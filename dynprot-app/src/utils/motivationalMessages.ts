export interface MotivationalMessage {
  title: string;
  description: string;
  iconName: string;
  color: 'green' | 'blue' | 'red' | 'orange' | 'purple' | 'yellow';
  urgency: 'low' | 'medium' | 'high';
  actionHint?: string;
}

interface MessageContext {
  progressPercentage: number;
  currentHour: number;
  mealsCount: number;
  isWeekend: boolean;
  currentStreak: number;
  daysUntilGoal?: number;
}

export function getEnhancedMotivationalMessage(context: MessageContext): MotivationalMessage {
  const { progressPercentage, currentHour, mealsCount, isWeekend, currentStreak } = context;
  const progress = progressPercentage / 100;

  // Goal completed - celebration
  if (progress >= 1) {
    const celebrations = [
      {
        title: "Mission accomplie ! 🎯",
        description: currentStreak >= 3 ? 
          `${currentStreak} jours consécutifs d'objectif atteint !` :
          "Félicitations, objectif quotidien atteint !",
        color: 'green' as const,
        iconName: 'Award'
      },
      {
        title: "Champion du jour ! 🏆",
        description: "Vous pouvez être fier de votre engagement",
        color: 'green' as const,
        iconName: 'Target'
      }
    ];
    
    const celebration = celebrations[Math.floor(Math.random() * celebrations.length)];
    return {
      ...celebration,
      urgency: 'low',
      actionHint: "Maintenez cette routine demain !"
    };
  }

  // Morning messages (6h-11h)
  if (currentHour >= 6 && currentHour < 11) {
    if (mealsCount === 0) {
      return {
        title: isWeekend ? "Bon week-end !" : "Nouvelle journée, nouveaux objectifs !",
        description: "Commencez avec un petit-déjeuner protéiné",
        iconName: 'Coffee',
        color: 'blue',
        urgency: 'medium',
        actionHint: "30g de protéines dès le matin boostent votre métabolisme"
      };
    }
    
    if (progress > 0.3) {
      return {
        title: "Excellent début de journée !",
        description: `Déjà ${Math.round(progressPercentage)}% de votre objectif`,
        iconName: 'TrendingUp',
        color: 'green',
        urgency: 'low',
        actionHint: "Vous êtes sur la bonne voie !"
      };
    }
  }

  // Lunch time (11h-14h)
  if (currentHour >= 11 && currentHour < 14) {
    if (progress < 0.25) {
      return {
        title: "Temps de rattraper !",
        description: "Un déjeuner protéiné va relancer votre journée",
        iconName: 'UtensilsCrossed',
        color: 'orange',
        urgency: 'high',
        actionHint: "Visez 35-40g de protéines au déjeuner"
      };
    }
    
    if (progress >= 0.25 && progress < 0.6) {
      return {
        title: "C'est l'heure du déjeuner !",
        description: `Vous avez ${Math.round(progressPercentage)}%, continuez sur cette lancée`,
        iconName: 'UtensilsCrossed',
        color: 'blue',
        urgency: 'medium',
        actionHint: "Un bon déjeuner pour maintenir l'élan"
      };
    }
  }

  // Afternoon (14h-18h)
  if (currentHour >= 14 && currentHour < 18) {
    if (progress < 0.4) {
      return {
        title: "Boost de l'après-midi nécessaire !",
        description: "Une collation protéinée peut vous sauver la mise",
        iconName: 'Zap',
        color: 'red',
        urgency: 'high',
        actionHint: "Shake protéiné, yaourt grec, ou noix"
      };
    }
    
    if (progress >= 0.6 && progress < 0.8) {
      return {
        title: "Vous y êtes presque !",
        description: `${Math.round(100 - progressPercentage)}% restant pour votre objectif`,
        iconName: 'Target',
        color: 'blue',
        urgency: 'medium',
        actionHint: "Une petite collation suffirait"
      };
    }
  }

  // Evening (18h-23h)
  if (currentHour >= 18 && currentHour < 23) {
    const remaining = 100 - progressPercentage;
    
    if (remaining > 50) {
      return {
        title: "Il est encore temps !",
        description: `Plus que ${Math.round(remaining)}% à rattraper ce soir`,
        iconName: 'AlertTriangle',
        color: 'red',
        urgency: 'high',
        actionHint: "Dîner + complément protéiné recommandés"
      };
    }
    
    if (remaining > 20) {
      return {
        title: "Dernière ligne droite !",
        description: "Votre dîner peut terminer votre objectif en beauté",
        iconName: 'Moon',
        color: 'orange',
        urgency: 'medium',
        actionHint: `Plus que ${Math.round(remaining)}% à consommer`
      };
    }
    
    if (remaining <= 20) {
      return {
        title: "Objectif à portée de main !",
        description: "Une petite collation et c'est dans la poche",
        iconName: 'Target',
        color: 'green',
        urgency: 'low',
        actionHint: "Vous y êtes presque !"
      };
    }
  }

  // Late night or very early morning
  if (currentHour >= 23 || currentHour < 6) {
    if (progress >= 0.8) {
      return {
        title: "Excellente journée !",
        description: "Reposez-vous, vous l'avez mérité",
        iconName: 'Moon',
        color: 'green',
        urgency: 'low',
        actionHint: "Récupération importante pour demain"
      };
    }
    
    return {
      title: "Il y a encore demain !",
      description: "Chaque jour est une nouvelle opportunité",
      iconName: 'Lightbulb',
      color: 'blue',
      urgency: 'low',
      actionHint: "Préparez un bon petit-déjeuner demain"
    };
  }

  // Default fallback
  return {
    title: "Continuez comme ça !",
    description: "Chaque gramme compte pour atteindre votre objectif",
    iconName: 'Target',
    color: 'blue',
    urgency: 'medium',
    actionHint: "Ajoutez votre prochain repas"
  };
}

// Streak-specific motivational messages
export function getStreakMotivation(currentStreak: number): MotivationalMessage | null {
  if (currentStreak === 0) return null;
  
  if (currentStreak === 1) {
    return {
      title: "Premier jour réussi ! 🎯",
      description: "Vous avez commencé votre série de réussites",
      iconName: 'Target',
      color: 'blue',
      urgency: 'low',
      actionHint: "Visez 2 jours d'affilée maintenant !"
    };
  }
  
  if (currentStreak >= 2 && currentStreak < 7) {
    return {
      title: `${currentStreak} jours de suite ! 🔥`,
      description: `Plus que ${7 - currentStreak} jour${7 - currentStreak > 1 ? 's' : ''} pour une semaine parfaite`,
      iconName: 'Zap',
      color: 'orange',
      urgency: 'medium',
      actionHint: "Ne cassez pas la série !"
    };
  }
  
  if (currentStreak >= 7) {
    return {
      title: `Série de ${currentStreak} jours ! 🏆`,
      description: "Vous êtes absolument en feu !",
      iconName: 'Award',
      color: 'green',
      urgency: 'low',
      actionHint: "Continuez, vous inspirez les autres !"
    };
  }
  
  return null;
}