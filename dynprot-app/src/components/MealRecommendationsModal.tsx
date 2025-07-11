import { motion } from 'framer-motion';
import { Clock, Users, ChefHat, Zap, Target, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface MealRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  ingredients: Array<{
    name: string;
    quantity: string;
    unit: string;
  }>;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  confidence: number;
  source: 'ai_generated' | 'adapted_recipe';
}

interface MealRecommendationsResponse {
  recommendations: MealRecommendation[];
  explanation: string;
  tips: string[];
  nutritionalInsights: string[];
  weeklyGoalProgress?: {
    proteinProgress: number;
    calorieProgress: number;
    balanceScore: number;
  };
}

interface MealRecommendationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: MealRecommendationsResponse | null;
  isLoading?: boolean;
}

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

export default function MealRecommendationsModal({
  isOpen,
  onClose,
  recommendations,
  isLoading = false
}: MealRecommendationsModalProps) {
  
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto rounded-3xl border-0 shadow-ios-xl backdrop-blur-xl bg-background/95">
          <DialogTitle className="sr-only">Génération de recommandations en cours</DialogTitle>
          <DialogDescription className="sr-only">
            L'intelligence artificielle génère vos recommandations de repas personnalisées
          </DialogDescription>
          <div className="p-6 text-center">
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
        </DialogContent>
      </Dialog>
    );
  }

  if (!recommendations) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-[100vh] p-0 border-0 shadow-none bg-background overflow-hidden rounded-none sm:rounded-3xl sm:max-w-2xl sm:max-h-[90vh] sm:shadow-ios-xl">
        <DialogTitle className="sr-only">Recommandations de repas personnalisées</DialogTitle>
        <DialogDescription className="sr-only">
          {recommendations.recommendations.length} recommandations de repas générées par intelligence artificielle selon vos objectifs nutritionnels
        </DialogDescription>
        {/* Header fixe style iOS */}
        <div className="sticky top-0 z-10 glass border-b border-border/30 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between p-4 sm:p-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-2xl h-10 w-10 hover:bg-muted/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-center flex-1 px-4">
              <h1 className="text-lg sm:text-xl font-bold truncate">Recommandations IA</h1>
              <p className="text-sm text-muted-foreground">
                {recommendations.recommendations.length} suggestion{recommendations.recommendations.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-10"></div>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto max-h-[calc(100vh-120px)] sm:max-h-[calc(90vh-120px)]">
          <div className="p-4 sm:p-6 space-y-6">
            
            {/* Progress cards - style iOS compact */}
            {recommendations.weeklyGoalProgress && (
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

            {/* Explication */}
            {recommendations.explanation && (
              <Card className="border-0 shadow-ios bg-gradient-to-r from-primary/5 to-accent/5">
                <CardContent className="p-4">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {recommendations.explanation}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recommandations de repas - style iOS Cards */}
            <div className="space-y-4">
              {recommendations.recommendations.map((meal, index) => (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-0 shadow-ios hover:shadow-ios-lg transition-shadow overflow-hidden">
                    <CardContent className="p-0">
                      {/* Header du repas */}
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
                        </div>
                        
                        {/* Tags et difficulté */}
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
                      
                      {/* Nutrition grid compact */}
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

                      {/* Ingrédients et instructions en colonnes compactes */}
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

            {/* Tips compact */}
            {recommendations.tips.length > 0 && (
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

            {/* Insights nutritionnels */}
            {recommendations.nutritionalInsights.length > 0 && (
              <Card className="border-0 shadow-ios bg-gradient-to-r from-green-50 to-blue-50">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" />
                    Résumé nutritionnel
                  </h4>
                  <div className="space-y-2">
                    {recommendations.nutritionalInsights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 text-xs mt-1">✓</span>
                        <span className="leading-relaxed font-medium">{insight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Espace en bas pour éviter que le contenu soit caché */}
            <div className="h-4"></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}