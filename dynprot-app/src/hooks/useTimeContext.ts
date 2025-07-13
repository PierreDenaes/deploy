import { useMemo } from 'react';
import { Sunrise, Sun, Sunset, Moon } from 'lucide-react';

export interface TimeContext {
  greeting: string;
  timeInfo: string;
  mealSuggestion: string;
  period: 'morning' | 'noon' | 'evening' | 'night';
  icon: React.ComponentType<any>;
  iconColor: string;
  bgGradient: string;
}

export function useTimeContext(userName?: string): TimeContext {
  return useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    const displayName = userName || 'vous';
    
    if (hour >= 5 && hour < 11) {
      return {
        greeting: userName ? `Bonjour ${userName} !` : 'Bonjour !',
        timeInfo: `Il est ${timeString}`,
        mealSuggestion: 'Que prenez-vous au petit-déjeuner ?',
        period: 'morning',
        icon: Sunrise,
        iconColor: 'text-orange-600',
        bgGradient: 'from-orange-100 to-yellow-100'
      };
    } else if (hour >= 11 && hour < 16) {
      return {
        greeting: userName ? `Bonjour ${userName} !` : 'Bonjour !',
        timeInfo: `Il est ${timeString}`,
        mealSuggestion: 'Que mangez-vous à midi ?',
        period: 'noon',
        icon: Sun,
        iconColor: 'text-green-600',
        bgGradient: 'from-yellow-100 to-green-100'
      };
    } else if (hour >= 16 && hour < 22) {
      return {
        greeting: userName ? `Bonsoir ${userName} !` : 'Bonsoir !',
        timeInfo: `Il est ${timeString}`,
        mealSuggestion: 'Que mangez-vous ce soir ?',
        period: 'evening',
        icon: Sunset,
        iconColor: 'text-purple-600',
        bgGradient: 'from-blue-100 to-purple-100'
      };
    } else {
      return {
        greeting: userName ? `Bonsoir ${userName} !` : 'Bonsoir !',
        timeInfo: `Il est ${timeString}`,
        mealSuggestion: 'Que mangez-vous ?',
        period: 'night',
        icon: Moon,
        iconColor: 'text-pink-600',
        bgGradient: 'from-purple-100 to-pink-100'
      };
    }
  }, [userName]);
}