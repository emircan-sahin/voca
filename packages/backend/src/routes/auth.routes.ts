import { Router } from 'express';
import { googleRedirect, googleCallback, poll, refresh, getMe } from '~/controllers/auth.controller';
import { authenticate } from '~/middleware/auth.middleware';

const router = Router();

router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);
router.get('/poll', poll);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);

export default router;
