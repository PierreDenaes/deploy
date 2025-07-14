import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  Camera, 
  BarChart3, 
  Plus, 
  History, 
  User,
  Smartphone,
  CheckCircle 
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const tourSteps = [
  {
    id: 1,
    title: 'Aperçu du tableau de bord',
    description: 'Votre parcours de suivi des protéines commence ici. Visualisez votre progression quotidienne, vos repas récents et vos tendances hebdomadaires en un coup d\'œil.',
    icon: BarChart3,
    image: '/api/placeholder/400/300',
    tips: [
      'Vérifiez votre anneau de progression quotidien des protéines',
      'Consultez vos repas récents et vos statistiques rapides',
      'Visualisez les tendances hebdomadaires pour suivre votre constance'
    ]
  },
  {
    id: 2,
    title: 'Ajoutez facilement vos repas',
    description: 'Trois façons d\'enregistrer vos protéines : prenez une photo pour l\'analyse IA, scannez des codes-barres ou saisissez les détails manuellement.',
    icon: Plus,
    image: '/api/placeholder/400/300',
    tips: [
      'Icône appareil photo pour l\'analyse photo assistée par IA',
      'Saisie manuelle pour un contrôle précis',
      'Fonction de scan pour les aliments emballés'
    ]
  },
  {
    id: 3,
    title: 'Analyse photo IA',
    description: 'Prenez une photo de votre repas et notre IA estimera automatiquement la teneur en protéines.',
    icon: Camera,
    image: '/api/placeholder/400/300',
    tips: [
      'Prenez des photos claires et bien éclairées pour de meilleurs résultats',
      'Incluez tout le repas dans le cadre',
      'Vérifiez et ajustez les estimations de l\'IA si nécessaire'
    ]
  },
  {
    id: 4,
    title: 'Suivez votre historique',
    description: 'Consultez votre historique nutritionnel, identifiez des schémas et suivez vos progrès au fil du temps.',
    icon: History,
    image: '/api/placeholder/400/300',
    tips: [
      'Filtrez par plage de dates ou type de repas',
      'Exportez vos données pour analyse',
      'Identifiez vos meilleurs jours et les jours difficiles'
    ]
  },
  {
    id: 5,
    title: 'Gérez votre profil',
    description: 'Mettez à jour vos objectifs, vos préférences et consultez vos réalisations dans la section profil.',
    icon: User,
    image: '/api/placeholder/400/300',
    tips: [
      'Ajustez vos objectifs de protéines et de calories',
      'Modifiez les préférences de l\'application et les notifications',
      'Visualisez votre série et vos réalisations'
    ]
  }
];

const AppTour = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = tourSteps.length;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    // Mark onboarding as complete and navigate to dashboard
    navigate('/');
  };

  const currentTour = tourSteps[currentStep];
  const IconComponent = currentTour.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 pt-8"
          >
            <div className="mx-auto w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-ios">
              <img 
                src="/logo.jpg" 
                alt="DynProt Logo" 
                className="w-12 h-12 object-contain filter drop-shadow-sm rounded-xl"
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Visite rapide de l'application
            </h1>
            <p className="text-muted-foreground mb-4">
              Découvrez comment tirer le meilleur parti de DynProt en quelques minutes seulement.
            </p>
            <div className="flex items-center justify-center space-x-2">
              <Badge variant="secondary" className="text-base py-1 px-3">
                Étape {currentStep + 1} sur {totalSteps}
              </Badge>
            </div>
          </motion.div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="w-full bg-muted/30 rounded-full h-2">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Tour Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="overflow-hidden border-0 shadow-ios bg-background border border-border/20">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-2 gap-0">
                    {/* Content Side */}
                    <div className="p-8">
                      <div className="flex items-center mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mr-4">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">
                          {currentTour.title}
                        </h2>
                      </div>
                      
                      <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                        {currentTour.description}
                      </p>

                      <div className="space-y-3">
                        <h3 className="font-semibold text-foreground mb-3">
                          Fonctionnalités clés :
                        </h3>
                        {currentTour.tips.map((tip, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="flex items-start space-x-3"
                          >
                            <CheckCircle className="h-5 w-5 text-ios-green mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{tip}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Image/Visual Side */}
                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-8 flex items-center justify-center rounded-r-2xl">
                      <div className="w-full max-w-sm">
                        {/* Mock Phone Interface */}
                        <div className="bg-gray-900 rounded-3xl p-2 shadow-2xl">
                          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
                            {/* Phone Header */}
                            <div className="h-16 bg-primary flex items-center justify-center relative">
                              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center p-1">
                                  <img 
                                    src="/logo.jpg" 
                                    alt="DynProt Logo" 
                                    className="w-full h-full object-contain rounded-md"
                                  />
                                </div>
                              </div>
                              <h3 className="text-white font-semibold text-base">
                                {currentTour.title}
                              </h3>
                            </div>
                            
                            {/* Phone Content */}
                            <div className="h-64 bg-muted/20 flex items-center justify-center p-4">
                              <div className="text-center">
                                <IconComponent className="h-16 w-16 text-primary mx-auto mb-4" />
                                <p className="text-sm text-muted-foreground">
                                  {currentTour.title} Interface
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex justify-between items-center mt-8"
          >
            <div className="flex space-x-2">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handlePrevious} className="h-12 text-base">
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Précédent
                </Button>
              )}
              {currentStep === 0 && (
                <Button variant="link" onClick={handleSkip} className="h-12 text-base">
                  Passer la visite
                </Button>
              )}
            </div>
            
            <div className="flex space-x-2">
              {currentStep < totalSteps - 1 && (
                <Button variant="link" onClick={handleSkip} className="h-12 text-base">
                  Passer
                </Button>
              )}
              <Button onClick={handleNext} className="h-12 text-base">
                {currentStep === totalSteps - 1 ? (
                  <>
                    Commencer DynProt
                    <CheckCircle className="ml-2 h-5 w-5" />
                  </>
                ) : (
                  <>
                    Suivant
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Step Indicators */}
          <div className="flex justify-center mt-8 space-x-2">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-3 h-3 rounded-full transition-colors duration-200",
                  index === currentStep 
                    ? 'bg-primary' 
                    : index < currentStep 
                      ? 'bg-primary/50' 
                      : 'bg-muted/50'
                )}
              />
            ))}
          </div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center mt-8"
          >
            <p className="text-sm text-muted-foreground">
              Vous pouvez toujours accéder à l'aide et aux astuces depuis le menu de profil.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AppTour;