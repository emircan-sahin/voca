import { createClient } from '@deepgram/sdk';
import fs from 'fs';
import { env } from '~/config/env';
import { logger } from '~/config/logger';
import { buildBiasTerms, DEEPGRAM_KEYTERM_MAX_COUNT, DEEPGRAM_KEYTERM_TOKEN_BUDGET } from '~/config/stt';
import { TranscriptionResult } from '~/services/groq.service';

const deepgram = createClient(env.DEEPGRAM_API_KEY);

// Pay-as-you-go pre-recorded nova-3, $/min (deepgram.com/pricing, checked 2026-10)
const COST_PER_MIN = 0.0043;
const KEYTERM_COST_PER_MIN = 0.0013;
// Streaming nova-3 is billed higher than pre-recorded, $/min
const LIVE_COST_PER_MIN = 0.0077;

export const transcribeAudio = async (filePath: string, language: string, vocabulary: string[] = []): Promise<TranscriptionResult> => {
  const stat = fs.statSync(filePath);
  logger.info('Deepgram', `Transcribing ${filePath} (${(stat.size / 1024).toFixed(1)} KB) lang:${language}`);

  const keyterms = buildBiasTerms(vocabulary, language, {
    maxTokens: DEEPGRAM_KEYTERM_TOKEN_BUDGET,
    maxCount: DEEPGRAM_KEYTERM_MAX_COUNT,
  });

  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
    fs.readFileSync(filePath),
    {
      model: 'nova-3',
      smart_format: true,
      language,
      // Turkish isn't in Deepgram's `multi` code-switching set, so bias the monolingual model instead
      ...(keyterms.length > 0 && { keyterm: keyterms }),
    }
  );

  if (error) {
    logger.error('Deepgram', `Transcription error: ${error.message}`);
    throw new Error('Deepgram transcription failed');
  }

  const alt = result?.results?.channels?.[0]?.alternatives?.[0];
  if (!alt) throw new Error('Deepgram returned empty result');

  const text = alt.transcript;
  const confidence = alt.confidence;
  const duration = result.metadata.duration;
  const cost = (duration / 60) * (COST_PER_MIN + (keyterms.length > 0 ? KEYTERM_COST_PER_MIN : 0));

  const hallucination = !text.trim() || confidence < 0.3;

  logger.info('Deepgram', `Done — conf:${confidence.toFixed(3)} dur:${duration.toFixed(1)}s cost:$${cost.toFixed(6)}${hallucination ? ' [HALLUCINATION]' : ''}`, { confidence, duration, cost, hallucination, language });

  return {
    text,
    language,
    duration,
    cost,
    hallucination,
  };
};

/** Opens a nova-3 live socket. Container audio (webm/opus) is auto-detected, so no encoding is set. */
export const openLiveConnection = (language: string, vocabulary: string[] = []) => {
  const keyterms = buildBiasTerms(vocabulary, language, {
    maxTokens: DEEPGRAM_KEYTERM_TOKEN_BUDGET,
    maxCount: DEEPGRAM_KEYTERM_MAX_COUNT,
  });

  const connection = deepgram.listen.live({
    model: 'nova-3',
    smart_format: true,
    language,
    // Finals only: text already typed into another app can't be taken back
    interim_results: false,
    ...(keyterms.length > 0 && { keyterm: keyterms }),
  });

  return { connection, hasKeyterms: keyterms.length > 0 };
};

export const liveCost = (durationSeconds: number, hasKeyterms: boolean) =>
  (durationSeconds / 60) * (LIVE_COST_PER_MIN + (hasKeyterms ? KEYTERM_COST_PER_MIN : 0));
