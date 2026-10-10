import { Schema, Types, model } from 'mongoose';

/** One-time code handed to the desktop app via voca:// and exchanged for tokens with a PKCE verifier. */
interface IAuthCode {
  codeHash: string;
  userId: Types.ObjectId;
  challenge: string;
  expiresAt: Date;
}

const authCodeSchema = new Schema<IAuthCode>({
  codeHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  challenge: { type: String, required: true },
  // TTL cleanup only; the sweeper runs every ~60s, so reads must also filter on expiresAt
  expiresAt: { type: Date, required: true, expires: 0 },
});

export const AuthCodeModel = model<IAuthCode>('AuthCode', authCodeSchema);
