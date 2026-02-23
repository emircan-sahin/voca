import { Document, Schema, model } from 'mongoose';

export interface IUserDocument extends Document {
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'apple';
  providerId: string;
  refreshToken?: string;
  createdAt: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
    provider: { type: String, enum: ['google', 'apple'], required: true },
    providerId: { type: String, required: true },
    refreshToken: { type: String },
  },
  { timestamps: true }
);

userSchema.index({ provider: 1, providerId: 1 }, { unique: true });

export const UserModel = model<IUserDocument>('User', userSchema);
