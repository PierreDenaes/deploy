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
      return { title: "Objectif atteint !", description: "Félicitations, vous êtes un champion !", icon: <Award className="h-6 w-6 text-ios-yellow" />, color: 'green' };
    } else if (progress >= 0.75) {
      return { title: "Presque là !", description: "Un dernier effort pour atteindre votre but.", icon: <TrendingUp className="h-6 w-6 text-primary" />, color: 'blue' };
    } else if (hour >= 19 && progress < 0.6) {
      return { title: "Besoin d'un boost ?", description: "Pensez à un snack protéiné ce soir.", icon: <Zap className="h-6 w-6 text-ios-red" />, color: 'red' };
    } else {
      return { title: "Bienvenue !", description: "Commencez à suivre vos repas pour progresser.", icon: <Plus className="h-6 w-6 text-primary" />, color: 'blue' };
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
    <div className="min-h-screen bg-background">
      <div className="container max-w-lg mx-auto p-4 pb-32">
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.header variants={itemVariants} className="pt-8 text-center">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              Bonjour, {state.user.name} !
            </h1>
            <p className="text-muted-foreground text-lg mt-2 font-medium">
              {format(new Date(), "eeee d MMMM", { locale: fr })}
            </p>
          </motion.header>

          {/* Daily Progress Card */}
          <motion.div variants={itemVariants}>
            <Card className="overflow-hidden bg-primary text-white border-0 shadow-ios">
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <CardTitle className="text-2xl font-bold mb-2">Progrès du jour</CardTitle>
                    <CardDescription className="text-white/80 text-base font-medium">Objectif : {dailyProteinGoal}g</CardDescription>
                  </div>
                  <div className="text-right">
                    <motion.p 
                      className="text-5xl font-bold mb-1"
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      {proteinToday}g
                    </motion.p>
                    <p className="text-white/70 text-lg font-medium">{caloriesToday} kcal</p>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={progressPercentage} className="h-4 bg-white/20 rounded-full" indicatorClassName="bg-white rounded-full" />
                  <p className="text-right text-base mt-2 font-semibold">{Math.round(progressPercentage)}%</p>
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
              'border-0 shadow-ios bg-background border border-border/20',
              {
                'bg-ios-green/10 border-ios-green/20': motivationalMessage.color === 'green',
                'bg-primary/10 border-primary/20': motivationalMessage.color === 'blue',
                'bg-ios-red/10 border-ios-red/20': motivationalMessage.color === 'red',
              }
            )}>
              <CardContent className="p-6 flex items-center gap-6">
                <motion.div 
                  className={cn(
                    'w-16 h-16 rounded-2xl flex items-center justify-center shadow-ios-sm',
                     {
                      'bg-ios-green/20': motivationalMessage.color === 'green',
                      'bg-primary/20': motivationalMessage.color === 'blue',
                      'bg-ios-red/20': motivationalMessage.color === 'red',
                    }
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {motivationalMessage.icon}
                </motion.div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-1">{motivationalMessage.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{motivationalMessage.description}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button variant="outline" size="lg" className="h-28 w-full flex flex-col gap-3 shadow-ios bg-background border border-primary/20 hover:border-primary/30 hover:bg-primary/5" onClick={() => navigate('/add-meal')}>
                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-base">Ajouter</span>
              </Button>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button variant="outline" size="lg" className="h-28 w-full flex flex-col gap-3 shadow-ios bg-background border border-primary/20 hover:border-primary/30 hover:bg-primary/5" onClick={() => navigate('/analytics')}>
                <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-base">Analytics</span>
              </Button>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Button variant="outline" size="lg" className="h-28 w-full flex flex-col gap-3 shadow-ios bg-background border border-border/20 hover:border-border/30 hover:bg-muted/5" onClick={() => navigate('/profile')}>
                <div className="w-10 h-10 rounded-2xl bg-muted/30 flex items-center justify-center">
                  <Settings className="h-6 w-6 text-muted-foreground" strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-base">Profil</span>
              </Button>
            </motion.div>
          </motion.div>

          {/* Recent Activity */}
          {todaysMeals.length > 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-ios bg-background border border-border/20">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Utensils className="h-5 w-5 text-primary" strokeWidth={2.5} />
                    </div>
                    Activité récente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {todaysMeals.slice(0, 2).map((meal, index) => (
                    <motion.div 
                      key={meal.id} 
                      className="flex items-center justify-between p-4 rounded-2xl hover:bg-muted/50 transition-all duration-200 hover:shadow-ios-sm"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center shadow-ios-sm">
                          <Utensils className="h-6 w-6 text-primary" strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-lg leading-tight">{meal.description}</p>
                          <p className="text-base text-muted-foreground font-medium">
                            {format(parseISO(meal.timestamp), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-bold text-lg px-4 py-2 rounded-2xl bg-primary/10 text-primary border-primary/20">
                        {meal.protein}g
                      </Badge>
                    </motion.div>
                  ))}
                  {todaysMeals.length > 2 && (
                    <Button variant="ghost" className="w-full mt-4 text-primary font-semibold text-base h-12 rounded-2xl hover:bg-primary/5" onClick={() => navigate('/analytics?tab=history')}>
                      Voir tous les repas <ChevronRight className="h-5 w-5 ml-2" strokeWidth={2.5} />
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants}>
              <Card className="border-0 shadow-ios bg-background border border-border/20">
                <CardContent className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="w-20 h-20 bg-gradient-to-br from-muted to-muted/50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-ios-sm"
                  >
                    <Utensils className="h-10 w-10 text-muted-foreground" strokeWidth={2} />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-3 text-foreground">Aucun repas enregistré aujourd'hui</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                    Commencez à suivre vos protéines en ajoutant votre premier repas !
                  </p>
                  <Button onClick={() => navigate('/add-meal')} variant="default" size="lg" className="text-lg px-8 py-4">
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
            <Card className="border-0 shadow-ios bg-background border border-border/20">
              <CardContent className="p-6 space-y-4">
                <Button variant="outline" className="w-full h-14 text-lg font-semibold rounded-2xl shadow-ios border-primary/20 hover:border-primary/30 hover:bg-primary/5" onClick={() => navigate('/analytics?tab=history')}>
                  Voir l'historique complet <ChevronRight className="h-5 w-5 ml-3" strokeWidth={2.5} />
                </Button>
                <Button variant="ghost" className="w-full h-14 text-lg font-semibold rounded-2xl hover:bg-primary/5" onClick={() => navigate('/analytics?tab=analytics')}>
                  <BarChart3 className="h-5 w-5 mr-3" strokeWidth={2.5} />
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