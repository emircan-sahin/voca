import { Types } from 'mongoose';
import { TranscriptModel, ITranscriptDocument } from '~/models/transcript.model';
import { UserModel } from '~/models/user.model';
import { ITranscript } from '@voca/shared';

// Hydrated docs, lean docs and privacy-mode results (never saved) all map through this.
export type TranscriptRecord = Pick<
  ITranscriptDocument,
  'text' | 'duration' | 'language' | 'createdAt' | 'translatedText' | 'targetLanguage' | 'tokenUsage'
> & { _id: Types.ObjectId };

export function toITranscript(doc: TranscriptRecord): ITranscript {
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

type TranscriptFields = Pick<TranscriptRecord, 'text' | 'duration' | 'language'> &
  Partial<Pick<TranscriptRecord, 'translatedText' | 'targetLanguage' | 'tokenUsage'>>;

/**
 * Read right before the save (not at request start) so a privacy toggle during STT is honoured.
 * Privacy mode: never written to the DB; the result is the only copy and the app keeps it in memory.
 */
export async function saveTranscript(userId: string, fields: TranscriptFields): Promise<TranscriptRecord> {
  const userDoc = await UserModel.findById(userId).select('settings.privacyMode').lean();
  if (userDoc?.settings?.privacyMode) return { ...fields, _id: new Types.ObjectId(), createdAt: new Date() };
  return TranscriptModel.create({ ...fields, userId });
}
