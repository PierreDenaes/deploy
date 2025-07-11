import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Camera, BarChart3, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';
import { ProfileService } from '@/services/api.profile';

const features = [
  {
    icon: Camera,
    title: 'Analyse photo IA',
    description: 'Prenez des photos de vos repas et obtenez des estimations instantanées de protéines grâce à notre IA avancée.',
    color: 'primary',
  },
  {
    icon: Target,
    title: 'Objectifs personnalisés',
    description: 'Définissez des objectifs de protéines personnalisés en fonction de votre niveau d\'activité et de vos objectifs de remise en forme.',
    color: 'ios-green',
  },
  {
    icon: BarChart3,
    title: 'Suivi des progrès',
    description: 'Visualisez votre parcours nutritionnel avec de superbes graphiques et des analyses.',
    color: 'primary',
  },
  {
    icon: Zap,
    title: 'Recommandations intelligentes',
    description: 'Obtenez des suggestions de repas personnalisées pour vous aider à atteindre vos objectifs quotidiens.',
    color: 'ios-yellow',
  },
];

const Welcome = () => {
  const navigate = useNavigate();
  const { updateUserProfile, user } = useAuth();

  const handleGetStarted = () => {
    navigate('/onboarding/profile-setup');
  };

  const handleSkip = async () => {
    if (!user) return;
    
    try {
      // Marquer l'onboarding comme terminé côté backend
      await ProfileService.completeOnboarding();
      updateUserProfile({ hasCompletedOnboarding: true });
      navigate('/');
    } catch (error) {
      // Même en cas d'erreur, tente de marquer onboarding comme complet côté backend
      try { await ProfileService.completeOnboarding(); } catch {}
      updateUserProfile({ hasCompletedOnboarding: true });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 pt-8"
          >
            <div className="mx-auto w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-ios">
              <span className="text-4xl font-bold text-white">D</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Bienvenue sur DynProt
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Votre compagnon intelligent de suivi des protéines. Configurons votre profil et commençons votre parcours nutritionnel.
            </p>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid md:grid-cols-2 gap-6 mb-12"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              >
                <Card className="h-full border-0 shadow-ios hover:shadow-ios-lg transition-shadow duration-300 bg-background border border-border/20">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-${feature.color}/10`}>
                        <feature.icon className={`w-6 h-6 text-${feature.color}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center space-y-4"
          >
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="w-full max-w-sm h-12 text-base"
            >
              Commencer
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <div>
              <Button
                variant="link"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-primary"
              >
                Passer la configuration pour l'instant
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Ne vous inquiétez pas, vous pourrez toujours modifier vos préférences plus tard dans les paramètres.
            </p>
          </motion.div>

          {/* Progress Dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="flex justify-center mt-12 space-x-2"
          >
            <div className="w-3 h-3 bg-primary rounded-full" />
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;