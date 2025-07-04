import { Request, Response } from 'express';
import prisma, { logActivity } from '../lib/prisma';
import {
  SummaryQuerySchema,
  CreateDataExportSchema,
  ApiResponse,
  AuthUser,
  SummaryQuery,
  CreateDataExport,
  NutritionSummary,
  WeeklyTrend,
  MonthlyStats,
  DailySummaryWithDetails
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

function getDateRanges(period: string, start: Date, end: Date) {
  const ranges: Array<{start: Date, end: Date, label: string}> = [];
  
  if (period === 'daily') {
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      ranges.push({
        start: new Date(d),
        end: new Date(d),
        label: d.toISOString().split('T')[0]!
      });
    }
  } else if (period === 'weekly') {
    let current = new Date(start);
    // Start from the beginning of the week (Sunday)
    current.setDate(current.getDate() - current.getDay());
    
    while (current <= end) {
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      ranges.push({
        start: new Date(current),
        end: weekEnd > end ? new Date(end) : weekEnd,
        label: `Week of ${current.toISOString().split('T')[0]}`
      });
      
      current.setDate(current.getDate() + 7);
    }
  } else if (period === 'monthly') {
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (current <= end) {
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      
      ranges.push({
        start: new Date(current),
        end: monthEnd > end ? new Date(end) : monthEnd,
        label: current.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      });
      
      current.setMonth(current.getMonth() + 1);
    }
  }
  
  return ranges;
}

function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  const difference = secondAvg - firstAvg;
  const threshold = firstAvg * 0.05; // 5% threshold
  
  if (difference > threshold) return 'increasing';
  if (difference < -threshold) return 'decreasing';
  return 'stable';
}

// =====================================================
// SUMMARY CONTROLLERS
// =====================================================

export async function getDailySummaries(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Validate query parameters
    const validation = SummaryQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const query: SummaryQuery = validation.data;
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);

    const summaries = await prisma.daily_summaries.findMany({
      where: {
        user_id: user.id,
        summary_date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        summary_date: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      data: { summaries },
      message: 'Daily summaries retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get daily summaries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve daily summaries',
      message: 'An error occurred while retrieving daily summaries'
    } as ApiResponse);
  }
}

export async function getNutritionSummary(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    const validation = SummaryQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters'
      } as ApiResponse);
      return;
    }

    const query: SummaryQuery = validation.data;
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);

    // Get meal entries for the period
    const meals = await prisma.meal_entries.findMany({
      where: {
        user_id: user.id,
        meal_timestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Get user's current goals
    const profile = await prisma.user_profiles.findUnique({
      where: { user_id: user.id }
    });

    const proteinGoal = profile?.daily_protein_goal || 120;
    const calorieGoal = profile?.daily_calorie_goal || 2000;

    // Calculate totals
    const totalProtein = meals.reduce((sum, meal) => sum + Number(meal.protein_grams), 0);
    const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalCarbs = meals.reduce((sum, meal) => sum + Number(meal.carbs_grams || 0), 0);
    const totalFat = meals.reduce((sum, meal) => sum + Number(meal.fat_grams || 0), 0);
    const totalFiber = meals.reduce((sum, meal) => sum + Number(meal.fiber_grams || 0), 0);
    const totalMeals = meals.length;

    // Calculate averages
    const avgProteinPerMeal = totalMeals > 0 ? totalProtein / totalMeals : 0;
    const avgCaloriesPerMeal = totalMeals > 0 ? totalCalories / totalMeals : 0;

    // Calculate goal progress (based on number of days)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const expectedProtein = proteinGoal * daysDiff;
    const expectedCalories = calorieGoal * daysDiff;
    
    const proteinGoalProgress = expectedProtein > 0 ? (totalProtein / expectedProtein) * 100 : 0;
    const calorieGoalProgress = expectedCalories > 0 ? (totalCalories / expectedCalories) * 100 : 0;

    // Calculate meal distribution by time
    const mealDistribution = {
      morning: meals.filter(m => m.meal_time_category === 'morning').length,
      afternoon: meals.filter(m => m.meal_time_category === 'afternoon').length,
      evening: meals.filter(m => m.meal_time_category === 'evening').length,
      night: meals.filter(m => m.meal_time_category === 'night').length
    };

    const summary: NutritionSummary = {
      totalProtein: Math.round(totalProtein),
      totalCalories: Math.round(totalCalories),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      totalFiber: Math.round(totalFiber),
      totalMeals,
      avgProteinPerMeal: Math.round(avgProteinPerMeal),
      avgCaloriesPerMeal: Math.round(avgCaloriesPerMeal),
      proteinGoalProgress: Math.round(proteinGoalProgress),
      calorieGoalProgress: Math.round(calorieGoalProgress),
      mealDistribution
    };

    res.status(200).json({
      success: true,
      data: { summary },
      message: 'Nutrition summary calculated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get nutrition summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate nutrition summary',
      message: 'An error occurred while calculating nutrition summary'
    } as ApiResponse);
  }
}

export async function getWeeklyTrends(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    const validation = SummaryQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters'
      } as ApiResponse);
      return;
    }

    const query: SummaryQuery = validation.data;
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);

    // Get daily summaries for the period
    const summaries = await prisma.daily_summaries.findMany({
      where: {
        user_id: user.id,
        summary_date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        summary_date: 'asc'
      }
    });

    // Group by week and calculate weekly totals
    const weeklyData = new Map<string, {
      dates: Date[],
      protein: number,
      calories: number,
      meals: number,
      goalsMetDays: number
    }>();

    summaries.forEach(summary => {
      const date = new Date(summary.summary_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0]!;

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, {
          dates: [],
          protein: 0,
          calories: 0,
          meals: 0,
          goalsMetDays: 0
        });
      }

      const weekData = weeklyData.get(weekKey)!;
      weekData.dates.push(date);
      weekData.protein += Number(summary.total_protein || 0);
      weekData.calories += summary.total_calories || 0;
      weekData.meals += summary.total_meals || 0;
      weekData.goalsMetDays += summary.protein_goal_met ? 1 : 0;
    });

    // Convert to trend format
    const trends: WeeklyTrend[] = Array.from(weeklyData.entries()).map(([weekKey, data]) => ({
      date: weekKey,
      protein: Math.round(data.protein),
      calories: Math.round(data.calories),
      meals: data.meals,
      goalMet: data.goalsMetDays >= Math.ceil(data.dates.length * 0.7) // 70% of days
    }));

    res.status(200).json({
      success: true,
      data: { trends },
      message: 'Weekly trends calculated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get weekly trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate weekly trends',
      message: 'An error occurred while calculating weekly trends'
    } as ApiResponse);
  }
}

export async function getMonthlyStats(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    const validation = SummaryQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid query parameters'
      } as ApiResponse);
      return;
    }

    const query: SummaryQuery = validation.data;
    const startDate = new Date(query.start_date);
    const endDate = new Date(query.end_date);

    // Get monthly ranges
    const monthRanges = getDateRanges('monthly', startDate, endDate);
    
    const monthlyStats: MonthlyStats[] = [];

    for (const range of monthRanges) {
      const summaries = await prisma.daily_summaries.findMany({
        where: {
          user_id: user.id,
          summary_date: {
            gte: range.start,
            lte: range.end
          }
        }
      });

      const totalProtein = summaries.reduce((sum, s) => sum + Number(s.total_protein || 0), 0);
      const totalCalories = summaries.reduce((sum, s) => sum + (s.total_calories || 0), 0);
      const totalMeals = summaries.reduce((sum, s) => sum + (s.total_meals || 0), 0);
      const activeDays = summaries.filter(s => (s.total_meals || 0) > 0).length;
      const goalsMetDays = summaries.filter(s => s.protein_goal_met).length;
      
      const avgProteinPerDay = activeDays > 0 ? totalProtein / activeDays : 0;
      
      // Calculate trend (compare first half vs second half of month)
      const midPoint = Math.floor(summaries.length / 2);
      const firstHalf = summaries.slice(0, midPoint);
      const secondHalf = summaries.slice(midPoint);
      
      const firstHalfAvg = firstHalf.length > 0 
        ? firstHalf.reduce((sum, s) => sum + Number(s.total_protein || 0), 0) / firstHalf.length
        : 0;
      const secondHalfAvg = secondHalf.length > 0 
        ? secondHalf.reduce((sum, s) => sum + Number(s.total_protein || 0), 0) / secondHalf.length
        : 0;
      
      const trend = calculateTrend([firstHalfAvg, secondHalfAvg]);

      monthlyStats.push({
        month: range.label,
        totalProtein: Math.round(totalProtein),
        totalCalories: Math.round(totalCalories),
        totalMeals,
        activeDays,
        avgProteinPerDay: Math.round(avgProteinPerDay),
        goalsMetDays,
        trend
      });
    }

    res.status(200).json({
      success: true,
      data: { monthlyStats },
      message: 'Monthly statistics calculated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get monthly stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate monthly statistics',
      message: 'An error occurred while calculating monthly statistics'
    } as ApiResponse);
  }
}

export async function getProgressInsights(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Get last 30 days of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const summaries = await prisma.daily_summaries.findMany({
      where: {
        user_id: user.id,
        summary_date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        summary_date: 'asc'
      }
    });

    if (summaries.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          insights: {
            achievements: ['Start tracking meals to see your progress!'],
            improvements: ['Begin logging your daily meals'],
            trends: []
          }
        },
        message: 'No data available for insights'
      } as ApiResponse);
      return;
    }

    const latest = summaries[summaries.length - 1];
    const achievements: string[] = [];
    const improvements: string[] = [];
    const trends: string[] = [];

    // Only analyze if we have data
    if (!latest) {
      res.status(200).json({
        success: true,
        data: {
          insights: {
            achievements: ['Start tracking meals to see achievements'],
            improvements: ['Begin by logging your first meal'],
            trends: []
          }
        },
        message: 'No recent data available for insights'
      } as ApiResponse);
      return;
    }

    // Achievements
    if (Number(latest.protein_goal_percentage) >= 100) {
      achievements.push(`Protein goal achieved at ${Math.round(Number(latest.protein_goal_percentage))}%`);
    }
    if (latest.calorie_goal_percentage && Number(latest.calorie_goal_percentage) >= 90 && Number(latest.calorie_goal_percentage) <= 110) {
      achievements.push('Calories well balanced');
    }
    
    const activeDays = summaries.filter(s => (s.total_meals || 0) > 0).length;
    if (activeDays / summaries.length >= 0.8) {
      achievements.push('Consistent tracking maintained');
    }

    // Improvements
    if (Number(latest.protein_goal_percentage) < 80) {
      improvements.push('Increase protein intake');
    }
    
    const avgMealsPerDay = summaries.length > 0 
      ? summaries.reduce((sum, s) => sum + (s.total_meals || 0), 0) / summaries.length 
      : 0;
    if (avgMealsPerDay < 2) {
      improvements.push('Increase meal frequency');
    }
    if (activeDays / summaries.length < 0.5) {
      improvements.push('Improve tracking consistency');
    }

    // Trends
    const proteinValues = summaries.map(s => Number(s.total_protein || 0));
    const proteinTrend = calculateTrend(proteinValues);
    
    if (proteinTrend === 'increasing') {
      trends.push('Positive trend for protein intake');
    } else if (proteinTrend === 'decreasing') {
      trends.push('Declining trend for protein intake');
    }

    if (summaries.length >= 14) {
      const recent7 = summaries.slice(-7);
      const previous7 = summaries.slice(-14, -7);
      
      const recentAvg = recent7.reduce((sum, s) => sum + Number(s.total_protein || 0), 0) / 7;
      const previousAvg = previous7.reduce((sum, s) => sum + Number(s.total_protein || 0), 0) / 7;
      const improvement = recentAvg - previousAvg;
      
      if (improvement > 5) {
        trends.push(`Improvement of +${Math.round(improvement)}g protein vs last week`);
      }
    }

    const insights = {
      achievements,
      improvements,
      trends
    };

    res.status(200).json({
      success: true,
      data: { insights },
      message: 'Progress insights generated successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get progress insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate insights',
      message: 'An error occurred while generating progress insights'
    } as ApiResponse);
  }
}

// =====================================================
// DATA EXPORT CONTROLLERS
// =====================================================

export async function createDataExport(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    // Validate request body
    const validation = CreateDataExportSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid export request data',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      } as ApiResponse);
      return;
    }

    const exportData: CreateDataExport = validation.data;
    
    // Convert dates
    const startDate = new Date(exportData.date_range_start);
    const endDate = new Date(exportData.date_range_end);

    // Count records to be exported
    let totalRecords = 0;
    
    if (exportData.include_meals) {
      const mealCount = await prisma.meal_entries.count({
        where: {
          user_id: user.id,
          meal_timestamp: {
            gte: startDate,
            lte: endDate
          }
        }
      });
      totalRecords += mealCount;
    }

    if (exportData.include_favorites) {
      const favoritesCount = await prisma.favorite_meals.count({
        where: { user_id: user.id }
      });
      totalRecords += favoritesCount;
    }

    // Create export record
    const exportRecord = await prisma.data_exports.create({
      data: {
        user_id: user.id,
        export_format: exportData.export_format,
        date_range_start: startDate,
        date_range_end: endDate,
        include_meals: exportData.include_meals,
        include_favorites: exportData.include_favorites,
        include_summary: exportData.include_summary,
        include_personal_info: exportData.include_personal_info,
        total_records: totalRecords,
        export_status: 'pending'
      }
    });

    // Log export request
    await logActivity(
      user.id,
      'DATA_EXPORT_REQUESTED',
      'data_exports',
      exportRecord.id,
      null,
      {
        format: exportData.export_format,
        date_range: `${startDate.toISOString()} - ${endDate.toISOString()}`,
        total_records: totalRecords
      },
      getClientContext(req)
    );

    // In a real implementation, you would:
    // 1. Queue the export job for background processing
    // 2. Generate the actual file (CSV/PDF)
    // 3. Upload to storage (S3, etc.)
    // 4. Update the export record with download URL and completion status
    
    // For now, we'll simulate immediate completion
    const updatedExport = await prisma.data_exports.update({
      where: { id: exportRecord.id },
      data: {
        export_status: 'completed',
        filename: `nutrition-export-${user.id}-${Date.now()}.${exportData.export_format}`,
        download_url: `/api/exports/${exportRecord.id}/download`,
        completed_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    res.status(201).json({
      success: true,
      data: { export: updatedExport },
      message: 'Data export created successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Create data export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create data export',
      message: 'An error occurred while creating the data export'
    } as ApiResponse);
  }
}

export async function getUserExports(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user as AuthUser;
    
    const exports = await prisma.data_exports.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: 20 // Limit to last 20 exports
    });

    res.status(200).json({
      success: true,
      data: { exports },
      message: 'User exports retrieved successfully'
    } as ApiResponse);
  } catch (error) {
    console.error('Get user exports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve exports',
      message: 'An error occurred while retrieving user exports'
    } as ApiResponse);
  }
}