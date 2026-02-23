import { Router } from 'express';
import { activate, cancel } from '~/controllers/billing.controller';
import { authenticate } from '~/middleware/auth.middleware';

const router = Router();

router.post('/activate', authenticate, activate);
router.post('/cancel', authenticate, cancel);

export default router;
