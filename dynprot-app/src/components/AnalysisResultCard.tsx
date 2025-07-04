import React from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  TrendingUp,
  Mic,
  Target,
  Camera,
  Type
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UnifiedAnalysisResult } from '@/hooks/useAnalyzeMeal';
import { cn } from '@/lib/utils';

interface AnalysisResultCardProps {
  result: UnifiedAnalysisResult;
  isRealtime?: boolean;
  className?: string;
}

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({
  result,
  isRealtime = false,
  className
}) => {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (confidence >= 0.6) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const getProteinLevel = (protein: number): { level: string; color: string; description: string } => {
    if (protein >= 35) return { 
      level: 'Exceptional', 
      color: 'text-emerald-600', 
      description: 'Excellent pour la récupération musculaire' 
    };
    if (protein >= 25) return { 
      level: 'Excellent', 
      color: 'text-green-600', 
      description: 'Idéal pour vos objectifs protéiques' 
    };
    if (protein >= 20) return { 
      level: 'Très bon', 
      color: 'text-blue-600', 
      description: 'Contribue bien à vos besoins quotidiens' 
    };
    if (protein >= 15) return { 
      level: 'Bon', 
      color: 'text-indigo-600', 
      description: 'Apport correct en protéines' 
    };
    if (protein >= 8) return { 
      level: 'Modéré', 
      color: 'text-yellow-600', 
      description: 'Pourrait être amélioré' 
    };
    return { 
      level: 'Faible', 
      color: 'text-red-600', 
      description: 'Ajoutez plus de protéines' 
    };
  };

  const getSourceIcon = (source: 'voice' | 'text') => {
    switch (source) {
      case 'voice':
        return <Mic className="h-4 w-4 text-blue-500" />;
      case 'text':
        return <Type className="h-4 w-4 text-green-500" />;
      default:
        return <Brain className="h-4 w-4 text-purple-500" />;
    }
  };

  const getSourceLabel = (source: 'voice' | 'text'): string => {
    switch (source) {
      case 'voice':
        return 'Voice Analysis';
      case 'text':
        return 'Text Analysis';
      default:
        return 'Analysis';
    }
  };

  const proteinLevel = getProteinLevel(result.estimatedProtein);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn("space-y-4", className)}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        {getSourceIcon(result.source)}
        <span className="font-medium text-sm">
          {isRealtime ? `Real-time ${getSourceLabel(result.source)}` : `${getSourceLabel(result.source)} Results`}
        </span>
        {isRealtime && (
          <Badge variant="secondary" className="text-xs animate-pulse">
            LIVE
          </Badge>
        )}
      </div>

      {/* Main Results */}
      <div className="grid grid-cols-2 gap-3">
        {/* Protein Estimate */}
        <Card className="border-0 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
                Protein
              </span>
            </div>
            <div className="mt-1 space-y-1">
              <div className="flex items-baseline gap-1">
                <span className={cn("text-lg font-bold", proteinLevel.color)}>
                  {result.estimatedProtein}g
                </span>
                <span className={cn("text-xs font-medium", proteinLevel.color)}>
                  {proteinLevel.level}
                </span>
              </div>
              <p className={cn("text-xs leading-tight", proteinLevel.color)}>
                {proteinLevel.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Confidence Score */}
        <Card className="border-0 bg-gray-50 dark:bg-gray-800">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              {getConfidenceIcon(result.confidence)}
              <span className="text-xs font-medium">
                Confidence
              </span>
            </div>
            <div className="mt-1">
              <span className={cn("text-lg font-bold", getConfidenceColor(result.confidence))}>
                {Math.round(result.confidence * 100)}%
              </span>
              <span className={cn("text-xs ml-1", getConfidenceColor(result.confidence))}>
                {getConfidenceLabel(result.confidence)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calories (if available) */}
      {result.estimatedCalories && (
        <Card className="border-0 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-800 dark:text-orange-200">
                Estimated Calories
              </span>
            </div>
            <div className="mt-1">
              <span className="text-lg font-bold text-orange-600">
                {result.estimatedCalories}
              </span>
              <span className="text-xs ml-1 text-orange-600">
                kcal
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detected Foods */}
      {result.detectedFoods.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Detected Foods:
          </p>
          <div className="flex flex-wrap gap-1">
            {result.detectedFoods.map((food, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              >
                {food}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Completeness Progress (only for voice analysis) */}
      {result.source === 'voice' && result.completeness !== undefined && (
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium">Description Completeness</span>
            <span className="text-muted-foreground">{result.completeness}%</span>
          </div>
          <Progress 
            value={result.completeness} 
            className="h-2" 
          />
          {result.completeness < 50 && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              Add more details for better accuracy
            </p>
          )}
        </div>
      )}

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Suggestions:
          </p>
          <div className="space-y-1">
            {result.suggestions.slice(0, 2).map((suggestion, index) => (
              <div key={index} className="flex items-start gap-2">
                <Zap className="h-3 w-3 mt-0.5 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low Confidence Warning */}
      {result.confidence < 0.5 && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200 text-xs">
            Low confidence in {result.source} analysis. Consider providing more details or trying a different input method.
          </AlertDescription>
        </Alert>
      )}
    </motion.div>
  );
};

export default AnalysisResultCard;