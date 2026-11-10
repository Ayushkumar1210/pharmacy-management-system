import { Router } from 'express';
import {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  getCategories,
} from '../controllers/medicine.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';

const router = Router();

// Public/authenticated medicine browsing
router.get('/', authenticate, getMedicines);
router.get('/categories', authenticate, getCategories);
router.get('/:id', authenticate, getMedicineById);

// Staff write operations
router.post('/', authenticate, authorize('ADMIN', 'PHARMACIST'), createMedicine);
router.put('/:id', authenticate, authorize('ADMIN', 'PHARMACIST'), updateMedicine);

export default router;
