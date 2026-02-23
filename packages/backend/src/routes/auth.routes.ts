import { Router } from 'express';
import { googleRedirect, googleCallback, refresh, getMe, getSettings, updateSettings } from '~/controllers/auth.controller';
import { authenticate } from '~/middleware/auth.middleware';

const router = Router();

router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);
router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, updateSettings);

export default router;
