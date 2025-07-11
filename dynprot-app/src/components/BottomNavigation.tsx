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

  // Primary navigation items - iOS Style
  const navigationItems: NavigationItem[] = [
    { 
      name: 'Accueil', 
      path: '/', 
      icon: <Home className="w-6 h-6" strokeWidth={2} />, 
      ariaLabel: 'Aller à l\'accueil'
    },
    { 
      name: 'Ajouter', 
      path: '/add-meal', 
      icon: <Plus className="w-6 h-6" strokeWidth={2} />,
      ariaLabel: 'Ajouter un repas par photo, scan ou saisie manuelle'
    },
    { 
      name: 'Statistiques', 
      path: '/analytics', 
      icon: <BarChart3 className="w-6 h-6" strokeWidth={2} />, 
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
      icon: <User className="w-6 h-6" strokeWidth={2} />, 
      ariaLabel: 'Voir le profil'
    },
  ];

  // Handle navigation with animation
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/60 h-20 pb-safe shadow-ios-lg"
      aria-label="Main Navigation"
      role="navigation"
    >
      <div className="h-full flex items-end justify-around max-w-md mx-auto px-4 pb-2">
        {navigationItems.map((item) => {
          const isActive = currentRoute === item.path;
          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                'flex flex-col items-center justify-center relative py-2 flex-1 transition-all duration-200',
                'min-h-[56px]', // Hauteur minimum uniforme
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
              whileTap={{ scale: 0.95 }}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Icon Container */}
              <div className={cn(
                'relative flex items-center justify-center',
                'w-8 h-8 mb-1', // Conteneur uniforme pour toutes les icônes
                isActive && 'transform scale-110'
              )}>
                {item.icon}
              </div>
              
              {/* Label */}
              <span className={cn(
                'text-[10px] font-medium tracking-tight leading-none',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {item.name}
              </span>
              
              {/* Badge for notifications or counts */}
              {item.badgeCount && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 right-1/4 bg-ios-red text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold shadow-ios"
                >
                  {item.badgeCount > 99 ? '99+' : item.badgeCount}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;