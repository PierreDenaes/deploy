import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Calendar, TrendingUp, Target, Activity, Zap, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAppContext } from '@/context/AppContext';
import { nutritionalAnalysis } from '@/services/nutritionalAnalysis.service';
import { toast } from 'sonner';
import { format, subDays, subWeeks, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

type AnalysisPeriod = 'week' | 'month' | 'quarter';

interface NutritionalScore {
  overall: number;
  protein: number;
  balance: number;
  consistency: number;
  variety: number;
}

interface NutritionalTrend {
  period: string;
  avgProtein: number;
  avgCalories: number;
  mealCount: number;
  score: number;
}

interface NutritionalInsight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
  actionable?: string;
}

interface AnalysisData {
  period: AnalysisPeriod;
  dateRange: { start: Date; end: Date };
  scores: NutritionalScore;
  trends: NutritionalTrend[];
  insights: NutritionalInsight[];
  recommendations: string[];
  totalMeals: number;
  avgDailyProtein: number;
  avgDailyCalories: number;
  proteinGoalAchievement: number;
  bestDay: { date: string; protein: number };
  improvementAreas: string[];
}

export default function NutritionAnalysis() {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const [period, setPeriod] = useState<AnalysisPeriod>('week');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  useEffect(() => {
    generateAnalysis();
  }, [period]);

  const generateAnalysis = async () => {
    // No need to check for state.user.profile, just check for required fields
    if (!state.user || !state.userSettings) {
      toast.error("Profil utilisateur manquant");
      return;
    }

    // Build userProfile as in Profile.tsx (move outside try/catch for fallback)
    const userProfile = {
      age: Number(state.userSettings.age) || 30,
      gender: (state.userSettings.gender as 'male' | 'female' | 'other') || 'other',
      weight: Number(state.user.weightKg) || 75,
      height: Number(state.user.heightCm) || 175,
      activityLevel: state.user.activityLevel,
      fitnessGoal: (state.userSettings.fitnessGoal as 'weight_loss' | 'muscle_gain' | 'maintenance' | 'general_health') || 'general_health',
      proteinGoal: Number(state.user.dailyProteinGoal) || 120,
      calorieGoal: Number(state.user.calorieGoal) || 2000,
      allergies: [],
      dietaryRestrictions: state.user.dietPreferences || [],
      cuisinePreferences: ['française', 'méditerranéenne'],
      cookingTime: 'moderate' as const,
      budget: 'medium' as const,
      equipment: ['four', 'plaques', 'mixeur']
    };

    setIsLoading(true);
    try {
      // Calculer la période selon la sélection
      const endDate = new Date();
      let startDate: Date;
      let periodDays: number;

      let analysisPeriod: 'week' | 'month' | '3months';
      switch (period) {
        case 'week':
          startDate = subWeeks(endDate, 1);
          periodDays = 7;
          analysisPeriod = 'week';
          break;
        case 'month':
          startDate = subMonths(endDate, 1);
          periodDays = 30;
          analysisPeriod = 'month';
          break;
        case 'quarter':
          startDate = subMonths(endDate, 3);
          periodDays = 90;
          analysisPeriod = '3months';
          break;
      }

      // Filtrer les repas selon la période
      const relevantMeals = state.meals.filter(meal => {
        const mealDate = new Date(meal.timestamp);
        return mealDate >= startDate && mealDate <= endDate;
      });

      // Appel au service d'analyse
      const request = {
        period: analysisPeriod,
        detailLevel: 'detailed' as const
      };

      const aiAnalysis = await nutritionalAnalysis.generateAnalysisReport(userProfile, relevantMeals, request);
      
      // Calculer les métriques locales
      const analysis = await calculateLocalAnalysis(relevantMeals, userProfile, period, startDate, endDate);
      
      // Parse insights from aiAnalysis.insights (array of strengths/improvements/alerts/personalizedTips)
      const insightStrings = [
        ...(aiAnalysis.insights?.strengths?.map(s => s.title + ': ' + s.description) || []),
        ...(aiAnalysis.insights?.improvements?.map(i => i.title + ': ' + i.description) || []),
        ...(aiAnalysis.insights?.alerts?.map(a => a.title + ': ' + a.description) || []),
        ...(aiAnalysis.insights?.personalizedTips?.map(t => t.tip + ': ' + t.reasoning) || [])
      ];

      const combinedAnalysis: AnalysisData = {
        ...analysis,
        insights: parseInsights(insightStrings),
        recommendations: [], // Optionally fill from aiAnalysis if available
        improvementAreas: [] // Optionally fill from aiAnalysis if available
      };

      setAnalysisData(combinedAnalysis);
      
    } catch (error) {
      console.error('Erreur lors de l\'analyse nutritionnelle:', error);
      toast.error("Impossible de générer l'analyse. Utilisation des données locales.");
      
      // Fallback sur l'analyse locale uniquement
      const endDate = new Date();
      let startDate: Date;
      switch (period) {
        case 'week':
          startDate = subWeeks(endDate, 1);
          break;
        case 'month':
          startDate = subMonths(endDate, 1);
          break;
        case 'quarter':
          startDate = subMonths(endDate, 3);
          break;
      }
      const relevantMeals = state.meals.filter(meal => {
        const mealDate = new Date(meal.timestamp);
        return mealDate >= startDate && mealDate <= endDate;
      });
      const fallbackAnalysis = await calculateLocalAnalysis(relevantMeals, userProfile, period, startDate, endDate);
      setAnalysisData(fallbackAnalysis);
      
    } finally {
      setIsLoading(false);
    }
  };

  const calculateLocalAnalysis = async (meals: typeof state.meals, userProfile: any, period: AnalysisPeriod, startDate: Date, endDate: Date): Promise<AnalysisData> => {
    const totalMeals = meals.length;
    const totalProtein = meals.reduce((sum, meal) => sum + meal.protein, 0);
    const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const avgDailyProtein = totalProtein / Math.max(daysDiff, 1);
    const avgDailyCalories = totalCalories / Math.max(daysDiff, 1);
    
    const proteinGoal = userProfile.proteinGoal || 120;
    const proteinGoalAchievement = Math.round((avgDailyProtein / proteinGoal) * 100);

    // Trouver le meilleur jour
    const mealsByDay = meals.reduce((acc, meal) => {
      const day = format(new Date(meal.timestamp), 'yyyy-MM-dd');
      if (!acc[day]) acc[day] = [];
      acc[day].push(meal);
      return acc;
    }, {} as Record<string, typeof meals>);

    const dailyProteinTotals = Object.entries(mealsByDay).map(([date, dayMeals]) => ({
      date,
      protein: dayMeals.reduce((sum, meal) => sum + meal.protein, 0)
    }));

    const bestDay = dailyProteinTotals.reduce((best, current) => 
      current.protein > best.protein ? current : best, 
      { date: '', protein: 0 }
    );

    // Calculer les scores
    const scores: NutritionalScore = {
      overall: Math.min(Math.round((proteinGoalAchievement + 80) / 2), 100),
      protein: Math.min(proteinGoalAchievement, 100),
      balance: totalMeals > 0 ? Math.min(Math.round((totalCalories / totalMeals) / 5), 100) : 0,
      consistency: dailyProteinTotals.length > 3 ? 85 : 60,
      variety: Math.min(totalMeals * 10, 100)
    };

    // Générer les tendances
    const trends: NutritionalTrend[] = [];
    const weekCount = Math.ceil(daysDiff / 7);
    for (let i = 0; i < Math.min(weekCount, 4); i++) {
      const weekStart = subWeeks(endDate, i);
      const weekEnd = subWeeks(endDate, i - 1);
      const weekMeals = meals.filter(meal => {
        const mealDate = new Date(meal.timestamp);
        return mealDate >= weekStart && mealDate < weekEnd;
      });
      
      trends.unshift({
        period: format(weekStart, 'dd MMM', { locale: fr }),
        avgProtein: weekMeals.reduce((sum, meal) => sum + meal.protein, 0) / 7,
        avgCalories: weekMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0) / 7,
        mealCount: weekMeals.length,
        score: Math.min(Math.round((weekMeals.reduce((sum, meal) => sum + meal.protein, 0) / 7 / proteinGoal) * 100), 100)
      });
    }

    return {
      period,
      dateRange: { start: startDate, end: endDate },
      scores,
      trends,
      insights: [], // Sera rempli par l'IA
      recommendations: [], // Sera rempli par l'IA
      totalMeals,
      avgDailyProtein: Math.round(avgDailyProtein),
      avgDailyCalories: Math.round(avgDailyCalories),
      proteinGoalAchievement,
      bestDay: {
        date: format(new Date(bestDay.date), 'dd MMMM', { locale: fr }),
        protein: Math.round(bestDay.protein)
      },
      improvementAreas: [] // Sera rempli par l'IA
    };
  };

  const parseInsights = (insights: string[]): NutritionalInsight[] => {
    return insights.map((insight, index) => ({
      type: index % 4 === 0 ? 'success' : index % 4 === 1 ? 'warning' : index % 4 === 2 ? 'info' : 'error',
      title: `Insight ${index + 1}`,
      description: insight,
      actionable: index < 2 ? "Cliquez pour plus de détails" : undefined
    }));
  };

  const exportToPDF = async () => {
    toast.info("Export PDF en cours de développement...");
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6"
            />
            <h2 className="text-xl font-bold mb-2">Analyse en cours</h2>
            <p className="text-base text-muted-foreground">
              Notre IA analyse vos habitudes nutritionnelles...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-2xl h-10 w-10 hover:bg-muted/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1 px-4">
            <h1 className="text-lg sm:text-xl font-bold">Analyse Nutritionnelle</h1>
            <p className="text-sm text-muted-foreground">
              {analysisData && format(analysisData.dateRange.start, 'dd MMM', { locale: fr })} - {analysisData && format(analysisData.dateRange.end, 'dd MMM', { locale: fr })}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={exportToPDF}
            className="rounded-2xl h-10 w-10"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Period Selector */}
        <div className="flex justify-center">
          <Select value={period} onValueChange={(value) => setPeriod(value as AnalysisPeriod)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Dernière semaine</SelectItem>
              <SelectItem value="month">Dernier mois</SelectItem>
              <SelectItem value="quarter">Dernier trimestre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {analysisData && (
          <>
            {/* Score Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Card className={`text-center ${getScoreBgColor(analysisData.scores.overall)}`}>
                <CardContent className="p-4">
                  <div className={`text-2xl font-bold ${getScoreColor(analysisData.scores.overall)}`}>
                    {analysisData.scores.overall}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Score Global</div>
                </CardContent>
              </Card>
              <Card className={`text-center ${getScoreBgColor(analysisData.scores.protein)}`}>
                <CardContent className="p-4">
                  <div className={`text-2xl font-bold ${getScoreColor(analysisData.scores.protein)}`}>
                    {analysisData.scores.protein}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Protéines</div>
                </CardContent>
              </Card>
              <Card className={`text-center ${getScoreBgColor(analysisData.scores.balance)}`}>
                <CardContent className="p-4">
                  <div className={`text-2xl font-bold ${getScoreColor(analysisData.scores.balance)}`}>
                    {analysisData.scores.balance}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Équilibre</div>
                </CardContent>
              </Card>
              <Card className={`text-center ${getScoreBgColor(analysisData.scores.consistency)}`}>
                <CardContent className="p-4">
                  <div className={`text-2xl font-bold ${getScoreColor(analysisData.scores.consistency)}`}>
                    {analysisData.scores.consistency}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Régularité</div>
                </CardContent>
              </Card>
              <Card className={`text-center ${getScoreBgColor(analysisData.scores.variety)}`}>
                <CardContent className="p-4">
                  <div className={`text-2xl font-bold ${getScoreColor(analysisData.scores.variety)}`}>
                    {analysisData.scores.variety}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Variété</div>
                </CardContent>
              </Card>
            </div>

            {/* Key Metrics */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Objectif Protéines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analysisData.proteinGoalAchievement}%</div>
                  <Progress value={analysisData.proteinGoalAchievement} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysisData.avgDailyProtein}g / jour en moyenne
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-600" />
                    Repas Enregistrés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analysisData.totalMeals}</div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Total sur la période
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    Meilleur Jour
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{analysisData.bestDay.protein}g</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysisData.bestDay.date}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-600" />
                    Calories Moyennes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analysisData.avgDailyCalories}</div>
                  <p className="text-xs text-muted-foreground mt-3">
                    kcal / jour
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Insights and Recommendations */}
            <Tabs defaultValue="insights" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
                <TabsTrigger value="trends">Tendances</TabsTrigger>
              </TabsList>
              
              <TabsContent value="insights" className="space-y-4">
                {analysisData.insights.length > 0 ? (
                  <div className="grid gap-4">
                    {analysisData.insights.map((insight, index) => (
                      <Card key={index} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className={`h-5 w-5 mt-0.5 ${
                              insight.type === 'success' ? 'text-green-600' :
                              insight.type === 'warning' ? 'text-yellow-600' :
                              insight.type === 'error' ? 'text-red-600' : 'text-blue-600'
                            }`} />
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                              <p className="text-sm text-muted-foreground">{insight.description}</p>
                              {insight.actionable && (
                                <Button variant="link" className="h-auto p-0 mt-2 text-xs">
                                  {insight.actionable}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">Pas d'insights disponibles pour cette période.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                {analysisData.recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {analysisData.recommendations.map((recommendation, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                              {index + 1}
                            </span>
                            <p className="text-sm leading-relaxed">{recommendation}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">Aucune recommandation disponible pour cette période.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Évolution hebdomadaire</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysisData.trends.map((trend, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <div className="text-sm font-medium">{trend.period}</div>
                            <div className="text-xs text-muted-foreground">
                              {Math.round(trend.avgProtein)}g protéines • {trend.mealCount} repas
                            </div>
                          </div>
                          <Badge variant={trend.score >= 80 ? "default" : trend.score >= 60 ? "secondary" : "destructive"}>
                            {trend.score}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}