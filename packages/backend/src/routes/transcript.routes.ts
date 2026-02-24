import { Router } from 'express';
import { upload } from '~/middleware/multer.middleware';
import { authenticate } from '~/middleware/auth.middleware';
import { requireCredits } from '~/middleware/billing.middleware';
import {
  createTranscript,
  getTranscripts,
  deleteTranscript,
} from '~/controllers/transcript.controller';
import { transcriptLimiter } from '~/middleware/rateLimit.middleware';
import { requireNoActiveTranscription } from '~/middleware/concurrency.middleware';

const router = Router();

router.post('/', authenticate, transcriptLimiter, requireCredits, requireNoActiveTranscription, upload.single('audio'), createTranscript);
router.get('/', authenticate, getTranscripts);
router.delete('/:id', authenticate, deleteTranscript);

export default router;
