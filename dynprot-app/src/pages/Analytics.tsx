import React, { useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, ArrowLeft } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import type { MealEntry } from "@/context/AppContext";

// Component imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeeklyTrendChart } from "@/components/WeeklyTrendChart";
import { DailyDashboard } from "@/components/DailyDashboard";
import { MealsTimeline } from "@/components/MealsTimeline";
import { ContextualInsights } from "@/components/ContextualInsights";
import DataExport from "@/components/DataExport";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { nutritionalAnalysis } from "@/services/nutritionalAnalysis.service";

export default function Analytics() {
  const navigate = useNavigate();
  const { state, deleteMeal, addFavoriteMeal, markAnalyticsViewed } = useAppContext();
  
  const meals = state?.meals ?? [];
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiAnalysisData, setAIAnalysisData] = useState<any>(null);

  // Mark analytics as viewed when component mounts
  React.useEffect(() => {
    markAnalyticsViewed();
  }, [markAnalyticsViewed]);

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await deleteMeal(mealId);
      toast.success("Repas supprimé avec succès");
    } catch (error) {
      console.error('Error deleting meal:', error);
      toast.error("Erreur lors de la suppression du repas");
    }
  };

  const handleAddToFavorites = (meal: MealEntry) => {
    if (isMealInFavorites(meal)) {
      toast.info("Ce repas est déjà dans vos favoris");
      return;
    }

    // Vérification de sécurité pour meal.description
    if (!meal.description) {
      toast.error("Impossible d'ajouter ce repas : description manquante");
      return;
    }

    const favoriteData = {
      name: meal.description.trim(), // Utilise la description comme nom
      description: meal.description.trim(),
      protein: Math.round(Math.max(0, meal.protein || 0)),
      calories: meal.calories && meal.calories > 0 ? Math.round(meal.calories) : null,
      tags: meal.tags || [],
    };
    
    addFavoriteMeal(favoriteData);
    toast.success("Repas ajouté aux favoris !");
  };

  const isMealInFavorites = (meal: MealEntry) => {
    if (!meal.description) return false;
    return (state.favoriteMeals || []).some(
      fav => fav.description && fav.description.toLowerCase() === meal.description.toLowerCase()
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

          {/* Daily Dashboard */}
          <motion.div variants={itemVariants}>
            <DailyDashboard meals={meals} />
          </motion.div>

          {/* Meals Timeline */}
          <motion.div variants={itemVariants}>
            <MealsTimeline 
              meals={meals}
              onDeleteMeal={handleDeleteMeal}
              onAddToFavorites={handleAddToFavorites}
              isMealInFavorites={isMealInFavorites}
            />
          </motion.div>

          {/* Contextual Insights */}
          <motion.div variants={itemVariants}>
            <ContextualInsights 
              meals={meals}
              aiAnalysisData={aiAnalysisData}
              isLoadingAI={isLoadingAI}
            />
          </motion.div>

          {/* Weekly Trends Chart */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-ios backdrop-blur-xl hover:shadow-ios-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary" strokeWidth={2.5} />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Tendances hebdomadaires</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Évolution de vos apports nutritionnels
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <WeeklyTrendChart showProtein showCalories={false} />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}