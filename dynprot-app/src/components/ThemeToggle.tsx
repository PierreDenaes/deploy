import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Clair',
    icon: Sun,
    description: 'Toujours utiliser le mode clair'
  },
  {
    value: 'dark',
    label: 'Sombre',
    icon: Moon,
    description: 'Toujours utiliser le mode sombre'
  },
  {
    value: 'system',
    label: 'Système',
    icon: Monitor,
    description: 'Suivre les préférences système'
  }
];

interface ThemeToggleProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className, 
  variant = 'full' 
}) => {
  const { theme, setTheme, actualTheme } = useTheme();

  if (variant === 'compact') {
    return (
      <motion.div
        className={cn('relative inline-flex items-center', className)}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
            setTheme(nextTheme);
          }}
          className="relative h-10 w-10 rounded-2xl"
        >
          <motion.div
            initial={false}
            animate={{ 
              rotate: actualTheme === 'dark' ? 180 : 0,
              scale: actualTheme === 'dark' ? 0.9 : 1
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {actualTheme === 'dark' ? (
              <Moon className="h-5 w-5" strokeWidth={2.5} />
            ) : (
              <Sun className="h-5 w-5" strokeWidth={2.5} />
            )}
          </motion.div>
          
          {/* System indicator */}
          {theme === 'system' && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
            />
          )}
        </Button>
      </motion.div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">Apparence</h3>
        <p className="text-sm text-muted-foreground">
          Choisissez votre thème préféré ou suivez les paramètres système.
        </p>
      </div>

      <motion.div 
        className="grid grid-cols-3 gap-3 p-2 rounded-2xl bg-muted/30 border border-border/20"
        layout
      >
        {themeOptions.map((option) => {
          const isActive = theme === option.value;
          const Icon = option.icon;
          
          return (
            <motion.button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200',
                'hover:bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
                isActive ? 'bg-background shadow-ios-sm border border-border/20' : 'hover:bg-background/30'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              layout
            >
              {/* Background indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTheme"
                  className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/20"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              
              {/* Icon */}
              <motion.div
                className={cn(
                  'relative w-8 h-8 rounded-xl flex items-center justify-center transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                )}
                animate={{
                  rotate: option.value === 'dark' && actualTheme === 'dark' ? 15 : 0,
                  scale: isActive ? 1.1 : 1
                }}
                transition={{ duration: 0.2 }}
              >
                <Icon className="h-5 w-5" strokeWidth={2.5} />
              </motion.div>
              
              {/* Label */}
              <div className="text-center">
                <p className={cn(
                  'text-sm font-semibold transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {option.label}
                </p>
              </div>

              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-ios-sm"
                />
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Current status */}
      <motion.div
        className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className={cn(
          'w-6 h-6 rounded-lg flex items-center justify-center',
          actualTheme === 'dark' ? 'bg-slate-800 text-white' : 'bg-yellow-100 text-yellow-600'
        )}>
          {actualTheme === 'dark' ? (
            <Moon className="h-3 w-3" strokeWidth={2.5} />
          ) : (
            <Sun className="h-3 w-3" strokeWidth={2.5} />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Mode {actualTheme === 'dark' ? 'sombre' : 'clair'} actif
          </p>
          <p className="text-xs text-muted-foreground">
            {theme === 'system' 
              ? `Détecté automatiquement depuis vos préférences système`
              : `Défini manuellement sur ${theme === 'dark' ? 'sombre' : 'clair'}`
            }
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ThemeToggle;