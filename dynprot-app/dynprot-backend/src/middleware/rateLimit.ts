// Middleware de limitation de taux pour les endpoints IA
import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

// Rate limiting général pour l'API
export const generalRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes par défaut
  max: config.rateLimit.maxRequests, // 100 requêtes par défaut
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Trop de requêtes, veuillez réessayer plus tard',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting strict pour l'analyse IA
export const aiAnalysisRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 analyses IA par minute par utilisateur
  message: {
    success: false,
    error: 'AI rate limit exceeded',
    message: 'Limite d\'analyses IA atteinte. Attendez 1 minute avant de réessayer.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit par utilisateur + IP
    const user = (req as any).user;
    return `ai:${user?.id || 'anonymous'}:${req.ip}`;
  },
  skip: (req) => {
    // Skip rate limiting en développement
    return config.isDevelopment;
  }
});

// Rate limiting pour l'upload d'images
export const uploadRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 uploads par 5 minutes
  message: {
    success: false,
    error: 'Upload rate limit exceeded',
    message: 'Limite d\'uploads atteinte. Attendez 5 minutes avant de réessayer.',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const user = (req as any).user;
    return `upload:${user?.id || 'anonymous'}:${req.ip}`;
  },
  skip: (req) => config.isDevelopment
});

// Rate limiting pour l'analyse vision (plus restrictif)
export const visionAnalysisRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 analyses vision par minute (plus coûteuses)
  message: {
    success: false,
    error: 'Vision analysis rate limit exceeded',
    message: 'Limite d\'analyses d\'images atteinte. Attendez 1 minute.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const user = (req as any).user;
    return `vision:${user?.id || 'anonymous'}:${req.ip}`;
  },
  skip: (req) => {
    // Skip si ce n'est pas une analyse d'image
    const isImageAnalysis = req.body?.input_type === 'image' || req.body?.photo_data;
    return config.isDevelopment || !isImageAnalysis;
  }
});

// Rate limiting pour les créations de comptes
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5, // 5 créations de compte par heure par IP
  message: {
    success: false,
    error: 'Registration rate limit exceeded',
    message: 'Trop de créations de compte. Attendez 1 heure.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `register:${req.ip}`,
});

// Rate limiting pour les tentatives de connexion
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives de connexion par 15 minutes
  message: {
    success: false,
    error: 'Login rate limit exceeded',
    message: 'Trop de tentatives de connexion. Attendez 15 minutes.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `login:${req.ip}`,
  skipSuccessfulRequests: true, // Ne compter que les échecs
});

// Middleware combiné pour les analyses IA
export const combinedAiRateLimit = [aiAnalysisRateLimit, visionAnalysisRateLimit];

// Rate limiting adaptatif basé sur la charge du serveur (optionnel)
export const adaptiveRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => {
    // Ajuster la limite selon la charge (simulé ici)
    const serverLoad = 0.5; // TODO: Obtenir la vraie charge du serveur
    const baseLimit = 100;
    
    if (serverLoad > 0.8) return Math.floor(baseLimit * 0.5); // Réduire de 50%
    if (serverLoad > 0.6) return Math.floor(baseLimit * 0.7); // Réduire de 30%
    return baseLimit;
  },
  message: {
    success: false,
    error: 'Server overloaded',
    message: 'Serveur surchargé, veuillez réessayer plus tard',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Utilitaire pour créer des rate limits personnalisés
export function createCustomRateLimit(
  windowMs: number,
  max: number,
  errorMessage: string,
  keyPrefix: string = 'custom'
) {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: 'Rate limit exceeded',
      message: errorMessage,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const user = (req as any).user;
      return `${keyPrefix}:${user?.id || 'anonymous'}:${req.ip}`;
    },
    skip: (req) => config.isDevelopment
  });
}