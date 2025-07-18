import { Request, Response } from 'express';
import prisma, { logActivity } from '../lib/prisma';
import {
  UserProfileUpdateSchema,
  ApiResponse,
  AuthUser,
  UserProfileUpdate
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

// Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  const baseRate = (10 * weight) + (6.25 * height) - (5 * age);
  return gender === 'male' ? baseRate + 5 : baseRate - 161;
}

// Calculate TDEE (Total Daily Energy Expenditure)
function calculateTDEE(bmr: number, activityLevel: string): number {
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extremely_active: 1.9
  };
  
  return bmr * (activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.55);
}

// Calculate protein goal based on weight, activity level, and fitness goal
function calculateProteinGoal(weight: number, activityLevel: string, fitnessGoal?: string): number {
  let baseProtein = weight * 0.8; // Base 0.8g per kg
  
  // Adjust for activity level
  switch (activityLevel) {
    case 'light':
      baseProtein = weight * 1.0;
      break;
    case 'moderate':
      baseProtein = weight * 1.2;
      break;
    case 'very_active':
      baseProtein = weight * 1.6;
      break;
    case 'extremely_active':
      baseProtein = weight * 2.0;
      break;
  }
  
  // Adjust for fitness goal
  switch (fitnessGoal) {
    case 'gain_muscle':
    case 'bulk':
      baseProtein *= 1.2;
      break;
    case 'cut':
      baseProtein *= 1.4;
      break;
    case 'lose_weight':
      baseProtein *= 1.1;
      break;
  }
  
  return Math.round(baseProtein);
}

// Calculate recommended calorie goal
function calculateCalorieGoal(tdee: number, fitnessGoal?: string): number {
  switch (fitnessGoal) {
    case 'lose_weight':
      return Math.round(tdee * 0.8); // 20% deficit
    case 'gain_muscle':
      return Math.round(tdee * 1.1); // 10% surplus
    case 'bulk':
      return Math.round(tdee * 1.2); // 20% surplus
    case 'cut':
      return Math.round(tdee * 0.75); // 25% deficit
    case 'maintain':
    default:
      return Math.round(tdee);
  }
}

// =====================================================
// PROFILE CONTROLLERS
// =====================================================

export async function getUserProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    const profile = await prisma.user_profiles.findUnique({
      where: { user_id: user.id }
    });

    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Profile not found',
        message: 'User profile has not been created yet'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: { profile },
      message: 'Profile retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile',
      message: 'An error occurred while retrieving the user profile'
    } as ApiResponse);
  }
}

export async function updateUserProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Validate request body
    const validation = UserProfileUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid profile update data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const updateData: UserProfileUpdate = validation.data;

    // Get existing profile for logging
    const existingProfile = await prisma.user_profiles.findUnique({
      where: { user_id: user.id }
    });

    if (!existingProfile) {
      res.status(404).json({
        success: false,
        error: 'Profile not found',
        message: 'User profile does not exist'
      } as ApiResponse);
      return;
    }

    // Prepare update payload
    const updatePayload: any = { ...updateData };

    // If physical characteristics changed, recalculate goals
    if ((updateData.weight_kg || updateData.height_cm || updateData.age || 
         updateData.gender || updateData.activity_level || updateData.fitness_goal) &&
        existingProfile.weight_kg && existingProfile.height_cm && existingProfile.age) {
      
      const weight = updateData.weight_kg || Number(existingProfile.weight_kg);
      const height = updateData.height_cm || existingProfile.height_cm;
      const age = updateData.age || existingProfile.age;
      const gender = updateData.gender || existingProfile.gender || 'other';
      const activityLevel = updateData.activity_level || existingProfile.activity_level;
      const fitnessGoal = updateData.fitness_goal || existingProfile.fitness_goal || undefined;

      // Calculate new goals if not explicitly provided
      if (!updateData.daily_protein_goal) {
        updatePayload.daily_protein_goal = calculateProteinGoal(weight, activityLevel, fitnessGoal);
      }
      
      if (!updateData.daily_calorie_goal) {
        const bmr = calculateBMR(weight, height, age, gender);
        const tdee = calculateTDEE(bmr, activityLevel);
        updatePayload.daily_calorie_goal = calculateCalorieGoal(tdee, fitnessGoal);
      }
    }

    // Update profile
    const updatedProfile = await prisma.user_profiles.update({
      where: { user_id: user.id },
      data: updatePayload
    });

    // Mark onboarding as complete if key fields are provided
    if (updateData.weight_kg && updateData.height_cm && updateData.age && 
        updateData.daily_protein_goal && !user.has_completed_onboarding) {
      await prisma.user.update({
        where: { id: user.id },
        data: { has_completed_onboarding: true }
      });
    }

    // Log profile update activity
    await logActivity(
      user.id,
      'PROFILE_UPDATED',
      'user_profiles',
      updatedProfile.id,
      existingProfile,
      updatedProfile,
      getClientContext(req)
    );

    res.status(200).json({
      success: true,
      data: { profile: updatedProfile },
      message: 'Profile updated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: 'An error occurred while updating the user profile'
    } as ApiResponse);
  }
}

export async function calculateRecommendedGoals(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { weight_kg, height_cm, age, gender, activity_level, fitness_goal } = req.body;

    if (!weight_kg || !height_cm || !age || !gender || !activity_level) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'Weight, height, age, gender, and activity level are required'
      } as ApiResponse);
      return;
    }

    // Calculate BMR and TDEE
    const bmr = calculateBMR(weight_kg, height_cm, age, gender);
    const tdee = calculateTDEE(bmr, activity_level);
    
    // Calculate recommended goals
    const recommendedProtein = calculateProteinGoal(weight_kg, activity_level, fitness_goal);
    const recommendedCalories = calculateCalorieGoal(tdee, fitness_goal);

    // Calculate macro distribution (example ratios)
    const proteinCalories = recommendedProtein * 4; // 4 cal per gram
    const proteinPercentage = (proteinCalories / recommendedCalories) * 100;
    
    // Adjust carbs and fats based on fitness goal
    let carbPercentage = 45;
    let fatPercentage = 30;
    
    switch (fitness_goal) {
      case 'keto':
      case 'cut':
        carbPercentage = 20;
        fatPercentage = 55;
        break;
      case 'bulk':
      case 'gain_muscle':
        carbPercentage = 50;
        fatPercentage = 25;
        break;
    }
    
    // Ensure percentages add up to 100
    const remainingPercentage = 100 - proteinPercentage;
    const ratio = remainingPercentage / (carbPercentage + fatPercentage);
    carbPercentage *= ratio;
    fatPercentage *= ratio;

    const recommendedCarbs = Math.round((recommendedCalories * carbPercentage / 100) / 4);
    const recommendedFat = Math.round((recommendedCalories * fatPercentage / 100) / 9);

    const recommendations = {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      calories: recommendedCalories,
      protein: recommendedProtein,
      carbs: recommendedCarbs,
      fat: recommendedFat,
      macroDistribution: {
        protein: Math.round(proteinPercentage),
        carbs: Math.round(carbPercentage),
        fat: Math.round(fatPercentage)
      },
      explanation: {
        bmr: 'Basal Metabolic Rate - calories burned at rest',
        tdee: 'Total Daily Energy Expenditure - calories burned including activity',
        protein: `Based on ${activity_level} activity level and ${fitness_goal || 'maintenance'} goal`,
        calories: fitness_goal ? `Adjusted for ${fitness_goal} goal` : 'Maintenance calories'
      }
    };

    res.status(200).json({
      success: true,
      data: { recommendations },
      message: 'Goal recommendations calculated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Calculate recommended goals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate recommendations',
      message: 'An error occurred while calculating goal recommendations'
    } as ApiResponse);
  }
}

export async function getDietaryPreferences(req: Request, res: Response): Promise<void> {
  try {
    const preferences = await prisma.dietary_preferences_reference.findMany({
      orderBy: [
        { common: 'desc' },
        { name: 'asc' }
      ]
    });

    res.status(200).json({
      success: true,
      data: { preferences },
      message: 'Dietary preferences retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get dietary preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dietary preferences',
      message: 'An error occurred while retrieving dietary preferences'
    } as ApiResponse);
  }
}

export async function getProfileStats(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Get profile with recent activity stats
    const profile = await prisma.user_profiles.findUnique({
      where: { user_id: user.id }
    });

    if (!profile) {
      res.status(404).json({
        success: false,
        error: 'Profile not found'
      } as ApiResponse);
      return;
    }

    // Get recent activity stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalMeals, aiAssistedMeals, favoriteMealsCount, recentSummaries] = await Promise.all([
      prisma.meal_entries.count({
        where: {
          user_id: user.id,
          created_at: { gte: thirtyDaysAgo }
        }
      }),
      prisma.meal_entries.count({
        where: {
          user_id: user.id,
          ai_estimated: true,
          created_at: { gte: thirtyDaysAgo }
        }
      }),
      prisma.favorite_meals.count({
        where: { user_id: user.id }
      }),
      prisma.daily_summaries.findMany({
        where: {
          user_id: user.id,
          summary_date: { gte: thirtyDaysAgo }
        },
        orderBy: { summary_date: 'desc' },
        take: 7
      })
    ]);

    // Calculate goal achievement stats
    const goalsMetDays = recentSummaries.filter(s => s.protein_goal_met).length;
    const avgProteinPercentage = recentSummaries.length > 0 
      ? recentSummaries.reduce((sum, s) => sum + Number(s.protein_goal_percentage || 0), 0) / recentSummaries.length
      : 0;

    const stats = {
      profile,
      activityStats: {
        totalMealsLast30Days: totalMeals,
        aiAssistedMealsLast30Days: aiAssistedMeals,
        aiUsagePercentage: totalMeals > 0 ? Math.round((aiAssistedMeals / totalMeals) * 100) : 0,
        favoriteMealsCount,
        activeDaysLast7: recentSummaries.filter(s => Number(s.total_meals) > 0).length,
        goalsMetLast7Days: goalsMetDays,
        avgProteinGoalPercentage: Math.round(avgProteinPercentage)
      },
      recentProgress: recentSummaries.map(summary => ({
        date: summary.summary_date,
        protein: Number(summary.total_protein),
        calories: summary.total_calories,
        meals: summary.total_meals,
        proteinGoalMet: summary.protein_goal_met,
        proteinPercentage: Number(summary.protein_goal_percentage)
      }))
    };

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Profile stats retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get profile stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile stats',
      message: 'An error occurred while retrieving profile statistics'
    } as ApiResponse);
  }
}

export async function completeOnboarding(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Create a basic profile if none exists (for users who skip onboarding)
    let profile = await prisma.user_profiles.findUnique({
      where: { user_id: user.id }
    });

    if (!profile) {
      // Create basic profile with default values
      profile = await prisma.user_profiles.create({
        data: {
          user_id: user.id,
          weight_kg: 75, // Default weight
          height_cm: 175, // Default height
          age: 30, // Default age
          daily_protein_goal: 120, // Default protein goal
          activity_level: 'moderate', // Default activity level
          gender: 'other' // Default gender
        }
      });
    }

    // Mark onboarding as complete
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { has_completed_onboarding: true }
    });

    // Log onboarding completion
    await logActivity(
      user.id,
      'ONBOARDING_COMPLETED',
      'users',
      user.id,
      { has_completed_onboarding: false },
      { has_completed_onboarding: true },
      getClientContext(req)
    );

    res.status(200).json({
      success: true,
      data: { onboardingComplete: true },
      message: 'Onboarding completed successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding',
      message: 'An error occurred while completing onboarding'
    } as ApiResponse);
  }
}

// Reset today's data (meals only)
export async function resetTodayData(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Get start and end of today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    // Delete only today's meals
    const deletedMeals = await prisma.meal_entries.deleteMany({
      where: {
        user_id: user.id,
        meal_timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    
    // Log the action
    await logActivity(
      user.id,
      'TODAY_DATA_RESET',
      'meal_entries',
      undefined,
      undefined,
      { deletedCount: deletedMeals.count, date: startOfDay.toISOString() },
      getClientContext(req)
    );
    
    res.status(200).json({
      success: true,
      data: { deletedMeals: deletedMeals.count },
      message: `${deletedMeals.count} repas d'aujourd'hui supprimés avec succès`
    } as ApiResponse);
    
  } catch (error) {
    console.error('Reset today data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset today data',
      message: 'Erreur lors de la réinitialisation des données du jour'
    } as ApiResponse);
  }
}

// Update analytics viewed timestamp
export async function updateAnalyticsViewed(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Update user's last analytics viewed timestamp
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { last_analytics_viewed: new Date() }
    });
    
    res.status(200).json({
      success: true,
      data: { lastAnalyticsViewed: updatedUser.last_analytics_viewed },
      message: 'Analytics viewed timestamp updated'
    } as ApiResponse);
    
  } catch (error) {
    console.error('Update analytics viewed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update analytics viewed',
      message: 'Erreur lors de la mise à jour du timestamp'
    } as ApiResponse);
  }
}

// Selective data deletion with same options as export
export async function deleteSelectiveData(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    const { dateRange, includeData } = req.body;
    
    // Validate request body
    if (!dateRange || !includeData) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'Date range and data selection are required'
      } as ApiResponse);
      return;
    }
    
    const { start, end } = dateRange;
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid date range',
        message: 'Start and end dates must be valid'
      } as ApiResponse);
      return;
    }
    
    const deletionResults = {
      deletedMeals: 0,
      deletedFavorites: 0,
      deletedSummaries: 0,
      resetProfile: false
    };
    
    // Delete meals in date range
    if (includeData.meals) {
      const deletedMeals = await prisma.meal_entries.deleteMany({
        where: {
          user_id: user.id,
          meal_timestamp: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      deletionResults.deletedMeals = deletedMeals.count;
    }
    
    // Delete favorite meals (not date-filtered)
    if (includeData.favorites) {
      const deletedFavorites = await prisma.favorite_meals.deleteMany({
        where: {
          user_id: user.id
        }
      });
      deletionResults.deletedFavorites = deletedFavorites.count;
    }
    
    // Delete daily summaries in date range
    if (includeData.summary) {
      const deletedSummaries = await prisma.daily_summaries.deleteMany({
        where: {
          user_id: user.id,
          summary_date: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      deletionResults.deletedSummaries = deletedSummaries.count;
    }
    
    // Reset personal info to defaults (keep user account)
    if (includeData.personalInfo) {
      const existingProfile = await prisma.user_profiles.findUnique({
        where: { user_id: user.id }
      });
      
      if (existingProfile) {
        await prisma.user_profiles.update({
          where: { user_id: user.id },
          data: {
            weight_kg: 75,
            height_cm: 175,
            age: 30,
            gender: 'other',
            body_fat_percentage: null,
            daily_protein_goal: 120,
            daily_calorie_goal: 2000,
            activity_level: 'moderate',
            fitness_goal: 'maintain',
            training_days_per_week: 3,
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
        deletionResults.resetProfile = true;
      }
    }
    
    // Log the deletion activity
    await logActivity(
      user.id,
      'SELECTIVE_DATA_DELETION',
      'multiple_tables',
      undefined,
      undefined,
      {
        dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
        includeData,
        results: deletionResults
      },
      getClientContext(req)
    );
    
    // Build response message
    const messageItems = [];
    if (deletionResults.deletedMeals > 0) {
      messageItems.push(`${deletionResults.deletedMeals} repas`);
    }
    if (deletionResults.deletedFavorites > 0) {
      messageItems.push(`${deletionResults.deletedFavorites} repas favoris`);
    }
    if (deletionResults.deletedSummaries > 0) {
      messageItems.push(`${deletionResults.deletedSummaries} résumés`);
    }
    if (deletionResults.resetProfile) {
      messageItems.push('profil réinitialisé');
    }
    
    const message = messageItems.length > 0 
      ? `Suppression terminée: ${messageItems.join(', ')}`
      : 'Aucune donnée à supprimer dans la période sélectionnée';
    
    res.status(200).json({
      success: true,
      data: deletionResults,
      message
    } as ApiResponse);
    
  } catch (error) {
    console.error('Selective data deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete data',
      message: 'Erreur lors de la suppression des données'
    } as ApiResponse);
  }
}
