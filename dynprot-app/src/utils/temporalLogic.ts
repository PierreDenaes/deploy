export interface TimeContext {
  currentHour: number;
  progressPercentage: number;
  mealsCount: number;
  isWeekend: boolean;
}

/**
 * Get contextual greeting based on time and progress
 */
export function getGreeting(context: TimeContext): string {
  const { currentHour, progressPercentage, isWeekend } = context;
  
  // Early morning (5h-8h)
  if (currentHour >= 5 && currentHour < 8) {
    if (isWeekend) {
      return "Bon week-end !";
    }
    return progressPercentage > 0 ? "Déjà en action !" : "Belle journée qui commence !";
  }
  
  // Morning (8h-11h)
  if (currentHour >= 8 && currentHour < 11) {
    if (progressPercentage > 30) {
      return "Excellent démarrage !";
    }
    return isWeekend ? "Matinée parfaite !" : "Bonjour champion !";
  }
  
  // Lunch time (11h-14h)
  if (currentHour >= 11 && currentHour < 14) {
    if (progressPercentage > 50) {
      return "Mi-journée réussie !";
    }
    return "C'est l'heure du déjeuner !";
  }
  
  // Afternoon (14h-17h)
  if (currentHour >= 14 && currentHour < 17) {
    if (progressPercentage > 70) {
      return "Après-midi productive !";
    }
    return "Bon après-midi !";
  }
  
  // Evening (17h-21h)
  if (currentHour >= 17 && currentHour < 21) {
    if (progressPercentage >= 100) {
      return "Soirée méritée !";
    }
    return "Bonne soirée !";
  }
  
  // Night (21h-5h)
  return progressPercentage >= 80 ? "Excellente journée !" : "Bonne nuit !";
}

/**
 * Get contextual CTA text based on time and progress
 */
export function getCtaText(context: TimeContext): string {
  const { currentHour, progressPercentage, mealsCount } = context;
  
  // Goal completed
  if (progressPercentage >= 100) {
    return "Ajouter un bonus";
  }
  
  // No meals yet
  if (mealsCount === 0) {
    if (currentHour >= 5 && currentHour < 10) {
      return "Commencer par le petit-déjeuner";
    }
    if (currentHour >= 10 && currentHour < 14) {
      return "Ajouter votre premier repas";
    }
    if (currentHour >= 14 && currentHour < 18) {
      return "Rattraper avec un bon repas";
    }
    return "Ajouter votre repas du soir";
  }
  
  // Based on time of day
  if (currentHour >= 5 && currentHour < 10) {
    return "Ajouter le petit-déjeuner";
  }
  
  if (currentHour >= 10 && currentHour < 14) {
    return progressPercentage < 30 ? "Booster avec le déjeuner" : "Ajouter le déjeuner";
  }
  
  if (currentHour >= 14 && currentHour < 17) {
    return progressPercentage < 50 ? "Collation de l'après-midi" : "Ajouter une collation";
  }
  
  if (currentHour >= 17 && currentHour < 21) {
    const remaining = 100 - progressPercentage;
    if (remaining > 40) {
      return "Ajouter le dîner";
    }
    return "Finaliser avec le dîner";
  }
  
  // Late night
  if (progressPercentage < 80) {
    return "Compléter la journée";
  }
  
  return "Ajouter un repas";
}

/**
 * Get quick actions based on time context
 */
export function getQuickActions(context: TimeContext): Array<{
  label: string;
  value: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
}> {
  const { currentHour, progressPercentage } = context;
  
  const actions = [];
  
  // Morning actions (5h-11h)
  if (currentHour >= 5 && currentHour < 11) {
    actions.push(
      { label: "Petit-déjeuner", value: "breakfast", icon: "☀️", priority: 'high' as const },
      { label: "Shake protéiné", value: "protein-shake", icon: "🥤", priority: 'medium' as const }
    );
  }
  
  // Lunch actions (11h-15h)
  else if (currentHour >= 11 && currentHour < 15) {
    actions.push(
      { label: "Déjeuner", value: "lunch", icon: "🍽️", priority: 'high' as const },
      { label: "Salade protéinée", value: "salad", icon: "🥗", priority: 'medium' as const }
    );
  }
  
  // Afternoon actions (15h-18h)
  else if (currentHour >= 15 && currentHour < 18) {
    actions.push(
      { label: "Collation", value: "snack", icon: "🥜", priority: 'high' as const },
      { label: "Yaourt grec", value: "yogurt", icon: "🥛", priority: 'medium' as const }
    );
  }
  
  // Evening actions (18h-22h)
  else if (currentHour >= 18 && currentHour < 22) {
    actions.push(
      { label: "Dîner", value: "dinner", icon: "🍖", priority: 'high' as const },
      { label: "Poisson", value: "fish", icon: "🐟", priority: 'medium' as const }
    );
  }
  
  // Late night or early morning
  else {
    actions.push(
      { label: "Repas léger", value: "light-meal", icon: "🥙", priority: 'medium' as const }
    );
  }
  
  // Add urgent action if progress is low
  if (progressPercentage < 25 && currentHour >= 8 && currentHour < 20) {
    actions.unshift(
      { label: "Rattrapage", value: "catch-up", icon: "⚡", priority: 'high' as const }
    );
  }
  
  return actions.slice(0, 3); // Limit to 3 actions
}

/**
 * Get motivational message based on progress percentage ranges
 */
export function getProgressMotivation(progressPercentage: number): {
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  color: 'green' | 'blue' | 'orange' | 'red';
} {
  if (progressPercentage >= 100) {
    return {
      title: "Objectif atteint ! 🎯",
      description: "Félicitations, vous pouvez être fier de votre constance !",
      urgency: 'low',
      color: 'green'
    };
  }
  
  if (progressPercentage >= 75) {
    return {
      title: "Plus que quelques grammes ! 💪",
      description: `Vous y êtes presque ! Plus que ${Math.round(100 - progressPercentage)}% pour valider votre journée.`,
      urgency: 'low',
      color: 'green'
    };
  }
  
  if (progressPercentage >= 50) {
    return {
      title: "À mi-parcours ! 🚀",
      description: "Excellent rythme ! Continuez sur cette lancée pour atteindre votre objectif.",
      urgency: 'medium',
      color: 'blue'
    };
  }
  
  if (progressPercentage >= 25) {
    return {
      title: "Bon départ ! ⭐",
      description: "C'est un début prometteur ! Votre prochain repas va faire la différence.",
      urgency: 'medium',
      color: 'blue'
    };
  }
  
  // 0-25%
  const currentHour = new Date().getHours();
  if (currentHour >= 18) {
    return {
      title: "Il est encore temps ! ⏰",
      description: "La soirée peut encore sauver votre journée. Un bon dîner et vous y êtes !",
      urgency: 'high',
      color: 'orange'
    };
  }
  
  if (currentHour >= 14) {
    return {
      title: "Rattrapez-vous ! 🎯",
      description: "L'après-midi est le moment parfait pour relancer votre progression.",
      urgency: 'high',
      color: 'orange'
    };
  }
  
  return {
    title: "Démarrez fort ! 💥",
    description: "Chaque nouveau jour est une opportunité. Votre premier repas lance la dynamique !",
    urgency: 'medium',
    color: 'blue'
  };
}