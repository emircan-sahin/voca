import { Document, Schema, model } from 'mongoose';

export interface ITranscriptDocument extends Document {
  text: string;
  duration: number;
  language: string;
  audioPath?: string;
  createdAt: Date;
}

const transcriptSchema = new Schema<ITranscriptDocument>(
  {
    text: { type: String, required: true },
    duration: { type: Number, required: true },
    language: { type: String, required: true },
    audioPath: { type: String },
  },
  { timestamps: true }
);

export const TranscriptModel = model<ITranscriptDocument>('Transcript', transcriptSchema);
