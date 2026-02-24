import Redis from 'ioredis';
import { env } from '~/config/env';

export const redis = new Redis(env.REDIS_URL);

redis.on('error', (err) => console.error('[Redis]', err.message));

export async function clearTranscriptionLocks() {
  const keys = await redis.keys('transcribing:*');
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`[Redis] Cleared ${keys.length} stale transcription lock(s)`);
  }
}
