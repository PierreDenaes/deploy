import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Target, Calendar, Trophy, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakTrackerProps {
  currentStreak: number;
  bestStreak: number;
  goalsMetThisWeek: number;
  totalDaysTracked: number;
  className?: string;
}

export default function StreakTracker({
  currentStreak,
  bestStreak,
  goalsMetThisWeek,
  totalDaysTracked,
  className
}: StreakTrackerProps) {
  
  // Calculate achievement badges
  const getAchievements = () => {
    const achievements = [];
    
    if (currentStreak >= 7) {
      achievements.push({
        icon: <Flame className="h-4 w-4" />,
        label: "Semaine parfaite",
        description: "7 jours consécutifs",
        color: "bg-orange-100 text-orange-700 border-orange-200"
      });
    }
    
    if (currentStreak >= 3) {
      achievements.push({
        icon: <Target className="h-4 w-4" />,
        label: "En feu",
        description: `${currentStreak} jours de suite`,
        color: "bg-red-100 text-red-700 border-red-200"
      });
    }
    
    if (goalsMetThisWeek >= 5) {
      achievements.push({
        icon: <Star className="h-4 w-4" />,
        label: "Super semaine",
        description: `${goalsMetThisWeek}/7 objectifs`,
        color: "bg-yellow-100 text-yellow-700 border-yellow-200"
      });
    }
    
    if (bestStreak >= 14) {
      achievements.push({
        icon: <Trophy className="h-4 w-4" />,
        label: "Champion",
        description: `Record: ${bestStreak} jours`,
        color: "bg-purple-100 text-purple-700 border-purple-200"
      });
    }
    
    return achievements;
  };

  const achievements = getAchievements();

  // Streak flame animation intensity
  const getFlameIntensity = () => {
    if (currentStreak >= 7) return "text-orange-500";
    if (currentStreak >= 3) return "text-red-500";
    if (currentStreak >= 1) return "text-yellow-500";
    return "text-gray-400";
  };

  // Motivational message based on streak
  const getStreakMessage = () => {
    if (currentStreak === 0) {
      return {
        title: "Commencez votre série !",
        subtitle: "Atteignez votre objectif aujourd'hui",
        color: "text-muted-foreground"
      };
    }
    
    if (currentStreak === 1) {
      return {
        title: "Bon début !",
        subtitle: "Continuez sur cette lancée",
        color: "text-blue-600"
      };
    }
    
    if (currentStreak < 7) {
      return {
        title: `${currentStreak} jours de suite !`,
        subtitle: `Plus que ${7 - currentStreak} pour une semaine parfaite`,
        color: "text-orange-600"
      };
    }
    
    return {
      title: `${currentStreak} jours consécutifs ! 🔥`,
      subtitle: "Vous êtes en feu !",
      color: "text-red-600"
    };
  };

  const streakMessage = getStreakMessage();

  // Week progress visualization
  const getWeekProgress = () => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const isComplete = i < goalsMetThisWeek;
      return {
        day: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i],
        isComplete,
        isToday: i === new Date().getDay() - 1 // Adjust for Monday start
      };
    });
    return days;
  };

  const weekProgress = getWeekProgress();

  if (achievements.length === 0 && currentStreak === 0) {
    return null; // Don't show component if no achievements
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
      className={className}
    >
      <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
        <CardContent className="p-6">
          {/* Streak Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ 
                  scale: currentStreak > 0 ? [1, 1.1, 1] : 1,
                  rotate: currentStreak > 0 ? [0, 5, -5, 0] : 0
                }}
                transition={{ 
                  repeat: currentStreak > 0 ? Infinity : 0,
                  duration: 2,
                  ease: "easeInOut"
                }}
                className={cn("text-3xl", getFlameIntensity())}
              >
                <Flame className="h-8 w-8" strokeWidth={2.5} />
              </motion.div>
              <div>
                <h3 className={cn("text-xl font-bold", streakMessage.color)}>
                  {streakMessage.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {streakMessage.subtitle}
                </p>
              </div>
            </div>
            
            {bestStreak > currentStreak && (
              <Badge variant="outline" className="text-xs font-medium">
                Record: {bestStreak}j
              </Badge>
            )}
          </div>

          {/* Week Progress */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Cette semaine ({goalsMetThisWeek}/7)
              </span>
            </div>
            
            <div className="flex gap-2">
              {weekProgress.map((day, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className={cn(
                    "flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all",
                    day.isComplete ? "bg-green-500 text-white" : "bg-muted text-muted-foreground",
                    day.isToday && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  {day.day}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Réalisations
              </h4>
              
              <div className="grid grid-cols-1 gap-2">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                  >
                    <Badge
                      variant="outline"
                      className={cn(
                        "w-full justify-start gap-2 p-3 h-auto",
                        achievement.color
                      )}
                    >
                      {achievement.icon}
                      <div className="text-left">
                        <div className="font-semibold text-xs">
                          {achievement.label}
                        </div>
                        <div className="text-xs opacity-80">
                          {achievement.description}
                        </div>
                      </div>
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Total tracking stats */}
          {totalDaysTracked > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 pt-4 border-t border-border/50 text-center"
            >
              <p className="text-xs text-muted-foreground">
                {totalDaysTracked} jour{totalDaysTracked > 1 ? 's' : ''} de suivi au total
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}