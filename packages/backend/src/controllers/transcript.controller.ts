import { Request, Response } from 'express';
import fs from 'fs';
import dayjs from 'dayjs';
import { z } from 'zod';
import { TranscriptModel } from '~/models/transcript.model';
import { transcribeAudio as groqTranscribe } from '~/services/groq.service';
import { transcribeAudio as deepgramTranscribe } from '~/services/deepgram.service';
import { sendSuccess, sendError } from '~/utils/response';
import { ITranscript } from '@voca/shared';

const SUPPORTED_LANGUAGES = [
  'en', 'tr', 'de', 'fr', 'es', 'pt', 'ja', 'ko', 'zh', 'ar',
  'ru', 'it', 'nl', 'pl', 'hi', 'bg', 'ca', 'cs', 'da', 'el',
  'et', 'fi', 'hu', 'id', 'lv', 'lt', 'ms', 'no', 'ro', 'sk',
  'sl', 'sv', 'th', 'uk', 'vi',
] as const;

const transcribeQuerySchema = z.object({
  provider: z.enum(['groq', 'deepgram']).default('groq'),
  language: z.enum(SUPPORTED_LANGUAGES).default('en'),
});

export const createTranscript = async (req: Request, res: Response) => {
  if (!req.file) {
    return sendError(res, 'Audio file is required', 400);
  }

  const filePath = req.file.path;
  const { provider, language } = transcribeQuerySchema.parse(req.query);

  try {
    const transcribe = provider === 'deepgram' ? deepgramTranscribe : groqTranscribe;
    const result = await transcribe(filePath, language);

    if (result.hallucination) {
      fs.unlink(filePath, () => {});
      return sendError(res, 'No speech detected, please try again.', 422);
    }

    const doc = await TranscriptModel.create({
      text: result.text,
      duration: result.duration,
      language: result.language,
      audioPath: filePath,
    });

    const transcript: ITranscript = {
      id: (doc._id as unknown as { toString(): string }).toString(),
      text: doc.text,
      duration: doc.duration,
      language: doc.language,
      createdAt: dayjs(doc.createdAt).valueOf(),
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
    createdAt: dayjs(doc.createdAt).valueOf(),
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
