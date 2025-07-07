import React, { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from "react";
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useAppContext } from "@/context/AppContext";
import { motion } from "framer-motion";
import { Calculator, Target, Info, TrendingUp, User, Activity, Zap, HelpCircle, CheckCircle, Circle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import type { GoalSetterRef } from "@/components/GoalSetter";

interface ProteinRecommendation {
  recommended: number;
  min: number;
  max: number;
  explanation: string;
  fitnessGoalMultiplier: number;
  // Add calorie recommendations
  calories?: {
    recommended: number;
    bmr: number;
    tdee: number;
    explanation: string;
  };
}

const fitnessGoals = [
  { 
    value: 'weight_loss', 
    label: 'Perte de poids', 
    description: 'Maintenir la masse musculaire en déficit calorique',
    proteinMultiplier: 1.6 // Higher protein for muscle preservation
  },
  { 
    value: 'muscle_gain', 
    label: 'Gain musculaire', 
    description: 'Construire et développer la masse musculaire',
    proteinMultiplier: 2.2 // Higher protein for muscle building
  },
  { 
    value: 'maintenance', 
    label: 'Maintien', 
    description: 'Maintenir le poids et la composition corporelle',
    proteinMultiplier: 1.4 // Moderate protein for maintenance
  },
  { 
    value: 'general_health', 
    label: 'Santé générale', 
    description: 'Santé optimale et bien-être',
    proteinMultiplier: 1.2 // Basic protein needs
  },
  { 
    value: 'endurance', 
    label: 'Endurance', 
    description: 'Sports d\'endurance et récupération',
    proteinMultiplier: 1.4 // Moderate protein for endurance
  },
  { 
    value: 'strength', 
    label: 'Force', 
    description: 'Développement de la force et puissance',
    proteinMultiplier: 2.0 // High protein for strength training
  },
];

const activityLevels = [
  { value: 'sedentary', label: 'Sédentaire', multiplier: 1.0 },
  { value: 'light', label: 'Léger', multiplier: 1.1 },
  { value: 'moderate', label: 'Modéré', multiplier: 1.2 },
  { value: 'very_active', label: 'Très actif', multiplier: 1.3 },
  { value: 'extremely_active', label: 'Extrêmement actif', multiplier: 1.4 },
];

interface OnboardingData {
  weight?: number;
  height?: number;
  age?: number;
  gender?: string;
  activityLevel?: string;
  fitnessGoal?: string;
  units?: 'metric' | 'imperial';
  bodyFatPercentage?: number;
  trainingDays?: number;
}

interface ProteinGoalCalculatorProps {
  goalSetterRef?: React.RefObject<GoalSetterRef>;
  initialData?: OnboardingData;
  autoCalculateOnMount?: boolean;
  showFormFields?: boolean;
  onRecommendationChange?: (recommendation: ProteinRecommendation) => void;
}

// Precise unit conversion functions
const convertWeight = {
  kgToLb: (kg: number): number => Math.round(kg * 2.20462 * 10) / 10,
  lbToKg: (lb: number): number => Math.round(lb / 2.20462 * 10) / 10
};

const convertHeight = {
  cmToIn: (cm: number): number => Math.round(cm / 2.54 * 10) / 10,
  inToCm: (inches: number): number => Math.round(inches * 2.54 * 10) / 10
};

// BMR calculation using Mifflin-St Jeor Equation
const calculateBMR = (weight: number, height: number, age: number, gender: string): number => {
  const baseRate = (10 * weight) + (6.25 * height) - (5 * age);
  return gender === 'male' ? baseRate + 5 : baseRate - 161;
};

// TDEE calculation
const calculateTDEE = (bmr: number, activityLevel: string): number => {
  const multipliers = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'very_active': 1.725,
    'extremely_active': 1.9
  };
  return bmr * (multipliers[activityLevel as keyof typeof multipliers] || 1.55);
};

export default function ProteinGoalCalculator({ 
  goalSetterRef,
  initialData,
  autoCalculateOnMount = false,
  showFormFields = true,
  onRecommendationChange
}: ProteinGoalCalculatorProps = {}) {
  const { userSettings, updateNutritionGoals } = useAppContext();
  
  // Map API fitness goals to calculator fitness goals
  const mapApiFitnessGoalToCalculator = (apiGoal?: string): string => {
    const mapping: Record<string, string> = {
      'lose_weight': 'weight_loss',
      'gain_muscle': 'muscle_gain',
      'maintain': 'maintenance',
      'bulk': 'muscle_gain',
      'cut': 'weight_loss'
    };
    return mapping[apiGoal || ''] || 'general_health';
  };
  
  const [weight, setWeight] = useState<number>(
    initialData?.weight || userSettings?.weightKg || 70
  );
  const [height, setHeight] = useState<number>(
    initialData?.height || userSettings?.heightCm || 175
  );
  const [age, setAge] = useState<number>(
    initialData?.age || userSettings?.age || 30
  );
  const [gender, setGender] = useState<string>(
    initialData?.gender || userSettings?.gender || 'other'
  );
  const [activityLevel, setActivityLevel] = useState<string>(
    initialData?.activityLevel || userSettings?.activityLevel || 'moderate'
  );
  const [fitnessGoal, setFitnessGoal] = useState<string>(
    initialData?.fitnessGoal || mapApiFitnessGoalToCalculator(userSettings?.fitnessGoal) || 'general_health'
  );
  const [bodyFatPercentage, setBodyFatPercentage] = useState<number>(
    initialData?.bodyFatPercentage || userSettings?.bodyFatPercentage || 20
  );
  const [trainingDays, setTrainingDays] = useState<number>(
    initialData?.trainingDays || userSettings?.trainingDays || 3
  );
  const [unit, setUnit] = useState<'metric' | 'imperial'>(
    initialData?.units || userSettings?.preferredUnits || 'metric'
  );
  const [recommendation, setRecommendation] = useState<ProteinRecommendation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [autoCalculateEnabled, setAutoCalculateEnabled] = useState(false);
  const [lastCalculationParams, setLastCalculationParams] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showToastNotifications, setShowToastNotifications] = useState(true);
  const hasCalculatedOnMount = useRef(false);

  // Debounced auto-calculation
  const debouncedCalculate = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (autoCalculateEnabled && weight && height && age && !isCalculating) {
            handleCalculate(false); // false = no toast notifications for auto-calculations
          }
        }, 1000); // 1 second delay
      };
    })(),
    [weight, height, age, autoCalculateEnabled, isCalculating]
  );

  // Memoized calculation parameters hash for optimization
  const calculationParamsHash = useMemo(() => {
    const params = {
      weight,
      height,
      age,
      gender,
      activityLevel,
      fitnessGoal,
      bodyFatPercentage,
      trainingDays,
      unit
    };
    return JSON.stringify(params);
  }, [weight, height, age, gender, activityLevel, fitnessGoal, bodyFatPercentage, trainingDays, unit]);

  // Update form when user settings change (only if no initial data provided)
  useEffect(() => {
    if (userSettings && !initialData) {
      setWeight(userSettings.weightKg || 70);
      setHeight(userSettings.heightCm || 175);
      setAge(userSettings.age || 30);
      setGender(userSettings.gender || 'other');
      setActivityLevel(userSettings.activityLevel || 'moderate');
      setFitnessGoal(mapApiFitnessGoalToCalculator(userSettings.fitnessGoal) || 'general_health');
      setBodyFatPercentage(userSettings.bodyFatPercentage || 20);
      setTrainingDays(userSettings.trainingDays || 3);
      setUnit(userSettings.preferredUnits || 'metric');
    }
  }, [userSettings, initialData]);

  // Auto-calculate on mount if requested and data is available
  useEffect(() => {
    if (autoCalculateOnMount && initialData && weight && height && age && !hasCalculatedOnMount.current) {
      hasCalculatedOnMount.current = true;
      handleCalculate(false); // false = no toast notifications for auto-calculations
    }
  }, [autoCalculateOnMount, initialData, weight, height, age]);

  // Call recommendation change callback when recommendation updates
  useEffect(() => {
    if (recommendation && onRecommendationChange) {
      onRecommendationChange(recommendation);
    }
  }, [recommendation, onRecommendationChange]);

  // Auto-calculate when parameters change (if enabled)
  useEffect(() => {
    if (calculationParamsHash !== lastCalculationParams) {
      setLastCalculationParams(calculationParamsHash);
      if (autoCalculateEnabled && weight && height && age) {
        debouncedCalculate();
      }
    }
  }, [calculationParamsHash, lastCalculationParams, debouncedCalculate, autoCalculateEnabled, weight, height, age]);

  // Calculate form completion progress
  const calculateProgress = useMemo(() => {
    const requiredFields = [
      { key: 'weight', value: weight, label: 'Poids' },
      { key: 'height', value: height, label: 'Taille' },
      { key: 'age', value: age, label: 'Âge' },
      { key: 'gender', value: gender, label: 'Genre' },
      { key: 'activityLevel', value: activityLevel, label: 'Niveau d\'activité' },
      { key: 'fitnessGoal', value: fitnessGoal, label: 'Objectif fitness' }
    ];
    
    const optionalFields = [
      { key: 'bodyFat', value: bodyFatPercentage, label: '% Graisse corporelle' },
      { key: 'trainingDays', value: trainingDays, label: 'Jours d\'entraînement' }
    ];
    
    const completedRequired = requiredFields.filter(field => {
      return typeof field.value === 'number' ? field.value > 0 : field.value && field.value !== '';
    }).length;
    
    const completedOptional = optionalFields.filter(field => {
      return typeof field.value === 'number' ? field.value > 0 : field.value && field.value !== '';
    }).length;
    
    const requiredProgress = (completedRequired / requiredFields.length) * 100;
    const totalProgress = ((completedRequired + completedOptional) / (requiredFields.length + optionalFields.length)) * 100;
    
    return {
      requiredFields,
      optionalFields,
      completedRequired,
      completedOptional,
      requiredProgress,
      totalProgress,
      isRequiredComplete: completedRequired === requiredFields.length
    };
  }, [weight, height, age, gender, activityLevel, fitnessGoal, bodyFatPercentage, trainingDays]);

  // Check for pending nutrition goals in localStorage and sync them
  useEffect(() => {
    const checkPendingSync = async () => {
      const pendingData = localStorage.getItem('pending_nutrition_goals');
      if (pendingData) {
        try {
          const goals = JSON.parse(pendingData);
          const now = Date.now();
          
          // Only sync if data is less than 24 hours old
          if (goals.timestamp && (now - goals.timestamp) < 86400000) {
            await updateNutritionGoals({
              proteinGoal: goals.proteinGoal,
              calorieGoal: goals.calorieGoal
            });
            localStorage.removeItem('pending_nutrition_goals');
            toast.success('Objectifs nutritionnels synchronisés automatiquement.');
          } else {
            // Remove old data
            localStorage.removeItem('pending_nutrition_goals');
          }
        } catch (error) {
          console.warn('Erreur lors de la synchronisation automatique:', error);
          // Keep the data for manual retry
        }
      }
    };

    // Only run sync check if we have user settings (user is logged in)
    if (userSettings && Object.keys(userSettings).length > 0) {
      checkPendingSync();
    }
  }, [userSettings, updateNutritionGoals]);

  const calculateSmartProteinGoal = useCallback((): ProteinRecommendation => {
    let weightKg = weight;
    let heightCm = height;
    if (unit === 'imperial') {
      weightKg = convertWeight.lbToKg(weight);
      heightCm = convertHeight.inToCm(height);
    }

    // Debug log to ensure consistency (temporary)
    console.log('🧮 ProteinGoalCalculator params:', {
      weightKg,
      heightCm,
      age,
      gender,
      activityLevel,
      fitnessGoal,
      bodyFatPercentage,
      trainingDays,
      source: initialData ? 'Onboarding' : 'Profile'
    });

    // Calculate BMR and TDEE
    const bmr = calculateBMR(weightKg, heightCm, age, gender);
    const tdee = calculateTDEE(bmr, activityLevel);

    // Calculate calories based on fitness goal
    let recommendedCalories = tdee;
    let calorieExplanation = 'Calories de maintien basées sur votre métabolisme de base et niveau d\'activité';
    
    switch (fitnessGoal) {
      case 'weight_loss':
        recommendedCalories = Math.round(tdee * 0.8);
        calorieExplanation = 'Déficit calorique de 20% pour une perte de poids durable';
        break;
      case 'muscle_gain':
        recommendedCalories = Math.round(tdee * 1.1);
        calorieExplanation = 'Surplus calorique de 10% pour la prise de masse maigre';
        break;
      case 'maintenance':
        recommendedCalories = Math.round(tdee);
        calorieExplanation = 'Calories de maintien pour conserver votre poids actuel';
        break;
      case 'strength':
        recommendedCalories = Math.round(tdee * 1.05);
        calorieExplanation = 'Légère augmentation calorique pour soutenir les gains de force';
        break;
      case 'endurance':
        recommendedCalories = Math.round(tdee * 1.1);
        calorieExplanation = 'Calories augmentées pour soutenir l\'entraînement d\'endurance';
        break;
    }

    // Get base multiplier from fitness goal
    const goalData = fitnessGoals.find(g => g.value === fitnessGoal);
    // Fallback to general_health if current goal is not found
    const fallbackGoalData = goalData || fitnessGoals.find(g => g.value === 'general_health');
    const baseMultiplier = goalData?.proteinMultiplier || 1.2;

    // Adjust for activity level
    const activityData = activityLevels.find(a => a.value === activityLevel);
    // Fallback to moderate if current level is not found
    const fallbackActivityData = activityData || activityLevels.find(a => a.value === 'moderate');
    const activityMultiplier = activityData?.multiplier || 1.0;

    // Adjust for age (older adults need more protein)
    let ageMultiplier = 1.0;
    if (age >= 65) {
      ageMultiplier = 1.2;
    } else if (age >= 50) {
      ageMultiplier = 1.1;
    }

    // Adjust for gender (males typically need slightly more)
    let genderMultiplier = 1.0;
    if (gender === 'male') {
      genderMultiplier = 1.05;
    }

    // Adjust for training frequency
    let trainingMultiplier = 1.0;
    if (trainingDays >= 6) {
      trainingMultiplier = 1.15;
    } else if (trainingDays >= 4) {
      trainingMultiplier = 1.1;
    } else if (trainingDays >= 2) {
      trainingMultiplier = 1.05;
    }

    // Use lean body mass if body fat percentage is provided
    let effectiveWeight = weightKg;
    if (bodyFatPercentage > 0 && bodyFatPercentage < 50) {
      const leanBodyMass = weightKg * (1 - bodyFatPercentage / 100);
      // Use a weighted average of total weight and lean body mass
      effectiveWeight = (weightKg * 0.3) + (leanBodyMass * 0.7);
    }

    // Calculate final multiplier
    const finalMultiplier = baseMultiplier * activityMultiplier * ageMultiplier * genderMultiplier * trainingMultiplier;

    // Calculate recommended protein
    const recommended = Math.round(effectiveWeight * finalMultiplier);
    const min = Math.round(effectiveWeight * (finalMultiplier * 0.8));
    const max = Math.round(effectiveWeight * (finalMultiplier * 1.2));

    // Generate explanation
    const goalLabel = (goalData || fallbackGoalData)?.label || 'Santé générale';
    const activityLabel = (activityData || fallbackActivityData)?.label || 'Modéré';
    let explanation = `Basé sur votre objectif fitness de ${goalLabel.toLowerCase()} et votre niveau d'activité ${activityLabel.toLowerCase()}. `;
    
    if (age >= 50) {
      explanation += `Protéines augmentées pour l'âge (${age} ans). `;
    }
    
    if (trainingDays >= 4) {
      explanation += `Augmentation pour ${trainingDays} jours d'entraînement par semaine. `;
    }
    
    if (bodyFatPercentage > 0 && bodyFatPercentage < 50) {
      explanation += `Calcul basé sur la masse corporelle maigre (~${Math.round(effectiveWeight)}kg effective). `;
    }

    return {
      recommended,
      min,
      max,
      explanation,
      fitnessGoalMultiplier: finalMultiplier,
      calories: {
        recommended: recommendedCalories,
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        explanation: calorieExplanation
      }
    };
  }, [weight, height, age, gender, activityLevel, fitnessGoal, bodyFatPercentage, trainingDays, unit]);

  const handleCalculate = useCallback(async (showToast: boolean = true) => {
    if (isCalculating) return; // Prevent multiple simultaneous calculations
    
    setIsCalculating(true);
    
    try {
      // Validate required fields
      const weightKg = unit === 'metric' ? weight : convertWeight.lbToKg(weight);
      const heightCm = unit === 'metric' ? height : convertHeight.inToCm(height);
      
      const newFieldErrors: Record<string, string> = {};
      
      // Weight validation
      if (!weight || weight <= 0) {
        newFieldErrors.weight = 'Le poids est requis et doit être supérieur à 0';
      } else if (weightKg < 20) {
        newFieldErrors.weight = unit === 'metric' 
          ? 'Poids trop faible (minimum 20kg)' 
          : 'Poids trop faible (minimum 44 lbs)';
      } else if (weightKg > 500) {
        newFieldErrors.weight = unit === 'metric' 
          ? 'Poids trop élevé (maximum 500kg)' 
          : 'Poids trop élevé (maximum 1100 lbs)';
      }
      
      // Height validation
      if (!height || height <= 0) {
        newFieldErrors.height = 'La taille est requise et doit être supérieure à 0';
      } else if (heightCm < 100) {
        newFieldErrors.height = unit === 'metric' 
          ? 'Taille trop faible (minimum 100cm)' 
          : 'Taille trop faible (minimum 3\'3")';
      } else if (heightCm > 250) {
        newFieldErrors.height = unit === 'metric' 
          ? 'Taille trop élevée (maximum 250cm)' 
          : 'Taille trop élevée (maximum 8\'2")';
      }
      
      // Age validation
      if (!age || age <= 0) {
        newFieldErrors.age = 'L\'âge est requis';
      } else if (age < 13) {
        newFieldErrors.age = 'L\'âge minimum est de 13 ans';
      } else if (age > 120) {
        newFieldErrors.age = 'L\'âge maximum est de 120 ans';
      }
      
      // Body fat validation
      if (bodyFatPercentage > 0) {
        if (bodyFatPercentage < 3) {
          newFieldErrors.bodyFat = 'Le pourcentage minimum est de 3%';
        } else if (bodyFatPercentage > 50) {
          newFieldErrors.bodyFat = 'Le pourcentage maximum est de 50%';
        }
      }
      
      setFieldErrors(newFieldErrors);
      
      if (Object.keys(newFieldErrors).length > 0) {
        const errorMessages = Object.values(newFieldErrors);
        if (showToast) {
          toast.error(`Veuillez corriger les erreurs de saisie (${errorMessages.length} erreur${errorMessages.length > 1 ? 's' : ''})`);
        }
        return;
      }
      
      // Robust calculation with fallback handling
      let result: ProteinRecommendation;
      
      try {
        // Primary calculation
        result = calculateSmartProteinGoal();
        
        // Validate calculation results
        if (!result || typeof result.recommended !== 'number' || isNaN(result.recommended)) {
          throw new Error('Calcul invalide détecté');
        }
        
        // Ensure reasonable bounds
        if (result.recommended < 10 || result.recommended > 500) {
          console.warn('Résultat de calcul hors limites, application de limites de sécurité');
          result.recommended = Math.max(10, Math.min(500, result.recommended));
          result.min = Math.max(10, Math.min(500, result.min));
          result.max = Math.max(10, Math.min(500, result.max));
        }
        
      } catch (calcError) {
        console.error('Erreur lors du calcul principal, utilisation de fallback:', calcError);
        
        // Fallback calculation with simplified formula
        const simplifiedProtein = Math.round(weightKg * 1.2); // Basic 1.2g/kg formula
        const simplifiedCalories = Math.round(weightKg * (gender === 'male' ? 30 : 25)); // Simplified calorie estimate
        
        result = {
          recommended: Math.max(10, Math.min(500, simplifiedProtein)),
          min: Math.max(10, Math.min(500, Math.round(simplifiedProtein * 0.8))),
          max: Math.max(10, Math.min(500, Math.round(simplifiedProtein * 1.2))),
          explanation: 'Calcul simplifié utilisé en raison d\'une erreur technique. Recommandation basée sur 1.2g de protéines par kg de poids.',
          fitnessGoalMultiplier: 1.2,
          calories: {
            recommended: Math.max(800, Math.min(5000, simplifiedCalories)),
            bmr: Math.max(800, Math.min(5000, Math.round(simplifiedCalories * 0.7))),
            tdee: Math.max(800, Math.min(5000, simplifiedCalories)),
            explanation: 'Estimation simplifiée en raison d\'une erreur de calcul. Consultez un professionnel pour des recommandations précises.'
          }
        };
        
        if (showToast) {
          toast.warning('Calcul simplifié utilisé. Pour des recommandations précises, vérifiez vos données.');
        }
      }
      
      // Simulate brief async operation for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setRecommendation(result);
      setFieldErrors({}); // Clear any previous errors on successful calculation
      if (showToast) {
        toast.success('Calcul effectué avec succès !');
      }
      
    } catch (error) {
      console.error('Erreur critique lors du calcul:', error);
      
      // Ultimate fallback with basic recommendations
      const fallbackWeight = weight || 70;
      const basicProtein = Math.round(fallbackWeight * 1.0); // Very basic 1g/kg
      const basicCalories = Math.round(fallbackWeight * 25); // Very basic calorie estimate
      
      const fallbackRecommendation: ProteinRecommendation = {
        recommended: Math.max(50, Math.min(200, basicProtein)),
        min: Math.max(40, Math.min(180, Math.round(basicProtein * 0.8))),
        max: Math.max(60, Math.min(220, Math.round(basicProtein * 1.2))),
        explanation: 'Recommandation de base en raison d\'une erreur technique. Consultez un professionnel de la nutrition.',
        fitnessGoalMultiplier: 1.0,
        calories: {
          recommended: Math.max(1200, Math.min(3000, basicCalories)),
          bmr: Math.max(1000, Math.min(2500, Math.round(basicCalories * 0.7))),
          tdee: Math.max(1200, Math.min(3000, basicCalories)),
          explanation: 'Estimation très basique. Des données plus précises sont nécessaires pour un calcul optimal.'
        }
      };
      
      setRecommendation(fallbackRecommendation);
      if (showToast) {
        toast.error('Erreur de calcul. Recommandations de base affichées. Vérifiez vos données.');
      }
      
    } finally {
      setIsCalculating(false);
    }
  }, [weight, height, age, gender, activityLevel, fitnessGoal, bodyFatPercentage, trainingDays, unit]);

  // Map calculator fitness goals to API fitness goals
  const mapFitnessGoalToApi = (calculatorGoal: string): string => {
    const mapping: Record<string, string> = {
      'weight_loss': 'lose_weight',
      'muscle_gain': 'gain_muscle', 
      'maintenance': 'maintain',
      'general_health': 'maintain',
      'endurance': 'maintain',
      'strength': 'gain_muscle'
    };
    return mapping[calculatorGoal] || 'maintain';
  };

  const handleApplyRecommendation = async () => {
    if (!recommendation || isSaving) return;
    
    setIsSaving(true);
    
    try {
      // Only save nutrition goals to avoid validation errors with physical data
      const nutritionGoals = {
        proteinGoal: Math.max(10, Math.min(500, recommendation.recommended)),
        calorieGoal: recommendation.calories ? Math.max(800, Math.min(5000, recommendation.calories.recommended)) : undefined
      };

      // Remove undefined values
      const cleanedGoals = Object.fromEntries(
        Object.entries(nutritionGoals).filter(([_, value]) => value !== undefined)
      );

      // Add timeout and retry logic for API calls
      const saveWithTimeout = async (goals: any, timeoutMs: number = 10000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
          await updateNutritionGoals(goals);
          clearTimeout(timeoutId);
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      };

      // Try to save with fallback strategy
      let saveSuccessful = false;
      let fallbackUsed = false;
      
      try {
        await saveWithTimeout(cleanedGoals);
        saveSuccessful = true;
      } catch (error) {
        console.warn('Premier essai de sauvegarde échoué, tentative de fallback...', error);
        
        // Fallback 1: Try saving only protein goal if calorie goal fails
        if (cleanedGoals.calorieGoal) {
          try {
            await saveWithTimeout({ proteinGoal: cleanedGoals.proteinGoal });
            fallbackUsed = true;
            saveSuccessful = true;
            toast.warning('Seul l\'objectif protéines a pu être sauvegardé. Réessayez pour les calories.');
          } catch (fallbackError) {
            console.warn('Fallback sauvegarde protéines échoué:', fallbackError);
          }
        }
        
        // Fallback 2: Store locally if all API calls fail
        if (!saveSuccessful) {
          const fallbackData = {
            ...cleanedGoals,
            timestamp: Date.now(),
            needsSync: true
          };
          localStorage.setItem('pending_nutrition_goals', JSON.stringify(fallbackData));
          fallbackUsed = true;
          saveSuccessful = true;
          toast.warning('Sauvegardé localement. Sera synchronisé automatiquement plus tard.');
        }
      }

      if (saveSuccessful) {
        // Synchronize with GoalSetter component if ref is provided
        if (goalSetterRef?.current) {
          goalSetterRef.current.updateGoals(
            recommendation.recommended, 
            recommendation.calories?.recommended
          );
        }

        if (!fallbackUsed) {
          const message = recommendation.calories 
            ? `Objectifs mis à jour : ${recommendation.recommended}g protéines, ${recommendation.calories.recommended} calories/jour`
            : `Objectif protéines mis à jour : ${recommendation.recommended}g/jour`;
          
          toast.success(message);
        }
      } else {
        throw new Error('Toutes les tentatives de sauvegarde ont échoué');
      }
    } catch (error) {
      console.error('Erreur lors de l\'application de la recommandation:', error);
      
      // Enhanced error messaging based on error type
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
          toast.error('Délai d\'attente dépassé. Vérifiez votre connexion et réessayez.');
        } else if (error.message.includes('Network')) {
          toast.error('Problème de connexion. Vos objectifs seront sauvegardés localement.');
        } else if (error.message.includes('401') || error.message.includes('403')) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
        } else {
          toast.error('Erreur lors de la sauvegarde. Réessayez dans quelques instants.');
        }
      } else {
        toast.error('Erreur lors de la sauvegarde des objectifs nutritionnels');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnitChange = (newUnit: 'metric' | 'imperial') => {
    if (newUnit !== unit && weight > 0 && height > 0) {
      if (newUnit === 'imperial') {
        setWeight(convertWeight.kgToLb(weight));
        setHeight(convertHeight.cmToIn(height));
      } else {
        setWeight(convertWeight.lbToKg(weight));
        setHeight(convertHeight.inToCm(height));
      }
      setUnit(newUnit);
    } else if (newUnit !== unit) {
      // Change unit even if no values to convert
      setUnit(newUnit);
    }
  };

  return (
    <TooltipProvider>
      <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Calculateur intelligent de nutrition
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>Obtenez des recommandations personnalisées de protéines et calories basées sur votre métabolisme et vos objectifs</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('/protein-calculation-explained', '_blank')}
            className="text-xs"
          >
            <HelpCircle className="h-3 w-3 mr-1" />
            Comment ça marche ?
          </Button>
        </CardDescription>
        
        {/* Progress Indicator */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progression du formulaire</span>
            <span className="text-sm text-muted-foreground">
              {calculateProgress.completedRequired + calculateProgress.completedOptional} / {calculateProgress.requiredFields.length + calculateProgress.optionalFields.length} champs
            </span>
          </div>
          
          <div className="space-y-2">
            {/* Required fields progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Champs requis</span>
                <span className={calculateProgress.isRequiredComplete ? 'text-green-600' : 'text-orange-600'}>
                  {calculateProgress.completedRequired}/{calculateProgress.requiredFields.length}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    calculateProgress.isRequiredComplete ? 'bg-green-500' : 'bg-orange-400'
                  }`}
                  style={{ width: `${calculateProgress.requiredProgress}%` }}
                />
              </div>
            </div>
            
            {/* Total progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progression totale</span>
                <span className="text-primary">
                  {Math.round(calculateProgress.totalProgress)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${calculateProgress.totalProgress}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Field checklist */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {calculateProgress.requiredFields.map((field) => {
              const isCompleted = typeof field.value === 'number' ? field.value > 0 : field.value && field.value !== '';
              return (
                <div key={field.key} className="flex items-center gap-2">
                  {isCompleted ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={isCompleted ? 'text-green-700' : 'text-muted-foreground'}>
                    {field.label}
                  </span>
                </div>
              );
            })}
          </div>
          
          {calculateProgress.isRequiredComplete && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
              <CheckCircle className="h-4 w-4" />
              <span>Tous les champs requis sont remplis !</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showFormFields && (
          <>
        {/* Unit Selection & Auto-Calculate Toggle */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={unit === 'metric' ? "default" : "outline"}
              size="sm"
              onClick={() => handleUnitChange('metric')}
              className="flex-1"
            >
              Métrique (kg)
            </Button>
            <Button
              variant={unit === 'imperial' ? "default" : "outline"}
              size="sm"
              onClick={() => handleUnitChange('imperial')}
              className="flex-1"
            >
              Impérial (lb)
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <div className="text-sm font-medium">Calcul automatique</div>
              <div className="text-xs text-muted-foreground">
                Recalcule automatiquement lors des modifications
              </div>
            </div>
            <Button
              variant={autoCalculateEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoCalculateEnabled(!autoCalculateEnabled)}
            >
              {autoCalculateEnabled ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>

        {/* Section 1: Mesures Physiques */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Informations physiques</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Poids {unit === 'metric' ? '(kg)' : '(lb)'}</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => {
                  setWeight(Number(e.target.value));
                  if (fieldErrors.weight) {
                    const newErrors = { ...fieldErrors };
                    delete newErrors.weight;
                    setFieldErrors(newErrors);
                  }
                }}
                className={`h-10 ${fieldErrors.weight ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder={unit === 'metric' ? '70' : '154'}
              />
              {fieldErrors.weight && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {fieldErrors.weight}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Taille {unit === 'metric' ? '(cm)' : '(in)'}</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => {
                  setHeight(Number(e.target.value));
                  if (fieldErrors.height) {
                    const newErrors = { ...fieldErrors };
                    delete newErrors.height;
                    setFieldErrors(newErrors);
                  }
                }}
                className={`h-10 ${fieldErrors.height ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder={unit === 'metric' ? '175' : '69'}
              />
              {fieldErrors.height && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {fieldErrors.height}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Âge (années)</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => {
                  setAge(Number(e.target.value));
                  if (fieldErrors.age) {
                    const newErrors = { ...fieldErrors };
                    delete newErrors.age;
                    setFieldErrors(newErrors);
                  }
                }}
                className={`h-10 ${fieldErrors.age ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="30"
                min="13"
                max="120"
              />
              {fieldErrors.age && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {fieldErrors.age}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Genre</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Sélectionnez votre genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">🚹 Homme</SelectItem>
                  <SelectItem value="female">🚺 Femme</SelectItem>
                  <SelectItem value="other">⚧ Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="body-fat">% Graisse corporelle (optionnel)</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Permet un calcul plus précis basé sur la masse maigre. Si vous ne connaissez pas ce pourcentage, laissez vide.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Hommes: 10-20% • Femmes: 16-25%</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="body-fat"
              type="number"
              value={bodyFatPercentage}
              onChange={(e) => {
                setBodyFatPercentage(Number(e.target.value));
                if (fieldErrors.bodyFat) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.bodyFat;
                  setFieldErrors(newErrors);
                }
              }}
              className={`h-10 ${fieldErrors.bodyFat ? 'border-red-500 focus:border-red-500' : ''}`}
              min="3"
              max="50"
              placeholder="Laissez vide si inconnu"
            />
            {fieldErrors.bodyFat && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <Info className="h-3 w-3" />
                {fieldErrors.bodyFat}
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Section 2: Activité & Objectifs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Activité physique et objectifs</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="activity-level">Niveau d'activité</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Votre niveau d'activité physique quotidienne, incluant le travail et les loisirs.</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <p><strong>Sédentaire:</strong> Bureau, peu de mouvement</p>
                      <p><strong>Léger:</strong> Marche occasionnelle</p>
                      <p><strong>Modéré:</strong> Exercice régulier 3-5x/sem</p>
                      <p><strong>Très actif:</strong> Exercice intense 6-7x/sem</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select value={activityLevel} onValueChange={setActivityLevel}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Sélectionnez votre niveau" />
                </SelectTrigger>
                <SelectContent>
                  {activityLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center">
                        <Activity className="mr-2 h-4 w-4" />
                        {level.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="training-days">Jours d'entraînement / semaine</Label>
              <Select value={trainingDays.toString()} onValueChange={(value) => setTrainingDays(Number(value))}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Nombre de jours" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((days) => (
                    <SelectItem key={days} value={days.toString()}>
                      <div className="flex items-center">
                        <span className="mr-2">{days === 0 ? '🛋️' : days <= 2 ? '🚶' : days <= 4 ? '🏃' : '🏋️'}</span>
                        {days === 0 ? 'Aucun' : `${days} jour${days > 1 ? 's' : ''}`}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="fitness-goal">Objectif fitness principal</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Votre objectif principal influence le calcul des besoins en protéines et calories.</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <p><strong>Perte de poids:</strong> Plus de protéines, moins de calories</p>
                    <p><strong>Gain musculaire:</strong> Protéines élevées, surplus calorique</p>
                    <p><strong>Maintien:</strong> Besoins équilibrés</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={fitnessGoal} onValueChange={setFitnessGoal}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Quel est votre objectif ?" />
              </SelectTrigger>
              <SelectContent>
                {fitnessGoals.map((goal) => (
                  <SelectItem key={goal.value} value={goal.value}>
                    <div>
                      <div className="flex items-center">
                        <Target className="mr-2 h-4 w-4" />
                        {goal.label}
                      </div>
                      <p className="text-xs text-muted-foreground">{goal.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
          </>
        )}

        <Button 
          onClick={handleCalculate} 
          className="w-full h-12"
          disabled={showFormFields ? !calculateProgress.isRequiredComplete || isCalculating : isCalculating}
        >
          <Calculator className={`mr-2 h-5 w-5 ${isCalculating ? 'animate-spin' : ''}`} />
          {isCalculating ? 'Calcul en cours...' : 'Calculer mes besoins en protéines et calories'}
        </Button>
        
        {showFormFields && !calculateProgress.isRequiredComplete && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Veuillez remplir tous les champs requis pour obtenir des recommandations précises.
              {calculateProgress.completedRequired < calculateProgress.requiredFields.length && (
                <span className="block mt-1 text-xs text-muted-foreground">
                  Champs manquants : {calculateProgress.requiredFields
                    .filter(field => {
                      return typeof field.value === 'number' ? !(field.value > 0) : !(field.value && field.value !== '');
                    })
                    .map(field => field.label)
                    .join(', ')}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Recommendation Display */}
        {recommendation && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {recommendation.explanation}
              </AlertDescription>
            </Alert>

            {/* Protein Recommendations */}
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Protéines recommandées</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-primary/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Basé sur votre poids, objectifs et niveau d'activité. Les protéines aident à maintenir et développer la masse musculaire.</p>
                      <p className="mt-1 text-xs">Répartissez sur 3-4 repas pour une meilleure absorption.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="text-4xl font-bold text-primary">
                  {recommendation.recommended}g
                </div>
                <div className="text-sm text-muted-foreground">
                  par jour
                </div>
                <div className="flex justify-center gap-2 mt-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="cursor-help">Min: {recommendation.min}g</Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Minimum recommandé pour maintenir la masse musculaire</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="cursor-help">Max: {recommendation.max}g</Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Maximum conseillé pour éviter un excès inutile</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Calorie Recommendations */}
            {recommendation.calories && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">Calories recommandées</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-green-600/60 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Basé sur votre métabolisme de base (BMR) et votre niveau d'activité, ajusté selon votre objectif.</p>
                        <p className="mt-1 text-xs">Cette valeur peut varier de ±10% selon votre morphologie.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {recommendation.calories.recommended} cal
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    par jour
                  </div>
                  <div className="flex justify-center gap-2 mt-2 text-xs">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 cursor-help">
                          BMR: {recommendation.calories.bmr} cal
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p><strong>Métabolisme de Base (BMR)</strong></p>
                        <p>Calories nécessaires au repos pour les fonctions vitales</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 cursor-help">
                          TDEE: {recommendation.calories.tdee} cal
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p><strong>Dépense Énergétique Totale (TDEE)</strong></p>
                        <p>BMR + activité physique quotidienne</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}

            {/* Calorie Explanation */}
            {recommendation.calories && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                <Zap className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                  <strong>Métabolisme calculé :</strong> {recommendation.calories.explanation}
                  <br />
                  <span className="text-xs mt-1 block">
                    BMR = Métabolisme de base • TDEE = Dépense énergétique totale quotidienne
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </motion.div>
        )}
      </CardContent>
      
      {recommendation && (
        <CardFooter className="border-t pt-4">
          <Button 
            onClick={handleApplyRecommendation} 
            className="w-full h-12"
            disabled={isSaving}
          >
            <Target className={`mr-2 h-5 w-5 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Sauvegarde en cours...' : 'Appliquer cette recommandation'}
          </Button>
        </CardFooter>
      )}
      </Card>
    </TooltipProvider>
  );
}