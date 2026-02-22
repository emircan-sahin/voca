import { Router } from 'express';
import { upload } from '~/middleware/multer.middleware';
import {
  createTranscript,
  getTranscripts,
  deleteTranscript,
} from '~/controllers/transcript.controller';

const router = Router();

router.post('/', upload.single('audio'), createTranscript);
router.get('/', getTranscripts);
router.delete('/:id', deleteTranscript);

export default router;
