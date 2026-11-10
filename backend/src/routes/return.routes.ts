import { Router } from 'express';
import { createAdjustment, getReturns } from '../controllers/return.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';

const router = Router();

// Adjustments & returns require supervisor/pharmacist or admin privileges
router.get('/', authenticate, getReturns);
router.post('/adjust', authenticate, authorize('ADMIN', 'PHARMACIST'), createAdjustment);

export default router;
