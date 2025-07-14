import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, Star, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedStreakTrackerProps {
  currentStreak: number;
  bestStreak: number;
  goalsMetThisWeek: number;
  totalDaysTracked: number;
  className?: string;
}

export default function EnhancedStreakTracker({
  currentStreak,
  bestStreak,
  goalsMetThisWeek,
  totalDaysTracked,
  className
}: EnhancedStreakTrackerProps) {
  
  // Déterminer le niveau d'achievement
  const getAchievementLevel = () => {
    if (currentStreak >= 14) return { level: 'Légende', color: 'purple', icon: '👑' };
    if (currentStreak >= 7) return { level: 'Champion', color: 'gold', icon: '🏆' };
    if (currentStreak >= 3) return { level: 'Rookie', color: 'blue', icon: '⭐' };
    return { level: 'Débutant', color: 'gray', icon: '🎯' };
  };

  const achievement = getAchievementLevel();

  // Génération de la visualisation de la semaine
  const getWeekVisualization = () => {
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const today = new Date().getDay();
    const mondayIndex = today === 0 ? 6 : today - 1; // Lundi = 0
    
    return days.map((day, index) => {
      const isToday = index === mondayIndex;
      const isCompleted = index < goalsMetThisWeek;
      const isFuture = index > mondayIndex;
      
      return {
        day,
        isToday,
        isCompleted,
        isFuture,
        status: isCompleted ? 'completed' : isToday ? 'today' : isFuture ? 'future' : 'missed'
      };
    });
  };

  const weekDays = getWeekVisualization();

  // Messages motivationnels selon le niveau
  const getMotivationalMessage = () => {
    if (currentStreak === 0) {
      return {
        title: "Commencez votre série !",
        subtitle: "Chaque grand voyage commence par un premier pas",
        urgency: 'medium' as const
      };
    }
    
    if (currentStreak >= 14) {
      return {
        title: `${currentStreak} jours d'excellence ! 👑`,
        subtitle: "Vous inspirez les autres !",
        urgency: 'low' as const
      };
    }
    
    if (currentStreak >= 7) {
      return {
        title: `Semaine parfaite complétée ! 🏆`,
        subtitle: `Plus que ${14 - currentStreak} jours pour devenir une Légende`,
        urgency: 'low' as const
      };
    }
    
    if (currentStreak >= 3) {
      return {
        title: `${currentStreak} jours de suite ! ⭐`,
        subtitle: `Plus que ${7 - currentStreak} pour devenir Champion`,
        urgency: 'medium' as const
      };
    }
    
    return {
      title: `${currentStreak} jour${currentStreak > 1 ? 's' : ''} ! 🎯`,
      subtitle: `Plus que ${3 - currentStreak} pour devenir Rookie`,
      urgency: 'high' as const
    };
  };

  const message = getMotivationalMessage();

  // Animation des confettis pour nouveaux records
  const showConfetti = currentStreak === bestStreak && currentStreak > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
      className={className}
    >
      <Card className={cn(
        "border-0 shadow-lg transition-all duration-300",
        {
          'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200': achievement.color === 'purple',
          'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200': achievement.color === 'gold',
          'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200': achievement.color === 'blue',
          'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200': achievement.color === 'gray'
        }
      )}>
        <CardContent className="p-6">
          
          {/* Header avec niveau et streak */}
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
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl",
                  {
                    'bg-purple-200 text-purple-700': achievement.color === 'purple',
                    'bg-yellow-200 text-yellow-700': achievement.color === 'gold',
                    'bg-blue-200 text-blue-700': achievement.color === 'blue',
                    'bg-gray-200 text-gray-700': achievement.color === 'gray'
                  }
                )}
              >
                {achievement.icon}
              </motion.div>
              <div>
                <h3 className={cn(
                  "text-lg font-bold",
                  {
                    'text-purple-800': achievement.color === 'purple',
                    'text-yellow-800': achievement.color === 'gold',
                    'text-blue-800': achievement.color === 'blue',
                    'text-gray-800': achievement.color === 'gray'
                  }
                )}>
                  {message.title}
                </h3>
                <p className="text-sm opacity-70">
                  {message.subtitle}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <Badge variant="outline" className={cn(
                "font-semibold",
                {
                  'bg-purple-100 text-purple-700 border-purple-300': achievement.color === 'purple',
                  'bg-yellow-100 text-yellow-700 border-yellow-300': achievement.color === 'gold',
                  'bg-blue-100 text-blue-700 border-blue-300': achievement.color === 'blue',
                  'bg-gray-100 text-gray-700 border-gray-300': achievement.color === 'gray'
                }
              )}>
                {achievement.level}
              </Badge>
              {bestStreak > currentStreak && (
                <p className="text-xs opacity-60 mt-1">
                  Record: {bestStreak}j
                </p>
              )}
            </div>
          </div>

          {/* Visualisation de la semaine */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 opacity-60" />
              <span className="text-sm font-medium opacity-70">
                Cette semaine ({goalsMetThisWeek}/7)
              </span>
            </div>
            
            <div className="flex gap-2">
              {weekDays.map((day, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className={cn(
                    "flex-1 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-200",
                    {
                      'bg-green-500 text-white shadow-md': day.status === 'completed',
                      'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 shadow-lg': day.status === 'today',
                      'bg-muted text-muted-foreground': day.status === 'future',
                      'bg-red-100 text-red-600 border border-red-200': day.status === 'missed'
                    }
                  )}
                >
                  {day.day}
                  {day.status === 'completed' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
                      className="absolute text-xs"
                    >
                      ✓
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Progression vers le prochain niveau */}
          {currentStreak < 14 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Prochain niveau</span>
                <span className="font-medium">
                  {currentStreak < 3 ? `${currentStreak}/3 Rookie` :
                   currentStreak < 7 ? `${currentStreak}/7 Champion` :
                   `${currentStreak}/14 Légende`}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    {
                      'bg-blue-500': currentStreak < 3,
                      'bg-yellow-500': currentStreak >= 3 && currentStreak < 7,
                      'bg-purple-500': currentStreak >= 7
                    }
                  )}
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${currentStreak < 3 ? (currentStreak / 3) * 100 :
                            currentStreak < 7 ? ((currentStreak - 3) / 4) * 100 :
                            ((currentStreak - 7) / 7) * 100}%`
                  }}
                  transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* Animation confettis pour nouveau record */}
          {showConfetti && (
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
                repeat: 2,
                repeatDelay: 1
              }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <span className="text-6xl">🎉</span>
            </motion.div>
          )}

        </CardContent>
      </Card>
    </motion.div>
  );
}