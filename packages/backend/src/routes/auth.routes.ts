import { Router } from 'express';
import { googleRedirect, googleCallback, refresh, getMe, getSettings, updateSettings } from '~/controllers/auth.controller';
import { authenticate } from '~/middleware/auth.middleware';
import { authLimiter } from '~/middleware/rateLimit.middleware';

const router = Router();

router.get('/google', authLimiter, googleRedirect);
router.get('/google/callback', authLimiter, googleCallback);
router.post('/refresh', authLimiter, refresh);
router.get('/me', authenticate, getMe);
router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, updateSettings);

export default router;
