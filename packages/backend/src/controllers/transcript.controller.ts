import { Request, Response } from 'express';
import fs from 'fs';
import { z } from 'zod';
import { TranscriptModel } from '~/models/transcript.model';
import { transcribeAudio as groqTranscribe } from '~/services/groq.service';
import { transcribeAudio as deepgramTranscribe } from '~/services/deepgram.service';
import { translateText } from '~/services/translation.service';
import { sendSuccess, sendError } from '~/utils/response';
import { env } from '~/config/env';
import { ITranscript, LANGUAGE_CODES, TONES } from '@voca/shared';

const transcribeQuerySchema = z.object({
  provider: z.enum(['groq', 'deepgram']).default('groq'),
  language: z.enum(LANGUAGE_CODES).default('en'),
  translateTo: z.enum(LANGUAGE_CODES).optional(),
  tone: z.enum(TONES).default('developer'),
  numeric: z.coerce.boolean().default(false),
  planning: z.coerce.boolean().default(false),
});

export const createTranscript = async (req: Request, res: Response) => {
  if (!req.file) {
    return sendError(res, 'Audio file is required', 400);
  }

  const filePath = req.file.path;
  const { provider, language, translateTo, tone, numeric, planning } = transcribeQuerySchema.parse(req.query);

  if (translateTo && !env.GEMINI_API_KEY) {
    return sendError(res, 'Translation requires a Gemini API key. Set GEMINI_API_KEY in your environment.', 400);
  }

  try {
    const transcribe = provider === 'deepgram' ? deepgramTranscribe : groqTranscribe;
    const result = await transcribe(filePath, language);

    if (result.hallucination) {
      fs.unlink(filePath, () => {});
      return sendError(res, 'No speech detected, please try again.', 422);
    }

    let translatedText: string | undefined;
    let targetLanguage: string | undefined;
    let tokenUsage: { inputTokens: number; outputTokens: number; cacheReadTokens: number } | undefined;

    if (translateTo && translateTo !== result.language) {
      const translation = await translateText(result.text, result.language, translateTo, tone, { numeric, planning });
      translatedText = translation.translatedText;
      targetLanguage = translateTo;
      tokenUsage = translation.tokenUsage;
    }

    const doc = await TranscriptModel.create({
      text: result.text,
      duration: result.duration,
      language: result.language,
      audioPath: filePath,
      translatedText,
      targetLanguage,
      tokenUsage,
    });

    const transcript: ITranscript = {
      id: (doc._id as unknown as { toString(): string }).toString(),
      text: doc.text,
      duration: doc.duration,
      language: doc.language,
      createdAt: doc.createdAt.toISOString(),
      ...(doc.translatedText && { translatedText: doc.translatedText }),
      ...(doc.targetLanguage && { targetLanguage: doc.targetLanguage }),
      ...(doc.tokenUsage && { tokenUsage: doc.tokenUsage }),
    };

    return sendSuccess(res, 'Transcription successful', transcript);
  } catch (err) {
    fs.unlink(filePath, () => {});
    throw err;
  }
};

export const getTranscripts = async (_req: Request, res: Response) => {
  const docs = await TranscriptModel.find().sort({ createdAt: -1 });

  const transcripts: ITranscript[] = docs.map((doc: typeof docs[number]) => ({
    id: (doc._id as unknown as { toString(): string }).toString(),
    text: doc.text,
    duration: doc.duration,
    language: doc.language,
    createdAt: doc.createdAt.toISOString(),
    ...(doc.translatedText && { translatedText: doc.translatedText }),
    ...(doc.targetLanguage && { targetLanguage: doc.targetLanguage }),
    ...(doc.tokenUsage && { tokenUsage: doc.tokenUsage }),
  }));

  return sendSuccess(res, 'Transcripts fetched', transcripts);
};

export const deleteTranscript = async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await TranscriptModel.findByIdAndDelete(id);

  if (!doc) {
    return sendError(res, 'Transcript not found', 404);
  }

  if (doc.audioPath) {
    fs.unlink(doc.audioPath, () => {});
  }

  return sendSuccess(res, 'Transcript deleted', null);
};
