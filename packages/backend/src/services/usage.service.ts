import { UserModel } from '~/models/user.model';
import { logger } from '~/config/logger';
import { getErrorMessage } from '~/utils/error';

/** Current UTC day as YYYY-MM-DD, the bucket the daily audio quota counts in. */
export const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);

/** Adds STT-billed audio to today's usage. Never throws: the transcription it follows already succeeded. */
export async function recordAudioUsage(userId: string, seconds: number): Promise<void> {
  const day = utcDay();
  try {
    // Pipeline update: concurrent requests add atomically, and a stale day restarts from this request.
    await UserModel.updateOne({ _id: userId }, [
      {
        $set: {
          usageSeconds: {
            $cond: [{ $eq: ['$usageDay', day] }, { $add: [{ $ifNull: ['$usageSeconds', 0] }, seconds] }, seconds],
          },
          usageDay: day,
        },
      },
    ]);
  } catch (err) {
    logger.warn('Usage', `Failed to record audio usage: ${getErrorMessage(err)}`, { seconds });
  }
}
