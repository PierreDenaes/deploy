import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma, { logActivity } from '../lib/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpirationTime
} from '../middleware/auth.middleware';
import {
  LoginSchema,
  RegisterSchema,
  RefreshTokenSchema,
  ApiResponse,
  AuthTokens,
  AuthUser
} from '../types/api.types';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

function createAuthResponse(user: AuthUser, tokens: AuthTokens): ApiResponse<{ user: AuthUser; tokens: AuthTokens }> {
  return {
    success: true,
    data: { user, tokens },
    message: 'Authentication successful'
  };
}

function getClientContext(req: Request) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']
  };
}

// =====================================================
// AUTH CONTROLLERS
// =====================================================

export async function register(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validation = RegisterSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid registration data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const { email, username, password, firstName, lastName } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      res.status(409).json({
        success: false,
        error: 'User already exists',
        message: `A user with this ${field} already exists`
      } as ApiResponse);
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user and profile in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          email_verified: false,
          has_completed_onboarding: false,
          is_active: true
        }
      });

      // Create default user profile
      const userProfile = await tx.user_profiles.create({
        data: {
          user_id: newUser.id,
          daily_protein_goal: 120,
          daily_calorie_goal: 2000,
          activity_level: 'moderate',
          fitness_goal: 'maintain',
          preferred_units: 'metric',
          diet_preferences: [],
          dark_mode: false,
          notifications_enabled: true,
          share_data: false,
          allow_analytics: true,
          reduced_motion: false,
          high_contrast: false,
          large_text: false
        }
      });

      return { user: newUser, profile: userProfile };
    });

    // Generate tokens
    const accessToken = generateAccessToken(result.user.id, result.user.email);
    const refreshToken = generateRefreshToken(result.user.id, result.user.email);
    const expiresIn = getTokenExpirationTime();

    const tokens: AuthTokens = {
      accessToken,
      refreshToken,
      expiresIn
    };

    // Create auth user object (exclude password)
    const authUser: AuthUser = {
      id: result.user.id,
      email: result.user.email,
      username: result.user.username,
      first_name: result.user.first_name,
      last_name: result.user.last_name,
      avatar_url: result.user.avatar_url,
      email_verified: result.user.email_verified,
      has_completed_onboarding: result.user.has_completed_onboarding,
      is_active: result.user.is_active,
      created_at: result.user.created_at,
      updated_at: result.user.updated_at,
      last_login_at: result.user.last_login_at,
      profile: result.profile
    };

    // Log registration activity
    await logActivity(
      result.user.id,
      'USER_REGISTERED',
      'users',
      result.user.id,
      null,
      { email: result.user.email, username: result.user.username },
      getClientContext(req)
    );

    res.status(201).json(createAuthResponse(authUser, tokens));
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: 'An error occurred during registration'
    } as ApiResponse);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validation = LoginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid login credentials format'
      } as ApiResponse);
      return;
    }

    const { email, password } = validation.data;

    // Find user with profile
    const user = await prisma.user.findUnique({
      where: { 
        email: email.toLowerCase(),
        is_active: true
      },
      include: {
        user_profiles: true
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      } as ApiResponse);
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      // Log failed login attempt
      await logActivity(
        user.id,
        'LOGIN_FAILED',
        'users',
        user.id,
        null,
        { reason: 'invalid_password', email },
        getClientContext(req)
      );

      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      } as ApiResponse);
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, user.email);
    const expiresIn = getTokenExpirationTime();

    const tokens: AuthTokens = {
      accessToken,
      refreshToken,
      expiresIn
    };

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
      profile: user.user_profiles || undefined
    };

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() }
    });

    // Log successful login
    await logActivity(
      user.id,
      'LOGIN_SUCCESS',
      'users',
      user.id,
      null,
      { email: user.email },
      getClientContext(req)
    );

    res.status(200).json(createAuthResponse(authUser, tokens));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: 'An error occurred during login'
    } as ApiResponse);
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validation = RefreshTokenSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Refresh token is required'
      } as ApiResponse);
      return;
    }

    const { refreshToken: token } = validation.data;

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: error instanceof Error ? error.message : 'Refresh token verification failed'
      } as ApiResponse);
      return;
    }

    // Find user
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
        error: 'User not found',
        message: 'The user associated with this token no longer exists'
      } as ApiResponse);
      return;
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id, user.email);
    const newRefreshToken = generateRefreshToken(user.id, user.email);
    const expiresIn = getTokenExpirationTime();

    const tokens: AuthTokens = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn
    };

    // Log token refresh
    await logActivity(
      user.id,
      'TOKEN_REFRESHED',
      'users',
      user.id,
      null,
      null,
      getClientContext(req)
    );

    res.status(200).json({
      success: true,
      data: { tokens },
      message: 'Token refreshed successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: 'An error occurred during token refresh'
    } as ApiResponse);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    if (user) {
      // Log logout activity
      await logActivity(
        user.id,
        'LOGOUT',
        'users',
        user.id,
        null,
        null,
        getClientContext(req)
      );
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: 'An error occurred during logout'
    } as ApiResponse);
  }
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'User not found in request context'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: { user },
      message: 'User retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      message: 'An error occurred while retrieving user information'
    } as ApiResponse);
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Current password and new password are required'
      } as ApiResponse);
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'New password must be at least 8 characters long'
      } as ApiResponse);
      return;
    }

    // Get user with password hash
    const userWithPassword = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!userWithPassword) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse);
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, userWithPassword.password_hash);
    if (!isCurrentPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid current password',
        message: 'The current password is incorrect'
      } as ApiResponse);
      return;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: newPasswordHash }
    });

    // Log password change
    await logActivity(
      user.id,
      'PASSWORD_CHANGED',
      'users',
      user.id,
      null,
      null,
      getClientContext(req)
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Password change failed',
      message: 'An error occurred while changing password'
    } as ApiResponse);
  }
}

// =====================================================
// PASSWORD RESET
// =====================================================

export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Email is required'
      } as ApiResponse);
      return;
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // For security, do not reveal if the email exists
      res.status(200).json({ success: true, message: 'If this email exists, a reset link will be sent.' });
      return;
    }
    // TODO: Generate a reset token and send email
    res.status(200).json({ success: true, message: 'If this email exists, a reset link will be sent.' });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Request password reset failed',
      message: 'An error occurred while requesting password reset'
    } as ApiResponse);
  }
}

// =====================================================
// ACCOUNT DELETION
// =====================================================

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  try {
    const authUser = (req as any).user as AuthUser;
    const { password, confirmation } = req.body;

    if (!authUser) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'User not found in request context'
      } as ApiResponse);
      return;
    }

    const userId = authUser.id;

    // Validate required fields
    if (!password || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Password is required to confirm account deletion'
      } as ApiResponse);
      return;
    }

    if (confirmation !== 'SUPPRIMER') {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'You must type "SUPPRIMER" exactly to confirm account deletion'
      } as ApiResponse);
      return;
    }

    // Get the user and verify password
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true,
        email: true,
        password_hash: true,
        is_active: true
      }
    });

    if (!dbUser || !dbUser.is_active) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Account not found or already deleted'
      } as ApiResponse);
      return;
    }

    // Verify the password
    const isPasswordValid = await comparePassword(password, dbUser.password_hash);
    if (!isPasswordValid) {
      res.status(400).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid password'
      } as ApiResponse);
      return;
    }

    // Log the deletion activity before deleting
    await logActivity(
      userId,
      'ACCOUNT_DELETION',
      'users',                    // tableName
      userId,                     // recordId
      null,                       // oldValues
      null,                       // newValues
      getClientContext(req)       // context
    );

    // Perform account deletion - this will cascade delete all related data
    // due to the database constraints (meals, meal entries, summaries, exports, etc.)
    await prisma.user.delete({
      where: { id: userId }
    });

    console.log(`Account deleted successfully for user ${userId} (${dbUser.email})`);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    } as ApiResponse);

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Account deletion failed',
      message: 'An error occurred while deleting the account'
    } as ApiResponse);
  }
}