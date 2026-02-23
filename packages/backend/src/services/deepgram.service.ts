import { createClient } from '@deepgram/sdk';
import fs from 'fs';
import { env } from '~/config/env';
import { TranscriptionResult } from '~/services/groq.service';

const deepgram = createClient(env.DEEPGRAM_API_KEY);

const COST_PER_HOUR = 0.462; // $0.0077/min — nova-3

export const transcribeAudio = async (filePath: string, language: string): Promise<TranscriptionResult> => {
  const stat = fs.statSync(filePath);
  console.log(`[Deepgram] Transcribing ${filePath} (${(stat.size / 1024).toFixed(1)} KB) lang:${language}`);

  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
    fs.readFileSync(filePath),
    {
      model: 'nova-3',
      smart_format: true,
      language,
    }
  );

  if (error) throw new Error(`Deepgram transcription failed: ${error.message}`);

  const alt = result?.results?.channels?.[0]?.alternatives?.[0];
  if (!alt) throw new Error('Deepgram returned empty result');

  const text = alt.transcript;
  const confidence = alt.confidence;
  const duration = result.metadata.duration;
  const cost = (duration / 3600) * COST_PER_HOUR;

  const hallucination = !text.trim() || confidence < 0.3;

  console.log(
    `[Deepgram] Done — conf:${confidence.toFixed(3)} dur:${duration.toFixed(1)}s cost:$${cost.toFixed(6)}${hallucination ? ' [HALLUCINATION]' : ''} text:"${text.slice(0, 80)}..."`
  );

  return {
    text,
    language,
    duration,
    cost,
    hallucination,
  };
};
