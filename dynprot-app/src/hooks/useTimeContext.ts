import { useMemo } from 'react';

export interface TimeContext {
  greeting: string;
  timeInfo: string;
  mealSuggestion: string;
  period: 'morning' | 'noon' | 'evening' | 'night';
}

export function useTimeContext(userName?: string): TimeContext {
  return useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    const displayName = userName || 'vous';
    
    if (hour >= 6 && hour < 11) {
      return {
        greeting: `👋 Bonjour ${displayName} !`,
        timeInfo: `Il est ${timeString}, c'est l'heure du petit-déjeuner`,
        mealSuggestion: 'Un café ? Des tartines ?',
        period: 'morning'
      };
    } else if (hour >= 11 && hour < 15) {
      return {
        greeting: `👋 Salut ${displayName} !`,
        timeInfo: `Il est ${timeString}, c'est l'heure du déjeuner`,
        mealSuggestion: "Qu'est-ce qu'on mange aujourd'hui ?",
        period: 'noon'
      };
    } else if (hour >= 17 && hour < 22) {
      return {
        greeting: `👋 Bonsoir ${displayName} !`,
        timeInfo: `Il est ${timeString}, c'est l'heure du dîner`,
        mealSuggestion: "Comment s'est passé le dîner ?",
        period: 'evening'
      };
    } else {
      return {
        greeting: `👋 Salut ${displayName} !`,
        timeInfo: `Il est ${timeString}`,
        mealSuggestion: 'Que mangez-vous ?',
        period: 'night'
      };
    }
  }, [userName]);
}