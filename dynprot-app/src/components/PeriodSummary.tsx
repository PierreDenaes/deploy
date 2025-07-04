import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Calendar,
  BarChart3,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Utensils,
  Activity
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import {
  calculateWeeklySummaries,
  calculateMonthlySummaries,
  getInsights,
  type PeriodSummary as PeriodSummaryType
} from "@/lib/summaryUtils";
import { formatDateRange } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

interface PeriodSummaryProps {
  className?: string;
}

const TrendIcon = ({ trend }: { trend: 'increasing' | 'decreasing' | 'stable' }) => {
  switch (trend) {
    case 'increasing':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'decreasing':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
};

const MetricCard = ({ 
  title, 
  value, 
  unit, 
  goal, 
  trend, 
  percentage,
  className 
}: {
  title: string;
  value: number;
  unit: string;
  goal?: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
  percentage?: number;
  className?: string;
}) => (
  <Card className={cn("border-0 shadow-md", className)}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {trend && <TrendIcon trend={trend} />}
      </div>
      <div className="space-y-2">
        <div className="text-2xl font-bold">
          {value}{unit}
          {goal && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              / {goal}{unit}
            </span>
          )}
        </div>
        {percentage !== undefined && (
          <div className="space-y-1">
            <Progress 
              value={Math.min(percentage, 100)} 
              className="h-2"
            />
            <span className="text-xs text-muted-foreground">
              {percentage}% de l'objectif
            </span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const InsightBadge = ({ 
  type, 
  text 
}: { 
  type: 'achievement' | 'improvement' | 'trend'; 
  text: string 
}) => {
  const config = {
    achievement: { icon: CheckCircle, variant: 'default' as const, color: 'text-green-600' },
    improvement: { icon: AlertCircle, variant: 'secondary' as const, color: 'text-orange-600' },
    trend: { icon: TrendingUp, variant: 'outline' as const, color: 'text-blue-600' }
  };

  const { icon: Icon, variant, color } = config[type];

  return (
    <Badge variant={variant} className="text-xs py-1 px-2">
      <Icon className={cn("h-3 w-3 mr-1", color)} />
      {text}
    </Badge>
  );
};

export default function PeriodSummary({ className }: PeriodSummaryProps) {
  const { state, userSettings } = useAppContext();
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  const proteinGoal = userSettings?.proteinGoal || state.user.dailyProteinGoal || 120;
  const calorieGoal = userSettings?.calorieGoal || state.user.calorieGoal || 2000;

  const { weeklySummaries, monthlySummaries, currentSummary } = useMemo(() => {
    const meals = state.meals || [];
    const weekly = calculateWeeklySummaries(meals, 4, proteinGoal, calorieGoal);
    const monthly = calculateMonthlySummaries(meals, 3, proteinGoal, calorieGoal);
    const current = selectedPeriod === 'weekly' ? weekly[weekly.length - 1] : monthly[monthly.length - 1];

    return {
      weeklySummaries: weekly,
      monthlySummaries: monthly,
      currentSummary: current
    };
  }, [state.meals, selectedPeriod, proteinGoal, calorieGoal]);

  const insights = useMemo(() => {
    const summaries = selectedPeriod === 'weekly' ? weeklySummaries : monthlySummaries;
    return getInsights(summaries);
  }, [selectedPeriod, weeklySummaries, monthlySummaries]);

  if (!currentSummary) {
    return (
      <Card className={cn("border-0 shadow-lg", className)}>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Aucune donnée disponible</h3>
          <p className="text-sm text-muted-foreground">
            Commencez à enregistrer vos repas pour voir vos statistiques
          </p>
        </CardContent>
      </Card>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
  };

  return (
    <motion.div
      className={cn("space-y-6", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header and Controls */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Résumé {selectedPeriod === 'weekly' ? 'hebdomadaire' : 'mensuel'}
                </CardTitle>
                <CardDescription>
                  {currentSummary.label} • {formatDateRange(currentSummary.start, currentSummary.end)}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedPeriod === 'weekly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod('weekly')}
                >
                  Semaines
                </Button>
                <Button
                  variant={selectedPeriod === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod('monthly')}
                >
                  Mois
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Key Metrics */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Protéines moyennes"
            value={currentSummary.averageProtein}
            unit="g"
            goal={currentSummary.proteinGoal}
            trend={currentSummary.proteinTrend}
            percentage={currentSummary.proteinGoalPercentage}
          />
          <MetricCard
            title="Calories moyennes"
            value={currentSummary.averageCalories}
            unit=" cal"
            goal={currentSummary.calorieGoal}
            trend={currentSummary.calorieTrend}
            percentage={currentSummary.calorieGoalPercentage}
          />
        </div>
      </motion.div>

      {/* Insights */}
      {(insights.achievements.length > 0 || insights.improvements.length > 0 || insights.trends.length > 0) && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.achievements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-green-600">Réussites</h4>
                  <div className="flex flex-wrap gap-2">
                    {insights.achievements.map((achievement, index) => (
                      <InsightBadge key={index} type="achievement" text={achievement} />
                    ))}
                  </div>
                </div>
              )}
              
              {insights.improvements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-orange-600">Points d'amélioration</h4>
                  <div className="flex flex-wrap gap-2">
                    {insights.improvements.map((improvement, index) => (
                      <InsightBadge key={index} type="improvement" text={improvement} />
                    ))}
                  </div>
                </div>
              )}
              
              {insights.trends.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-blue-600">Tendances</h4>
                  <div className="flex flex-wrap gap-2">
                    {insights.trends.map((trend, index) => (
                      <InsightBadge key={index} type="trend" text={trend} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Detailed Stats */}
      <motion.div variants={itemVariants}>
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'overview' | 'detailed')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="detailed">Détails</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{currentSummary.activeDays}</div>
                  <div className="text-xs text-muted-foreground">Jours actifs</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <Utensils className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{currentSummary.totalMeals}</div>
                  <div className="text-xs text-muted-foreground">Total repas</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <Target className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{currentSummary.proteinGoalAchieved}</div>
                  <div className="text-xs text-muted-foreground">Objectifs atteints</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardContent className="p-4 text-center">
                  <Activity className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{currentSummary.averageMealsPerDay}</div>
                  <div className="text-xs text-muted-foreground">Repas/jour</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nutrition Details */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Détails nutritionnels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Protéines totales</span>
                      <span className="font-medium">{currentSummary.totalProtein}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Max quotidien</span>
                      <span className="font-medium">{currentSummary.maxProtein}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Min quotidien</span>
                      <span className="font-medium">{currentSummary.minProtein}g</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Calories totales</span>
                      <span className="font-medium">{currentSummary.totalCalories} cal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Max quotidien</span>
                      <span className="font-medium">{currentSummary.maxCalories} cal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Min quotidien</span>
                      <span className="font-medium">{currentSummary.minCalories} cal</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Meal Patterns */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Répartition des repas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">Matin</span>
                      </div>
                      <span className="font-medium">{currentSummary.mealFrequency.morning}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">Après-midi</span>
                      </div>
                      <span className="font-medium">{currentSummary.mealFrequency.afternoon}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Soir</span>
                      </div>
                      <span className="font-medium">{currentSummary.mealFrequency.evening}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Nuit</span>
                      </div>
                      <span className="font-medium">{currentSummary.mealFrequency.night}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Historical Comparison */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Évolution historique</CardTitle>
            <CardDescription>
              Comparaison des {selectedPeriod === 'weekly' ? 'dernières semaines' : 'derniers mois'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(selectedPeriod === 'weekly' ? weeklySummaries : monthlySummaries).map((summary, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{summary.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDateRange(summary.start, summary.end)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{summary.averageProtein}g</div>
                      <div className="text-muted-foreground">Protéines</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{summary.proteinGoalAchieved}</div>
                      <div className="text-muted-foreground">Objectifs</div>
                    </div>
                    <div className="flex gap-1">
                      <TrendIcon trend={summary.proteinTrend} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}