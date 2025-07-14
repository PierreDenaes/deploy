import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Coffee, UtensilsCrossed, Moon, Apple } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartCTAProps {
  onAddMeal: () => void;
  onQuickAdd: (mealType: string) => void;
  progressPercentage: number;
  currentHour: number;
  mealsCount: number;
  className?: string;
}

export default function SmartCTA({
  onAddMeal,
  onQuickAdd,
  progressPercentage,
  currentHour,
  mealsCount,
  className
}: SmartCTAProps) {
  
  // Determine contextual meal type and message
  const getContextualSuggestion = () => {
    if (currentHour >= 6 && currentHour < 11) {
      return {
        primary: "Ajouter mon petit-déjeuner",
        message: "Commencez votre journée avec des protéines",
        mealType: "breakfast",
        icon: <Coffee className="h-6 w-6" />,
        quickActions: [
          { type: "breakfast", label: "Petit-déj", icon: <Coffee className="h-4 w-4" /> }
        ]
      };
    }
    
    if (currentHour >= 11 && currentHour < 14) {
      return {
        primary: "Ajouter mon déjeuner",
        message: progressPercentage < 30 ? 
          "Rattrapez le retard avec un déjeuner protéiné" : 
          "Maintenez votre élan avec un bon déjeuner",
        mealType: "lunch",
        icon: <UtensilsCrossed className="h-6 w-6" />,
        quickActions: [
          { type: "lunch", label: "Déjeuner", icon: <UtensilsCrossed className="h-4 w-4" /> },
          { type: "snack", label: "Collation", icon: <Apple className="h-4 w-4" /> }
        ]
      };
    }
    
    if (currentHour >= 14 && currentHour < 18) {
      return {
        primary: "Ajouter une collation",
        message: progressPercentage > 70 ? 
          "Une petite collation pour finir en beauté" :
          "Boost de l'après-midi recommandé",
        mealType: "snack",
        icon: <Apple className="h-6 w-6" />,
        quickActions: [
          { type: "snack", label: "Collation", icon: <Apple className="h-4 w-4" /> },
          { type: "lunch", label: "Déjeuner tardif", icon: <UtensilsCrossed className="h-4 w-4" /> }
        ]
      };
    }
    
    if (currentHour >= 18 && currentHour < 23) {
      const remaining = 100 - progressPercentage;
      return {
        primary: "Ajouter mon dîner",
        message: remaining > 40 ? 
          `Plus que ${Math.round(remaining)}% pour atteindre votre objectif !` :
          "Parfait timing pour votre dîner",
        mealType: "dinner",
        icon: <Moon className="h-6 w-6" />,
        quickActions: [
          { type: "dinner", label: "Dîner", icon: <Moon className="h-4 w-4" /> },
          { type: "snack", label: "Collation", icon: <Apple className="h-4 w-4" /> }
        ]
      };
    }
    
    // Late night or early morning
    return {
      primary: "Ajouter un repas",
      message: mealsCount === 0 ? 
        "Commencez à tracker vos protéines" :
        "Ajoutez votre prochain repas",
      mealType: "meal",
      icon: <Plus className="h-6 w-6" />,
      quickActions: [
        { type: "snack", label: "Collation", icon: <Apple className="h-4 w-4" /> },
        { type: "meal", label: "Repas", icon: <Plus className="h-4 w-4" /> }
      ]
    };
  };

  const suggestion = getContextualSuggestion();

  // Button variant based on urgency/context
  const getButtonVariant = () => {
    if (progressPercentage < 25 && currentHour > 12) return "destructive"; // Behind schedule
    if (progressPercentage >= 75) return "secondary"; // Almost done
    return "default"; // Normal progress
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      className={className}
    >
      <Card className="border-0 shadow-lg bg-background">
        <CardContent className="p-6">
          {/* Contextual Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-6"
          >
            <p className="text-lg font-semibold text-foreground mb-2">
              {suggestion.message}
            </p>
            {progressPercentage < 25 && currentHour > 14 && (
              <p className="text-sm text-orange-600 font-medium">
                ⚡ Pensez à rattraper votre retard !
              </p>
            )}
          </motion.div>

          {/* Primary CTA */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              onClick={onAddMeal}
              variant={getButtonVariant()}
              size="lg"
              className={cn(
                "w-full h-16 text-xl font-bold rounded-2xl shadow-lg mb-4",
                "flex items-center justify-center gap-4",
                getButtonVariant() === "destructive" && "bg-orange-500 hover:bg-orange-600 text-white",
                getButtonVariant() === "secondary" && "bg-green-500 hover:bg-green-600 text-white"
              )}
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                {suggestion.icon}
              </motion.div>
              {suggestion.primary}
            </Button>
          </motion.div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground text-center">
              Ou ajoutez rapidement :
            </p>
            <div className="flex gap-2 justify-center">
              {suggestion.quickActions.map((action, index) => (
                <motion.div
                  key={action.type}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={() => onQuickAdd(action.type)}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-12 px-4 rounded-xl shadow-sm",
                      "flex items-center gap-2 font-medium",
                      "hover:bg-primary/5 hover:border-primary/30",
                      "transition-all duration-200"
                    )}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Progress-based encouragement */}
          {progressPercentage >= 75 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
              className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-center"
            >
              <p className="text-green-700 font-semibold text-sm">
                🎯 Vous êtes presque à l'objectif ! Plus que {Math.round(100 - progressPercentage)}%
              </p>
            </motion.div>
          )}

          {/* Behind schedule warning */}
          {progressPercentage < 30 && currentHour > 15 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
              className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-center"
            >
              <p className="text-orange-700 font-semibold text-sm">
                ⏰ Il est encore temps de rattraper votre objectif !
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}