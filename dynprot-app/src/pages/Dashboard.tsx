import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Utensils, ChevronRight, BarChart3, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppContext } from '../context/AppContext';
import FavoritesMealsList from '@/components/FavoritesMealsList';
import TestErrorComponent from '@/components/TestErrorComponent';
import ContextualGoalCard from '@/components/ContextualGoalCard';
import SmartCTA from '@/components/SmartCTA';
import EnhancedStreakTracker from '@/components/EnhancedStreakTracker';
import { cn } from '@/lib/utils';
import { safeSum, safeNumber } from '../utils/numberUtils';
import { getEnhancedMotivationalMessage, getStreakMotivation } from '../utils/motivationalMessages';
import { getGreeting, getCtaText, getProgressMotivation, TimeContext } from '../utils/temporalLogic';
import { getIcon } from '../utils/iconMapper';
import { toast } from 'sonner';

const Dashboard = () => {
  const navigate = useNavigate();
  const { state, userSettings } = useAppContext();
  const [lastMealCount, setLastMealCount] = useState(state.meals.length);

  const dailyProteinGoal = userSettings?.proteinGoal || state.user.dailyProteinGoal;
  
  // Track meal count changes to detect when a new meal is added
  useEffect(() => {
    if (state.meals.length !== lastMealCount) {
      setLastMealCount(state.meals.length);
    }
  }, [state.meals.length, lastMealCount]);

  // Temporal context for smart UI
  const currentHour = new Date().getHours();
  const isWeekend = [0, 6].includes(new Date().getDay());

  const { proteinToday, caloriesToday, progressPercentage, todaysMeals, streakData } = useMemo(() => {
    const todayStr = new Date().toDateString();
    const today = new Date();
    let protein = 0;
    let calories = 0;
    const meals = state.meals
      .filter(meal => new Date(meal.timestamp).toDateString() === todayStr)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    meals.forEach(meal => {
      protein += safeNumber(meal.protein, 0);
      if (meal.calories) {
        calories += safeNumber(meal.calories, 0);
      }
    });

    const percentage = dailyProteinGoal > 0 ? Math.min(100, (protein / dailyProteinGoal) * 100) : 0;

    // Calculate streak data (mock for now - should come from backend)
    const currentStreak = 3; // This should be calculated from actual data
    const bestStreak = 7;
    const goalsMetThisWeek = 4;
    const totalDaysTracked = 15;

    return {
      proteinToday: protein,
      caloriesToday: calories,
      progressPercentage: percentage,
      todaysMeals: meals.slice(0, 3),
      streakData: {
        currentStreak,
        bestStreak,
        goalsMetThisWeek,
        totalDaysTracked
      }
    };
  }, [state.meals, dailyProteinGoal, lastMealCount]);

  // Temporal context and smart messaging
  const timeContext: TimeContext = {
    currentHour,
    progressPercentage,
    mealsCount: todaysMeals.length,
    isWeekend
  };

  const contextualGreeting = getGreeting(timeContext);
  const smartCtaText = getCtaText(timeContext);
  const progressMotivation = getProgressMotivation(progressPercentage);
  
  const motivationalMessage = getEnhancedMotivationalMessage({
    progressPercentage,
    currentHour,
    mealsCount: todaysMeals.length,
    isWeekend,
    currentStreak: streakData.currentStreak
  });

  const streakMessage = getStreakMotivation(streakData.currentStreak);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 100 } },
  };

  const handleQuickAdd = (mealType: string) => {
    // Navigate to add meal with pre-selected type
    navigate(`/add-meal?type=${mealType}`);
  };


  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-lg mx-auto p-4 pb-32">
        <motion.div
          className="dashboard-gap-xl flex flex-col"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ZONE 1: Accueil personnalisé (nom + contexte temporel) */}
          <motion.header variants={itemVariants} className="pt-6 text-center">
            <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2">
              {contextualGreeting}
            </h1>
            <p className="text-secondary text-lg font-medium">
              {state.user.name} • {format(new Date(), "eeee d MMMM", { locale: fr })}
            </p>
          </motion.header>

          {/* ZONE 2: Carte objectif avec CTA intégré */}
          <motion.div variants={itemVariants} className="dashboard-spacing-md">
            <Card className="overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 text-white border-0 shadow-2xl">
              <CardContent className="p-8">
                {/* Objectif Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Utensils className="h-6 w-6 text-white" strokeWidth={2.5} />
                      </div>
                      <h2 className="text-2xl font-bold">Objectif Protéines</h2>
                    </div>
                    <p className="text-white/80 text-lg font-medium">
                      Aujourd'hui • {dailyProteinGoal}g
                    </p>
                  </div>
                  
                  {progressPercentage >= 75 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                      className="text-right"
                    >
                      <div className="text-3xl mb-1">{progressPercentage >= 100 ? '🎉' : '🔥'}</div>
                      <p className="text-white/90 font-semibold">
                        {progressPercentage >= 100 ? 'Objectif atteint !' : 'Presque là !'}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Main Progress Display */}
                <div className="mb-6">
                  <div className="flex items-end justify-between mb-4">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    >
                      <span className="text-7xl font-black tracking-tight">{proteinToday}g</span>
                      <span className="text-white/70 text-3xl ml-3 font-medium">/ {dailyProteinGoal}g</span>
                    </motion.div>
                    <div className="text-right">
                      <p className="text-white/80 text-lg">{caloriesToday} kcal</p>
                      <p className="text-white/70 text-base">{todaysMeals.length} repas</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-white rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, progressPercentage)}%` }}
                        transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-right text-lg mt-2 font-bold">
                      {Math.round(progressPercentage)}%
                    </p>
                  </div>
                </div>

                {/* CTA UNIQUE SIMPLIFIÉ */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button
                    onClick={() => {
                      if (typeof window !== 'undefined' && (window as any).gtag) {
                        (window as any).gtag('event', 'primary_cta_clicked', {
                          event_category: 'Dashboard',
                          progress_percentage: progressPercentage,
                          time_of_day: currentHour
                        });
                      }
                      navigate('/add-meal');
                    }}
                    size="lg"
                    className="w-full h-16 text-xl font-bold rounded-2xl bg-white text-primary hover:bg-white/90 shadow-lg"
                  >
                    <Plus className="h-6 w-6 mr-3" />
                    {smartCtaText}
                  </Button>
                </motion.div>

                {/* Encouragement contextuel sous le CTA */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-center mt-3 text-white/80 text-sm"
                >
                  {progressPercentage < 25 ? "💪 Chaque repas compte !" : 
                   progressPercentage < 75 ? "🚀 Vous y êtes presque !" : 
                   "🎯 Plus que quelques grammes !"}
                </motion.p>
              </CardContent>
            </Card>
          </motion.div>

          {/* ZONE 3: Favoris actifs (cliquables !) */}
          <motion.div variants={itemVariants} className="dashboard-spacing-md">
            <FavoritesMealsList 
              maxItems={3} 
              onAddMeal={() => {
                // Toast personnalisé selon la progression
                const remainingProtein = dailyProteinGoal - proteinToday;
                if (remainingProtein <= 0) {
                  toast.success('Bonus ajouté ! Votre série continue ! 🔥');
                } else if (remainingProtein <= 20) {
                  toast.success('Excellent ! Plus que quelques grammes pour valider votre série ! 🎯');
                } else {
                  toast.success('Repas ajouté ! Chaque favori vous rapproche de votre série ! ⭐');
                }
              }}
              showQuickAdd={true}
              displayOnly={false}
              progressContext={{
                currentProtein: proteinToday,
                goalProtein: dailyProteinGoal,
                progressPercentage,
                streakActive: streakData.currentStreak > 0
              }}
            />
          </motion.div>

          {/* ZONE 4: Streak gamifié */}
          {(streakData.currentStreak > 0 || streakData.goalsMetThisWeek > 0) && (
            <motion.div variants={itemVariants} className="dashboard-spacing-md">
              <EnhancedStreakTracker
                currentStreak={streakData.currentStreak}
                bestStreak={streakData.bestStreak}
                goalsMetThisWeek={streakData.goalsMetThisWeek}
                totalDaysTracked={streakData.totalDaysTracked}
              />
            </motion.div>
          )}

          {/* Development Tools - Hidden from zone count */}
          {process.env.NODE_ENV === 'development' && (
            <motion.div variants={itemVariants} className="mt-8 opacity-50">
              <TestErrorComponent />
            </motion.div>
          )}

        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;