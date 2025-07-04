import { Request, Response } from 'express';
import prisma, { logActivity } from '../lib/prisma';
import {
  CreateFavoriteMealSchema,
  UpdateFavoriteMealSchema,
  ApiResponse,
  AuthUser,
  CreateFavoriteMeal,
  UpdateFavoriteMeal,
  FavoriteMealWithStats
} from '../types/api.types';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getClientContext(req: Request) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']
  };
}

// =====================================================
// FAVORITE MEALS CONTROLLERS
// =====================================================

export async function createFavoriteMeal(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Validate request body
    const validation = CreateFavoriteMealSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid favorite meal data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const favoriteData: CreateFavoriteMeal = validation.data;

    // Check if user already has a favorite with this name
    const existingFavorite = await prisma.favorite_meals.findFirst({
      where: {
        user_id: user.id,
        name: {
          equals: favoriteData.name,
          mode: 'insensitive'
        }
      }
    });

    if (existingFavorite) {
      res.status(409).json({
        success: false,
        error: 'Favorite meal already exists',
        message: 'You already have a favorite meal with this name'
      } as ApiResponse);
      return;
    }

    // Create favorite meal
    const favoriteMeal = await prisma.favorite_meals.create({
      data: {
        user_id: user.id,
        name: favoriteData.name,
        description: favoriteData.description,
        protein_grams: favoriteData.protein_grams,
        calories: favoriteData.calories,
        carbs_grams: favoriteData.carbs_grams,
        fat_grams: favoriteData.fat_grams,
        tags: favoriteData.tags || [],
        photo_url: favoriteData.photo_url,
        use_count: 0
      }
    });

    // Log activity
    await logActivity(
      user.id,
      'FAVORITE_MEAL_CREATED',
      'favorite_meals',
      favoriteMeal.id,
      null,
      { 
        name: favoriteMeal.name,
        protein_grams: favoriteMeal.protein_grams
      },
      getClientContext(req)
    );

    res.status(201).json({
      success: true,
      data: { favoriteMeal },
      message: 'Favorite meal created successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Create favorite meal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create favorite meal',
      message: 'An error occurred while creating the favorite meal'
    } as ApiResponse);
  }
}

export async function getFavoriteMeals(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { search, sortBy = 'name', order = 'asc', limit = 50 } = req.query;

    console.log(`📋 Get favorite meals for user ${user.id}:`, {
      search,
      sortBy,
      order,
      limit,
      clientContext: getClientContext(req)
    });

    // Build where clause
    const whereClause: any = {
      user_id: user.id
    };

    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          tags: {
            has: search as string
          }
        }
      ];
    }

    // Build order by clause
    let orderBy: any = { name: 'asc' };
    
    switch (sortBy) {
      case 'name':
        orderBy = { name: order === 'desc' ? 'desc' : 'asc' };
        break;
      case 'protein':
        orderBy = { protein_grams: order === 'desc' ? 'desc' : 'asc' };
        break;
      case 'calories':
        orderBy = { calories: order === 'desc' ? 'desc' : 'asc' };
        break;
      case 'usage':
        orderBy = { use_count: order === 'desc' ? 'desc' : 'asc' };
        break;
      case 'recent':
        orderBy = { last_used_at: order === 'desc' ? 'desc' : 'asc' };
        break;
      case 'created':
        orderBy = { created_at: order === 'desc' ? 'desc' : 'asc' };
        break;
    }

    const favoriteMeals = await prisma.favorite_meals.findMany({
      where: whereClause,
      orderBy,
      take: Math.min(Number(limit), 100) // Limit to 100 maximum
    });

    console.log(`✅ Found ${favoriteMeals.length} favorite meals for user ${user.id}`);

    // Add popularity rankings and recent usage stats
    const enhancedFavorites: FavoriteMealWithStats[] = favoriteMeals.map((meal, index) => ({
      ...meal,
      popularity_rank: index + 1,
      recent_usage: meal.last_used_at ? Math.floor((Date.now() - meal.last_used_at.getTime()) / (1000 * 60 * 60 * 24)) : undefined
    }));

    res.status(200).json({
      success: true,
      data: { favoriteMeals: enhancedFavorites },
      message: 'Favorite meals retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get favorite meals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve favorite meals',
      message: 'An error occurred while retrieving favorite meals'
    } as ApiResponse);
  }
}

export async function getFavoriteMeal(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Favorite meal ID is required'
      } as ApiResponse);
      return;
    }

    const favoriteMeal = await prisma.favorite_meals.findFirst({
      where: {
        id,
        user_id: user.id
      }
    });

    if (!favoriteMeal) {
      res.status(404).json({
        success: false,
        error: 'Favorite meal not found',
        message: 'The requested favorite meal does not exist or does not belong to you'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: { favoriteMeal },
      message: 'Favorite meal retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get favorite meal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve favorite meal',
      message: 'An error occurred while retrieving the favorite meal'
    } as ApiResponse);
  }
}

export async function updateFavoriteMeal(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Favorite meal ID is required'
      } as ApiResponse);
      return;
    }

    // Validate request body
    const validation = UpdateFavoriteMealSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid favorite meal update data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const updateData: UpdateFavoriteMeal = validation.data;

    // Get existing favorite for logging
    const existingFavorite = await prisma.favorite_meals.findFirst({
      where: {
        id,
        user_id: user.id
      }
    });

    if (!existingFavorite) {
      res.status(404).json({
        success: false,
        error: 'Favorite meal not found',
        message: 'The requested favorite meal does not exist or does not belong to you'
      } as ApiResponse);
      return;
    }

    // Check for name conflicts if name is being updated
    if (updateData.name && updateData.name !== existingFavorite.name) {
      const nameConflict = await prisma.favorite_meals.findFirst({
        where: {
          user_id: user.id,
          name: {
            equals: updateData.name,
            mode: 'insensitive'
          },
          id: {
            not: id
          }
        }
      });

      if (nameConflict) {
        res.status(409).json({
          success: false,
          error: 'Name already exists',
          message: 'You already have a favorite meal with this name'
        } as ApiResponse);
        return;
      }
    }

    // Update favorite meal
    const updatedFavorite = await prisma.favorite_meals.update({
      where: { id },
      data: updateData
    });

    // Log activity
    await logActivity(
      user.id,
      'FAVORITE_MEAL_UPDATED',
      'favorite_meals',
      updatedFavorite.id,
      existingFavorite,
      updatedFavorite,
      getClientContext(req)
    );

    res.status(200).json({
      success: true,
      data: { favoriteMeal: updatedFavorite },
      message: 'Favorite meal updated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Update favorite meal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update favorite meal',
      message: 'An error occurred while updating the favorite meal'
    } as ApiResponse);
  }
}

export async function deleteFavoriteMeal(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Favorite meal ID is required'
      } as ApiResponse);
      return;
    }

    // Get existing favorite for logging
    const existingFavorite = await prisma.favorite_meals.findFirst({
      where: {
        id,
        user_id: user.id
      }
    });

    if (!existingFavorite) {
      res.status(404).json({
        success: false,
        error: 'Favorite meal not found',
        message: 'The requested favorite meal does not exist or does not belong to you'
      } as ApiResponse);
      return;
    }

    // Delete favorite meal
    await prisma.favorite_meals.delete({
      where: { id }
    });

    // Log activity
    await logActivity(
      user.id,
      'FAVORITE_MEAL_DELETED',
      'favorite_meals',
      id,
      existingFavorite,
      null,
      getClientContext(req)
    );

    res.status(200).json({
      success: true,
      message: 'Favorite meal deleted successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Delete favorite meal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete favorite meal',
      message: 'An error occurred while deleting the favorite meal'
    } as ApiResponse);
  }
}

export async function useFavoriteMeal(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Favorite meal ID is required'
      } as ApiResponse);
      return;
    }

    // Get favorite meal
    const favoriteMeal = await prisma.favorite_meals.findFirst({
      where: {
        id,
        user_id: user.id
      }
    });

    if (!favoriteMeal) {
      res.status(404).json({
        success: false,
        error: 'Favorite meal not found',
        message: 'The requested favorite meal does not exist or does not belong to you'
      } as ApiResponse);
      return;
    }

    // Update usage statistics
    const updatedFavorite = await prisma.favorite_meals.update({
      where: { id },
      data: {
        use_count: {
          increment: 1
        },
        last_used_at: new Date()
      }
    });

    // Create meal entry template from favorite
    const mealTemplate = {
      description: favoriteMeal.description,
      protein_grams: Number(favoriteMeal.protein_grams),
      calories: favoriteMeal.calories,
      carbs_grams: favoriteMeal.carbs_grams ? Number(favoriteMeal.carbs_grams) : undefined,
      fat_grams: favoriteMeal.fat_grams ? Number(favoriteMeal.fat_grams) : undefined,
      source_type: 'favorite' as const,
      ai_estimated: false,
      tags: favoriteMeal.tags,
      photo_url: favoriteMeal.photo_url,
      meal_timestamp: new Date().toISOString()
    };

    // Log usage activity
    await logActivity(
      user.id,
      'FAVORITE_MEAL_USED',
      'favorite_meals',
      updatedFavorite.id,
      { use_count: favoriteMeal.use_count },
      { use_count: updatedFavorite.use_count },
      getClientContext(req)
    );

    res.status(200).json({
      success: true,
      data: { 
        favoriteMeal: updatedFavorite,
        mealTemplate 
      },
      message: 'Favorite meal usage recorded successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Use favorite meal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to use favorite meal',
      message: 'An error occurred while using the favorite meal'
    } as ApiResponse);
  }
}