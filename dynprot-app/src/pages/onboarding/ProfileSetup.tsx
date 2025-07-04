import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, User, Activity, Target, Settings, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { OnboardingData } from '@/types/auth';
import { ProfileService } from '@/services/api.profile';
import { toast } from 'sonner';

// Validation schemas for each step
const step1Schema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  age: z.number().min(13, 'Doit avoir au moins 13 ans').max(120, 'Veuillez entrer un âge valide'),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Veuillez sélectionner votre genre' }),
});

const step2Schema = z.object({
  height: z.number().min(100, 'Veuillez entrer une taille valide').max(250, 'Veuillez entrer une taille valide'),
  weight: z.number().min(30, 'Veuillez entrer un poids valide').max(300, 'Veuillez entrer un poids valide'),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very_active', 'extremely_active'], {
    required_error: 'Veuillez sélectionner votre niveau d\'activité'
  }),
  units: z.enum(['metric', 'imperial']),
});

const step3Schema = z.object({
  primaryGoal: z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'general_health']),
  proteinGoal: z.number().min(20, 'Minimum 20g de protéines par jour').max(300, 'Maximum 300g de protéines par jour'),
  calorieGoal: z.number().min(800, 'Minimum 800 calories par jour').max(5000, 'Maximum 5000 calories par jour'),
  dietaryPreferences: z.array(z.string()),
});

const step4Schema = z.object({
  notifications: z.boolean(),
  dataSharing: z.boolean(),
  darkMode: z.boolean(),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type Step4Data = z.infer<typeof step4Schema>;

const activityLevels = [
  { value: 'sedentary', label: 'Sédentaire', description: 'Peu ou pas d\'exercice' },
  { value: 'light', label: 'Légèrement actif', description: 'Exercice léger 1-3 jours/semaine' },
  { value: 'moderate', label: 'Modérément actif', description: 'Exercice modéré 3-5 jours/semaine' },
  { value: 'very_active', label: 'Très actif', description: 'Exercice intense 6-7 jours/semaine' },
  { value: 'extremely_active', label: 'Extrêmement actif', description: 'Exercice très intense, travail physique' },
];

const primaryGoals = [
  { value: 'weight_loss', label: 'Perte de poids', description: 'Perdre du poids et réduire la graisse corporelle' },
  { value: 'muscle_gain', label: 'Gain musculaire', description: 'Développer la masse musculaire et la force' },
  { value: 'maintenance', label: 'Maintien', description: 'Maintenir le poids actuel et la santé' },
  { value: 'general_health', label: 'Santé générale', description: 'Santé et bien-être général' },
];

const dietaryOptions = [
  'Végétarien',
  'Végétalien',
  'Keto',
  'Paléo',
  'Méditerranéen',
  'Sans gluten',
  'Sans produits laitiers',
  'Faible en glucides',
  'Riche en protéines',
];

// Add animation variants for motion components
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren" as const,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

// Utility to sanitize profile payloads
function sanitizeProfilePayload(payload: Record<string, any>) {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== null && value !== undefined && value !== '') {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, updateUserProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<OnboardingData>>({
    personalInfo: { name: user?.name || '', age: 25, gender: 'other' },
    physicalStats: { height: 170, weight: 70, activityLevel: 'moderate', units: 'metric' },
    goals: { primaryGoal: 'general_health', proteinGoal: 120, calorieGoal: 2000, dietaryPreferences: [] },
    preferences: { notifications: true, dataSharing: false, darkMode: false },
  });

  const totalSteps = 4;

  // Form configurations for each step
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      ...formData.personalInfo,
      gender: (formData.personalInfo?.gender as "male" | "female" | "other") || 'other',
    },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: formData.physicalStats,
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: formData.goals,
  });

  const step4Form = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: formData.preferences,
  });

  const handleNext = async () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = await step1Form.trigger();
        if (isValid) {
          const data = step1Form.getValues();
          setFormData(prev => ({
            ...prev,
            personalInfo: {
              name: data.name ?? prev.personalInfo?.name ?? '',
              age: data.age ?? prev.personalInfo?.age ?? 0,
              gender: (data.gender ?? prev.personalInfo?.gender ?? 'other') as "male" | "female" | "other",
            }
          }));
        }
        break;
      case 2:
        isValid = await step2Form.trigger();
        if (isValid) {
          const data = step2Form.getValues();
          setFormData(prev => ({
            ...prev,
            physicalStats: {
              height: data.height ?? prev.physicalStats?.height ?? 0,
              weight: data.weight ?? prev.physicalStats?.weight ?? 0,
              activityLevel: data.activityLevel ?? prev.physicalStats?.activityLevel ?? 'moderate',
              units: data.units ?? prev.physicalStats?.units ?? 'metric',
            }
          }));
        }
        break;
      case 3:
        isValid = await step3Form.trigger();
        if (isValid) {
          const data = step3Form.getValues();
          setFormData(prev => ({
            ...prev,
            goals: {
              primaryGoal: data.primaryGoal ?? prev.goals?.primaryGoal ?? 'general_health',
              proteinGoal: data.proteinGoal ?? prev.goals?.proteinGoal ?? 120,
              calorieGoal: data.calorieGoal ?? prev.goals?.calorieGoal ?? 2000,
              dietaryPreferences: data.dietaryPreferences ?? prev.goals?.dietaryPreferences ?? [],
            }
          }));
        }
        break;
      case 4:
        await handleComplete();
        return;
    }

    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/onboarding');
    }
  };

  const handleComplete = async () => {
    const step4Data = step4Form.getValues();
    const finalData = { ...formData, preferences: step4Data };
    
    try {
      // Map onboarding data to API format and save to backend
      if (finalData.personalInfo && finalData.physicalStats && finalData.goals) {
        // Update name first to ensure it's saved
        if (finalData.personalInfo.name) {
          const nameParts = finalData.personalInfo.name.trim().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
          
          await ProfileService.updateProfile(sanitizeProfilePayload({
            first_name: firstName,
            last_name: lastName,
          }));
        }

        // Save physical info
        await ProfileService.updatePhysicalInfo({
          weight_kg: finalData.physicalStats.weight,
          height_cm: finalData.physicalStats.height,
          age: finalData.personalInfo.age,
          gender: finalData.personalInfo.gender as any,
        });

        // Save fitness info
        await ProfileService.updateFitnessInfo({
          activity_level: finalData.physicalStats.activityLevel as any,
          fitness_goal: finalData.goals.primaryGoal === 'weight_loss' ? 'lose_weight' as const :
                       finalData.goals.primaryGoal === 'muscle_gain' ? 'gain_muscle' as const :
                       'maintain' as const,
        });

        // Save nutrition goals  
        await ProfileService.updateNutritionGoals({
          daily_protein_goal: finalData.goals.proteinGoal,
          daily_calorie_goal: finalData.goals.calorieGoal,
        });

        // Save preferences
        await ProfileService.updateAppPreferences({
          dark_mode: step4Data.darkMode,
          notifications_enabled: step4Data.notifications,
        });

        await ProfileService.updatePrivacySettings({
          share_data: step4Data.dataSharing,
          allow_analytics: step4Data.dataSharing,
        });

        // Save dietary preferences if any
        if (finalData.goals.dietaryPreferences.length > 0) {
          await ProfileService.updateDietPreferences(finalData.goals.dietaryPreferences);
        }

        // Save units preference
        await ProfileService.updateProfile(sanitizeProfilePayload({
          preferred_units: finalData.physicalStats.units,
        }));

        toast.success('Profil sauvegardé avec succès !');
      }

      // Marquer l'onboarding comme terminé côté backend
      await ProfileService.completeOnboarding();

      // Update user profile with onboarding completion
      if (user) {
        updateUserProfile({ hasCompletedOnboarding: true });
      }
      
      navigate('/onboarding/app-tour');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du profil:', error);
      toast.error('Erreur lors de la sauvegarde du profil. Les données ont été conservées localement.');
      // Même en cas d'erreur, tente de marquer onboarding comme complet côté backend
      try { await ProfileService.completeOnboarding(); } catch {}
      if (user) {
        updateUserProfile({ hasCompletedOnboarding: true });
      }
      navigate('/onboarding/app-tour');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Parlez-nous un peu de vous pour personnaliser votre expérience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input
                  id="name"
                  placeholder="Entrez votre nom complet"
                  {...step1Form.register('name')}
                  className="h-12 text-base"
                />
                {step1Form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">{step1Form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Âge</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="Entrez votre âge"
                  {...step1Form.register('age', { valueAsNumber: true })}
                  className="h-12 text-base"
                />
                {step1Form.formState.errors.age && (
                  <p className="text-sm text-destructive mt-1">{step1Form.formState.errors.age.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Genre</Label>
                <RadioGroup
                  value={step1Form.watch('gender')}
                  onValueChange={(value) => step1Form.setValue('gender', value as any)}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Homme</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Femme</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other">Autre</Label>
                  </div>
                </RadioGroup>
                {step1Form.formState.errors.gender && (
                  <p className="text-sm text-destructive mt-1">{step1Form.formState.errors.gender.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Statistiques physiques & Activité
              </CardTitle>
              <CardDescription>
                Aidez-nous à calculer vos objectifs nutritionnels personnalisés.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Taille (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="170"
                    {...step2Form.register('height', { valueAsNumber: true })}
                    className="h-12 text-base"
                  />
                  {step2Form.formState.errors.height && (
                    <p className="text-sm text-destructive mt-1">{step2Form.formState.errors.height.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Poids (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="70"
                    {...step2Form.register('weight', { valueAsNumber: true })}
                    className="h-12 text-base"
                  />
                  {step2Form.formState.errors.weight && (
                    <p className="text-sm text-destructive mt-1">{step2Form.formState.errors.weight.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Niveau d'activité</Label>
                <RadioGroup
                  value={step2Form.watch('activityLevel')}
                  onValueChange={(value) => step2Form.setValue('activityLevel', value as any)}
                  className="space-y-4"
                >
                  {activityLevels.map((level) => (
                    <div key={level.value} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                      <div className="space-y-1">
                        <Label htmlFor={level.value} className="font-medium text-base">
                          {level.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{level.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
                {step2Form.formState.errors.activityLevel && (
                  <p className="text-sm text-destructive mt-1">{step2Form.formState.errors.activityLevel.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Objectifs & Préférences
              </CardTitle>
              <CardDescription>
                Définissez vos objectifs nutritionnels et vos préférences alimentaires.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Objectif principal</Label>
                <RadioGroup
                  value={step3Form.watch('primaryGoal')}
                  onValueChange={(value) => step3Form.setValue('primaryGoal', value as any)}
                  className="space-y-4"
                >
                  {primaryGoals.map((goal) => (
                    <div key={goal.value} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <RadioGroupItem value={goal.value} id={goal.value} className="mt-1" />
                      <div className="space-y-1">
                        <Label htmlFor={goal.value} className="font-medium text-base">
                          {goal.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proteinGoal">Objectif protéines (g)</Label>
                  <Input
                    id="proteinGoal"
                    type="number"
                    placeholder="120"
                    {...step3Form.register('proteinGoal', { valueAsNumber: true })}
                    className="h-12 text-base"
                  />
                  {step3Form.formState.errors.proteinGoal && (
                    <p className="text-sm text-destructive mt-1">{step3Form.formState.errors.proteinGoal.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calorieGoal">Objectif calories</Label>
                  <Input
                    id="calorieGoal"
                    type="number"
                    placeholder="2000"
                    {...step3Form.register('calorieGoal', { valueAsNumber: true })}
                    className="h-12 text-base"
                  />
                  {step3Form.formState.errors.calorieGoal && (
                    <p className="text-sm text-destructive mt-1">{step3Form.formState.errors.calorieGoal.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Préférences alimentaires (facultatif)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dietaryOptions.map((option) => (
                    <label key={option} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={step3Form.watch('dietaryPreferences')?.includes(option) || false}
                        onChange={(e) => {
                          const current = step3Form.getValues('dietaryPreferences') || [];
                          if (e.target.checked) {
                            step3Form.setValue('dietaryPreferences', [...current, option]);
                          } else {
                            step3Form.setValue('dietaryPreferences', current.filter(p => p !== option));
                          }
                        }}
                      />
                      <span className="text-base">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Préférences de l'application
              </CardTitle>
              <CardDescription>
                Personnalisez votre expérience de l'application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="notifications">Notifications push</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevez des rappels pour la saisie des repas et les objectifs atteints.
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={step4Form.watch('notifications')}
                  onCheckedChange={(checked) => step4Form.setValue('notifications', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="dataSharing">Partage de données</Label>
                  <p className="text-sm text-muted-foreground">
                    Aidez à améliorer notre IA en partageant anonymement des données nutritionnelles.
                  </p>
                </div>
                <Switch
                  id="dataSharing"
                  checked={step4Form.watch('dataSharing')}
                  onCheckedChange={(checked) => step4Form.setValue('dataSharing', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="darkMode">Mode sombre</Label>
                  <p className="text-sm text-muted-foreground">
                    Utilisez le thème sombre pour une meilleure visualisation en basse lumière.
                  </p>
                </div>
                <Switch
                  id="darkMode"
                  checked={step4Form.watch('darkMode')}
                  onCheckedChange={(checked) => step4Form.setValue('darkMode', checked)}
                />
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container max-w-lg mx-auto p-4 pb-32">
        <motion.div
          className="space-y-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div
            variants={itemVariants}
            className="text-center mb-8 pt-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Configuration du profil
            </h1>
            <p className="text-muted-foreground">
              Étape {currentStep} sur {totalSteps}
            </p>
          </motion.div>

          {/* Progress Bar */}
          <motion.div variants={itemVariants} className="mb-8">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>

          {/* Form Step */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <motion.div variants={itemVariants} className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 h-12 text-base"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Retour
            </Button>
            
            <Button 
              onClick={handleNext}
              className="flex-1 h-12 text-base"
            >
              {currentStep === totalSteps ? (
                <>
                  Terminer
                  <CheckCircle className="ml-2 h-5 w-5" />
                </>
              ) : (
                <>
                  Suivant
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};