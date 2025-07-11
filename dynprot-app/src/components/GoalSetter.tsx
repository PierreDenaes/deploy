import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAppContext } from "@/context/AppContext";
import { motion } from "framer-motion";
import { Target, Save } from "lucide-react";
import { toast } from "sonner";

interface GoalSetterProps {
  onGoalsChange?: (protein: number, calories: number) => void;
}

export interface GoalSetterRef {
  updateGoals: (protein: number, calories?: number) => void;
}

const GoalSetter = forwardRef<GoalSetterRef, GoalSetterProps>(({ onGoalsChange }, ref) => {
  const { userSettings, updateNutritionGoals } = useAppContext();
  const [proteinGoal, setProteinGoal] = useState<number>(userSettings?.proteinGoal || 120);
  const [calorieGoal, setCalorieGoal] = useState<number>(userSettings?.calorieGoal || 2000);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update form when user settings change
  useEffect(() => {
    if (userSettings) {
      setProteinGoal(userSettings.proteinGoal || 120);
      setCalorieGoal(userSettings.calorieGoal || 2000);
    }
  }, [userSettings]);

  // Notify parent component when goals change
  useEffect(() => {
    if (onGoalsChange) {
      onGoalsChange(proteinGoal, calorieGoal);
    }
  }, [proteinGoal, calorieGoal, onGoalsChange]);

  // Function to update goals from parent (ProteinGoalCalculator)
  const updateGoalsFromCalculator = (protein: number, calories?: number) => {
    setIsUpdating(true);
    setProteinGoal(protein);
    if (calories !== undefined) {
      setCalorieGoal(calories);
    }
    
    // Note: No auto-save here since the calculator handles the saving
    // This only updates the visual state for immediate feedback
    
    // Reset visual feedback after animation
    setTimeout(() => setIsUpdating(false), 1000);
  };

  // Expose function to parent component
  useImperativeHandle(ref, () => ({
    updateGoals: updateGoalsFromCalculator
  }), []);

  // Handle save changes
  const handleSave = () => {
    updateNutritionGoals({
      proteinGoal,
      calorieGoal
    });

    toast.success("Objectifs mis à jour avec succès !");
  };


  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Définir les objectifs nutritionnels
        </CardTitle>
        <CardDescription>
          Ajustez vos objectifs quotidiens de protéines et calories, ou utilisez le calculateur ci-dessus pour des recommandations personnalisées.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="protein-goal" className="text-base font-medium">
              Objectif quotidien de protéines
            </label>
            <div className="flex items-center gap-2">
              <motion.span 
                className="text-3xl font-bold text-primary"
                animate={isUpdating ? { scale: [1, 1.1, 1], color: ["#007aff", "#34c759", "#007aff"] } : {}}
                transition={{ duration: 0.6 }}
              >
                {proteinGoal}g
              </motion.span>
            </div>
          </div>
          <Slider
            id="protein-goal"
            value={[proteinGoal]}
            min={20}
            max={300}
            step={5}
            onValueChange={(value) => setProteinGoal(value[0])}
            className="py-4"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>20g</span>
            <span>300g</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="calorie-goal" className="text-base font-medium">
              Objectif quotidien de calories
            </label>
            <div className="flex items-center gap-2">
              <motion.span 
                className="text-3xl font-bold text-primary"
                animate={isUpdating ? { scale: [1, 1.1, 1], color: ["#007aff", "#34c759", "#007aff"] } : {}}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {calorieGoal} cal
              </motion.span>
            </div>
          </div>
          <Slider
            id="calorie-goal"
            value={[calorieGoal]}
            min={1200}
            max={4000}
            step={50}
            onValueChange={(value) => setCalorieGoal(value[0])}
            className="py-4"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>1200 cal</span>
            <span>4000 cal</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <motion.div 
          whileHover={{ scale: 1.03 }} 
          whileTap={{ scale: 0.98 }}
          className="w-full"
        >
          <Button onClick={handleSave} className="w-full h-12 text-base">
            <Save className="mr-2 h-5 w-5" />
            Enregistrer les objectifs
          </Button>
        </motion.div>
      </CardFooter>
    </Card>
  );
});

GoalSetter.displayName = 'GoalSetter';

export default GoalSetter;