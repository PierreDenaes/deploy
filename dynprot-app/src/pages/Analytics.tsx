import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { format, parseISO, isToday, isThisWeek, isThisMonth, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { 
  BarChart3,
  Filter, 
  ArrowUpDown,
  Search,
  ArrowLeft,
  Heart,
  Utensils,
  Clock,
  Trash2,
  TrendingUp,
  Calendar,
  Target,
  Award,
  Activity,
  AlertCircle
} from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import type { MealEntry } from "@/context/AppContext";
import type { DateRange } from "react-day-picker";

// Component imports
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { WeeklyTrendChart } from "@/components/WeeklyTrendChart";
import PeriodSummary from "@/components/PeriodSummary";
import DataExport from "@/components/DataExport";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { nutritionalAnalysis } from "@/services/nutritionalAnalysis.service";

type DateFilter = "all" | "today" | "week" | "month" | "custom";
type SortDirection = "asc" | "desc";
type SortField = "date" | "protein";

// AI Analysis types
interface NutritionalScore {
  overall: number;
  protein: number;
  balance: number;
  consistency: number;
  variety: number;
}

interface NutritionalInsight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
  actionable?: string;
}

interface AIAnalysisData {
  period: 'week' | 'month' | 'quarter';
  scores: NutritionalScore;
  insights: NutritionalInsight[];
  recommendations: string[];
  totalMeals: number;
  avgDailyProtein: number;
  avgDailyCalories: number;
  proteinGoalAchievement: number;
  bestDay: { date: string; protein: number };
  improvementAreas: string[];
}

export default function Analytics() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, deleteMeal, addFavoriteMeal } = useAppContext();
  
  // Get tab from URL params with legacy support, default to 'analytics'
  const rawTab = searchParams.get('tab');
  const currentTab = (() => {
    // Handle legacy URLs
    if (rawTab === 'overview' || rawTab === 'trends') return 'analytics';
    if (rawTab === 'details') return 'history';
    if (rawTab === 'ai' || rawTab === 'insights') return 'ai-insights';
    return rawTab || 'analytics';
  })();
  
  const meals = state?.meals ?? [];
  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sortField, setSortField] = useState<SortField>("date");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date(),
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<string | null>(null);
  
  // AI Analysis states
  const [aiAnalysisData, setAIAnalysisData] = useState<AIAnalysisData | null>(null);
  const [aiPeriod, setAIPeriod] = useState<'week' | 'month' | 'quarter'>('week');
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Note: Analytics viewing tracking disabled (API endpoint not implemented)

  // Handle tab changes and update URL
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
    
    // Load AI analysis when switching to AI tab
    if (tab === 'ai-insights' && !aiAnalysisData) {
      generateAIAnalysis();
    }
  };

  // Load AI analysis when period changes
  React.useEffect(() => {
    if (currentTab === 'ai-insights') {
      generateAIAnalysis();
    }
  }, [aiPeriod]);

  // Load AI analysis initially if on AI tab
  React.useEffect(() => {
    if (currentTab === 'ai-insights' && !aiAnalysisData) {
      generateAIAnalysis();
    }
  }, [currentTab]);

  const generateAIAnalysis = async () => {
    if (!state.user || !state.userSettings) {
      toast.error("Profil utilisateur manquant");
      return;
    }

    // Check if AI features are enabled
    if (!state.ai?.features?.nutritionAnalysis) {
      toast.error("L'analyse IA n'est pas activée. Activez-la dans votre profil.");
      return;
    }

    setIsLoadingAI(true);
    try {
      // Build userProfile
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

      // Calculate period dates
      const endDate = new Date();
      let startDate: Date;
      let analysisPeriod: 'week' | 'month' | '3months';
      
      switch (aiPeriod) {
        case 'week':
          startDate = subDays(endDate, 7);
          analysisPeriod = 'week';
          break;
        case 'month':
          startDate = subDays(endDate, 30);
          analysisPeriod = 'month';
          break;
        case 'quarter':
          startDate = subDays(endDate, 90);
          analysisPeriod = '3months';
          break;
      }

      // Filter meals for the period
      const relevantMeals = meals.filter(meal => {
        const mealDate = new Date(meal.timestamp);
        return mealDate >= startDate && mealDate <= endDate;
      });

      if (relevantMeals.length === 0) {
        const defaultAnalysis: AIAnalysisData = {
          period: aiPeriod,
          scores: { overall: 0, protein: 0, balance: 0, consistency: 0, variety: 0 },
          insights: [{
            type: 'info',
            title: 'Commencez votre suivi',
            description: 'Aucun repas n\'a été enregistré pour cette période. Commencez à logger vos repas pour obtenir une analyse détaillée.'
          }],
          recommendations: ['Commencez par enregistrer vos repas quotidiens'],
          totalMeals: 0,
          avgDailyProtein: 0,
          avgDailyCalories: 0,
          proteinGoalAchievement: 0,
          bestDay: { date: 'Aucun repas enregistré', protein: 0 },
          improvementAreas: []
        };
        setAIAnalysisData(defaultAnalysis);
        return;
      }

      // Call AI analysis service
      const request = {
        period: analysisPeriod,
        detailLevel: 'detailed' as const
      };

      const aiAnalysis = await nutritionalAnalysis.generateAnalysisReport(userProfile, relevantMeals, request);
      
      // Transform AI response to our format
      const transformedData: AIAnalysisData = {
        period: aiPeriod,
        scores: {
          overall: aiAnalysis.summary?.overallScore || 0,
          protein: Math.min((aiAnalysis.summary?.proteinGoalAchievement || 0), 100),
          balance: aiAnalysis.benchmarks?.vs_goals?.balance || 0,
          consistency: aiAnalysis.metrics?.consistencyScore || 0,
          variety: aiAnalysis.metrics?.varietyScore || 0
        },
        insights: [
          ...(aiAnalysis.insights?.strengths?.map(s => ({
            type: 'success' as const,
            title: s.title,
            description: s.description
          })) || []),
          ...(aiAnalysis.insights?.improvements?.map(i => ({
            type: 'warning' as const,
            title: i.title,
            description: i.description
          })) || []),
          ...(aiAnalysis.insights?.alerts?.map(a => ({
            type: 'error' as const,
            title: a.title,
            description: a.description
          })) || [])
        ],
        recommendations: aiAnalysis.insights?.personalizedTips?.map(t => t.tip) || [],
        totalMeals: aiAnalysis.summary?.totalMeals || relevantMeals.length,
        avgDailyProtein: Math.round(aiAnalysis.summary?.avgDailyProtein || 0),
        avgDailyCalories: Math.round(aiAnalysis.summary?.avgDailyCalories || 0),
        proteinGoalAchievement: Math.round(aiAnalysis.summary?.proteinGoalAchievement || 0),
        bestDay: {
          date: 'Analyse en cours',
          protein: Math.round(aiAnalysis.summary?.avgDailyProtein || 0)
        },
        improvementAreas: aiAnalysis.insights?.improvements?.map(i => i.title) || []
      };

      setAIAnalysisData(transformedData);
      
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      toast.error("Erreur lors de l'analyse IA. Veuillez réessayer.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const groupedMeals = useMemo(() => {
    const filtered = meals
      .filter((meal) => {
        const mealDate = parseISO(meal.timestamp);
        const matchesSearch = meal.description.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        switch (dateFilter) {
          case "today": return isToday(mealDate);
          case "week": return isThisWeek(mealDate, { weekStartsOn: 1 });
          case "month": return isThisMonth(mealDate);
          case "custom": {
            const isAfterFrom = customDateRange?.from ? mealDate >= customDateRange.from : true;
            const isBeforeTo = customDateRange?.to ? mealDate <= customDateRange.to : true;
            return isAfterFrom && isBeforeTo;
          }
          default: return true;
        }
      })
      .sort((a, b) => {
        if (sortField === "date") {
          return sortDirection === "asc"
            ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        } else {
          return sortDirection === "asc"
            ? a.protein - b.protein
            : b.protein - a.protein;
        }
      });

    const groups: { [key: string]: { meals: typeof filtered; totalProtein: number; totalCalories: number } } = {};
    filtered.forEach(meal => {
      const dateKey = format(parseISO(meal.timestamp), "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = { meals: [], totalProtein: 0, totalCalories: 0 };
      }
      groups[dateKey].meals.push(meal);
      groups[dateKey].totalProtein += meal.protein;
      if (meal.calories) groups[dateKey].totalCalories += meal.calories;
    });

    // Sort groups by date
    const sortedGroups = Object.keys(groups).sort((a, b) => {
      return sortDirection === "asc" ? a.localeCompare(b) : b.localeCompare(a);
    }).map(dateKey => ({ date: dateKey, ...groups[dateKey] }));

    return sortedGroups;
  }, [meals, dateFilter, customDateRange, searchTerm, sortField, sortDirection]);

  const stats = useMemo(() => {
    const allFilteredMeals = groupedMeals.flatMap(group => group.meals);
    const totalProtein = allFilteredMeals.reduce((sum, meal) => sum + meal.protein, 0);
    const avgProtein = allFilteredMeals.length > 0 ? Math.round(totalProtein / allFilteredMeals.length) : 0;
    return {
      totalMeals: allFilteredMeals.length,
      totalProtein,
      avgProtein,
    };
  }, [groupedMeals]);

  const getDateFilterName = () => {
    if (dateFilter === "custom") {
      if (customDateRange?.from && customDateRange?.to) {
        return `${format(customDateRange.from, "d MMM", { locale: fr })} - ${format(customDateRange.to, "d MMM", { locale: fr })}`;
      }
      return "Plage personnalisée";
    }
    const names = { all: "Tout", today: "Aujourd'hui", week: "Cette semaine", month: "Ce mois" };
    return names[dateFilter];
  };

  const handleDeleteMeal = (mealId: string) => {
    setMealToDelete(mealId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteMeal = () => {
    if (mealToDelete) {
      deleteMeal(mealToDelete);
      toast.success("Repas supprimé avec succès");
      setShowDeleteDialog(false);
      setMealToDelete(null);
    }
  };

  const handleAddToFavorites = (meal: MealEntry) => {
    // Check if meal is already in favorites
    const existingFavorite = (state.favoriteMeals || []).find(
      fav => fav.description.toLowerCase() === meal.description.toLowerCase()
    );
    
    if (existingFavorite) {
      toast.info("Ce repas est déjà dans vos favoris");
      return;
    }

    const favoriteData = {
      name: meal.description.split(' ').slice(0, 3).join(' ').trim() || 'Repas favori',
      description: meal.description.trim(),
      protein: Math.round(Math.max(0, meal.protein || 0)),
      calories: meal.calories && meal.calories > 0 ? Math.round(meal.calories) : null,
      tags: meal.tags || [],
    };
    
    addFavoriteMeal(favoriteData);
    toast.success("Repas ajouté aux favoris !");
  };

  const isMealInFavorites = (meal: MealEntry) => {
    return (state.favoriteMeals || []).some(
      fav => fav.description.toLowerCase() === meal.description.toLowerCase()
    );
  };

  const containerVariants = { 
    hidden: { opacity: 0 }, 
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } } 
  };
  
  const itemVariants = { 
    hidden: { y: 20, opacity: 0 }, 
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } } 
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      <div className="container max-w-4xl mx-auto p-4 pb-32">
        <motion.div 
          className="space-y-8" 
          initial="hidden" 
          animate="visible" 
          variants={containerVariants}
        >
          {/* Header */}
          <motion.header 
            variants={itemVariants} 
            className="flex items-center justify-between mb-8 sticky top-0 glass z-20 -mx-4 px-4 sm:px-6 py-4 border-b border-border/30"
          >
            <div className="flex items-center flex-1 min-w-0">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  aria-label="Retour"
                  className="mr-3 sm:mr-4 rounded-2xl h-10 w-10 sm:h-12 sm:w-12 hover:bg-primary/10 flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                </Button>
              </motion.div>
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center shadow-ios flex-shrink-0">
                  <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" strokeWidth={2.5} />
                </div>
                <h1 className="text-xl sm:text-3xl font-bold text-foreground tracking-tight truncate">
                  Analytics
                </h1>
              </div>
            </div>
            <div className="ml-4 flex-shrink-0">
              <DataExport 
                variant="inline" 
                className="h-10 sm:h-12 px-3 sm:px-6 rounded-2xl font-semibold shadow-ios text-sm sm:text-base"
                buttonText="Exporter"
              />
            </div>
          </motion.header>

          {/* Main Content with Tabs */}
          <motion.div variants={itemVariants}>
            <Tabs value={currentTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
                  <span className="hidden sm:inline">Analytics</span>
                  <span className="sm:hidden">Stats</span>
                </TabsTrigger>
                <TabsTrigger value="ai-insights" className="flex items-center gap-2">
                  <Target className="h-4 w-4" strokeWidth={2.5} />
                  <span className="hidden sm:inline">IA Insights</span>
                  <span className="sm:hidden">IA</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" strokeWidth={2.5} />
                  <span className="hidden sm:inline">Historique</span>
                  <span className="sm:hidden">Liste</span>
                </TabsTrigger>
              </TabsList>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-8 mt-8">
                {/* Quick Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {/* Protéines - 2 colonnes sur mobile, 1 colonne sur desktop */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="col-span-2 sm:col-span-1 sm:order-2"
                  >
                    <Card className="border-0 shadow-ios backdrop-blur-xl text-center hover:shadow-ios-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <Target className="h-6 w-6 text-accent" strokeWidth={2.5} />
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1 break-words">{stats.totalProtein}g</p>
                        <p className="text-base text-muted-foreground font-medium">Protéines</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  
                  {/* Repas - 1 colonne sur mobile, order pour desktop */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="col-span-1 sm:order-1"
                  >
                    <Card className="border-0 shadow-ios backdrop-blur-xl text-center hover:shadow-ios-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <Utensils className="h-6 w-6 text-primary" strokeWidth={2.5} />
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1 break-words">{stats.totalMeals}</p>
                        <p className="text-base text-muted-foreground font-medium">Repas</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  
                  {/* Moyenne - 1 colonne sur mobile, order pour desktop */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="col-span-1 sm:order-3"
                  >
                    <Card className="border-0 shadow-ios backdrop-blur-xl text-center hover:shadow-ios-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="w-12 h-12 bg-ios-green/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <Award className="h-6 w-6 text-ios-green" strokeWidth={2.5} />
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1 break-words">{stats.avgProtein}g</p>
                        <p className="text-base text-muted-foreground font-medium">Moyenne</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Trend Chart */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="border-0 shadow-ios backdrop-blur-xl hover:shadow-ios-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-primary" strokeWidth={2.5} />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold">Tendances</CardTitle>
                          <CardDescription className="text-base font-medium">{getDateFilterName()}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <WeeklyTrendChart showProtein showCalories={false} />
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Period Summary - Compact Mode */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <PeriodSummary />
                </motion.div>
              </TabsContent>

              {/* AI Insights Tab */}
              <TabsContent value="ai-insights" className="space-y-8 mt-8">
                {isLoadingAI ? (
                  <div className="text-center py-20">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6"
                    />
                    <h2 className="text-xl font-bold mb-2">Analyse IA en cours</h2>
                    <p className="text-base text-muted-foreground">
                      Notre IA analyse vos habitudes nutritionnelles...
                    </p>
                  </div>
                ) : aiAnalysisData ? (
                  <>
                    {/* Period Selector for AI */}
                    <div className="flex justify-center">
                      <div className="flex items-center gap-2 p-1 bg-muted rounded-2xl">
                        {(['week', 'month', 'quarter'] as const).map((period) => (
                          <Button
                            key={period}
                            variant={aiPeriod === period ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setAIPeriod(period)}
                            className="rounded-xl px-4 py-2"
                          >
                            {period === 'week' ? 'Semaine' : period === 'month' ? 'Mois' : 'Trimestre'}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* AI Score Overview */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {Object.entries({
                        overall: { label: 'Global', icon: Award },
                        protein: { label: 'Protéines', icon: Target },
                        balance: { label: 'Équilibre', icon: Activity },
                        consistency: { label: 'Régularité', icon: Clock },
                        variety: { label: 'Variété', icon: Utensils }
                      }).map(([key, { label, icon: Icon }]) => {
                        const score = aiAnalysisData.scores[key as keyof NutritionalScore];
                        const getScoreColor = (score: number) => {
                          if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
                          if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
                          return 'text-red-600 bg-red-50 border-red-200';
                        };
                        
                        return (
                          <Card key={key} className={`text-center ${getScoreColor(score)}`}>
                            <CardContent className="p-4">
                              <Icon className="h-6 w-6 mx-auto mb-2" />
                              <div className="text-2xl font-bold">{score}</div>
                              <div className="text-sm font-medium">{label}</div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* AI Insights */}
                    {aiAnalysisData.insights.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Insights IA
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {aiAnalysisData.insights.slice(0, 6).map((insight, index) => {
                            const getInsightIcon = (type: string) => {
                              switch (type) {
                                case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />;
                                case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-600" />;
                                case 'error': return <AlertCircle className="h-5 w-5 text-red-600" />;
                                default: return <AlertCircle className="h-5 w-5 text-blue-600" />;
                              }
                            };
                            
                            return (
                              <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                                {getInsightIcon(insight.type)}
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm">{insight.title}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )}

                    {/* AI Recommendations */}
                    {aiAnalysisData.recommendations.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Recommandations
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {aiAnalysisData.recommendations.slice(0, 5).map((rec, index) => (
                              <li key={index} className="flex items-start gap-3 text-sm">
                                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-primary">{aiAnalysisData.totalMeals}</div>
                          <div className="text-sm text-muted-foreground">Repas total</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-primary">{aiAnalysisData.avgDailyProtein}g</div>
                          <div className="text-sm text-muted-foreground">Protéines/jour</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-primary">{aiAnalysisData.avgDailyCalories}</div>
                          <div className="text-sm text-muted-foreground">Calories/jour</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-primary">{aiAnalysisData.proteinGoalAchievement}%</div>
                          <div className="text-sm text-muted-foreground">Objectif atteint</div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20">
                    <Target className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
                    <h2 className="text-xl font-bold mb-2">Analyse IA non disponible</h2>
                    <p className="text-base text-muted-foreground mb-6">
                      Activez l'analyse IA dans votre profil pour obtenir des insights personnalisés.
                    </p>
                    <Button onClick={() => navigate('/profile')} variant="outline">
                      Aller au profil
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-8 mt-8">
                {/* Filters and Search */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-grow">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" strokeWidth={2} />
                    <Input
                      placeholder="Rechercher un repas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-14 h-14 text-lg font-medium shadow-ios"
                    />
                  </div>
                  <div className="flex gap-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-12 sm:h-14 px-3 sm:px-6 text-sm sm:text-base font-semibold shadow-ios border-border/20 hover:border-primary/30 hover:bg-primary/5">
                          <Filter className="h-4 sm:h-5 w-4 sm:w-5 mr-2 sm:mr-3" strokeWidth={2.5} />
                          <span className="hidden sm:inline">{getDateFilterName()}</span>
                          <span className="sm:hidden">Filtre</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDateFilter("all")}>Tout</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDateFilter("today")}>Aujourd'hui</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDateFilter("week")}>Cette semaine</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDateFilter("month")}>Ce mois</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start font-normal">
                              Personnalisé
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent 
                              mode="range" 
                              selected={customDateRange} 
                              onSelect={setCustomDateRange} 
                              initialFocus 
                            />
                          </PopoverContent>
                        </Popover>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-12 sm:h-14 px-3 sm:px-6 text-sm sm:text-base font-semibold shadow-ios border-border/20 hover:border-accent/30 hover:bg-accent/5">
                          <ArrowUpDown className="h-4 sm:h-5 w-4 sm:w-5 mr-2 sm:mr-3" strokeWidth={2.5} />
                          <span className="hidden sm:inline">Trier</span>
                          <span className="sm:hidden">Tri</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Trier par</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem 
                          checked={sortField === 'date' && sortDirection === 'desc'} 
                          onCheckedChange={() => { setSortField("date"); setSortDirection("desc"); }}
                        >
                          Date (plus récent)
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem 
                          checked={sortField === 'date' && sortDirection === 'asc'} 
                          onCheckedChange={() => { setSortField("date"); setSortDirection("asc"); }}
                        >
                          Date (plus ancien)
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem 
                          checked={sortField === 'protein' && sortDirection === 'desc'} 
                          onCheckedChange={() => { setSortField("protein"); setSortDirection("desc"); }}
                        >
                          Protéines (élevé)
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem 
                          checked={sortField === 'protein' && sortDirection === 'asc'} 
                          onCheckedChange={() => { setSortField("protein"); setSortDirection("asc"); }}
                        >
                          Protéines (faible)
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Detailed Meal History */}
                <div className="space-y-8">
                  {groupedMeals.length > 0 ? (
                    groupedMeals.map((group, groupIndex) => (
                      <motion.div 
                        key={group.date} 
                        className="space-y-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: groupIndex * 0.1 }}
                      >
                        <div className="flex items-center justify-between px-6 py-4 bg-muted/50 backdrop-blur-xl rounded-2xl shadow-ios border border-border/20">
                          <h3 className="text-xl font-bold text-foreground">
                            {format(parseISO(group.date), "EEEE d MMMM", { locale: fr })}
                          </h3>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="text-sm sm:text-lg font-bold py-1 sm:py-2 px-2 sm:px-4 rounded-xl bg-primary/10 text-primary border-primary/20">
                              {group.totalProtein}g
                            </Badge>
                            <Badge variant="outline" className="text-sm sm:text-lg font-bold py-1 sm:py-2 px-2 sm:px-4 rounded-xl border-accent/20 text-accent">
                              {group.totalCalories} kcal
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {group.meals.map((meal, mealIndex) => (
                            <motion.div 
                              key={meal.id} 
                              initial={{ opacity: 0, x: -20 }} 
                              animate={{ opacity: 1, x: 0 }} 
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: mealIndex * 0.05 }}
                              whileHover={{ x: 4 }}
                            >
                              <Card className="border-0 shadow-ios backdrop-blur-xl hover:shadow-ios-lg transition-all duration-200">
                                <CardContent className="p-4 sm:p-6">
                                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                                    <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center shadow-ios-sm flex-shrink-0">
                                        <Utensils className="h-6 w-6 sm:h-7 sm:w-7 text-primary" strokeWidth={2.5} />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h3 className="text-sm sm:text-lg font-bold text-foreground mb-1 truncate">
                                          {meal.description}
                                        </h3>
                                        <div className="flex items-center text-xs sm:text-base text-muted-foreground">
                                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" strokeWidth={2} />
                                          {format(parseISO(meal.timestamp), "HH:mm", { locale: fr })}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                                      <Badge variant="secondary" className="text-xs sm:text-lg font-bold py-1 sm:py-2 px-2 sm:px-4 rounded-xl bg-primary/10 text-primary border-primary/20">
                                        {meal.protein}g
                                      </Badge>
                                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => handleAddToFavorites(meal)}
                                          disabled={isMealInFavorites(meal)}
                                          className={cn(
                                            "h-8 w-8 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl transition-colors shadow-ios-sm",
                                            isMealInFavorites(meal) 
                                              ? "text-ios-red bg-ios-red/10 hover:bg-ios-red/20" 
                                              : "text-muted-foreground hover:text-ios-red hover:bg-ios-red/10"
                                          )}
                                          title={isMealInFavorites(meal) ? "Déjà dans les favoris" : "Ajouter aux favoris"}
                                        >
                                          <Heart className={cn("h-4 w-4 sm:h-5 sm:w-5", isMealInFavorites(meal) && "fill-current")} strokeWidth={2} />
                                        </Button>
                                      </motion.div>
                                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => handleDeleteMeal(meal.id)} 
                                          className="h-8 w-8 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 shadow-ios-sm"
                                        >
                                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
                                        </Button>
                                      </motion.div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div 
                      className="text-center py-20"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <div className="w-24 h-24 bg-gradient-to-br from-muted to-muted/50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-ios">
                        <BarChart3 className="h-12 w-12 text-muted-foreground" strokeWidth={2} />
                      </div>
                      <h3 className="text-2xl font-bold mb-3 text-foreground">Aucun repas trouvé</h3>
                      <p className="text-lg text-muted-foreground leading-relaxed">
                        {searchTerm ? "Essayez un autre terme de recherche." : "Modifiez vos filtres ou ajoutez de nouveaux repas."}
                      </p>
                    </motion.div>
                  )}
                </div>
              </TabsContent>

            </Tabs>
          </motion.div>
        </motion.div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="rounded-3xl border-0 shadow-ios-xl backdrop-blur-xl">
            <DialogHeader className="text-center">
              <div className="w-16 h-16 bg-destructive/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-8 w-8 text-destructive" strokeWidth={2} />
              </div>
              <DialogTitle className="text-2xl font-bold">Supprimer le repas</DialogTitle>
              <DialogDescription className="text-lg leading-relaxed mt-2">
                Êtes-vous sûr de vouloir supprimer ce repas ? Cette action est irréversible.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 h-12 rounded-2xl text-base font-semibold shadow-ios"
              >
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteMeal}
                className="flex-1 h-12 rounded-2xl text-base font-semibold shadow-ios"
              >
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}