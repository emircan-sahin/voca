import { Request, Response } from 'express';
import { z } from 'zod';
import { TranscriptModel, ITranscriptDocument } from '~/models/transcript.model';
import { transcribeAudio as groqTranscribe } from '~/services/groq.service';
import { transcribeAudio as deepgramTranscribe } from '~/services/deepgram.service';
import { translateText } from '~/services/translation.service';
import { calculateCost, deductCredits } from '~/services/billing.service';
import { sendSuccess, sendError } from '~/utils/response';
import { safeUnlink } from '~/utils/fs';
import { env } from '~/config/env';
import { ITranscript, LANGUAGE_CODES, TONES, STT_PROVIDERS } from '@voca/shared';

const transcribeQuerySchema = z.object({
  provider: z.enum(STT_PROVIDERS).default('groq'),
  language: z.enum(LANGUAGE_CODES).default('en'),
  translateTo: z.enum(LANGUAGE_CODES).optional(),
  tone: z.enum(TONES).default('developer'),
  numeric: z.coerce.boolean().default(false),
  planning: z.coerce.boolean().default(false),
});

function toITranscript(doc: ITranscriptDocument): ITranscript {
  return {
    id: doc._id.toString(),
    text: doc.text,
    duration: doc.duration,
    language: doc.language,
    createdAt: doc.createdAt.toISOString(),
    ...(doc.translatedText && { translatedText: doc.translatedText }),
    ...(doc.targetLanguage && { targetLanguage: doc.targetLanguage }),
    ...(doc.tokenUsage && { tokenUsage: doc.tokenUsage }),
  };
}

export const createTranscript = async (req: Request, res: Response) => {
  if (!req.file) {
    return sendError(res, 'Audio file is required', 400);
  }

  const filePath = req.file.path;
  const parsed = transcribeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    safeUnlink(filePath);
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return sendError(res, message, 400);
  }
  const { provider, language, translateTo, tone, numeric, planning } = parsed.data;

  if (translateTo && !env.GEMINI_API_KEY) {
    return sendError(res, 'Translation requires a Gemini API key. Set GEMINI_API_KEY in your environment.', 400);
  }

  try {
    const transcribe = provider === 'deepgram' ? deepgramTranscribe : groqTranscribe;
    const result = await transcribe(filePath, language);

    if (result.hallucination) {
      safeUnlink(filePath);
      return sendError(res, 'No speech detected, please try again.', 422);
    }

    let translatedText: string | undefined;
    let targetLanguage: string | undefined;
    let tokenUsage: { inputTokens: number; outputTokens: number; cacheReadTokens: number } | undefined;

    if (translateTo) {
      const translation = await translateText(result.text, result.language, translateTo, tone, { numeric, planning });
      translatedText = translation.translatedText;
      targetLanguage = translateTo;
      tokenUsage = translation.tokenUsage;
    }

    const cost = calculateCost(result.cost, tokenUsage);
    console.log(
      `[Billing] stt:$${result.cost.toFixed(6)} gemini:$${tokenUsage ? (cost - result.cost * 1.25).toFixed(6) : '0'} total:$${cost.toFixed(6)} (incl. 25% markup)`
    );
    const deducted = await deductCredits(req.user!.id, cost);
    if (!deducted) {
      safeUnlink(filePath);
      return sendError(res, 'Insufficient credits', 402);
    }

    const doc = await TranscriptModel.create({
      text: result.text,
      duration: result.duration,
      language: result.language,
      audioPath: filePath,
      userId: req.user!.id,
      translatedText,
      targetLanguage,
      tokenUsage,
    });

    return sendSuccess(res, 'Transcription successful', toITranscript(doc));
  } catch (err) {
    safeUnlink(filePath);
    throw err;
  }
};

export const getTranscripts = async (req: Request, res: Response) => {
  const docs = await TranscriptModel.find({ userId: req.user!.id }).sort({ createdAt: -1 });
  return sendSuccess(res, 'Transcripts fetched', docs.map(toITranscript));
};

export const deleteTranscript = async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await TranscriptModel.findOneAndDelete({ _id: id, userId: req.user!.id });

  if (!doc) {
    return sendError(res, 'Transcript not found', 404);
  }

  if (doc.audioPath) {
    safeUnlink(doc.audioPath);
  }

  return sendSuccess(res, 'Transcript deleted', null);
};
