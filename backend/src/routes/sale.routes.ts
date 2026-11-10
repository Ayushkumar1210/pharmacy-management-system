import { Router } from 'express';
import { createSale, getSales, getSaleById } from '../controllers/sale.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';

const router = Router();

// Cashiers, Pharmacists and Admins can create sales and view invoices
router.get('/', authenticate, getSales);
router.get('/:id', authenticate, getSaleById);
router.post('/', authenticate, authorize('ADMIN', 'PHARMACIST', 'CASHIER'), createSale);

export default router;
