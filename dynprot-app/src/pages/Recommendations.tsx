import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter, Heart, Clock, Users, Zap, ChefHat, Target, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/context/AppContext';
import { nutritionCoach } from '@/services/nutritionCoach.service';
import type { MealRecommendation, CoachRecommendationResponse } from '@/services/nutritionCoach.service';
import { toast } from 'sonner';

const categoryLabels = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner', 
  dinner: 'Dîner',
  snack: 'Collation'
};

const categoryEmojis = {
  breakfast: '☀️',
  lunch: '🥗',
  dinner: '🍽️',
  snack: '🍎'
};

const difficultyColors = {
  easy: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
  hard: 'bg-red-100 text-red-800 border-red-200'
};

const difficultyLabels = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile'
};

export default function Recommendations() {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const [recommendations, setRecommendations] = useState<CoachRecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'>('all');
  const [sortBy, setSortBy] = useState<'protein' | 'calories' | 'time' | 'difficulty'>('protein');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Charger les recommandations au montage
  useEffect(() => {
    generateRecommendations();
  }, []);

  const generateRecommendations = async () => {
    // No need to check for state.user.profile, just check for required fields
    if (!state.user || !state.userSettings) {
      toast.error("Profil utilisateur manquant");
      return;
    }

    setIsLoading(true);
    try {
      // Build userProfile as in Profile.tsx
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

      const request = {
        type: 'meal' as const,
        mealType: 'lunch' as const,
        context: 'Page recommandations - génération complète de repas'
      };

      const result = await nutritionCoach.getRecommendations(userProfile, request, state.meals.slice(-7));
      setRecommendations(result);
      
    } catch (error) {
      console.error('Erreur lors de la génération de recommandations:', error);
      toast.error("Impossible de générer les recommandations. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = (mealId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(mealId)) {
        newFavorites.delete(mealId);
        toast.success("Retiré des favoris");
      } else {
        newFavorites.add(mealId);
        toast.success("Ajouté aux favoris");
      }
      return newFavorites;
    });
  };

  const filteredRecommendations = recommendations?.recommendations.filter(meal => 
    activeCategory === 'all' || meal.category === activeCategory
  ).sort((a, b) => {
    switch (sortBy) {
      case 'protein':
        return b.nutrition.protein - a.nutrition.protein;
      case 'calories':
        return a.nutrition.calories - b.nutrition.calories;
      case 'time':
        return (a.prepTime + a.cookTime) - (b.prepTime + b.cookTime);
      case 'difficulty':
        const diffOrder = { easy: 1, medium: 2, hard: 3 };
        return diffOrder[a.difficulty] - diffOrder[b.difficulty];
      default:
        return 0;
    }
  }) || [];

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
            <h2 className="text-xl font-bold mb-2">Génération en cours</h2>
            <p className="text-base text-muted-foreground">
              Notre chef IA prépare vos recommandations personnalisées...
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
            <h1 className="text-lg sm:text-xl font-bold">Recommandations IA</h1>
            <p className="text-sm text-muted-foreground">
              {filteredRecommendations.length} recommandation{filteredRecommendations.length > 1 ? 's' : ''}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={generateRecommendations}
            className="rounded-2xl h-10 w-10"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Progress Overview */}
        {recommendations?.weeklyGoalProgress && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-primary/20 bg-primary/5 shadow-ios-sm">
              <CardContent className="p-4 text-center">
                <div className="text-xl font-bold text-primary">
                  {recommendations.weeklyGoalProgress.proteinProgress}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Protéines</div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50 shadow-ios-sm">
              <CardContent className="p-4 text-center">
                <div className="text-xl font-bold text-blue-600">
                  {recommendations.weeklyGoalProgress.calorieProgress}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">Calories</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50 shadow-ios-sm">
              <CardContent className="p-4 text-center">
                <div className="text-xl font-bold text-green-600">
                  {recommendations.weeklyGoalProgress.balanceScore}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Score</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as any)} className="flex-1">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="breakfast">☀️</TabsTrigger>
              <TabsTrigger value="lunch">🥗</TabsTrigger>
              <TabsTrigger value="dinner">🍽️</TabsTrigger>
              <TabsTrigger value="snack">🍎</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Trier par..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="protein">Protéines</SelectItem>
              <SelectItem value="calories">Calories</SelectItem>
              <SelectItem value="time">Temps de préparation</SelectItem>
              <SelectItem value="difficulty">Difficulté</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Recommendations Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredRecommendations.map((meal, index) => (
            <motion.div
              key={meal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-0 shadow-ios hover:shadow-ios-lg transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="p-4 bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border/20">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {categoryEmojis[meal.category]}
                          </span>
                          <Badge variant="secondary" className="text-xs rounded-xl">
                            {categoryLabels[meal.category]}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-base leading-tight mb-1">
                          {meal.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {meal.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(meal.id)}
                        className="rounded-full h-8 w-8 ml-2"
                      >
                        <Heart 
                          className={`h-4 w-4 ${favorites.has(meal.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
                        />
                      </Button>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs rounded-xl ${difficultyColors[meal.difficulty]}`}>
                        {difficultyLabels[meal.difficulty]}
                      </Badge>
                      {meal.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs rounded-xl">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Nutrition */}
                  <div className="p-4 border-b border-border/20">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">{meal.nutrition.calories}</div>
                        <div className="text-xs text-muted-foreground">kcal</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{meal.nutrition.protein}g</div>
                        <div className="text-xs text-muted-foreground">protéines</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{meal.nutrition.carbs}g</div>
                        <div className="text-xs text-muted-foreground">glucides</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">{meal.nutrition.fat}g</div>
                        <div className="text-xs text-muted-foreground">lipides</div>
                      </div>
                    </div>
                    
                    {/* Temps et portions */}
                    <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {meal.prepTime + meal.cookTime}min
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {meal.servings} pers.
                      </div>
                    </div>
                  </div>

                  {/* Ingrédients et instructions */}
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        Ingrédients ({meal.ingredients.length})
                      </h4>
                      <div className="space-y-1">
                        {meal.ingredients.map((ingredient, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="truncate flex-1">{ingredient.name}</span>
                            <span className="text-muted-foreground text-xs ml-2">
                              {ingredient.quantity} {ingredient.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-primary" />
                        Instructions
                      </h4>
                      <div className="space-y-2">
                        {meal.instructions.map((instruction, i) => (
                          <div key={i} className="flex gap-2 text-sm">
                            <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-sm leading-relaxed">{instruction}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tips */}
        {recommendations?.tips && recommendations.tips.length > 0 && (
          <Card className="border-0 shadow-ios bg-gradient-to-r from-accent/5 to-primary/5">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent" />
                Conseils du chef
              </h4>
              <div className="space-y-2">
                {recommendations.tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-accent text-xs mt-1">•</span>
                    <span className="leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}