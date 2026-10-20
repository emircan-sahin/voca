import { IncomingMessage, Server } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import { LiveTranscriptionEvents } from '@deepgram/sdk';
import { LiveServerMessage, liveStartSchema } from '@voca/shared';
import i18n from '~/i18n/config';
import { env } from '~/config/env';
import { logger } from '~/config/logger';
import { redis } from '~/config/redis';
import { verifyToken } from '~/services/auth.service';
import { openLiveConnection, liveCost } from '~/services/deepgram.service';
import { isOverDailyQuota, recordAudioUsage } from '~/services/usage.service';
import { saveTranscript, toITranscript } from '~/services/transcript.service';
import { getErrorMessage } from '~/utils/error';

// The app auto-pauses recording at 5 minutes; the extra minute covers the stop tail
const MAX_SESSION_MS = 6 * 60_000;
const START_TIMEOUT_MS = 5_000;
// ~250ms webm chunks are a few KB; this only bounds a misbehaving client
const MAX_PAYLOAD_BYTES = 256 * 1024;

const send = (ws: WebSocket, msg: LiveServerMessage) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

function handleSession(ws: WebSocket, req: IncomingMessage) {
  const t = i18n.getFixedT(req.headers['accept-language']?.split(',')[0]?.trim() || 'en');
  const fail = (status: number, key: string) => {
    send(ws, { type: 'error', message: t(key), status });
    ws.close();
  };

  let starting = false;
  let started = false;
  let finalized = false;
  let stopQueued = false;
  let cancelled = false;
  let userId = '';
  let lockKey: string | null = null;
  let language = '';
  let hasKeyterms = false;
  let dg: ReturnType<typeof openLiveConnection>['connection'] | null = null;
  let dgOpen = false;
  let stopping = false;
  // Audio that arrives before the Deepgram socket is open
  const pending: ArrayBuffer[] = [];
  const segments: string[] = [];
  let audioEnd = 0;
  const startedAt = Date.now();

  const startTimer = setTimeout(() => {
    if (!started) fail(400, 'error.unauthorized');
  }, START_TIMEOUT_MS);
  const maxTimer = setTimeout(() => requestStop(), MAX_SESSION_MS);

  const cleanup = () => {
    clearTimeout(startTimer);
    clearTimeout(maxTimer);
    if (lockKey) redis.del(lockKey).catch((err) => logger.error('Redis', `Failed to release lock: ${err.message}`));
    lockKey = null;
  };

  function requestStop() {
    if (stopping) return;
    // Closing before the socket is open would drop the buffered audio; the Open handler retries
    if (!dgOpen) {
      stopQueued = true;
      return;
    }
    stopping = true;
    dg?.requestClose();
  }

  // Deepgram closed: everything it will ever send has arrived
  async function finalize() {
    if (finalized) return;
    finalized = true;
    try {
      if (cancelled) {
        // Nothing is kept, but the provider billed the audio
        await recordAudioUsage(userId, audioEnd || (Date.now() - startedAt) / 1000);
        ws.close();
        return;
      }
      if (segments.length === 0) {
        // The provider bills the audio either way, so wall-clock stands in for the missing timestamps
        await recordAudioUsage(userId, (Date.now() - startedAt) / 1000);
        return fail(422, 'transcript.noSpeech');
      }

      const text = segments.join(' ');
      const duration = audioEnd;
      await recordAudioUsage(userId, duration);
      logger.info('Billing', `stt:$${liveCost(duration, hasKeyterms).toFixed(6)} (live, incl. no markup)`, { sttCost: liveCost(duration, hasKeyterms), provider: 'deepgram', live: true });

      const record = await saveTranscript(userId, { text, duration, language });
      send(ws, { type: 'done', message: t('transcript.success'), transcript: toITranscript(record) });
      ws.close();
    } catch (err) {
      logger.error('Stream', `Finalize failed: ${getErrorMessage(err)}`);
      fail(500, 'error.internal');
    } finally {
      cleanup();
    }
  }

  async function start(raw: string) {
    const parsed = liveStartSchema.safeParse(safeJson(raw));
    if (!parsed.success) return fail(400, 'error.internal');
    const { token, vocabulary } = parsed.data;
    language = parsed.data.language;

    try {
      userId = verifyToken(token).sub;
    } catch {
      return fail(401, 'error.unauthorized');
    }
    if (!env.DEEPGRAM_API_KEY) return fail(400, 'error.internal');
    if (await isOverDailyQuota(userId)) return fail(429, 'error.dailyLimitReached');

    // Same lock as POST /transcripts: one dictation per user at a time
    const key = `transcribing:${userId}`;
    if (!(await redis.set(key, '1', 'EX', MAX_SESSION_MS / 1000 + 60, 'NX'))) return fail(409, 'error.transcriptionInProgress');
    lockKey = key;
    // The client may have gone while we were awaiting
    if (ws.readyState !== WebSocket.OPEN) return cleanup();

    started = true;
    clearTimeout(startTimer);

    const live = openLiveConnection(language, vocabulary);
    dg = live.connection;
    hasKeyterms = live.hasKeyterms;

    dg.on(LiveTranscriptionEvents.Open, () => {
      dgOpen = true;
      for (const chunk of pending.splice(0)) dg?.send(chunk);
      if (stopQueued) requestStop();
      else send(ws, { type: 'ready' });
    });
    dg.on(LiveTranscriptionEvents.Transcript, (data) => {
      const text = data.channel?.alternatives?.[0]?.transcript?.trim();
      if (!data.is_final || !text) return;
      segments.push(text);
      audioEnd = Math.max(audioEnd, data.start + data.duration);
      send(ws, { type: 'segment', text });
    });
    dg.on(LiveTranscriptionEvents.Error, (err) => {
      // The message can carry request details, never the audio or text
      logger.error('Deepgram', `Live error: ${getErrorMessage(err)}`);
      if (segments.length === 0) {
        fail(502, 'error.internal');
        cleanup();
      }
    });
    dg.on(LiveTranscriptionEvents.Close, () => {
      if (ws.readyState === WebSocket.OPEN || segments.length > 0) void finalize();
      else cleanup();
    });
  }

  ws.on('message', (data: RawData, isBinary: boolean) => {
    if (!started) {
      if (isBinary) pending.push(toArrayBuffer(data));
      // A very short dictation can send stop before Deepgram is up; honour it once the socket opens
      else if (starting) {
        const type = safeJson(data.toString())?.type;
        if (type === 'cancel') cancelled = true;
        if (type === 'stop' || type === 'cancel') stopQueued = true;
      }
      // A second start while the first is still verifying would open two Deepgram sockets
      else {
        starting = true;
        void start(data.toString()).catch((err) => {
          logger.error('Stream', `Start failed: ${getErrorMessage(err)}`);
          fail(500, 'error.internal');
          cleanup();
        });
      }
      return;
    }
    if (isBinary) {
      if (stopping) return;
      if (dg && dgOpen) dg.send(toArrayBuffer(data));
      else pending.push(toArrayBuffer(data));
      return;
    }
    const type = safeJson(data.toString())?.type;
    if (type === 'cancel') cancelled = true;
    if (type === 'stop' || type === 'cancel') requestStop();
  });

  ws.on('close', () => {
    // Client vanished: let Deepgram flush so what was already typed still lands in history
    if (dg) requestStop();
    else cleanup();
  });
  ws.on('error', (err) => logger.warn('Stream', `Socket error: ${err.message}`));
}

// Deepgram's send() takes an ArrayBuffer, not a Node Buffer
const toArrayBuffer = (data: RawData): ArrayBuffer =>
  new Uint8Array(Array.isArray(data) ? Buffer.concat(data) : (data as Buffer)).buffer;

function safeJson(raw: string): { type?: string } | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Serves the live dictation socket on `path`; every other upgrade request is refused. */
export function attachLiveStream(server: Server, path: string) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });
  wss.on('connection', handleSession);

  server.on('upgrade', (req, socket, head) => {
    // Query string can't carry anything we need; the token travels in the first message
    if (new URL(req.url ?? '', 'http://localhost').pathname !== path) return socket.destroy();
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  return wss;
}
