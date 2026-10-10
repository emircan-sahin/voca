import { Router } from 'express';
import { upload } from '~/middleware/multer.middleware';
import { authenticate } from '~/middleware/auth.middleware';
// Paid plans are disabled: everyone gets unlimited transcription. Re-enable to gate on credits.
// import { requireCredits } from '~/middleware/billing.middleware';
import {
  createTranscript,
  getTranscripts,
  deleteTranscript,
} from '~/controllers/transcript.controller';
import { transcriptLimiter } from '~/middleware/rateLimit.middleware';
import { requireNoActiveTranscription } from '~/middleware/concurrency.middleware';
import { requireDailyQuota } from '~/middleware/quota.middleware';
import { asyncHandler } from '~/utils/asyncHandler';

const router = Router();

router.post('/', authenticate, transcriptLimiter, /* asyncHandler(requireCredits), */ asyncHandler(requireDailyQuota), asyncHandler(requireNoActiveTranscription), upload.single('audio'), asyncHandler(createTranscript));
router.get('/', authenticate, asyncHandler(getTranscripts));
router.delete('/:id', authenticate, asyncHandler(deleteTranscript));

export default router;
