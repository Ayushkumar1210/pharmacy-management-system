import { Router } from 'express';
import { getBatches, getFefoRecommendation, createBatch } from '../controllers/batch.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';

const router = Router();

router.get('/', authenticate, getBatches);
router.get('/fefo-recommendation', authenticate, getFefoRecommendation);
router.post('/', authenticate, authorize('ADMIN', 'PHARMACIST'), createBatch);

export default router;
