import { Router, type Router as ExpressRouter } from 'express';
import { 
  register, 
  login, 
  refreshToken, 
  logout, 
  getCurrentUser, 
  changePassword, 
  requestPasswordReset,
  deleteAccount
} from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router: ExpressRouter = Router();

// Public auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/request-password-reset', requestPasswordReset);

// Protected auth routes
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getCurrentUser);
router.post('/change-password', authenticateToken, changePassword);
router.post('/delete-account', authenticateToken, deleteAccount);

export default router;