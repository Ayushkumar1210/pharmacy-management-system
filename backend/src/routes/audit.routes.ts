import { Router } from 'express';
import { getAuditTrail } from '../controllers/audit.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';

const router = Router();

// Audit trail accessible to Pharmacists and Admins
router.get('/', authenticate, authorize('ADMIN', 'PHARMACIST'), getAuditTrail);

export default router;
