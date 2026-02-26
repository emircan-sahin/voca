import Redis from 'ioredis';
import { env } from '~/config/env';
import { logger } from '~/config/logger';

export const redis = new Redis(env.REDIS_URL);

redis.on('error', (err) => logger.error('Redis', err.message));

export async function clearTranscriptionLocks() {
  const keys = await redis.keys('transcribing:*');
  if (keys.length > 0) {
    await redis.del(...keys);
    logger.local('Redis', `Cleared ${keys.length} stale transcription lock(s)`);
  }
}
