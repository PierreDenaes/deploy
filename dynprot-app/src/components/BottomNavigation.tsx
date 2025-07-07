import { useNavigate } from 'react-router-dom';
import { Home, Camera, BarChart3, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppContext } from '../context/AppContext';
import { motion } from 'framer-motion';

interface NavigationItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  ariaLabel: string;
  badgeCount?: number;
}

const BottomNavigation = () => {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const currentRoute = state.navigation.currentRoute;

  // Primary navigation items
  const navigationItems: NavigationItem[] = [
    { 
      name: 'Accueil', 
      path: '/', 
      icon: <Home className="h-6 w-6" />, 
      ariaLabel: 'Aller à l\'accueil'
    },
    { 
      name: 'Ajouter', 
      path: '/add-meal', 
      icon: (
        <div className="bg-primary rounded-full p-3 -mt-8 shadow-lg">
          <Plus className="h-6 w-6 text-primary-foreground" />
        </div>
      ),
      ariaLabel: 'Ajouter un repas par photo, scan ou saisie manuelle'
    },
    { 
      name: 'Statistiques', 
      path: '/analytics', 
      icon: <BarChart3 className="h-6 w-6" />, 
      ariaLabel: 'Voir les statistiques et analyses',
      badgeCount: (() => {
        if (!state.lastAnalyticsViewed) {
          // Si jamais consulté, afficher le nombre total
          return state.meals.length > 0 ? state.meals.length : undefined;
        }
        // Compter les repas ajoutés après la dernière consultation
        const lastViewedDate = new Date(state.lastAnalyticsViewed);
        const newMeals = state.meals.filter(meal => new Date(meal.timestamp) > lastViewedDate);
        return newMeals.length > 0 ? newMeals.length : undefined;
      })()
    },
    { 
      name: 'Profil', 
      path: '/profile', 
      icon: <User className="h-6 w-6" />, 
      ariaLabel: 'Voir le profil'
    },
  ];

  // Handle navigation with animation
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border h-16 px-2"
      aria-label="Main Navigation"
      role="navigation"
    >
      <div className="h-full flex items-center justify-around max-w-md mx-auto">
        {navigationItems.map((item) => {
          const isActive = currentRoute === item.path;
          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                'flex flex-col items-center justify-center relative py-1 flex-1',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
              whileTap={{ scale: 0.9 }}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.icon}
              
              <span className="text-xs mt-1 font-medium">{item.name}</span>
              
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  className="absolute -bottom-1 w-12 h-1 bg-primary rounded-t-full"
                  layoutId="activeTab"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              
              {/* Badge for notifications or counts */}
              {item.badgeCount && (
                <span className="absolute top-0 right-1/4 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badgeCount}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;