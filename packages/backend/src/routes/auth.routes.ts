import { Router } from 'express';
import { googleRedirect, googleCallback, exchange, refresh, logout, getMe, getSettings, updateSettings, resetSettings } from '~/controllers/auth.controller';
import { authenticate } from '~/middleware/auth.middleware';
import { authLimiter } from '~/middleware/rateLimit.middleware';
import { asyncHandler } from '~/utils/asyncHandler';

const router = Router();

router.get('/google', authLimiter, googleRedirect);
router.get('/google/callback', authLimiter, asyncHandler(googleCallback));
router.post('/exchange', authLimiter, asyncHandler(exchange));
router.post('/refresh', authLimiter, asyncHandler(refresh));
router.post('/logout', authenticate, asyncHandler(logout));
router.get('/me', authenticate, asyncHandler(getMe));
router.get('/settings', authenticate, asyncHandler(getSettings));
router.put('/settings', authenticate, asyncHandler(updateSettings));
router.post('/settings/reset', authenticate, asyncHandler(resetSettings));

export default router;
