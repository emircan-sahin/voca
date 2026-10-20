import { Request, Response } from 'express';
import { z } from 'zod';
import { TranscriptModel } from '~/models/transcript.model';
import { transcribeAudio as groqTranscribe } from '~/services/groq.service';
import { transcribeAudio as deepgramTranscribe } from '~/services/deepgram.service';
import { translateText } from '~/services/translation.service';
import { saveTranscript, toITranscript } from '~/services/transcript.service';
import { calculateCost /* , deductCredits */ } from '~/services/billing.service';
import { sendSuccess, sendError } from '~/utils/response';
import { safeUnlink } from '~/utils/fs';
import { getErrorMessage } from '~/utils/error';
import { env } from '~/config/env';
import {
  LANGUAGE_CODES,
  TONES,
  STT_PROVIDERS,
  vocabularySchema,
  transcriptListQuerySchema,
} from '@voca/shared';
import { logger } from '~/config/logger';
import { recordAudioUsage } from '~/services/usage.service';

// Sent as one JSON-encoded array so phrases may contain commas (repeated params hit qs array limits)
const vocabularyParamSchema = z
  .string()
  .transform((raw, ctx) => {
    try {
      return JSON.parse(raw);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'vocabulary must be a JSON array' });
      return z.NEVER;
    }
  })
  .pipe(vocabularySchema);

// Not z.coerce.boolean(): Boolean('false') is true, so `numeric=false` would turn the add-on on.
const queryFlag = z.enum(['true', 'false']).default('false').transform((v) => v === 'true');

const transcribeQuerySchema = z.object({
  provider: z.enum(STT_PROVIDERS).default('groq'),
  language: z.enum(LANGUAGE_CODES).default('en'),
  translateTo: z.enum(LANGUAGE_CODES).optional(),
  tone: z.enum(TONES).default('developer'),
  numeric: queryFlag,
  planning: queryFlag,
  vocabulary: vocabularyParamSchema.default('[]'),
});

// Released clients (<= v0.0.12) send no params and expect the whole history; cap it so their payload stays bounded.
const UNPAGED_LIST_CAP = 200;

export async function deleteUserTranscripts(userId: string) {
  await TranscriptModel.deleteMany({ userId });
}

export const createTranscript = async (req: Request, res: Response) => {
  if (!req.file) {
    return sendError(res, req.t('transcript.audioRequired'), 400);
  }

  const filePath = req.file.path;
  const parsed = transcribeQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    safeUnlink(filePath);
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return sendError(res, message, 400);
  }
  const { provider, language, translateTo, tone, numeric, planning, vocabulary } = parsed.data;

  if (translateTo && !env.DEEPSEEK_API_KEY) {
    safeUnlink(filePath);
    return sendError(res, req.t('transcript.translationKeyRequired'), 400);
  }

  // Zero retention: audio is removed as soon as STT returns (or fails), on every path.
  let result;
  try {
    const transcribe = provider === 'deepgram' ? deepgramTranscribe : groqTranscribe;
    result = await transcribe(filePath, language, vocabulary);
  } finally {
    safeUnlink(filePath);
  }

  // Counted before the no-speech check: the provider bills that audio either way.
  await recordAudioUsage(req.user!.id, result.duration);

  if (result.hallucination) {
    return sendError(res, req.t('transcript.noSpeech'), 422);
  }

  let translatedText: string | undefined;
  let targetLanguage: string | undefined;
  let tokenUsage: { inputTokens: number; outputTokens: number; cacheReadTokens: number } | undefined;

  let translationFailed = false;

  if (translateTo) {
    // The transcript is the user's words: if translation fails, keep it and bill STT only.
    // Log the error message only (it never contains the transcript text).
    try {
      const translation = await translateText(result.text, result.language, translateTo, tone, { numeric, planning });
      translatedText = translation.translatedText;
      targetLanguage = translateTo;
      tokenUsage = translation.tokenUsage;
    } catch (err) {
      translationFailed = true;
      logger.warn('Translation', `Failed, returning raw transcript: ${getErrorMessage(err)}`, { sourceLang: result.language, targetLang: translateTo });
    }
  }

  const cost = calculateCost(result.cost, tokenUsage);
  logger.info('Billing', `stt:$${result.cost.toFixed(6)} llm:$${tokenUsage ? (cost - result.cost * 1.25).toFixed(6) : '0'} total:$${cost.toFixed(6)} (incl. 25% markup)`, { sttCost: result.cost, totalCost: cost, provider });
  // Paid plans are disabled: cost is still logged to track spend, but nothing is deducted.
  // The work is already paid for, so the deduction never refuses; requireCredits blocks the next request.
  // await deductCredits(req.user!.id, cost);

  const fields = {
    text: result.text,
    duration: result.duration,
    language: result.language,
    translatedText,
    targetLanguage,
    tokenUsage,
  };

  const record = await saveTranscript(req.user!.id, fields);
  // Refund credits if transcript save fails (re-enable together with deductCredits):
  // catch: await UserModel.updateOne({ _id: req.user!.id }, { $inc: { credits: cost } });

  return sendSuccess(res, req.t('transcript.success'), { ...toITranscript(record), ...(translationFailed && { translationFailed }) });
};

export const getTranscripts = async (req: Request, res: Response) => {
  const parsed = transcriptListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const message = parsed.error.errors.map((e) => e.message).join(', ');
    return sendError(res, message, 400);
  }
  const { limit, before } = parsed.data;

  const docs = await TranscriptModel.find({ userId: req.user!.id, ...(before && { _id: { $lt: before } }) })
    .sort({ _id: -1 })
    .limit(limit ?? UNPAGED_LIST_CAP)
    .lean();
  return sendSuccess(res, req.t('transcript.fetched'), docs.map(toITranscript));
};

export const deleteTranscript = async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await TranscriptModel.findOneAndDelete({ _id: id, userId: req.user!.id });

  if (!doc) {
    return sendError(res, req.t('transcript.notFound'), 404);
  }

  return sendSuccess(res, req.t('transcript.deleted'), null);
};
