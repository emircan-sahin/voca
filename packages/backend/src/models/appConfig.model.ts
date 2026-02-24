import dayjs from 'dayjs';
import { Schema, model } from 'mongoose';

interface IAppConfig {
  _id: string;
  latestVersion: string;
}

const appConfigSchema = new Schema<IAppConfig>(
  {
    _id: { type: String, default: 'main' },
    latestVersion: { type: String, required: true, default: '0.0.1' },
  },
  { _id: false, timestamps: true },
);

export const AppConfigModel = model<IAppConfig>('AppConfig', appConfigSchema);

let cachedConfig = { latestVersion: '0.0.1' };

async function refreshConfig(): Promise<void> {
  try {
    const doc = await AppConfigModel.findById('main').lean();
    if (doc) {
      cachedConfig = { latestVersion: doc.latestVersion };
    }
  } catch (err) {
    console.error('[AppConfig] Refresh failed, using cached value:', (err as Error).message);
  }
}

export async function ensureAppConfig(): Promise<void> {
  await AppConfigModel.findOneAndUpdate(
    { _id: 'main' },
    { $setOnInsert: { latestVersion: '0.0.1' } },
    { upsert: true },
  );
  await refreshConfig();
  setInterval(refreshConfig, dayjs().add(3, 'minute').diff(dayjs()));
  console.log('[AppConfig] Ensured');
}

export function getAppConfig(): { latestVersion: string } {
  return cachedConfig;
}
