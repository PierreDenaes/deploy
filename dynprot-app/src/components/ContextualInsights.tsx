import React from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Award, 
  AlertCircle, 
  CheckCircle,
  Lightbulb,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ContextualInsightsProps {
  meals: any[];
  aiAnalysisData?: any;
  isLoadingAI?: boolean;
  className?: string;
}

interface Insight {
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  priority: 'high' | 'medium' | 'low';
}

export function ContextualInsights({ 
  meals, 
  aiAnalysisData, 
  isLoadingAI = false, 
  className 
}: ContextualInsightsProps) {
  
  // Generate contextual insights based on current data
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];
    const today = new Date().toDateString();
    const todaysMeals = meals.filter(meal => 
      new Date(meal.timestamp).toDateString() === today
    );
    
    const totalProtein = todaysMeals.reduce((sum, meal) => sum + meal.protein, 0);
    const totalMeals = todaysMeals.length;
    const currentHour = new Date().getHours();
    
    // Protein insights
    if (totalProtein > 100) {
      insights.push({
        type: 'success',
        title: 'Excellent apport protéique',
        description: `Vous avez déjà consommé ${Math.round(totalProtein)}g de protéines aujourd'hui. Parfait pour vos objectifs !`,
        icon: CheckCircle,
        priority: 'high'
      });
    } else if (totalProtein < 30 && currentHour > 14) {
      insights.push({
        type: 'warning',
        title: 'Apport protéique faible',
        description: `Il vous manque encore ${Math.round(120 - totalProtein)}g de protéines. Pensez à une collation riche en protéines.`,
        icon: AlertCircle,
        priority: 'high'
      });
    }
    
    // Meal frequency insights
    if (totalMeals === 0 && currentHour > 10) {
      insights.push({
        type: 'warning',
        title: 'Premier repas en retard',
        description: 'Il est important de commencer la journée avec un petit-déjeuner équilibré.',
        icon: AlertCircle,
        priority: 'high'
      });
    } else if (totalMeals >= 4) {
      insights.push({
        type: 'success',
        title: 'Répartition optimale',
        description: 'Excellente répartition des repas dans la journée. Continuez ainsi !',
        icon: Award,
        priority: 'medium'
      });
    }
    
    // Time-based tips
    if (currentHour >= 16 && currentHour <= 18 && totalProtein < 80) {
      insights.push({
        type: 'tip',
        title: 'Collation post-entraînement',
        description: 'C\'est le moment idéal pour une collation protéinée si vous vous entraînez.',
        icon: Lightbulb,
        priority: 'medium'
      });
    }
    
    // Weekly pattern insights (if we have historical data)
    if (meals.length > 7) {
      const weeklyAverage = meals.slice(-7).reduce((sum, meal) => sum + meal.protein, 0) / 7;
      if (totalProtein > weeklyAverage * 1.2) {
        insights.push({
          type: 'success',
          title: 'Progression excellente',
          description: `Vous dépassez votre moyenne hebdomadaire de ${Math.round(weeklyAverage)}g. Bravo !`,
          icon: TrendingUp,
          priority: 'low'
        });
      }
    }
    
    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };
  
  const insights = generateInsights();
  
  const getAlertVariant = (type: Insight['type']) => {
    switch (type) {
      case 'success': return 'default';
      case 'warning': return 'destructive';
      case 'info': return 'default';
      case 'tip': return 'default';
    }
  };
  
  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'warning': return 'bg-red-50 border-red-200 text-red-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'tip': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  if (isLoadingAI) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className={className}
      >
        <Card className="border-0 shadow-ios backdrop-blur-xl">
          <CardContent className="p-6 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
            />
            <h3 className="font-semibold mb-2">Analyse IA en cours</h3>
            <p className="text-sm text-muted-foreground">
              Notre IA analyse vos habitudes nutritionnelles...
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className={className}
    >
      <Card className="border-0 shadow-ios backdrop-blur-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
              <Brain className="h-6 w-6 text-purple-600" strokeWidth={2.5} />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Insights personnalisés</CardTitle>
              <p className="text-sm text-muted-foreground">
                Recommandations basées sur vos habitudes
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {insights.length > 0 ? (
            insights.slice(0, 3).map((insight, index) => {
              const Icon = insight.icon;
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-2xl border ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold mb-1">{insight.title}</h4>
                      <p className="text-sm opacity-90">{insight.description}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        insight.priority === 'high' ? 'border-red-300 text-red-700' :
                        insight.priority === 'medium' ? 'border-yellow-300 text-yellow-700' :
                        'border-gray-300 text-gray-700'
                      }`}
                    >
                      {insight.priority === 'high' ? 'Important' : 
                       insight.priority === 'medium' ? 'Moyen' : 'Info'}
                    </Badge>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Aucun insight disponible</h3>
              <p className="text-sm text-muted-foreground">
                Ajoutez plus de repas pour recevoir des recommandations personnalisées
              </p>
            </div>
          )}
          
          {/* AI Score Summary (if available) */}
          {aiAnalysisData?.scores && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="pt-4 border-t border-border/20"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Score nutritionnel global</span>
                <Badge variant="secondary" className="font-bold">
                  {aiAnalysisData.scores.overall}/100
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>Protéines:</span>
                  <span className="font-medium">{aiAnalysisData.scores.protein}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Équilibre:</span>
                  <span className="font-medium">{aiAnalysisData.scores.balance}/100</span>
                </div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}