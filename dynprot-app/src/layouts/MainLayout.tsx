import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNavigation from '../components/BottomNavigation';
import { useAppContext } from '../context/AppContext';
import { useScrollReset } from '../hooks/useScrollReset';
import { useAccessibility } from '../hooks/useAccessibility';

const MainLayout = () => {
  const location = useLocation();
  const { state, dispatch } = useAppContext();
  
  // Reset scroll for main content area on route changes
  useScrollReset({
    selector: 'main',
    behavior: 'instant',
    resetOnRouteChange: true,
  });

  // Apply accessibility preferences
  useAccessibility(state.preferences.accessibility);

  // Update navigation state when route changes
  useEffect(() => {
    if (state.navigation.currentRoute !== location.pathname) {
      dispatch({
        type: 'SET_NAVIGATION',
        payload: {
          currentRoute: location.pathname,
          previousRoute: state.navigation.currentRoute,
          history: state.navigation.history.concat(location.pathname),
        },
      });
    }
  }, [location.pathname, state.navigation.currentRoute, dispatch]);


  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 container mx-auto px-4 pb-20">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
};

export default MainLayout;