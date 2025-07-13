import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Mic, Keyboard, Scan, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MealMethod {
  id: 'photo' | 'voice' | 'text' | 'scan';
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

const mealMethods: MealMethod[] = [
  {
    id: 'photo',
    icon: Camera,
    label: 'Photo',
    description: 'Prenez une photo',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100'
  },
  {
    id: 'scan',
    icon: Scan,
    label: 'Scanner',
    description: 'Code-barres',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100'
  },
  {
    id: 'text',
    icon: Keyboard,
    label: 'Texte',
    description: 'Tapez votre repas',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100'
  }
];

interface MealEntryMethodsProps {
  onMethodSelect: (method: 'photo' | 'text' | 'scan') => void;
  onChatMode: () => void;
  disabled?: boolean;
  className?: string;
}

export const MealEntryMethods: React.FC<MealEntryMethodsProps> = ({
  onMethodSelect,
  onChatMode,
  disabled = false,
  className
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Comment ajouter votre repas ?
        </h3>
      </div>

      {/* Methods Grid */}
      <div className="grid grid-cols-3 gap-4 sm:gap-6">
        {mealMethods.map((method, index) => {
          const Icon = method.icon;
          
          return (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.1,
                ease: "easeOut"
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={cn(
                  "cursor-pointer transition-all duration-200 border-2 hover:border-primary/20 hover:shadow-md",
                  method.bgColor,
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => !disabled && onMethodSelect(method.id)}
              >
                <CardContent className="flex flex-col items-center justify-center p-4 text-center min-h-[100px]">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center mb-2",
                      "bg-white shadow-sm",
                      method.color
                    )}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2.5} />
                  </motion.div>
                  
                  <div>
                    <p className="font-medium text-sm text-foreground mb-1">
                      {method.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {method.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-4 text-muted-foreground font-medium">
            ou
          </span>
        </div>
      </div>

      {/* Chat Mode Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="text-center"
      >
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 border-2 border-primary/20 hover:border-primary/40 hover:shadow-md",
            "bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !disabled && onChatMode()}
        >
          <CardContent className="flex items-center justify-center p-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary" strokeWidth={2.5} />
              </div>
              <span className="font-medium text-foreground">
                💬 Discuter avec l'assistant (vocal + texte)
              </span>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default MealEntryMethods;