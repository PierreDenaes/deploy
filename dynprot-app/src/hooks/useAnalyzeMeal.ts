import { useState, useCallback } from 'react';
import { VoiceAnalysisService, VoiceAnalysis } from '@/services/voiceAnalysisService';
import { TextAnalysisService, TextAnalysisResult } from '@/services/textAnalysisService';

export interface UnifiedAnalysisResult {
  detectedFoods: string[];
  estimatedProtein: number;
  estimatedCalories?: number;
  confidence: number;
  suggestions: string[];
  completeness?: number;
  source: 'voice' | 'text';
}

export interface AnalyzeState {
  isAnalyzing: boolean;
  result: UnifiedAnalysisResult | null;
  error: string | null;
}

export const useAnalyzeMeal = () => {
  const [state, setState] = useState<AnalyzeState>({
    isAnalyzing: false,
    result: null,
    error: null
  });

  const analyzeVoice = useCallback(async (transcript: string): Promise<UnifiedAnalysisResult | null> => {
    if (!transcript.trim()) {
      setState(prev => ({ ...prev, error: 'Transcript is empty' }));
      return null;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const voiceResult = VoiceAnalysisService.analyzeVoiceInput(transcript);
      
      const unifiedResult: UnifiedAnalysisResult = {
        detectedFoods: voiceResult.detectedFoods,
        estimatedProtein: voiceResult.estimatedProtein,
        estimatedCalories: undefined, // Voice service doesn't provide calories
        confidence: voiceResult.confidence,
        suggestions: voiceResult.suggestions,
        completeness: voiceResult.completeness,
        source: 'voice'
      };

      setState(prev => ({ ...prev, result: unifiedResult, isAnalyzing: false }));
      return unifiedResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Voice analysis failed';
      setState(prev => ({ ...prev, error: errorMessage, isAnalyzing: false }));
      return null;
    }
  }, []);

  const analyzeText = useCallback(async (text: string): Promise<UnifiedAnalysisResult | null> => {
    if (!text.trim()) {
      setState(prev => ({ ...prev, error: 'Text is empty' }));
      return null;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const textResponse = await TextAnalysisService.analyzeText(text);
      
      if (textResponse.error) {
        setState(prev => ({ ...prev, error: textResponse.error!, isAnalyzing: false }));
        return null;
      }

      if (!textResponse.result) {
        setState(prev => ({ ...prev, error: 'No analysis result received', isAnalyzing: false }));
        return null;
      }

      const textResult = textResponse.result;
      
      const unifiedResult: UnifiedAnalysisResult = {
        detectedFoods: textResult.detectedFoods,
        estimatedProtein: textResult.protein,
        estimatedCalories: textResult.calories || undefined,
        confidence: textResult.confidence,
        suggestions: textResult.suggestions || [],
        completeness: undefined, // Text service doesn't provide completeness
        source: 'text'
      };

      setState(prev => ({ ...prev, result: unifiedResult, isAnalyzing: false }));
      return unifiedResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Text analysis failed';
      setState(prev => ({ ...prev, error: errorMessage, isAnalyzing: false }));
      return null;
    }
  }, []);

  const clearResult = useCallback(() => {
    setState({
      isAnalyzing: false,
      result: null,
      error: null
    });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    analyzeVoice,
    analyzeText,
    clearResult,
    clearError
  };
};