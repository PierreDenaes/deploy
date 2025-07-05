import { PrismaClient } from '@prisma/client';

// Global variable to store Prisma client instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create or reuse Prisma client instance
const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn']
    : ['error'],
  errorFormat: 'pretty',
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  transactionOptions: {
    maxWait: 5000, // 5 seconds max wait
    timeout: 10000, // 10 seconds timeout
  },
});

// In development, save to global to prevent hot reload issues
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Database connection health check with retry logic
export async function checkDatabaseConnection(retries = 3): Promise<boolean> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log(`Database connection successful on attempt ${attempt}`);
      return true;
    } catch (error) {
      lastError = error as Error;
      console.error(`Database connection attempt ${attempt} failed:`, error);
      
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('All database connection attempts failed:', lastError);
  return false;
}

// Connection with timeout wrapper
export async function withConnectionTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 15000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Database operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    operation()
      .then(result => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Error during database disconnection:', error);
  }
}

// Database transaction helper
export async function withTransaction<T>(
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    return await fn(tx as PrismaClient);
  });
}

// Daily summary update function (matches SQL function)
export async function updateDailySummary(
  userId: string, 
  date: Date
): Promise<void> {
  try {
    // Get user's current goals
    const userProfile = await prisma.user_profiles.findUnique({
      where: { user_id: userId },
      select: {
        daily_protein_goal: true,
        daily_calorie_goal: true
      }
    });

    const proteinGoal = userProfile?.daily_protein_goal || 120;
    const calorieGoal = userProfile?.daily_calorie_goal || 2000;

    // Calculate daily totals from meal entries
    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const meals = await prisma.meal_entries.findMany({
      where: {
        user_id: userId,
        meal_timestamp: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    });

    // Calculate aggregations
    const totalProtein = meals.reduce((sum, meal) => sum + Number(meal.protein_grams), 0);
    const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalCarbs = meals.reduce((sum, meal) => sum + Number(meal.carbs_grams || 0), 0);
    const totalFat = meals.reduce((sum, meal) => sum + Number(meal.fat_grams || 0), 0);
    const totalFiber = meals.reduce((sum, meal) => sum + Number(meal.fiber_grams || 0), 0);

    const morningMeals = meals.filter(m => m.meal_time_category === 'morning').length;
    const afternoonMeals = meals.filter(m => m.meal_time_category === 'afternoon').length;
    const eveningMeals = meals.filter(m => m.meal_time_category === 'evening').length;
    const nightMeals = meals.filter(m => m.meal_time_category === 'night').length;
    const aiAssistedMeals = meals.filter(m => m.ai_estimated).length;

    const proteinGoalMet = totalProtein >= proteinGoal;
    const calorieGoalMet = calorieGoal > 0 ? totalCalories >= calorieGoal : true;
    const proteinGoalPercentage = proteinGoal > 0 ? (totalProtein / proteinGoal) * 100 : 0;
    const calorieGoalPercentage = calorieGoal > 0 ? (totalCalories / calorieGoal) * 100 : 0;

    // Upsert daily summary
    await prisma.daily_summaries.upsert({
      where: {
        user_id_summary_date: {
          user_id: userId,
          summary_date: date
        }
      },
      update: {
        total_protein: totalProtein,
        total_calories: totalCalories,
        total_carbs: totalCarbs,
        total_fat: totalFat,
        total_fiber: totalFiber,
        total_meals: meals.length,
        morning_meals: morningMeals,
        afternoon_meals: afternoonMeals,
        evening_meals: eveningMeals,
        night_meals: nightMeals,
        protein_goal: proteinGoal,
        calorie_goal: calorieGoal,
        protein_goal_met: proteinGoalMet,
        calorie_goal_met: calorieGoalMet,
        protein_goal_percentage: Math.round(proteinGoalPercentage),
        calorie_goal_percentage: Math.round(calorieGoalPercentage),
        ai_assisted_meals: aiAssistedMeals,
        updated_at: new Date()
      },
      create: {
        user_id: userId,
        summary_date: date,
        total_protein: totalProtein,
        total_calories: totalCalories,
        total_carbs: totalCarbs,
        total_fat: totalFat,
        total_fiber: totalFiber,
        total_meals: meals.length,
        morning_meals: morningMeals,
        afternoon_meals: afternoonMeals,
        evening_meals: eveningMeals,
        night_meals: nightMeals,
        protein_goal: proteinGoal,
        calorie_goal: calorieGoal,
        protein_goal_met: proteinGoalMet,
        calorie_goal_met: calorieGoalMet,
        protein_goal_percentage: Math.round(proteinGoalPercentage),
        calorie_goal_percentage: Math.round(calorieGoalPercentage),
        ai_assisted_meals: aiAssistedMeals
      }
    });
  } catch (error) {
    console.error('Error updating daily summary:', error);
    throw error;
  }
}

// Activity logging helper
export async function logActivity(
  userId: string | null,
  actionType: string,
  tableName?: string,
  recordId?: string,
  oldValues?: Record<string, any> | null,
  newValues?: Record<string, any> | null,
  context?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  try {
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action_type: actionType,
        table_name: tableName,
        record_id: recordId,
        old_values: oldValues || undefined,
        new_values: newValues || undefined,
        ip_address: context?.ipAddress,
        user_agent: context?.userAgent
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging shouldn't break the main operation
  }
}

export default prisma;