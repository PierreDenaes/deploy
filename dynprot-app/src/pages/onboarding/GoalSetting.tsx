import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Target, Calculator, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Mock user data for calculation (in real app, this would come from onboarding data)
const mockUserData = {
  age: 30,
  gender: 'male',
  weight: 75, // kg
  height: 175, // cm
  activityLevel: 'moderate',
  primaryGoal: 'muscle_gain',
};

const activityMultipliers = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

const proteinMultipliers = {
  weight_loss: 2.2, // g per kg body weight
  muscle_gain: 2.4,
  maintenance: 1.8,
  general_health: 1.6,
};

const GoalSetting = () => {
  const navigate = useNavigate();
  const [proteinGoal, setProteinGoal] = useState(120);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [recommendations, setRecommendations] = useState({
    protein: 0,
    calories: 0,
    reasoning: '',
  });

  useEffect(() => {
    calculateRecommendations();
  }, []);

  const calculateRecommendations = () => {
    const { age, gender, weight, height, activityLevel, primaryGoal } = mockUserData;
    
    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }
    
    // Calculate TDEE
    const tdee = bmr * activityMultipliers[activityLevel as keyof typeof activityMultipliers];
    
    // Adjust calories based on goal
    let recommendedCalories = tdee;
    if (primaryGoal === 'weight_loss') {
      recommendedCalories = tdee * 0.85; // 15% deficit
    } else if (primaryGoal === 'muscle_gain') {
      recommendedCalories = tdee * 1.1; // 10% surplus
    }
    
    // Calculate protein recommendation
    const proteinPerKg = proteinMultipliers[primaryGoal as keyof typeof proteinMultipliers];
    const recommendedProtein = weight * proteinPerKg;
    
    setRecommendations({
      protein: Math.round(recommendedProtein),
      calories: Math.round(recommendedCalories),
      reasoning: getRecommendationReasoning(primaryGoal, activityLevel),
    });
    
    // Set initial values to recommendations
    setProteinGoal(Math.round(recommendedProtein));
    setCalorieGoal(Math.round(recommendedCalories));
  };

  const getRecommendationReasoning = (goal: string, activity: string) => {
    switch (goal) {
      case 'weight_loss':
        return 'Pour la perte de poids, nous recommandons un déficit calorique modéré avec un apport protéique plus élevé pour préserver la masse musculaire.';
      case 'muscle_gain':
        return 'Pour le gain musculaire, nous recommandons un léger surplus calorique avec un apport protéique élevé pour soutenir la synthèse des protéines musculaires.';
      case 'maintenance':
        return 'Pour le maintien, nous équilibrons vos calories avec vos dépenses et fournissons un apport protéique adéquat pour la santé.';
      default:
        return 'Ces objectifs sont optimisés pour la santé générale et le bien-être en fonction de votre niveau d\'activité.';
    }
  };

  const handleNext = () => {
    // In a real app, you'd save these goals to the user's profile
    navigate('/onboarding/app-tour');
  };

  const handleBack = () => {
    navigate('/onboarding/profile-setup');
  };

  const useRecommendations = () => {
    setProteinGoal(recommendations.protein);
    setCalorieGoal(recommendations.calories);
  };

  const getProteinAdvice = (protein: number, weight: number) => {
    const perKg = protein / weight;
    if (perKg < 1.2) {
      return { level: 'low', message: 'Envisagez d\'augmenter votre apport pour une meilleure maintenance musculaire.' };
    } else if (perKg > 3.0) {
      return { level: 'high', message: 'C\'est assez élevé - assurez-vous une hydratation adéquate.' };
    } else {
      return { level: 'good', message: 'Excellent objectif de protéines pour vos besoins !', color: 'text-green-600' };
    }
  };

  const getCalorieAdvice = (calories: number, tdee: number) => {
    const ratio = calories / tdee;
    if (ratio < 0.8) {
      return { level: 'low', message: 'Déficit très agressif - surveillez votre niveau d\'énergie.' };
    } else if (ratio > 1.2) {
      return { level: 'high', message: 'Surplus significatif - ajustez si un gain de poids indésirable se produit.' };
    } else {
      return { level: 'good', message: 'Objectif calorique équilibré pour un progrès durable.', color: 'text-green-600' };
    }
  };

  const proteinAdvice = getProteinAdvice(proteinGoal, mockUserData.weight);
  const calorieAdvice = getCalorieAdvice(calorieGoal, 2200); // Mock TDEE

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 pt-8"
          >
            <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Target className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Définissez vos objectifs
            </h1>
            <p className="text-muted-foreground">
              Ajustez vos objectifs nutritionnels quotidiens en fonction de nos recommandations.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Recommendations Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="h-full border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Recommandations IA
                  </CardTitle>
                  <CardDescription>
                    Basées sur votre profil et vos objectifs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Information</AlertTitle>
                    <AlertDescription>
                      {recommendations.reasoning}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div>
                        <h3 className="font-medium text-green-800 dark:text-green-200">
                          Objectif Protéines
                        </h3>
                        <p className="text-sm text-green-600 dark:text-green-300">
                          {(recommendations.protein / mockUserData.weight).toFixed(1)}g par kg de poids corporel
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-base font-bold py-1 px-3">
                        {recommendations.protein}g
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div>
                        <h3 className="font-medium text-blue-800 dark:text-blue-200">
                          Objectif Calories
                        </h3>
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                          Optimisé pour {mockUserData.primaryGoal.replace('_', ' ')}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-base font-bold py-1 px-3">
                        {recommendations.calories} cal
                      </Badge>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full h-12 text-base"
                    onClick={useRecommendations}
                  >
                    Utiliser ces recommandations
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Goal Customization Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="h-full border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Personnalisez vos objectifs</CardTitle>
                  <CardDescription>
                    Ajustez les cibles pour correspondre à vos préférences.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Protein Goal Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-base">Objectif quotidien de protéines</Label>
                      <Badge variant="secondary" className="text-base font-bold py-1 px-3">{proteinGoal}g</Badge>
                    </div>
                    <Slider
                      value={[proteinGoal]}
                      onValueChange={(value) => setProteinGoal(value[0])}
                      max={250}
                      min={50}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>50g</span>
                      <span>250g</span>
                    </div>
                    <Alert variant={proteinAdvice.level === 'good' ? 'default' : 'destructive'} className={cn(
                      proteinAdvice.level === 'good' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200' :
                      'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
                    )}>
                      <AlertDescription className="text-sm">
                        {proteinAdvice.message}
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Calorie Goal Slider */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-base">Objectif quotidien de calories</Label>
                      <Badge variant="secondary" className="text-base font-bold py-1 px-3">{calorieGoal} cal</Badge>
                    </div>
                    <Slider
                      value={[calorieGoal]}
                      onValueChange={(value) => setCalorieGoal(value[0])}
                      max={4000}
                      min={1200}
                      step={50}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>1,200</span>
                      <span>4,000</span>
                    </div>
                    <Alert variant={calorieAdvice.level === 'good' ? 'default' : 'destructive'} className={cn(
                      calorieAdvice.level === 'good' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200' :
                      'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200'
                    )}>
                      <AlertDescription className="text-sm">
                        {calorieAdvice.message}
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Goal Summary */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Vos objectifs</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Protéines:</span>
                        <span className="font-medium">{proteinGoal}g/jour</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Calories:</span>
                        <span className="font-medium">{calorieGoal} cal/jour</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Protéines par kg:</span>
                        <span className="font-medium">
                          {(proteinGoal / mockUserData.weight).toFixed(1)}g/kg
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex justify-between mt-8 gap-4"
          >
            <Button variant="outline" onClick={handleBack} className="flex-1 h-12 text-base">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Retour
            </Button>
            
            <Button onClick={handleNext} className="flex-1 h-12 text-base">
              Continuer
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>

          {/* Progress indicator */}
          <div className="flex justify-center mt-8 space-x-2">
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
            <div className="w-3 h-3 bg-primary rounded-full" />
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalSetting;