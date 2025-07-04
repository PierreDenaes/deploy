import React, { useReducer, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "@/context/AppContext";
import { Camera, ArrowLeft, Scan, Save, X, Plus, Loader2, CheckCircle, AlertCircle, Mic, Edit3, Brain, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CameraInterface } from "@/components/CameraInterface";
import BaseVoiceInput from "@/components/BaseVoiceInput";
import QuantityInput from "@/components/QuantityInput";
import { TextAnalysisService, TextAnalysisResult } from "@/services/textAnalysisService";
import { analyzeMealFromText, MealAnalysisResult, MealNutritionData } from "@/services/gpt";
import { UnifiedAnalysisResult } from "@/hooks/useAnalyzeMeal";
import { AnalysisService, useMealAnalysis } from "@/services/api.analysis";
import { sanitizeMealDescription, sanitizeNumber, validateImageDataUrl } from "@/utils/sanitize";

// Types pour les modes d'entrée
type InputMode = 'selection' | 'ai_text' | 'ai_photo' | 'manual';
type ProcessingStep = 'input' | 'analysis' | 'quantity' | 'validation';

// État du formulaire restructuré
interface MealFormState {
  // Mode et progression
  currentMode: InputMode;
  currentStep: ProcessingStep;
  
  // Données de base
  description: string;
  finalProtein: number | null;
  finalCalories: number | null;
  
  // Mode IA Texte
  textInput: string;
  isAnalyzingText: boolean;
  textAnalysisResult: TextAnalysisResult | null;
  showVoiceInput: boolean;
  
  // Mode IA Photo
  capturedPhoto: string | null;
  showCamera: boolean;
  isAnalyzingPhoto: boolean;
  photoAnalysisResult: { description: string; protein: number; calories: number } | null;
  quantityInput: string;
  
  // Mode Manuel
  manualName: string;
  manualProtein: string;
  manualCalories: string;
  
  // États globaux
  isSaving: boolean;
  errors: Record<string, string>;
}

// Actions pour le reducer
type MealFormAction =
  | { type: 'SET_MODE'; payload: InputMode }
  | { type: 'SET_STEP'; payload: ProcessingStep }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_FINAL_PROTEIN'; payload: number | null }
  | { type: 'SET_FINAL_CALORIES'; payload: number | null }
  | { type: 'SET_TEXT_INPUT'; payload: string }
  | { type: 'SET_IS_ANALYZING_TEXT'; payload: boolean }
  | { type: 'SET_TEXT_ANALYSIS_RESULT'; payload: TextAnalysisResult | null }
  | { type: 'TOGGLE_VOICE_INPUT' }
  | { type: 'SET_CAPTURED_PHOTO'; payload: string | null }
  | { type: 'TOGGLE_CAMERA' }
  | { type: 'SET_IS_ANALYZING_PHOTO'; payload: boolean }
  | { type: 'SET_PHOTO_ANALYSIS_RESULT'; payload: { description: string; protein: number; calories: number } | null }
  | { type: 'SET_QUANTITY_INPUT'; payload: string }
  | { type: 'SET_MANUAL_NAME'; payload: string }
  | { type: 'SET_MANUAL_PROTEIN'; payload: string }
  | { type: 'SET_MANUAL_CALORIES'; payload: string }
  | { type: 'SET_IS_SAVING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: { field: string; message: string } }
  | { type: 'CLEAR_ERROR'; payload: string }
  | { type: 'CLEAR_ALL_ERRORS' }
  | { type: 'RESET_FORM' };

// État initial
const initialState: MealFormState = {
  currentMode: 'selection',
  currentStep: 'input',
  description: '',
  finalProtein: null,
  finalCalories: null,
  textInput: '',
  isAnalyzingText: false,
  textAnalysisResult: null,
  showVoiceInput: false,
  capturedPhoto: null,
  showCamera: false,
  isAnalyzingPhoto: false,
  photoAnalysisResult: null,
  quantityInput: '',
  manualName: '',
  manualProtein: '',
  manualCalories: '',
  isSaving: false,
  errors: {},
};

// Reducer fonction
function mealFormReducer(state: MealFormState, action: MealFormAction): MealFormState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, currentMode: action.payload, currentStep: 'input' };
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload };
    case 'SET_FINAL_PROTEIN':
      return { ...state, finalProtein: action.payload };
    case 'SET_FINAL_CALORIES':
      return { ...state, finalCalories: action.payload };
    case 'SET_TEXT_INPUT':
      return { ...state, textInput: action.payload };
    case 'SET_IS_ANALYZING_TEXT':
      return { ...state, isAnalyzingText: action.payload };
    case 'SET_TEXT_ANALYSIS_RESULT':
      return { ...state, textAnalysisResult: action.payload };
    case 'TOGGLE_VOICE_INPUT':
      return { ...state, showVoiceInput: !state.showVoiceInput };
    case 'SET_CAPTURED_PHOTO':
      return { ...state, capturedPhoto: action.payload };
    case 'TOGGLE_CAMERA':
      return { ...state, showCamera: !state.showCamera };
    case 'SET_IS_ANALYZING_PHOTO':
      return { ...state, isAnalyzingPhoto: action.payload };
    case 'SET_PHOTO_ANALYSIS_RESULT':
      return { ...state, photoAnalysisResult: action.payload };
    case 'SET_QUANTITY_INPUT':
      return { ...state, quantityInput: action.payload };
    case 'SET_MANUAL_NAME':
      return { ...state, manualName: action.payload };
    case 'SET_MANUAL_PROTEIN':
      return { ...state, manualProtein: action.payload };
    case 'SET_MANUAL_CALORIES':
      return { ...state, manualCalories: action.payload };
    case 'SET_IS_SAVING':
      return { ...state, isSaving: action.payload };
    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.field]: action.payload.message,
        },
      };
    case 'CLEAR_ERROR': {
      const { [action.payload]: _, ...restErrors } = state.errors;
      return { ...state, errors: restErrors };
    }
    case 'CLEAR_ALL_ERRORS':
      return { ...state, errors: {} };
    case 'RESET_FORM':
      return initialState;
    default:
      return state;
  }
}

export default function AddMealForm() {
  const navigate = useNavigate();
  const { addMeal } = useAppContext();
  const [state, dispatch] = useReducer(mealFormReducer, initialState);
  
  // Hook pour l'analyse IA
  const { 
    analyzeImage, 
    isAnalyzing: isAnalyzingWithAI, 
    analysisResult, 
    analysisError 
  } = useMealAnalysis();

  // Validation du formulaire
  const validateForm = useCallback((skipDescriptionCheck = false) => {
    dispatch({ type: 'CLEAR_ALL_ERRORS' });
    let isValid = true;

    // Skip description check for AI analysis results
    if (!skipDescriptionCheck && !state.description.trim()) {
      dispatch({
        type: 'SET_ERROR',
        payload: { field: 'description', message: 'Veuillez entrer une description' },
      });
      isValid = false;
    }

    if (state.finalProtein === null || state.finalProtein <= 0) {
      dispatch({
        type: 'SET_ERROR',
        payload: { field: 'protein', message: 'Les protéines sont obligatoires' },
      });
      isValid = false;
    }

    return isValid;
  }, [state.description, state.finalProtein]);

  // Analyse de texte IA avec OpenAI GPT
  const handleTextAnalysis = useCallback(async () => {
    if (!state.textInput.trim()) return;

    dispatch({ type: 'SET_IS_ANALYZING_TEXT', payload: true });
    dispatch({ type: 'CLEAR_ALL_ERRORS' });

    try {
      // Use OpenAI GPT service first, fallback to local service if needed
      const gptResult = await analyzeMealFromText(state.textInput);
      
      if (gptResult.success && gptResult.data) {
        // Convert GPT result to TextAnalysisResult format
        const textResult: TextAnalysisResult = {
          protein: gptResult.data.protein,
          calories: gptResult.data.calories || null,
          confidence: gptResult.data.confidence === 'high' ? 0.9 : 
                     gptResult.data.confidence === 'medium' ? 0.7 : 0.5,
          detectedFoods: gptResult.data.breakdown.map(item => item.name),
          suggestions: gptResult.data.suggestions
        };
        
        dispatch({ type: 'SET_TEXT_ANALYSIS_RESULT', payload: textResult });
        dispatch({ type: 'SET_STEP', payload: 'validation' });
        toast.success('🤖 Analyse IA terminée !');
      } else {
        // Fallback to local analysis service
        console.log('GPT analysis failed, falling back to local service:', gptResult.error);
        
        const response = await TextAnalysisService.analyzeText(state.textInput);
        
        if (response.error) {
          dispatch({ type: 'SET_ERROR', payload: { field: 'analysis', message: response.error } });
        } else if (response.result) {
          dispatch({ type: 'SET_TEXT_ANALYSIS_RESULT', payload: response.result });
          dispatch({ type: 'SET_STEP', payload: 'validation' });
          toast.success('Analyse terminée !');
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      dispatch({ type: 'SET_ERROR', payload: { field: 'analysis', message: 'Échec de l\'analyse' } });
    } finally {
      dispatch({ type: 'SET_IS_ANALYZING_TEXT', payload: false });
    }
  }, [state.textInput]);

  // Gestion de la saisie vocale améliorée - callback pour les résultats d'analyse
  const handleVoiceResult = useCallback((result: UnifiedAnalysisResult) => {
    
    // Afficher les résultats de l'analyse
    if (result.detectedFoods.length > 0) {
      const foodsText = result.detectedFoods.join(', ');
      const confidenceText = Math.round(result.confidence * 100);
      toast.success(`Détecté: ${foodsText} (${result.estimatedProtein}g protéines, ${confidenceText}% confiance)`);
      
      // Auto-trigger text analysis si la confiance est très élevée
      if (result.confidence > 0.8) {
        // Utiliser les résultats de l'analyse vocale directement
        dispatch({ 
          type: 'SET_TEXT_ANALYSIS_RESULT', 
          payload: {
            protein: result.estimatedProtein,
            calories: result.estimatedCalories || null,
            confidence: result.confidence,
            detectedFoods: result.detectedFoods,
            suggestions: result.suggestions
          }
        });
        dispatch({ type: 'MOVE_TO_VALIDATION' });
      }
    }
    
    dispatch({ type: 'TOGGLE_VOICE_INPUT' });
  }, []);

  // Callback pour recevoir la transcription
  const handleVoiceTranscript = useCallback((transcript: string) => {
    dispatch({ type: 'SET_TEXT_INPUT', payload: transcript });
    toast.success('Transcription reçue !');
  }, []);

  // Gestion de la photo avec analyse IA réelle
  const handlePhotoCapture = useCallback(async (photoData: string) => {
    const validation = validateImageDataUrl(photoData);
    if (!validation.isValid) {
      dispatch({ type: 'SET_ERROR', payload: { field: 'photo', message: validation.error || 'Photo invalide' } });
      return;
    }

    dispatch({ type: 'SET_CAPTURED_PHOTO', payload: photoData });
    dispatch({ type: 'TOGGLE_CAMERA' });
    dispatch({ type: 'SET_STEP', payload: 'analysis' });
    dispatch({ type: 'SET_IS_ANALYZING_PHOTO', payload: true });
    
    try {
      // Utiliser l'analyse IA réelle
      const result = await analyzeImage(photoData);
      
      if (result) {
        const analysisResult = {
          description: result.detected_foods.join(', ') || 'Aliments détectés',
          protein: result.estimated_protein || 0,
          calories: result.estimated_calories || 0,
          confidence: result.confidence_score
        };
        
        dispatch({ type: 'SET_PHOTO_ANALYSIS_RESULT', payload: analysisResult });
        dispatch({ type: 'SET_STEP', payload: 'quantity' });
        toast.success('Photo analysée par IA !');
      } else {
        throw new Error('Échec de l\'analyse');
      }
    } catch (error) {
      console.error('Erreur analyse photo:', error);
      dispatch({ type: 'SET_ERROR', payload: { 
        field: 'photo', 
        message: 'Échec de l\'analyse. Veuillez réessayer.' 
      }});
      dispatch({ type: 'SET_STEP', payload: 'input' });
      toast.error('Erreur lors de l\'analyse de la photo');
    } finally {
      dispatch({ type: 'SET_IS_ANALYZING_PHOTO', payload: false });
    }
  }, [analyzeImage]);

  // Gérer la continuation depuis l'étape quantité
  const handleQuantityContinue = useCallback(async () => {
    if (!state.quantityInput.trim() || !state.photoAnalysisResult) {
      toast.error('Veuillez préciser la quantité');
      return;
    }

    dispatch({ type: 'SET_IS_ANALYZING_PHOTO', payload: true });
    
    try {
      // Re-analyser avec la quantité spécifiée
      const description = `${state.photoAnalysisResult.description}. Quantité: ${state.quantityInput}`;
      const result = await analyzeImage(state.capturedPhoto!, description);
      
      if (result) {
        const updatedResult = {
          description: `${result.detected_foods.join(', ')} (${state.quantityInput})`,
          protein: result.estimated_protein || 0,
          calories: result.estimated_calories || 0,
          confidence: result.confidence_score
        };
        
        dispatch({ type: 'SET_PHOTO_ANALYSIS_RESULT', payload: updatedResult });
        dispatch({ type: 'SET_STEP', payload: 'validation' });
        toast.success('Analyse mise à jour avec la quantité !');
      } else {
        // Garder l'analyse précédente mais passer à la validation
        dispatch({ type: 'SET_STEP', payload: 'validation' });
        toast.info('Quantité enregistrée, analyse précédente conservée');
      }
    } catch (error) {
      console.error('Erreur re-analyse avec quantité:', error);
      // En cas d'erreur, on continue avec l'analyse précédente
      dispatch({ type: 'SET_STEP', payload: 'validation' });
      toast.info('Quantité enregistrée');
    } finally {
      dispatch({ type: 'SET_IS_ANALYZING_PHOTO', payload: false });
    }
  }, [state.quantityInput, state.photoAnalysisResult, state.capturedPhoto, analyzeImage]);

  // Retour depuis l'étape quantité
  const handleQuantityBack = useCallback(() => {
    dispatch({ type: 'SET_STEP', payload: 'analysis' });
  }, []);

  // Validation des résultats IA
  const handleAcceptAnalysis = useCallback(async () => {
    let description = '';
    let protein = 0;
    let calories: number | null = null;

    if (state.currentMode === 'ai_text' && state.textAnalysisResult) {
      // For text analysis, use the detected foods as description or fall back to user input
      const detectedFoodsText = state.textAnalysisResult.detectedFoods.length > 0 
        ? state.textAnalysisResult.detectedFoods.join(', ')
        : state.textInput;
      
      description = detectedFoodsText;
      protein = state.textAnalysisResult.protein;
      calories = state.textAnalysisResult.calories;
    } else if (state.currentMode === 'ai_photo' && state.photoAnalysisResult) {
      // Inclure la quantité dans la description si elle a été précisée
      const baseDescription = state.photoAnalysisResult.description;
      const quantityText = state.quantityInput.trim() ? ` (${state.quantityInput})` : '';
      description = baseDescription + quantityText;
      protein = state.photoAnalysisResult.protein;
      calories = state.photoAnalysisResult.calories;
    }

    // Update the final values
    dispatch({ type: 'SET_DESCRIPTION', payload: description });
    dispatch({ type: 'SET_FINAL_PROTEIN', payload: protein });
    dispatch({ type: 'SET_FINAL_CALORIES', payload: calories });
    
    // Wait a moment for state to update, then save
    setTimeout(async () => {
      try {
        const mealData = {
          id: Date.now().toString(),
          description: sanitizeMealDescription(description),
          timestamp: new Date().toISOString(),
          protein: sanitizeNumber(protein, 0, 1000),
          calories: calories ? sanitizeNumber(calories, 0, 10000) : null,
          photo: state.capturedPhoto,
          source: state.currentMode === 'ai_photo' ? 'ai_scan' : 'text',
        };

        dispatch({ type: 'SET_IS_SAVING', payload: true });
        await addMeal(mealData);
        toast.success('Repas sauvegardé !');
        
        setTimeout(() => {
          navigate('/');
        }, 500);
      } catch (error) {
        toast.error('Échec de la sauvegarde');
      } finally {
        dispatch({ type: 'SET_IS_SAVING', payload: false });
      }
    }, 100);
  }, [state.currentMode, state.textAnalysisResult, state.photoAnalysisResult, state.textInput, state.capturedPhoto, addMeal, navigate]);

  // Sauvegarde du repas
  const handleSaveMeal = useCallback(async () => {
    // Pour le mode manuel, finaliser les données
    if (state.currentMode === 'manual') {
      dispatch({ type: 'SET_DESCRIPTION', payload: state.manualName });
      dispatch({ type: 'SET_FINAL_PROTEIN', payload: parseFloat(state.manualProtein) || 0 });
      dispatch({ type: 'SET_FINAL_CALORIES', payload: state.manualCalories ? parseFloat(state.manualCalories) : null });
    }

    if (!validateForm()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    dispatch({ type: 'SET_IS_SAVING', payload: true });
    
    try {
      const description = state.currentMode === 'manual' ? state.manualName : state.description;
      const protein = state.currentMode === 'manual' ? parseFloat(state.manualProtein) : state.finalProtein;
      const calories = state.currentMode === 'manual' 
        ? (state.manualCalories ? parseFloat(state.manualCalories) : null)
        : state.finalCalories;

      const mealData = {
        id: Date.now().toString(),
        description: sanitizeMealDescription(description),
        timestamp: new Date().toISOString(),
        protein: sanitizeNumber(protein || 0, 0, 1000),
        calories: calories ? sanitizeNumber(calories, 0, 10000) : null,
        photo: state.capturedPhoto,
        source: state.currentMode === 'manual' ? 'manual' : 
                state.currentMode === 'ai_photo' ? 'ai_scan' : 'text',
      };

      await addMeal(mealData);
      toast.success('Repas sauvegardé !');
      
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (error) {
      toast.error('Échec de la sauvegarde');
    } finally {
      dispatch({ type: 'SET_IS_SAVING', payload: false });
    }
  }, [addMeal, navigate, state, validateForm]);

  // Rendu des étapes de progression
  const renderProgressSteps = () => {
    const steps = ['Méthode', 'Saisie', 'Validation'];
    const currentStepIndex = state.currentMode === 'selection' ? 0 : 
                           state.currentStep === 'input' ? 1 : 2;

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all",
              index <= currentStepIndex 
                ? "bg-primary text-primary-foreground" 
                : "bg-gray-200 text-gray-600"
            )}>
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-8 h-0.5 transition-all",
                index < currentStepIndex ? "bg-primary" : "bg-gray-200"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Rendu de la sélection de mode
  const renderModeSelection = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >

      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">Comment souhaitez-vous procéder ?</CardTitle>
          <p className="text-muted-foreground">Choisissez votre méthode préférée</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {/* Mode IA + Texte */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => dispatch({ type: 'SET_MODE', payload: 'ai_text' })}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Décrire avec l'IA</h3>
                  <p className="text-sm text-gray-600">Tapez ou dictez votre repas</p>
                </div>
              </div>
            </motion.button>

            {/* Mode IA + Photo */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => dispatch({ type: 'SET_MODE', payload: 'ai_photo' })}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Camera className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Photo avec IA</h3>
                  <p className="text-sm text-gray-600">Prenez une photo de votre repas</p>
                </div>
              </div>
            </motion.button>

            {/* Mode Manuel */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => dispatch({ type: 'SET_MODE', payload: 'manual' })}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <Hand className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Saisie manuelle</h3>
                  <p className="text-sm text-gray-600">Entrez les informations vous-même</p>
                </div>
              </div>
            </motion.button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Rendu du mode IA Texte
  const renderAITextMode = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {state.currentStep === 'input' && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              Décrivez votre repas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Notre IA analysera votre description pour estimer les valeurs nutritionnelles
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                value={state.textInput}
                onChange={(e) => dispatch({ type: 'SET_TEXT_INPUT', payload: e.target.value })}
                placeholder="ex. Salade de poulet grillé avec avocat et quinoa"
                className="text-base h-12"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => dispatch({ type: 'TOGGLE_VOICE_INPUT' })}
                variant="outline"
                className="flex-1"
              >
                <Mic className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
              <Button
                onClick={handleTextAnalysis}
                disabled={!state.textInput.trim() || state.isAnalyzingText}
                className="flex-1"
              >
                {state.isAnalyzingText ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyse...
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4 mr-2" />
                    Analyser
                  </>
                )}
              </Button>
            </div>

            {state.errors.analysis && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.errors.analysis}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {state.currentStep === 'validation' && state.textAnalysisResult && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Résultat de l'analyse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">Aliments détectés :</p>
              <p className="text-sm text-gray-600">{state.textAnalysisResult.detectedFoods.join(', ') || 'Analyse générale'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{state.textAnalysisResult.protein}g</p>
                <p className="text-sm text-gray-600">Protéines</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {state.textAnalysisResult.calories || '--'}
                </p>
                <p className="text-sm text-gray-600">Calories</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Confiance: {Math.round(state.textAnalysisResult.confidence * 100)}%
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleAcceptAnalysis} 
                disabled={state.isSaving}
                className="flex-1"
              >
                {state.isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmer
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => dispatch({ type: 'SET_STEP', payload: 'quantity' })}
                className="flex-1"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Modifier quantité
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );

  // Rendu du mode IA Photo
  const renderAIPhotoMode = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {state.currentStep === 'input' && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-green-600" />
              Prenez une photo de votre repas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Notre IA analysera la photo pour identifier les aliments
            </p>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => dispatch({ type: 'TOGGLE_CAMERA' })}
              className="w-full h-32 text-lg"
              variant="outline"
            >
              <Camera className="h-8 w-8 mr-3" />
              Ouvrir l'appareil photo
            </Button>
          </CardContent>
        </Card>
      )}

      {state.currentStep === 'analysis' && state.isAnalyzingPhoto && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="font-semibold mb-2">Analyse en cours...</h3>
            <p className="text-sm text-gray-600">Notre IA identifie les aliments dans votre photo</p>
          </CardContent>
        </Card>
      )}

      {state.currentStep === 'quantity' && state.photoAnalysisResult && (
        <QuantityInput
          photoAnalysisResult={state.photoAnalysisResult}
          quantityInput={state.quantityInput}
          onQuantityChange={(quantity) => dispatch({ type: 'SET_QUANTITY_INPUT', payload: quantity })}
          onContinue={handleQuantityContinue}
          onBack={handleQuantityBack}
          isLoading={state.isAnalyzingPhoto}
        />
      )}

      {state.currentStep === 'validation' && state.photoAnalysisResult && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Photo analysée
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.capturedPhoto && (
              <img 
                src={state.capturedPhoto} 
                alt="Repas photographié" 
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <p className="font-medium">{state.photoAnalysisResult.description}</p>
              {state.quantityInput && (
                <p className="text-sm text-blue-600">
                  <strong>Quantité précisée :</strong> {state.quantityInput}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{state.photoAnalysisResult.protein}g</p>
                <p className="text-sm text-gray-600">Protéines</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{state.photoAnalysisResult.calories}</p>
                <p className="text-sm text-gray-600">Calories</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleAcceptAnalysis} 
                disabled={state.isSaving}
                className="flex-1"
              >
                {state.isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmer
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => dispatch({ type: 'SET_STEP', payload: 'quantity' })}
                className="flex-1"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Modifier quantité
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );

  // Rendu du mode Manuel
  const renderManualMode = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hand className="h-5 w-5 text-orange-600" />
            Saisie manuelle
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Entrez les informations de votre repas
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="manual-name">Nom du plat *</Label>
            <Input
              id="manual-name"
              value={state.manualName}
              onChange={(e) => dispatch({ type: 'SET_MANUAL_NAME', payload: e.target.value })}
              placeholder="ex. Poulet grillé, Salade de thon..."
              className="text-base h-12"
            />
          </div>
          
          <div>
            <Label htmlFor="manual-protein">Protéines (grammes) *</Label>
            <Input
              id="manual-protein"
              type="number"
              value={state.manualProtein}
              onChange={(e) => dispatch({ type: 'SET_MANUAL_PROTEIN', payload: e.target.value })}
              placeholder="ex. 25"
              min="0"
              max="1000"
              step="0.1"
              className="text-base h-12"
            />
          </div>
          
          <div>
            <Label htmlFor="manual-calories" className="text-gray-600">
              Calories <span className="text-gray-400">(optionnel)</span>
            </Label>
            <Input
              id="manual-calories"
              type="number"
              value={state.manualCalories}
              onChange={(e) => dispatch({ type: 'SET_MANUAL_CALORIES', payload: e.target.value })}
              placeholder="ex. 150 (laisser vide si inconnu)"
              min="0"
              max="10000"
              step="1"
              className="text-base h-12 bg-gray-50 border-gray-200"
            />
            <p className="text-xs text-gray-500 mt-1">
              Les calories ne sont pas nécessaires pour le suivi des protéines
            </p>
          </div>

          <Button 
            onClick={handleSaveMeal} 
            disabled={!state.manualName.trim() || !state.manualProtein.trim() || state.isSaving}
            className="w-full h-12"
          >
            {state.isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container max-w-lg mx-auto p-4 pb-32">
        {/* En-tête */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center mb-6 sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-10 -mx-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Retour"
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ajouter un repas</h1>
        </motion.div>

        {/* Indicateur de progression */}
        {renderProgressSteps()}

        {/* Contenu principal */}
        <AnimatePresence mode="wait">
          {state.currentMode === 'selection' && renderModeSelection()}
          {state.currentMode === 'ai_text' && renderAITextMode()}
          {state.currentMode === 'ai_photo' && renderAIPhotoMode()}
          {state.currentMode === 'manual' && renderManualMode()}
        </AnimatePresence>

        {/* Bouton retour pour les modes actifs */}
        {state.currentMode !== 'selection' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6"
          >
            <Button
              variant="outline"
              onClick={() => dispatch({ type: 'SET_MODE', payload: 'selection' })}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Changer de méthode
            </Button>
          </motion.div>
        )}
      </div>

      {/* Interface caméra */}
      <AnimatePresence>
        {state.showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            <CameraInterface onCapture={handlePhotoCapture} />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white"
              onClick={() => dispatch({ type: 'TOGGLE_CAMERA' })}
            >
              <X className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interface vocale */}
      <AnimatePresence>
        {state.showVoiceInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-md"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Enregistrement vocal</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => dispatch({ type: 'TOGGLE_VOICE_INPUT' })}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <BaseVoiceInput
                    variant="enhanced"
                    onResult={handleVoiceResult}
                    onTranscript={handleVoiceTranscript}
                    placeholder="salade de poulet grillé avec quinoa et légumes"
                    autoAnalyze={true}
                    showModal={false}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}