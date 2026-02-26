import { Router } from 'express';
import { checkout, getConfig, cancel } from '~/controllers/billing.controller';
import { authenticate } from '~/middleware/auth.middleware';

const router = Router();

router.post('/checkout', authenticate, checkout);
router.get('/config', authenticate, getConfig);
router.post('/cancel', authenticate, cancel);

export default router;
