import { Router } from 'express';
import { googleRedirect, googleCallback, refresh, logout, getMe, getSettings, updateSettings, resetSettings } from '~/controllers/auth.controller';
import { authenticate } from '~/middleware/auth.middleware';
import { authLimiter } from '~/middleware/rateLimit.middleware';

const router = Router();

router.get('/google', authLimiter, googleRedirect);
router.get('/google/callback', authLimiter, googleCallback);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, updateSettings);
router.post('/settings/reset', authenticate, resetSettings);

export default router;
