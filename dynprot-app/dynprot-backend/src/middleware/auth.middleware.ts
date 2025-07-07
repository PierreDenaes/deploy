import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AuthUser, RequestContext, ApiResponse } from '../types/api.types';

// JWT payload interface
interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Check for JWT secrets and warn if using defaults
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  const isProduction = process.env.NODE_ENV === 'production';
  const missingVars = [];
  
  if (!process.env.JWT_SECRET) missingVars.push('JWT_SECRET');
  if (!process.env.JWT_REFRESH_SECRET) missingVars.push('JWT_REFRESH_SECRET');
  
  const message = `⚠️  Missing JWT environment variables: ${missingVars.join(', ')}`;
  
  if (isProduction) {
    console.error(`🚨 ${message} - Using default values is not secure in production!`);
    // In production, still allow the app to start but log the security issue
  } else {
    console.warn(`🔧 ${message} - Using default values for development`);
  }
}

// Generate access token
export function generateAccessToken(userId: string, email: string): string {
  const payload = { userId, email };
  const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, JWT_SECRET, options);
}

// Generate refresh token
export function generateRefreshToken(userId: string, email: string): string {
  const payload = { userId, email };
  const options: jwt.SignOptions = { expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, JWT_REFRESH_SECRET, options);
}

// Verify access token
export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Refresh token verification failed');
    }
  }
}

// Get token expiration time in seconds
export function getTokenExpirationTime(): number {
  const expiresIn = JWT_EXPIRES_IN;
  if (expiresIn.endsWith('m')) {
    return parseInt(expiresIn) * 60;
  } else if (expiresIn.endsWith('h')) {
    return parseInt(expiresIn) * 3600;
  } else if (expiresIn.endsWith('d')) {
    return parseInt(expiresIn) * 86400;
  } else {
    return parseInt(expiresIn);
  }
}

// Extract token from Authorization header
function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1] || null;
}

// Authentication middleware
export async function authenticateToken(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Authorization header with Bearer token is required'
      } as ApiResponse);
      return;
    }

    // Verify token
    const payload = verifyAccessToken(token);
    
    // Get user from database with profile
    const user = await prisma.user.findUnique({
      where: { 
        id: payload.userId,
        is_active: true 
      },
      include: {
        user_profiles: true
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive',
        message: 'The user associated with this token no longer exists or is inactive'
      } as ApiResponse);
      return;
    }

    // Create auth user object (exclude password)
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar_url: user.avatar_url,
      email_verified: user.email_verified,
      has_completed_onboarding: user.has_completed_onboarding,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at,
      last_analytics_viewed: user.last_analytics_viewed,
      profile: user.user_profiles || undefined
    };

    // Create request context
    const context: RequestContext = {
      userId: user.id,
      user: authUser,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    // Attach to request object
    (req as any).user = authUser;
    (req as any).context = context;

    // Update last login time (async, don't wait)
    prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() }
    }).catch(error => {
      console.error('Failed to update last login time:', error);
    });

    next();
  } catch (error) {
    let message = 'Authentication failed';
    let statusCode = 401;

    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        message = 'Access token has expired';
      } else if (error.message === 'Invalid token') {
        message = 'Invalid access token';
      } else {
        message = error.message;
      }
    }

    res.status(statusCode).json({
      success: false,
      error: 'Authentication failed',
      message
    } as ApiResponse);
  }
}

// Optional authentication middleware (doesn't fail if no token)
export async function optionalAuth(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      next();
      return;
    }

    // Try to authenticate
    await authenticateToken(req, res, next);
  } catch (error) {
    // If authentication fails, continue without user context
    next();
  }
}

// Check if user has completed onboarding
export function requireOnboarding(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  const user = (req as any).user as AuthUser;
  
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    } as ApiResponse);
    return;
  }

  if (!user.has_completed_onboarding) {
    res.status(403).json({
      success: false,
      error: 'Onboarding required',
      message: 'Please complete your profile setup before accessing this resource'
    } as ApiResponse);
    return;
  }

  next();
}

// Check if email is verified
export function requireEmailVerification(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  const user = (req as any).user as AuthUser;
  
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    } as ApiResponse);
    return;
  }

  if (!user.email_verified) {
    res.status(403).json({
      success: false,
      error: 'Email verification required',
      message: 'Please verify your email address before accessing this resource'
    } as ApiResponse);
    return;
  }

  next();
}

// Rate limiting by user ID
const userRateLimits = new Map<string, { count: number; resetTime: number }>();

export function createUserRateLimit(maxRequests: number = 100, windowMs: number = 900000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as AuthUser;
    
    if (!user) {
      next();
      return;
    }

    const now = Date.now();
    const userLimit = userRateLimits.get(user.id);
    
    if (!userLimit || now > userLimit.resetTime) {
      // Reset or create new limit
      userRateLimits.set(user.id, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userLimit.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`
      } as ApiResponse);
      return;
    }

    userLimit.count++;
    next();
  };
}

// Cleanup expired rate limits (should be called periodically)
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [userId, limit] of userRateLimits.entries()) {
    if (now > limit.resetTime) {
      userRateLimits.delete(userId);
    }
  }
}

// Setup cleanup interval (call this in your app startup)
export function setupRateLimitCleanup(): void {
  setInterval(cleanupRateLimits, 300000); // Clean up every 5 minutes
}