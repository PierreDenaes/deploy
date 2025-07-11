import { useEffect } from 'react';

interface AccessibilityPreferences {
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
}

export const useAccessibility = (preferences: AccessibilityPreferences) => {
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply reduced motion (respect system preference if user hasn't set it)
    const systemPrefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (preferences.reducedMotion || systemPrefersReducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Apply high contrast (respect system preference if user hasn't set it)
    const systemPrefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    if (preferences.highContrast || systemPrefersHighContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Apply large text
    if (preferences.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
    
    // Update CSS custom property for motion preference
    root.style.setProperty('--motion-reduce', preferences.reducedMotion ? '1' : '0');
    
    // Cleanup function
    return () => {
      root.classList.remove('reduced-motion', 'high-contrast', 'large-text');
      root.style.removeProperty('--motion-reduce');
    };
  }, [preferences.reducedMotion, preferences.highContrast, preferences.largeText]);
};

export default useAccessibility;