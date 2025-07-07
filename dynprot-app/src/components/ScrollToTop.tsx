import { useScrollReset } from '@/hooks/useScrollReset';

const ScrollToTop = () => {
  useScrollReset({
    behavior: 'instant',
    resetOnRouteChange: true,
  });

  return null;
};

export default ScrollToTop;