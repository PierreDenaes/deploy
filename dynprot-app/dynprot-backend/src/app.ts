import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration with debug logging
const corsOrigin = process.env.CORS_ORIGIN;
console.log('🔍 CORS_ORIGIN from env:', corsOrigin);

let allowedOrigins;
if (corsOrigin && corsOrigin.includes(',')) {
  allowedOrigins = corsOrigin.split(',').map(origin => origin.trim());
  console.log('🌐 Multiple origins detected:', allowedOrigins);
} else {
  allowedOrigins = corsOrigin || 'http://localhost:3000';
  console.log('🌐 Single origin:', allowedOrigins);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rate limiting (disabled in development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check route
app.get('/health', (_, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
import apiRoutes from './routes';
import { setupRateLimitCleanup } from './middleware/auth.middleware';

app.use('/api', apiRoutes);

// Setup rate limit cleanup
setupRateLimitCleanup();

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.path} does not exist`
  });
});

// Error handling middleware
app.use((err: any, _: express.Request, res: express.Response, __: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
    ...(isDevelopment && { stack: err.stack })
  });
});

export default app;