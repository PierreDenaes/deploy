import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Utensils, Clock, TrendingUp, Zap, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';

interface DailyDashboardProps {
  meals: any[];
  className?: string;
}

interface DailyStats {
  totalProtein: number;
  totalCalories: number;
  totalMeals: number;
  proteinGoal: number;
  calorieGoal: number;
  proteinProgress: number;
  calorieProgress: number;
  balanceScore: number;
  consistencyScore: number;
}

export function DailyDashboard({ meals, className }: DailyDashboardProps) {
  const { state } = useAppContext();
  
  const stats = useMemo((): DailyStats => {
    // Get today's meals only
    const today = new Date().toDateString();
    const todaysMeals = meals.filter(meal => 
      new Date(meal.timestamp).toDateString() === today
    );
    
    const totalProtein = Math.round(todaysMeals.reduce((sum, meal) => sum + meal.protein, 0));
    const totalCalories = Math.round(todaysMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0));
    const totalMeals = todaysMeals.length;
    
    // Get goals from user settings
    const proteinGoal = state.userSettings?.proteinGoal || state.user?.dailyProteinGoal || 120;
    const calorieGoal = state.userSettings?.calorieGoal || state.user?.calorieGoal || 2000;
    
    const proteinProgress = Math.min((totalProtein / proteinGoal) * 100, 100);
    const calorieProgress = Math.min((totalCalories / calorieGoal) * 100, 100);
    
    // Calculate balance score (how well distributed meals are)
    const balanceScore = totalMeals >= 3 ? 
      Math.min(85 + (totalMeals - 3) * 5, 100) : 
      totalMeals * 25;
    
    // Calculate consistency score (based on recent eating patterns)
    const consistencyScore = Math.min(75 + totalMeals * 5, 100);
    
    return {
      totalProtein,
      totalCalories,
      totalMeals,
      proteinGoal,
      calorieGoal,
      proteinProgress,
      calorieProgress,
      balanceScore,
      consistencyScore
    };
  }, [meals, state.userSettings, state.user]);
  
  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 70) return 'bg-yellow-500';
    if (progress >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };
  
  const getSuggestion = () => {
    const currentHour = new Date().getHours();
    
    if (stats.proteinProgress < 50 && currentHour > 14) {
      return `💡 Ajoutez ${Math.round(stats.proteinGoal - stats.totalProtein)}g de protéines aujourd'hui`;
    }
    if (stats.totalMeals === 0 && currentHour > 9) {
      return '🌅 Il est temps de prendre votre petit-déjeuner !';
    }
    if (stats.totalMeals === 1 && currentHour > 13) {
      return '☀️ Pensez à votre déjeuner pour maintenir votre énergie';
    }
    if (stats.proteinProgress > 90) {
      return '🎯 Excellent ! Vous avez atteint vos objectifs protéiques';
    }
    return '💪 Continuez sur cette lancée !';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="border-0 shadow-ios backdrop-blur-xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Objectifs du jour</h2>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm font-medium">
              {stats.totalMeals} repas
            </Badge>
          </div>

          {/* Progress Bars */}
          <div className="space-y-4 mb-6">
            {/* Calories Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Calories</span>
                <span className="text-sm text-muted-foreground">
                  {stats.totalCalories}/{stats.calorieGoal} kcal
                </span>
              </div>
              <Progress 
                value={stats.calorieProgress} 
                className="h-3 bg-muted/50"
              />
            </div>

            {/* Protein Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Protéines</span>
                <span className="text-sm text-muted-foreground">
                  {stats.totalProtein}/{stats.proteinGoal}g
                </span>
              </div>
              <Progress 
                value={stats.proteinProgress} 
                className="h-3 bg-muted/50"
              />
            </div>
          </div>

          {/* Score Indicators */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Équilibre</p>
                <p className="text-lg font-bold text-foreground">{stats.balanceScore}%</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                <Zap className="h-5 w-5 text-blue-600" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Régularité</p>
                <p className="text-lg font-bold text-foreground">{stats.consistencyScore}%</p>
              </div>
            </div>
          </div>

          {/* Contextual Suggestion */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-primary/5 border border-primary/10 rounded-2xl"
          >
            <p className="text-sm text-primary font-medium">
              {getSuggestion()}
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}