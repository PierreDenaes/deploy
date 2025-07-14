import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Lightbulb, TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextualGoalCardProps {
  currentProtein: number;
  goalProtein: number;
  progressPercentage: number;
  calories: number;
  mealsCount: number;
  className?: string;
}

export default function ContextualGoalCard({
  currentProtein,
  goalProtein,
  progressPercentage,
  calories,
  mealsCount,
  className
}: ContextualGoalCardProps) {
  const remaining = Math.max(0, goalProtein - currentProtein);
  
  // Calculate food equivalences for remaining protein
  const getFoodEquivalence = (remainingProtein: number) => {
    if (remainingProtein <= 0) return null;
    
    const equivalences = [
      { food: 'poulet', amount: Math.round(remainingProtein * 4.5), unit: 'g' },
      { food: 'œufs', amount: Math.round(remainingProtein / 6), unit: 'œufs' },
      { food: 'saumon', amount: Math.round(remainingProtein * 4), unit: 'g' },
      { food: 'shake protéiné', amount: Math.round(remainingProtein / 25), unit: 'dose' }
    ];
    
    // Return the most appropriate equivalence based on amount
    if (remainingProtein > 40) return equivalences[0]; // Chicken for large amounts
    if (remainingProtein > 20) return equivalences[2]; // Salmon for medium amounts
    if (remainingProtein > 10) return equivalences[1]; // Eggs for small amounts
    return equivalences[3]; // Protein shake for very small amounts
  };

  // Predict completion time based on current progress and time of day
  const getPredictedCompletion = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const minutesSinceMidnight = currentHour * 60 + now.getMinutes();
    
    if (progressPercentage >= 100) return null;
    if (mealsCount === 0) return "Ajoutez votre premier repas pour une prédiction";
    
    // Simple prediction based on current pace
    const avgProteinPerHour = currentProtein / (minutesSinceMidnight / 60);
    if (avgProteinPerHour <= 0) return null;
    
    const hoursToComplete = remaining / avgProteinPerHour;
    const completionTime = new Date(now.getTime() + hoursToComplete * 60 * 60 * 1000);
    
    if (completionTime.getHours() > 23) {
      return "Objectif atteignable demain avec ce rythme";
    }
    
    return `Objectif atteint vers ${completionTime.getHours()}h${String(completionTime.getMinutes()).padStart(2, '0')}`;
  };

  const equivalence = getFoodEquivalence(remaining);
  const prediction = getPredictedCompletion();

  // Progress bar color based on percentage
  const getProgressColor = () => {
    if (progressPercentage >= 100) return 'bg-green-500';
    if (progressPercentage >= 75) return 'bg-blue-500';
    if (progressPercentage >= 50) return 'bg-yellow-500';
    return 'bg-primary';
  };

  // Milestone celebrations
  const getMilestone = () => {
    if (progressPercentage >= 100) return { icon: '🎉', text: 'Objectif atteint !', color: 'text-green-600' };
    if (progressPercentage >= 75) return { icon: '🔥', text: 'Presque là !', color: 'text-orange-500' };
    if (progressPercentage >= 50) return { icon: '💪', text: 'À mi-parcours', color: 'text-blue-500' };
    if (progressPercentage >= 25) return { icon: '🚀', text: 'Bon départ !', color: 'text-purple-500' };
    return null;
  };

  const milestone = getMilestone();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200 }}
      className={className}
    >
      <Card className="overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 text-white border-0 shadow-2xl">
        <CardContent className="p-10">
          {/* Header with milestone */}
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-bold">Objectif Protéines</h2>
              </div>
              <p className="text-white/80 text-lg font-medium">
                Aujourd'hui • {goalProtein}g
              </p>
            </div>
            
            {milestone && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                className="text-right"
              >
                <div className="text-3xl mb-1">{milestone.icon}</div>
                <p className="text-white/90 font-semibold">{milestone.text}</p>
              </motion.div>
            )}
          </div>

          {/* Main Progress Display */}
          <div className="mb-8">
            <div className="flex items-end justify-between mb-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <span className="text-7xl font-black tracking-tight">{currentProtein}g</span>
                <span className="text-white/70 text-3xl ml-3 font-medium">/ {goalProtein}g</span>
              </motion.div>
              <div className="text-right">
                <p className="text-white/80 text-lg">{calories} kcal</p>
                <p className="text-white/70 text-base">{mealsCount} repas</p>
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="relative">
              <Progress 
                value={progressPercentage} 
                className="h-6 bg-white/20 rounded-full" 
                indicatorClassName={cn("rounded-full transition-all duration-500", getProgressColor())}
              />
              <motion.p 
                className="text-right text-lg mt-3 font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {Math.round(progressPercentage)}%
              </motion.p>

              {/* Milestone markers */}
              <div className="absolute top-0 left-0 w-full h-6 flex justify-between items-center px-1">
                {[25, 50, 75].map((marker) => (
                  <div
                    key={marker}
                    className={cn(
                      "w-1 h-4 rounded-full transition-all duration-300",
                      progressPercentage >= marker ? "bg-white" : "bg-white/30"
                    )}
                    style={{ marginLeft: `${marker - 2}%` }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Contextual Guidance */}
          <div className="space-y-4">
            {remaining > 0 && equivalence && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3 p-4 bg-white/10 rounded-2xl"
              >
                <Lightbulb className="h-5 w-5 text-yellow-300 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">
                    Il vous reste {remaining}g à consommer
                  </p>
                  <p className="text-white/80 text-sm">
                    Soit environ {equivalence.amount}{equivalence.unit === 'œufs' ? '' : equivalence.unit} de {equivalence.food}
                  </p>
                </div>
              </motion.div>
            )}

            {prediction && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-3 p-4 bg-white/10 rounded-2xl"
              >
                <Clock className="h-5 w-5 text-blue-300 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">Prédiction</p>
                  <p className="text-white/80 text-sm">{prediction}</p>
                </div>
              </motion.div>
            )}

            {progressPercentage >= 100 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                className="flex items-center gap-3 p-4 bg-green-500/20 rounded-2xl border border-green-400/30"
              >
                <TrendingUp className="h-5 w-5 text-green-300 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-white">Félicitations ! 🎯</p>
                  <p className="text-white/80 text-sm">
                    Vous avez atteint votre objectif quotidien de protéines
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Celebration Effect for 100% */}
          {progressPercentage >= 100 && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0, 1.2, 1.2, 0],
                rotate: [0, 10, -10, 0]
              }}
              transition={{ 
                duration: 2,
                times: [0, 0.3, 0.7, 1],
                repeat: 3,
                repeatDelay: 1
              }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <span className="text-8xl">🎉</span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}