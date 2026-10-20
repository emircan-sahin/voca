import i18n from 'i18next';
import { ITranscript, LIVE_STREAM_PATH, LiveServerMessage } from '@voca/shared';
import { ApiError } from '~/lib/axios';
import { useAuthStore } from '~/stores/auth.store';

// Gives up if the server never answers the stop; it flushes in well under a second normally
const FINISH_TIMEOUT_MS = 15_000;

export interface LiveSession {
  /** Audio chunks sent before the socket is open are held and flushed in order. */
  send: (chunk: Blob) => void;
  /** Tells the server the audio is over; resolves with the saved transcript once its last segment arrived. */
  finish: () => Promise<{ message: string; transcript: ITranscript }>;
  /** Drops the dictation: the server keeps nothing. */
  abort: () => void;
  /** True once at least one segment was handed to onSegment (it can't be taken back). */
  hasTyped: () => boolean;
}

const streamUrl = () => `${import.meta.env.VITE_API_BASE_URL.replace(/^http/, 'ws')}${LIVE_STREAM_PATH}`;

export function openLiveSession(
  // language stays a plain string like the language store; the server validates it
  params: { language: string; vocabulary: string[] },
  onSegment: (text: string, isFirst: boolean) => void
): LiveSession {
  const ws = new WebSocket(streamUrl());
  const queue: Array<Blob | string> = [];
  let segments = 0;
  let settled = false;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  // Settled by the server's verdict; finish() may be called before or after it arrives
  let resolveOutcome!: (v: { message: string; transcript: ITranscript }) => void;
  let rejectOutcome!: (e: ApiError) => void;
  const outcome = new Promise<{ message: string; transcript: ITranscript }>((resolve, reject) => {
    resolveOutcome = resolve;
    rejectOutcome = reject;
  });
  // An aborted session never has a finish() caller to receive the rejection
  outcome.catch(() => {});

  const pushOrSend = (item: Blob | string) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(item);
    else if (ws.readyState === WebSocket.CONNECTING) queue.push(item);
  };

  const settle = (fn: () => void) => {
    if (settled) return;
    settled = true;
    clearTimeout(finishTimer);
    fn();
  };

  ws.onopen = () => {
    const start = {
      type: 'start' as const,
      token: useAuthStore.getState().token ?? '',
      language: params.language,
      vocabulary: params.vocabulary,
    };
    ws.send(JSON.stringify(start));
    for (const item of queue.splice(0)) ws.send(item);
  };

  ws.onmessage = (e) => {
    if (typeof e.data !== 'string') return;
    const msg = JSON.parse(e.data) as LiveServerMessage;
    if (msg.type === 'segment') {
      onSegment(msg.text, segments++ === 0);
    } else if (msg.type === 'done') {
      settle(() => resolveOutcome({ message: msg.message, transcript: msg.transcript }));
    } else if (msg.type === 'error') {
      settle(() => rejectOutcome(new ApiError(msg.message, null, msg.status)));
    }
  };

  // Dropped before a verdict: no status, so the caller treats it as a connection failure
  const lost = () => settle(() => rejectOutcome(new ApiError(i18n.t('error.network'))));
  ws.onerror = lost;
  ws.onclose = lost;

  return {
    send: (chunk) => pushOrSend(chunk),
    finish: () => {
      pushOrSend(JSON.stringify({ type: 'stop' }));
      finishTimer = setTimeout(lost, FINISH_TIMEOUT_MS);
      return outcome;
    },
    abort: () => {
      settled = true;
      clearTimeout(finishTimer);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'cancel' }));
        ws.close();
      } else if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close();
      }
    },
    hasTyped: () => segments > 0,
  };
}
