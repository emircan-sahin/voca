import { Router } from 'express';
import { upload } from '~/middleware/multer.middleware';
import { optionalAuth } from '~/middleware/auth.middleware';
import {
  createTranscript,
  getTranscripts,
  deleteTranscript,
} from '~/controllers/transcript.controller';

const router = Router();

router.post('/', optionalAuth, upload.single('audio'), createTranscript);
router.get('/', optionalAuth, getTranscripts);
router.delete('/:id', optionalAuth, deleteTranscript);

export default router;
