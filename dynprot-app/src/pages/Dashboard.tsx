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
import { Progress } from '@/components/ui/progress';
import { Plus, Settings, Utensils, ChevronRight, TrendingUp, Award, Zap, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppContext } from '../context/AppContext';
import FavoritesMealsList from '@/components/FavoritesMealsList';
import TestErrorComponent from '@/components/TestErrorComponent';
import { cn } from '@/lib/utils';
import { safeSum, safeNumber } from '../utils/numberUtils';
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

  const { proteinToday, caloriesToday, progressPercentage, todaysMeals } = useMemo(() => {
    const todayStr = new Date().toDateString();
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

    return {
      proteinToday: protein,
      caloriesToday: calories,
      progressPercentage: percentage,
      todaysMeals: meals.slice(0, 3),
    };
  }, [state.meals, dailyProteinGoal, lastMealCount]);

  const getMotivationalMessage = () => {
    const progress = progressPercentage / 100;
    const hour = new Date().getHours();

    if (progress >= 1) {
      return { title: "Objectif atteint !", description: "Félicitations, vous êtes un champion !", icon: <Award className="h-6 w-6 text-yellow-500" />, color: 'green' };
    } else if (progress >= 0.75) {
      return { title: "Presque là !", description: "Un dernier effort pour atteindre votre but.", icon: <TrendingUp className="h-6 w-6 text-blue-500" />, color: 'blue' };
    } else if (hour >= 19 && progress < 0.6) {
      return { title: "Besoin d'un boost ?", description: "Pensez à un snack protéiné ce soir.", icon: <Zap className="h-6 w-6 text-red-500" />, color: 'red' };
    } else {
      return { title: "Bienvenue !", description: "Commencez à suivre vos repas pour progresser.", icon: <Plus className="h-6 w-6 text-indigo-500" />, color: 'indigo' };
    }
  };

  const motivationalMessage = getMotivationalMessage();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 100 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container max-w-lg mx-auto p-4 pb-32">
        <motion.div
          className="space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.header variants={itemVariants} className="pt-6 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Bonjour, {state.user.name} !
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(), "eeee d MMMM", { locale: fr })}
            </p>
          </motion.header>

          {/* Daily Progress Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-primary to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">Progrès du jour</CardTitle>
                    <CardDescription className="text-blue-100">Objectif : {dailyProteinGoal}g</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold">{proteinToday}g</p>
                    <p className="text-blue-200">{caloriesToday} kcal</p>
                  </div>
                </div>
                <div className="mt-4 relative">
                  <Progress value={progressPercentage} className="h-3 bg-white/30" indicatorClassName="bg-white" />
                  <p className="text-right text-sm mt-1 font-medium">{Math.round(progressPercentage)}%</p>
                  {progressPercentage >= 100 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1.2 }}
                      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-4xl"
                        style={{ textShadow: '0 0 10px rgba(255,255,255,0.8)' }}
                      >
                        🎉
                      </motion.span>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Motivational Message */}
          <motion.div variants={itemVariants}>
            <Card className={cn(
              'border-0 shadow-lg',
              {
                'bg-green-100/50 dark:bg-green-900/30 border-green-200': motivationalMessage.color === 'green',
                'bg-blue-100/50 dark:bg-blue-900/30 border-blue-200': motivationalMessage.color === 'blue',
                'bg-red-100/50 dark:bg-red-900/30 border-red-200': motivationalMessage.color === 'red',
                'bg-indigo-100/50 dark:bg-indigo-900/30 border-indigo-200': motivationalMessage.color === 'indigo',
              }
            )}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                   {
                    'bg-green-100': motivationalMessage.color === 'green',
                    'bg-blue-100': motivationalMessage.color === 'blue',
                    'bg-red-100': motivationalMessage.color === 'red',
                    'bg-indigo-100': motivationalMessage.color === 'indigo',
                  }
                )}>
                  {motivationalMessage.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{motivationalMessage.title}</h3>
                  <p className="text-sm text-muted-foreground">{motivationalMessage.description}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 text-center">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="lg" className="h-24 w-full flex flex-col gap-2 shadow-lg bg-white dark:bg-gray-800" onClick={() => navigate('/add-meal')}>
                <Plus className="h-6 w-6 text-primary" />
                <span className="font-semibold">Ajouter</span>
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="lg" className="h-24 w-full flex flex-col gap-2 shadow-lg bg-white dark:bg-gray-800" onClick={() => navigate('/analytics')}>
                <BarChart3 className="h-6 w-6 text-primary" />
                <span className="font-semibold">Analytics</span>
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="lg" className="h-24 w-full flex flex-col gap-2 shadow-lg bg-white dark:bg-gray-800" onClick={() => navigate('/profile')}>
                <Settings className="h-6 w-6 text-primary" />
                <span className="font-semibold">Profil</span>
              </Button>
            </motion.div>
          </motion.div>

          {/* Recent Activity */}
          {todaysMeals.length > 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Activité récente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {todaysMeals.slice(0, 2).map(meal => (
                    <div key={meal.id} className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Utensils className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{meal.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(meal.timestamp), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-semibold text-base">
                        {meal.protein}g
                      </Badge>
                    </div>
                  ))}
                  {todaysMeals.length > 2 && (
                    <Button variant="ghost" className="w-full mt-2 text-primary" onClick={() => navigate('/analytics?tab=history')}>
                      Voir tous les repas <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Aucun repas enregistré aujourd'hui</h3>
                  <p className="text-sm text-muted-foreground">
                    Commencez à suivre vos protéines en ajoutant votre premier repas !
                  </p>
                  <Button onClick={() => navigate('/add-meal')} className="mt-4">
                    Ajouter un repas
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Favorites Quick Access */}
          <motion.div variants={itemVariants}>
            <FavoritesMealsList 
              maxItems={3} 
              onAddMeal={() => {
                // Show success feedback - calculations will update automatically
                toast.success('Repas ajouté à votre journée !');
              }}
              showQuickAdd={true}
            />
          </motion.div>

          {/* Error Boundary Test */}
          {process.env.NODE_ENV === 'development' && (
            <motion.div variants={itemVariants}>
              <TestErrorComponent />
            </motion.div>
          )}

          {/* Weekly Trends Button */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4 space-y-2">
                <Button variant="outline" className="w-full" onClick={() => navigate('/analytics?tab=history')}>
                  Voir l'historique complet <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => navigate('/analytics?tab=analytics')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics & Tendances
                </Button>
              </CardContent>
            </Card>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;