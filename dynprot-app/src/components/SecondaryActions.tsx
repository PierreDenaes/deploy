import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Scan, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SecondaryAction {
  id: 'photo' | 'scan' | 'voice';
  icon: React.ComponentType<any>;
  label: string;
  color: string;
}

const secondaryActions: SecondaryAction[] = [
  {
    id: 'photo',
    icon: Camera,
    label: 'Photo',
    color: 'text-blue-600 hover:text-blue-700'
  },
  {
    id: 'scan',
    icon: Scan,
    label: 'Scanner',
    color: 'text-orange-600 hover:text-orange-700'
  },
  {
    id: 'voice',
    icon: Mic,
    label: 'Vocal',
    color: 'text-green-600 hover:text-green-700'
  }
];

interface SecondaryActionsProps {
  onActionSelect: (action: 'photo' | 'scan' | 'voice') => void;
  disabled?: boolean;
  className?: string;
}

export const SecondaryActions: React.FC<SecondaryActionsProps> = ({
  onActionSelect,
  disabled = false,
  className
}) => {
  return (
    <motion.div 
      className={cn("flex justify-center gap-8 sm:gap-12", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      {secondaryActions.map((action, index) => {
        const Icon = action.icon;
        
        return (
          <motion.button
            key={action.id}
            onClick={() => !disabled && onActionSelect(action.id)}
            disabled={disabled}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200",
              "hover:bg-muted/50 active:scale-95",
              action.color,
              disabled && "opacity-50 cursor-not-allowed"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <Icon className="w-6 h-6" strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {action.label}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
};

export default SecondaryActions;