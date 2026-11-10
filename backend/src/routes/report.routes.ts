import { Router } from 'express';
import {
  getReconciliationReport,
  getAlertsReport,
  getValuationReport,
  getSalesSummaryReport,
  getDashboardMetrics,
} from '../controllers/report.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';

const router = Router();

router.get('/dashboard', authenticate, getDashboardMetrics);
router.get('/alerts', authenticate, getAlertsReport);
router.get('/reconciliation', authenticate, authorize('ADMIN', 'PHARMACIST'), getReconciliationReport);
router.get('/valuation', authenticate, authorize('ADMIN', 'PHARMACIST'), getValuationReport);
router.get('/sales-summary', authenticate, authorize('ADMIN', 'PHARMACIST'), getSalesSummaryReport);

export default router;
