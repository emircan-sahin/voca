import { Router } from 'express';
import { upload } from '~/middleware/multer.middleware';
import { authenticate } from '~/middleware/auth.middleware';
import { requireCredits } from '~/middleware/billing.middleware';
import {
  createTranscript,
  getTranscripts,
  deleteTranscript,
} from '~/controllers/transcript.controller';

const router = Router();

router.post('/', authenticate, requireCredits, upload.single('audio'), createTranscript);
router.get('/', authenticate, getTranscripts);
router.delete('/:id', authenticate, deleteTranscript);

export default router;
