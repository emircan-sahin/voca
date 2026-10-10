import { Document, Schema, model } from 'mongoose';

export interface ITranscriptDocument extends Document {
  text: string;
  duration: number;
  language: string;
  userId?: string;
  translatedText?: string;
  targetLanguage?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
  };
  createdAt: Date;
}

const transcriptSchema = new Schema<ITranscriptDocument>(
  {
    text: { type: String, required: true },
    duration: { type: Number, required: true },
    language: { type: String, required: true },
    userId: { type: String },
    translatedText: { type: String },
    targetLanguage: { type: String },
    tokenUsage: {
      type: new Schema(
        {
          inputTokens: { type: Number, required: true },
          outputTokens: { type: Number, required: true },
          cacheReadTokens: { type: Number, required: true },
        },
        { _id: false }
      ),
    },
  },
  { timestamps: true }
);

// History pages are read as "this user's, newest first" by _id (time-ordered) with an `_id < before` cursor.
// The compound index also serves userId-only filters (deleteMany), so it replaces the old userId index.
transcriptSchema.index({ userId: 1, _id: -1 });

export const TranscriptModel = model<ITranscriptDocument>('Transcript', transcriptSchema);
