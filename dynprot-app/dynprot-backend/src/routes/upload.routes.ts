// Routes pour l'upload d'images
import { Router, type Router as ExpressRouter } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { uploadRateLimit } from '../middleware/rateLimit';
import { 
  upload,
  uploadMealImage,
  uploadMealImageFromUrl,
  deleteMealImage,
  generateUploadSignature,
  getOptimizedImageUrl
} from '../controllers/upload.controller';

const router: ExpressRouter = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

// Upload d'image depuis un fichier (with rate limiting)
router.post(
  '/image', 
  uploadRateLimit,
  upload.single('image'), 
  uploadMealImage
);

// Upload d'image depuis une URL (with rate limiting)
router.post('/image/url', uploadRateLimit, uploadMealImageFromUrl);

// Supprimer une image
router.delete('/image/:publicId', deleteMealImage);

// Générer une signature pour upload direct
router.post('/signature', generateUploadSignature);

// Obtenir une URL optimisée
router.get('/image/:publicId/optimized', getOptimizedImageUrl);

export default router;