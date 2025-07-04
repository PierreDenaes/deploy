import { Router, type Router as ExpressRouter } from 'express';
import authRoutes from './auth.routes';
import mealRoutes from './meal.routes';
import profileRoutes from './profile.routes';
import summaryRoutes from './summary.routes';
import uploadRoutes from './upload.routes';
import { authenticateToken } from '../middleware/auth.middleware';


const router: ExpressRouter = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Public routes (no authentication required)
console.log('🔧 Mounting auth routes at /auth');
router.use('/auth', authRoutes);
console.log('✅ Auth routes mounted');

// Protected routes (authentication required)
console.log('🔧 Mounting protected routes...');
router.use('/profile', authenticateToken, profileRoutes);
router.use('/meals', authenticateToken, mealRoutes);
router.use('/summaries', authenticateToken, summaryRoutes);
router.use('/upload', authenticateToken, uploadRoutes);
console.log('✅ All protected routes mounted');

// API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'DynProt API v1.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      profile: '/api/profile',
      meals: '/api/meals',
      summaries: '/api/summaries',
      upload: '/api/upload'
    }
  });
});

export default router;