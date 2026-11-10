import { Router } from 'express';
import { getSuppliers, createSupplier } from '../controllers/supplier.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';

const router = Router();

router.get('/', authenticate, getSuppliers);
router.post('/', authenticate, authorize('ADMIN', 'PHARMACIST'), createSupplier);

export default router;
