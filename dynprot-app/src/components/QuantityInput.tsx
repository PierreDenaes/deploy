import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ArrowRight, Plus } from 'lucide-react';

interface QuantityInputProps {
  photoAnalysisResult: {
    description: string;
    protein: number;
    calories: number;
    confidence?: number;
  };
  quantityInput: string;
  onQuantityChange: (quantity: string) => void;
  onContinue: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

// Suggestions de quantités courantes
const QUANTITY_SUGGESTIONS = [
  { label: '1 portion', value: '1 portion' },
  { label: '1 tranche', value: '1 tranche' },
  { label: '100g', value: '100 grammes' },
  { label: '1 assiette', value: '1 assiette' },
  { label: '1/2 portion', value: 'une demi-portion' },
  { label: 'Une grande portion', value: 'une grande portion' },
];

// Exemples contextuels selon le type d'aliment
const getContextualSuggestions = (description: string): string[] => {
  const desc = description.toLowerCase();
  
  if (desc.includes('tranche') || desc.includes('pain') || desc.includes('fromage')) {
    return ['1 tranche', '2 tranches', '3 tranches'];
  }
  
  if (desc.includes('fruit') || desc.includes('pomme') || desc.includes('banane')) {
    return ['1 fruit', '2 fruits', '1/2 fruit'];
  }
  
  if (desc.includes('œuf') || desc.includes('oeuf')) {
    return ['1 œuf', '2 œufs', '3 œufs'];
  }
  
  if (desc.includes('verre') || desc.includes('lait') || desc.includes('jus')) {
    return ['1 verre', '1 grand verre', '200ml'];
  }
  
  if (desc.includes('cuillère') || desc.includes('yaourt') || desc.includes('miel')) {
    return ['1 cuillère', '2 cuillères', '1 pot'];
  }
  
  return ['1 portion', 'Une petite portion', 'Une grande portion'];
};

export const QuantityInput: React.FC<QuantityInputProps> = ({
  photoAnalysisResult,
  quantityInput,
  onQuantityChange,
  onContinue,
  onBack,
  isLoading = false
}) => {
  const [customInput, setCustomInput] = useState(quantityInput);
  
  // Obtenir les suggestions contextuelles
  const contextualSuggestions = getContextualSuggestions(photoAnalysisResult.description);
  
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
                {photoAnalysisResult.protein}g
              </p>
              <p className="text-gray-600">Protéines estimées</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {photoAnalysisResult.calories}
              </p>
              <p className="text-gray-600">Calories estimées</p>
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
          {/* Suggestions contextuelles */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Suggestions pour ce type d'aliment
            </Label>
            <div className="flex flex-wrap gap-2">
              {contextualSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant={customInput === suggestion ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          {/* Suggestions générales */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Quantités courantes
            </Label>
            <div className="flex flex-wrap gap-2">
              {QUANTITY_SUGGESTIONS.map((suggestion, index) => (
                <Button
                  key={index}
                  variant={customInput === suggestion.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion.value)}
                  className="text-xs"
                >
                  {suggestion.label}
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