import { Router } from 'express';
import { createPurchase, getPurchases } from '../controllers/purchase.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';

const router = Router();

router.get('/', authenticate, getPurchases);
router.post('/', authenticate, authorize('ADMIN', 'PHARMACIST'), createPurchase);

export default router;
