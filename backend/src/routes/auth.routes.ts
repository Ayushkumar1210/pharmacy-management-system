import { Router } from 'express';
import { login, getMe, register } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/rbac.middleware';

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/register', authenticate, authorize('ADMIN'), register);

export default router;
