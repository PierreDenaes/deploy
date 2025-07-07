import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface UseScrollResetOptions {
  selector?: string;
  behavior?: 'instant' | 'smooth';
  resetOnRouteChange?: boolean;
  resetOnMount?: boolean;
}

export const useScrollReset = ({
  selector = 'window',
  behavior = 'instant',
  resetOnRouteChange = true,
  resetOnMount = false,
}: UseScrollResetOptions = {}) => {
  const location = useLocation();

  const scrollToTop = () => {
    if (selector === 'window') {
      window.scrollTo({ top: 0, left: 0, behavior });
    } else {
      const element = document.querySelector(selector);
      if (element) {
        element.scrollTo({ top: 0, left: 0, behavior });
      }
    }
  };

  // Reset scroll on route change
  useEffect(() => {
    if (resetOnRouteChange) {
      scrollToTop();
    }
  }, [location.pathname]);

  // Reset scroll on component mount
  useEffect(() => {
    if (resetOnMount) {
      scrollToTop();
    }
  }, []);

  return { scrollToTop };
};