import { Router } from 'express';
import { checkout, getConfig, cancel } from '~/controllers/billing.controller';
import { authenticate } from '~/middleware/auth.middleware';
import { asyncHandler } from '~/utils/asyncHandler';

const router = Router();

router.post('/checkout', authenticate, asyncHandler(checkout));
router.get('/config', authenticate, asyncHandler(getConfig));
router.post('/cancel', authenticate, asyncHandler(cancel));

export default router;
