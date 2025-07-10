import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ArrowRight, Plus } from 'lucide-react';
import { QuantityParser } from '@/utils/quantity-parser';

interface QuantityInputProps {
  photoAnalysisResult: {
    description: string;
    protein: number;
    calories: number;
    confidence?: number;
    estimatedWeight?: number;
  };
  quantityInput: string;
  onQuantityChange: (quantity: string) => void;
  onContinue: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

// Get intelligent quantity suggestions based on detected food types
const getSmartSuggestions = (description: string): Array<{label: string, value: string, weight: number}> => {
  const desc = description.toLowerCase();
  
  // Extract food type from description
  let detectedFoodType: string | undefined;
  
  // Check for common food types
  if (desc.includes('biscuit') || desc.includes('cookie')) {
    detectedFoodType = 'biscuit';
  } else if (desc.includes('tranche') || desc.includes('pain')) {
    detectedFoodType = 'tranche';
  } else if (desc.includes('yaourt') || desc.includes('yogurt')) {
    detectedFoodType = 'yaourt';
  } else if (desc.includes('pomme') || desc.includes('apple')) {
    detectedFoodType = 'pomme';
  } else if (desc.includes('banane') || desc.includes('banana')) {
    detectedFoodType = 'banane';
  } else if (desc.includes('orange')) {
    detectedFoodType = 'orange';
  } else if (desc.includes('fromage') || desc.includes('cheese')) {
    detectedFoodType = 'fromage';
  }
  
  // Get suggestions from quantity parser
  const suggestions = QuantityParser.getPortionSuggestions(detectedFoodType);
  
  return suggestions;
};

// Fallback general suggestions
const GENERAL_SUGGESTIONS = [
  { label: '1 portion', value: '1 portion', weight: 100 },
  { label: '1/2 portion', value: '1/2 portion', weight: 50 },
  { label: '2 portions', value: '2 portions', weight: 200 },
  { label: '50g', value: '50g', weight: 50 },
  { label: '100g', value: '100g', weight: 100 },
  { label: '150g', value: '150g', weight: 150 },
];

export const QuantityInput: React.FC<QuantityInputProps> = ({
  photoAnalysisResult,
  quantityInput,
  onQuantityChange,
  onContinue,
  onBack,
  isLoading = false
}) => {
  const [customInput, setCustomInput] = useState(quantityInput);
  
  // Get smart suggestions based on detected food types
  const smartSuggestions = getSmartSuggestions(photoAnalysisResult.description);
  
  // Gérer la sélection d'une suggestion
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setCustomInput(suggestion);
    onQuantityChange(suggestion);
  }, [onQuantityChange]);
  
  // Gérer la saisie manuelle
  const handleCustomInputChange = useCallback((value: string) => {
    setCustomInput(value);
    onQuantityChange(value);
  }, [onQuantityChange]);
  
  // Vérifier si on peut continuer
  const canContinue = customInput.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Résumé de l'analyse */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            Aliments détectés
            {photoAnalysisResult.confidence && (
              <Badge variant="secondary" className="text-xs">
                {Math.round(photoAnalysisResult.confidence * 100)}% confiance
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-700">
            <strong>{photoAnalysisResult.description}</strong>
          </p>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {(() => {
                  const estimatedWeight = photoAnalysisResult.estimatedWeight || 10;
                  const normalizedProtein = (photoAnalysisResult.protein * 10) / estimatedWeight;
                  return Math.round(normalizedProtein * 10) / 10;
                })()}g
              </p>
              <p className="text-gray-600">Protéines estimées</p>
              <p className="text-xs text-gray-500">
                pour 10g
              </p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {(() => {
                  const estimatedWeight = photoAnalysisResult.estimatedWeight || 10;
                  const normalizedCalories = (photoAnalysisResult.calories * 10) / estimatedWeight;
                  return Math.round(normalizedCalories);
                })()}
              </p>
              <p className="text-gray-600">Calories estimées</p>
              <p className="text-xs text-gray-500">
                pour 10g
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saisie de quantité */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Précisez la quantité</CardTitle>
          <p className="text-sm text-gray-600">
            Aidez-nous à affiner l'estimation nutritionnelle
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Smart suggestions based on detected food */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Suggestions intelligentes
            </Label>
            <div className="flex flex-wrap gap-2">
              {smartSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant={customInput === suggestion.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion.value)}
                  className="text-xs flex items-center gap-1"
                >
                  {suggestion.label}
                  {!suggestion.label.includes('g') && (
                    <span className="text-xs text-gray-500">({suggestion.weight}g)</span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* General suggestions */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Quantités courantes
            </Label>
            <div className="flex flex-wrap gap-2">
              {GENERAL_SUGGESTIONS.map((suggestion, index) => (
                <Button
                  key={index}
                  variant={customInput === suggestion.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion.value)}
                  className="text-xs flex items-center gap-1"
                >
                  {suggestion.label}
                  {!suggestion.label.includes('g') && (
                    <span className="text-xs text-gray-500">({suggestion.weight}g)</span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Saisie libre */}
          <div>
            <Label htmlFor="custom-quantity" className="text-sm font-medium">
              Ou saisissez votre propre quantité
            </Label>
            <Input
              id="custom-quantity"
              type="text"
              value={customInput}
              onChange={(e) => handleCustomInputChange(e.target.value)}
              placeholder="ex: j'ai mangé 2 tranches, 150g, une petite portion..."
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Exemples : "j'en ai mangé un", "2 tranches fines", "une grosse portion"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1"
        >
          Retour
        </Button>
        
        <Button
          onClick={onContinue}
          disabled={!canContinue || isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-2"
              >
                <Plus className="h-4 w-4" />
              </motion.div>
              Analyse en cours...
            </>
          ) : (
            <>
              Continuer
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default QuantityInput;