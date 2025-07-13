import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter, Heart, Clock, Users, Zap, ChefHat, Target, Plus, AlertCircle, RefreshCw, Sparkles, Activity, TrendingUp, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppContext } from '@/context/AppContext';
import { nutritionCoach } from '@/services/nutritionCoach.service';
import type { MealRecommendation, CoachRecommendationResponse } from '@/services/nutritionCoach.service';
import { toast } from 'sonner';

const categoryLabels = {
  'petit-dejeuner': 'Petit-déjeuner',
  'dejeuner': 'Déjeuner', 
  'diner': 'Dîner',
  'collation': 'Collation'
};

const categoryEmojis = {
  'petit-dejeuner': '☀️',
  'dejeuner': '🥗',
  'diner': '🍽️',
  'collation': '🍎'
};

const difficultyColors = {
  facile: 'bg-green-100 text-green-800 border-green-200',
  moyen: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
  difficile: 'bg-red-100 text-red-800 border-red-200'
};

const difficultyLabels = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile'
};

// Helper function to ensure all categories are represented
const ensureCategoriesInRecommendations = (recommendations: MealRecommendation[]): MealRecommendation[] => {
  const categories: ('petit-dejeuner' | 'dejeuner' | 'diner' | 'collation')[] = 
    ['petit-dejeuner', 'dejeuner', 'diner', 'collation'];
  
  // If we have at least 4 recommendations, ensure each category is represented
  if (recommendations.length >= 4) {
    const result = [...recommendations];
    const existingCategories = new Set(result.map(r => r.categorie));
    
    categories.forEach((category, index) => {
      if (!existingCategories.has(category) && index < result.length) {
        // Find a recommendation that doesn't have a unique category and reassign it
        const duplicateIndex = result.findIndex((rec, idx) => {
          const cat = rec.categorie;
          return result.filter(r => r.categorie === cat).length > 1;
        });
        
        if (duplicateIndex !== -1) {
          result[duplicateIndex].categorie = category;
        }
      }
    });
    
    return result.slice(0, 4); // Return only 4 recommendations
  }
  
  return recommendations;
};

// Fallback recommendations generator
const generateFallbackRecommendations = (): MealRecommendation[] => {
  const categories: ('petit-dejeuner' | 'dejeuner' | 'diner' | 'collation')[] = 
    ['petit-dejeuner', 'dejeuner', 'diner', 'collation'];
  
  const fallbackData = [
    {
      titre: 'Omelette protéinée aux légumes',
      description: 'Un petit-déjeuner équilibré pour bien commencer la journée',
      categorie: 'petit-dejeuner' as const,
      nutrition: { calories: 320, proteines: 28, glucides: 12, lipides: 18, fibres: 3 },
      ingredients: [
        { nom: "Oeufs", quantite: "3", unite: "unités" },
        { nom: "Épinards frais", quantite: "50", unite: "g" },
        { nom: "Tomates cerises", quantite: "100", unite: "g" },
        { nom: "Fromage feta", quantite: "30", unite: "g" }
      ],
      instructions: [
        "Battre les œufs dans un bol",
        "Faire revenir les épinards et tomates dans une poêle",
        "Verser les œufs battus et cuire 3-4 minutes",
        "Ajouter le fromage feta émietté avant de servir"
      ],
      tempsPreparation: 5,
      tempsCuisson: 10,
      difficulte: 'facile' as const
    },
    {
      titre: 'Salade de quinoa au poulet grillé',
      description: 'Un déjeuner léger et nutritif',
      categorie: 'dejeuner' as const,
      nutrition: { calories: 380, proteines: 32, glucides: 35, lipides: 12, fibres: 8 },
      ingredients: [
        { nom: "Quinoa cuit", quantite: "150", unite: "g" },
        { nom: "Blanc de poulet", quantite: "120", unite: "g" },
        { nom: "Concombre", quantite: "100", unite: "g" },
        { nom: "Avocat", quantite: "0.5", unite: "unité" }
      ],
      instructions: [
        "Griller le poulet assaisonné 6-7 minutes de chaque côté",
        "Couper le concombre et l'avocat en dés",
        "Mélanger le quinoa avec les légumes",
        "Trancher le poulet et disposer sur la salade"
      ],
      tempsPreparation: 10,
      tempsCuisson: 15,
      difficulte: 'facile' as const
    },
    {
      titre: 'Saumon au four et légumes rôtis',
      description: 'Un dîner savoureux riche en oméga-3',
      categorie: 'diner' as const,
      nutrition: { calories: 420, proteines: 35, glucides: 28, lipides: 18, fibres: 6 },
      ingredients: [
        { nom: "Filet de saumon", quantite: "150", unite: "g" },
        { nom: "Brocoli", quantite: "150", unite: "g" },
        { nom: "Patates douces", quantite: "100", unite: "g" },
        { nom: "Huile d'olive", quantite: "1", unite: "cuillère à soupe" }
      ],
      instructions: [
        "Préchauffer le four à 200°C",
        "Disposer le saumon et les légumes sur une plaque",
        "Arroser d'huile d'olive et assaisonner",
        "Cuire 20-25 minutes jusqu'à ce que tout soit doré"
      ],
      tempsPreparation: 10,
      tempsCuisson: 25,
      difficulte: 'moyen' as const
    },
    {
      titre: 'Smoothie protéiné aux fruits rouges',
      description: 'Une collation rafraîchissante et énergisante',
      categorie: 'collation' as const,
      nutrition: { calories: 180, proteines: 20, glucides: 18, lipides: 3, fibres: 4 },
      ingredients: [
        { nom: "Whey protéine vanille", quantite: "30", unite: "g" },
        { nom: "Fruits rouges surgelés", quantite: "100", unite: "g" },
        { nom: "Lait d'amande", quantite: "200", unite: "ml" },
        { nom: "Graines de chia", quantite: "1", unite: "cuillère à soupe" }
      ],
      instructions: [
        "Mettre tous les ingrédients dans le blender",
        "Mixer pendant 60 secondes jusqu'à consistance lisse",
        "Ajouter des glaçons si désiré",
        "Servir immédiatement"
      ],
      tempsPreparation: 5,
      tempsCuisson: 0,
      difficulte: 'facile' as const
    }
  ];

  return fallbackData.map((data, index) => ({
    ...data,
    id: `fallback_${data.categorie}_${Date.now()}_${index}`,
    portions: 1,
    tags: ['équilibré', 'protéiné', 'fait maison'],
    confiance: 0.75,
    source: 'fallback' as const
  }));
};

export default function Recommendations() {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const [recommendations, setRecommendations] = useState<CoachRecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'all' | 'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation'>('all');
  const [sortBy, setSortBy] = useState<'proteines' | 'calories' | 'time' | 'difficulty'>('proteines');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Charger les favoris depuis localStorage au montage
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('mealFavorites');
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    }
  }, []);

  // Sauvegarder les favoris dans localStorage à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem('mealFavorites', JSON.stringify([...favorites]));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des favoris:', error);
    }
  }, [favorites]);

  // État pour afficher la page explicative
  const [showExplanation, setShowExplanation] = useState(true);
  const [usageToday, setUsageToday] = useState(0);
  const [cachedRecommendations, setCachedRecommendations] = useState<CoachRecommendationResponse | null>(null);
  
  // Charger le cache et l'usage au montage
  useEffect(() => {
    // Charger les recommandations en cache
    const cached = localStorage.getItem('dynprot_recommendations_cache');
    if (cached) {
      try {
        const parsedCache = JSON.parse(cached);
        const cacheAge = Date.now() - parsedCache.timestamp;
        // Cache valide pendant 24h
        if (cacheAge < 24 * 60 * 60 * 1000) {
          setCachedRecommendations(parsedCache.data);
          setRecommendations(parsedCache.data);
          setShowExplanation(false);
        }
      } catch (error) {
        console.error('Erreur lecture cache:', error);
      }
    }
    
    // Charger le compteur d'usage quotidien
    const today = new Date().toDateString();
    const usageData = localStorage.getItem('dynprot_ai_usage');
    if (usageData) {
      try {
        const parsed = JSON.parse(usageData);
        if (parsed.date === today) {
          setUsageToday(parsed.count || 0);
        } else {
          // Reset si nouveau jour
          localStorage.setItem('dynprot_ai_usage', JSON.stringify({ date: today, count: 0 }));
        }
      } catch (error) {
        console.error('Erreur lecture usage:', error);
      }
    }
  }, []);

  // Helper to map fitness goal values to expected schema
  const mapFitnessGoal = (goal: string | undefined): 'weight_loss' | 'muscle_gain' | 'maintenance' | 'general_health' => {
    switch (goal) {
      case 'weight_loss':
      case 'lose_weight':
        return 'weight_loss';
      case 'muscle_gain':
      case 'gain_muscle':
        return 'muscle_gain';
      case 'maintenance':
      case 'maintain_weight':
        return 'maintenance';
      case 'general_health':
      default:
        return 'general_health';
    }
  };

  const generateRecommendations = async (isRetry = false) => {
    // Validation initiale
    if (!state.user || !state.userSettings) {
      setError("Profil utilisateur incomplet. Veuillez compléter votre profil.");
      return;
    }

    // Vérifier la limite quotidienne
    if (usageToday >= 3) {
      setError("Vous avez atteint votre limite quotidienne de 3 générations. Revenez demain ou consultez vos recommandations précédentes.");
      toast.error("Limite quotidienne atteinte");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Build userProfile with validation
      const userProfile = {
        age: Number(state.userSettings.age) || 30,
        gender: (state.userSettings.gender as 'male' | 'female' | 'other') || 'other',
        weight: Number(state.user.weightKg) || 75,
        height: Number(state.user.heightCm) || 175,
        activityLevel: state.user.activityLevel || 'moderate',
        fitnessGoal: mapFitnessGoal(state.userSettings.fitnessGoal),
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
        context: 'Générer 4 recommandations de repas variées : 1 petit-déjeuner, 1 déjeuner, 1 dîner, 1 collation. Chaque recommandation doit correspondre exactement à sa catégorie avec des recettes complètes et détaillées.'
      };

      // Tentative d'appel API avec timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 30000)
      );

      const apiPromise = nutritionCoach.getRecommendations(
        userProfile, 
        request, 
        state.meals.slice(-7)
      );

      const result = await Promise.race([apiPromise, timeoutPromise]) as CoachRecommendationResponse;
      
      // Validation du résultat
      if (!result.recommendations || result.recommendations.length === 0) {
        throw new Error('Aucune recommandation reçue');
      }

      // S'assurer que toutes les catégories sont représentées
      const processedResult = {
        ...result,
        recommendations: ensureCategoriesInRecommendations(result.recommendations)
      };

      setRecommendations(processedResult);
      setRetryCount(0);
      setShowExplanation(false);
      
      // Incrémenter le compteur d'usage uniquement en cas de succès
      const newUsageCount = usageToday + 1;
      setUsageToday(newUsageCount);
      const today = new Date().toDateString();
      localStorage.setItem('dynprot_ai_usage', JSON.stringify({ date: today, count: newUsageCount }));
      
      // Sauvegarder en cache
      localStorage.setItem('dynprot_recommendations_cache', JSON.stringify({
        data: processedResult,
        timestamp: Date.now()
      }));
      
      toast.success(`${processedResult.recommendations.length} recommandations générées avec succès ! (${3 - newUsageCount} restantes aujourd'hui)`);
      
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      
      // Gestion des erreurs avec retry automatique et timeout progressif
      if (!isRetry && retryCount < 2 && error instanceof Error && error.message === 'Timeout') {
        setRetryCount(prev => prev + 1);
        toast.warning(`Délai dépassé, nouvelle tentative ${retryCount + 1}/3...`);
        
        // Attendre un peu plus longtemps entre les tentatives
        const waitTime = (retryCount + 1) * 2000; // 2s, 4s, 6s
        setTimeout(() => generateRecommendations(true), waitTime);
        return;
      }

      // Si toutes les tentatives échouent, utiliser les recommandations de fallback
      if (retryCount >= 1 || isRetry) {
        const fallbackResponse: CoachRecommendationResponse = {
          recommendations: generateFallbackRecommendations(),
          explanation: "Nous avons généré des recommandations par défaut adaptées à vos objectifs. L'IA n'est temporairement pas disponible.",
          tips: [
            "Variez vos sources de protéines entre animales et végétales",
            "Préparez vos repas à l'avance pour gagner du temps",
            "Hydratez-vous régulièrement tout au long de la journée"
          ],
          nutritionalInsights: [
            "Ces repas couvrent environ 115g de protéines par jour",
            "L'équilibre entre les macronutriments est respecté",
            "Les fibres présentes favorisent la satiété"
          ],
          weeklyGoalProgress: {
            proteinProgress: 85,
            calorieProgress: 90,
            balanceScore: 88
          }
        };
        
        setRecommendations(fallbackResponse);
        setError("Recommandations par défaut chargées. L'IA n'est pas disponible actuellement.");
        toast.warning("Mode hors ligne activé - Recommandations par défaut");
      } else {
        setError("Impossible de charger les recommandations. Veuillez réessayer.");
        toast.error("Erreur lors de la génération des recommandations");
      }
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

  const filteredRecommendations = recommendations?.recommendations ? 
    recommendations.recommendations
      .filter(meal => activeCategory === 'all' || meal.categorie === activeCategory)
      .sort((a, b) => {
        switch (sortBy) {
          case 'proteines':
            return b.nutrition.proteines - a.nutrition.proteines;
          case 'calories':
            return a.nutrition.calories - b.nutrition.calories;
          case 'time':
            return (a.tempsPreparation + a.tempsCuisson) - (b.tempsPreparation + b.tempsCuisson);
          case 'difficulty':
            const diffOrder = { facile: 1, moyen: 2, difficile: 3 };
            return diffOrder[a.difficulte] - diffOrder[b.difficulte];
          default:
            return 0;
        }
      }) : [];

  // Fonction pour gérer le clic sur générer
  const handleGenerateClick = () => {
    if (usageToday >= 3) {
      toast.error("Limite quotidienne atteinte (3 générations max)");
      return;
    }
    generateRecommendations();
  };

  // Fonction pour formater le temps relatif
  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
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
            <h2 className="text-xl font-bold mb-2">Génération en cours</h2>
            <p className="text-base text-muted-foreground">
              Notre chef IA prépare vos recommandations personnalisées...
            </p>
            {retryCount > 0 && (
              <p className="text-sm text-yellow-600 mt-2">
                Tentative {retryCount + 1}/3...
              </p>
            )}
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
              {showExplanation ? "Personnalisées pour vous" : `${filteredRecommendations.length} recommandation${filteredRecommendations.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => showExplanation ? handleGenerateClick() : generateRecommendations()}
            className="rounded-2xl h-10 w-10"
            disabled={isLoading || usageToday >= 3}
          >
            {isLoading ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Attention</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Vue explicative */}
        {showExplanation && !recommendations ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Hero Section */}
            <Card className="border-0 shadow-ios bg-gradient-to-br from-primary/5 to-accent/5 mb-6">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-ios-sm"
                  >
                    <ChefHat className="h-10 w-10 text-primary-foreground" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">Recommandations IA personnalisées</h2>
                  <p className="text-muted-foreground">Basées sur votre profil nutritionnel unique</p>
                </div>
              </CardContent>
            </Card>


            {/* Badge de quota */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="border-0 shadow-ios-sm bg-muted/30 mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Générations aujourd'hui</p>
                        <p className="text-xs text-muted-foreground">Renouvellement à minuit</p>
                      </div>
                    </div>
                    <Badge 
                      variant={usageToday >= 3 ? "destructive" : "secondary"} 
                      className="rounded-2xl px-3"
                    >
                      {usageToday}/3
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Afficher les recommandations en cache si disponibles */}
            {cachedRecommendations && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mb-6"
              >
                <Alert className="border-0 shadow-ios bg-accent/5 border-accent/20">
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Vous avez des recommandations générées {formatRelativeTime(JSON.parse(localStorage.getItem('dynprot_recommendations_cache') || '{}').timestamp || Date.now())}
                    <Button 
                      variant="link" 
                      className="ml-2 p-0 h-auto" 
                      onClick={() => setShowExplanation(false)}
                    >
                      Les consulter
                    </Button>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Bouton CTA principal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Button 
                size="lg" 
                className="w-full h-14 rounded-2xl shadow-ios font-semibold text-base"
                onClick={handleGenerateClick}
                disabled={usageToday >= 3}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Générer mes recommandations
                <Badge 
                  variant="secondary" 
                  className="ml-2 rounded-xl bg-white/20 text-white border-white/30"
                >
                  {3 - usageToday} restant{3 - usageToday > 1 ? 's' : ''}
                </Badge>
              </Button>
            </motion.div>

            {/* Comment ça marche */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-8"
            >
              <Card className="border-0 shadow-ios bg-gradient-to-r from-accent/5 to-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-accent" />
                    Comment ça marche ?
                  </CardTitle>
                  <CardDescription>
                    Notre IA analyse vos données pour créer des recommandations parfaitement adaptées
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-foreground text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Analyse de votre profil</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Âge, poids, objectifs nutritionnels et niveau d'activité physique issus de votre profil Analytics
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-foreground text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Étude de vos habitudes alimentaires</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Analyse des repas des 7 derniers jours pour comprendre vos préférences et équilibrer vos apports
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-foreground text-sm font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Génération personnalisée</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        4 repas complets (petit-déjeuner, déjeuner, dîner, collation) avec recettes détaillées et valeurs nutritionnelles
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 rounded-2xl bg-background/50 border border-border/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Objectifs visés</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div>✓ Atteindre vos objectifs protéines</div>
                      <div>✓ Respecter votre budget calorique</div>
                      <div>✓ Équilibrer les macronutriments</div>
                      <div>✓ Varier les plaisirs culinaires</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ) : null}

        {/* Progress Overview */}
        {!showExplanation && recommendations?.weeklyGoalProgress && (
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
        {!showExplanation && recommendations && (
          <div className="flex flex-col sm:flex-row gap-4">
          <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as any)} className="flex-1">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="petit-dejeuner">☀️</TabsTrigger>
              <TabsTrigger value="dejeuner">🥗</TabsTrigger>
              <TabsTrigger value="diner">🍽️</TabsTrigger>
              <TabsTrigger value="collation">🍎</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Trier par..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="proteines">Protéines</SelectItem>
              <SelectItem value="calories">Calories</SelectItem>
              <SelectItem value="time">Temps de préparation</SelectItem>
              <SelectItem value="difficulty">Difficulté</SelectItem>
            </SelectContent>
          </Select>
        </div>
        )}

        {/* Recommendations Grid */}
        {!showExplanation && recommendations && (
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
                            {categoryEmojis[meal.categorie]}
                          </span>
                          <Badge variant="secondary" className="text-xs rounded-xl">
                            {categoryLabels[meal.categorie]}
                          </Badge>
                          {meal.source === 'fallback' && (
                            <Badge variant="outline" className="text-xs rounded-xl">
                              Hors ligne
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-bold text-base leading-tight mb-1">
                          {meal.titre}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {meal.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(meal.id!)}
                        className="rounded-full h-8 w-8 ml-2"
                      >
                        <Heart 
                          className={`h-4 w-4 ${favorites.has(meal.id!) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
                        />
                      </Button>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`text-xs rounded-xl ${difficultyColors[meal.difficulte]}`}>
                        {difficultyLabels[meal.difficulte]}
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
                        <div className="text-lg font-bold text-primary">{meal.nutrition.proteines}g</div>
                        <div className="text-xs text-muted-foreground">protéines</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{meal.nutrition.glucides}g</div>
                        <div className="text-xs text-muted-foreground">glucides</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">{meal.nutrition.lipides}g</div>
                        <div className="text-xs text-muted-foreground">lipides</div>
                      </div>
                    </div>
                    
                    {/* Temps et portions */}
                    <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {meal.tempsPreparation + meal.tempsCuisson}min
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {meal.portions} pers.
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
                            <span className="truncate flex-1">{ingredient.nom}</span>
                            <span className="text-muted-foreground text-xs ml-2">
                              {ingredient.quantite} {ingredient.unite}
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
        )}

        {/* Tips */}
        {!showExplanation && recommendations?.tips && recommendations.tips.length > 0 && (
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