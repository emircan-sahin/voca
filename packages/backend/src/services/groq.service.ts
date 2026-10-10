import Groq from 'groq-sdk';
import fs from 'fs';
import { env } from '~/config/env';
import { logger } from '~/config/logger';
import { buildBiasTerms, toPromptWords, WHISPER_PROMPT_TOKEN_BUDGET } from '~/config/stt';

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

interface Segment {
  start: number;
  end: number;
  text: string;
  no_speech_prob: number;
  avg_logprob: number;
  compression_ratio: number;
}

interface VerboseTranscription {
  text: string;
  language?: string;
  duration?: number;
  segments?: Segment[];
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
  cost: number;
  hallucination: boolean;
}

export const transcribeAudio = async (filePath: string, language: string, vocabulary: string[] = []): Promise<TranscriptionResult> => {
  const stat = fs.statSync(filePath);
  logger.info('Groq', `Transcribing ${filePath} (${(stat.size / 1024).toFixed(1)} KB) lang:${language}`);

  const promptTerms = buildBiasTerms(vocabulary, language, { maxTokens: WHISPER_PROMPT_TOKEN_BUDGET });

  const transcription = (await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: 'whisper-large-v3-turbo',
    response_format: 'verbose_json',
    language,
    // Whisper treats the prompt as prior context, so it biases spelling toward these words
    ...(promptTerms.length > 0 && { prompt: promptTerms.join(', ') }),
  })) as unknown as VerboseTranscription;

  const duration = transcription.duration ?? 0;
  // whisper-large-v3-turbo: $0.04/hour, billed with a 10 s minimum per request (console.groq.com/docs/models, 2026-10)
  const cost = (Math.max(duration, 10) / 3600) * 0.04;
  const hallucination = isHallucination(transcription, toPromptWords(promptTerms));

  logger.info('Groq', `Done — lang:${transcription.language} dur:${duration.toFixed(1)}s cost:$${cost.toFixed(6)}${hallucination ? ' [HALLUCINATION]' : ''}`, { language: transcription.language, duration, cost, hallucination });

  return {
    text: transcription.text,
    language: transcription.language ?? 'unknown',
    duration,
    cost,
    hallucination,
  };
};

function isHallucination(t: VerboseTranscription, promptWords: Set<string>): boolean {
  const duration = t.duration ?? 0;
  const segments = t.segments ?? [];

  // Signal 1: segment end time far exceeds actual audio duration
  if (duration > 0 && segments.length > 0) {
    const maxEnd = Math.max(...segments.map((s) => s.end));
    if (maxEnd > duration * 3) return true;
  }

  // Signal 2: high no_speech_prob across all segments
  if (segments.length > 0 && segments.every((s) => s.no_speech_prob > 0.6)) {
    return true;
  }

  // Signal 3: known hallucination patterns (fallback)
  const normalized = t.text.trim().toLowerCase().replace(/\s+/g, ' ');
  const patterns = ['altyazı m.k.', 'altyazılar m.k.', 'alt yazı m.k.'];
  if (patterns.some((p) => normalized === p || normalized.startsWith(p))) {
    return true;
  }

  // Signal 4: on near-silent audio Whisper echoes the prompt back (the terms we sent)
  const words = normalized.split(/[^\p{L}]+/u).filter(Boolean);
  if (words.length >= 4 && words.every((w) => promptWords.has(w))) {
    return true;
  }

  return false;
}
