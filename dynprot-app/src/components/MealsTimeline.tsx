import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Utensils, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Heart, 
  Trash2,
  Sun,
  Sunrise,
  Sunset,
  Moon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MealEntry {
  id: string;
  description: string;
  protein: number;
  calories?: number;
  timestamp: string;
  tags?: string[];
}

interface MealsTimelineProps {
  meals: MealEntry[];
  onDeleteMeal: (id: string) => void;
  onAddToFavorites: (meal: MealEntry) => void;
  isMealInFavorites: (meal: MealEntry) => boolean;
  className?: string;
}

interface GroupedMeal extends MealEntry {
  hour: number;
  timeLabel: string;
  mealPeriod: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export function MealsTimeline({ 
  meals, 
  onDeleteMeal, 
  onAddToFavorites, 
  isMealInFavorites, 
  className 
}: MealsTimelineProps) {
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  
  const toggleMealExpansion = (mealId: string) => {
    const newExpanded = new Set(expandedMeals);
    if (newExpanded.has(mealId)) {
      newExpanded.delete(mealId);
    } else {
      newExpanded.add(mealId);
    }
    setExpandedMeals(newExpanded);
  };
  
  const getMealPeriod = (hour: number): GroupedMeal['mealPeriod'] => {
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 22) return 'dinner';
    return 'snack';
  };
  
  const getPeriodIcon = (period: GroupedMeal['mealPeriod']) => {
    switch (period) {
      case 'breakfast': return Sunrise;
      case 'lunch': return Sun;
      case 'dinner': return Sunset;
      case 'snack': return Moon;
    }
  };
  
  const getPeriodColor = (period: GroupedMeal['mealPeriod']) => {
    switch (period) {
      case 'breakfast': return 'from-orange-100 to-yellow-100 text-orange-600';
      case 'lunch': return 'from-yellow-100 to-green-100 text-green-600';
      case 'dinner': return 'from-blue-100 to-purple-100 text-purple-600';
      case 'snack': return 'from-purple-100 to-pink-100 text-pink-600';
    }
  };
  
  // Group meals by day and sort by time
  const groupedMeals = React.useMemo(() => {
    const today = new Date().toDateString();
    const todaysMeals = meals.filter(meal => 
      new Date(meal.timestamp).toDateString() === today
    );
    
    return todaysMeals
      .map(meal => {
        const date = new Date(meal.timestamp);
        const hour = date.getHours();
        const mealPeriod = getMealPeriod(hour);
        
        return {
          ...meal,
          hour,
          timeLabel: format(date, 'HH:mm', { locale: fr }),
          mealPeriod
        } as GroupedMeal;
      })
      .sort((a, b) => a.hour - b.hour);
  }, [meals]);
  
  const totalDailyProtein = groupedMeals.reduce((sum, meal) => sum + meal.protein, 0);
  const totalDailyCalories = groupedMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
  
  if (groupedMeals.length === 0) {
    return (
      <Card className={cn("border-0 shadow-ios backdrop-blur-xl", className)}>
        <CardContent className="p-8 text-center">
          <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Aucun repas aujourd'hui</h3>
          <p className="text-sm text-muted-foreground">
            Commencez à enregistrer vos repas pour voir votre timeline
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={className}
    >
      <Card className="border-0 shadow-ios backdrop-blur-xl">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Timeline du jour</h2>
                <p className="text-sm text-muted-foreground">
                  {groupedMeals.length} repas • {Math.round(totalDailyProtein)}g protéines
                </p>
              </div>
            </div>
            {totalDailyCalories > 0 && (
              <Badge variant="outline" className="text-sm font-medium">
                {Math.round(totalDailyCalories)} kcal
              </Badge>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            {groupedMeals.map((meal, index) => {
              const Icon = getPeriodIcon(meal.mealPeriod);
              const isExpanded = expandedMeals.has(meal.id);
              const isLastMeal = index === groupedMeals.length - 1;
              
              return (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  {/* Timeline Line */}
                  {!isLastMeal && (
                    <div className="absolute left-6 top-16 w-px h-8 bg-border/30" />
                  )}
                  
                  <div className="flex gap-4">
                    {/* Time Icon */}
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-ios-sm flex-shrink-0 bg-gradient-to-br",
                      getPeriodColor(meal.mealPeriod)
                    )}>
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </div>
                    
                    {/* Meal Content */}
                    <div className="flex-1 min-w-0">
                      <div 
                        className="bg-muted/30 rounded-2xl p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleMealExpansion(meal.id)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                {meal.timeLabel}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {meal.protein}g
                              </Badge>
                              {meal.calories && (
                                <Badge variant="outline" className="text-xs">
                                  {meal.calories} kcal
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">
                              {meal.description}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToFavorites(meal);
                              }}
                              disabled={isMealInFavorites(meal)}
                              className={cn(
                                "h-8 w-8 rounded-xl transition-colors",
                                isMealInFavorites(meal)
                                  ? "text-red-500 bg-red-50 hover:bg-red-100"
                                  : "text-muted-foreground hover:text-red-500 hover:bg-red-50"
                              )}
                            >
                              <Heart className={cn("h-4 w-4", isMealInFavorites(meal) && "fill-current")} />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => isExpanded ? toggleMealExpansion(meal.id) : undefined}
                              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mt-4 pt-4 border-t border-border/20"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex flex-wrap gap-2">
                                  {meal.tags?.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteMeal(meal.id);
                                  }}
                                  className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}