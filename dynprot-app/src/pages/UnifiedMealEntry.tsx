import React from 'react';
import { motion } from 'framer-motion';
import UnifiedMealChat from '@/components/UnifiedMealChat';

interface UnifiedMealEntryProps {
  className?: string;
}

export const UnifiedMealEntry: React.FC<UnifiedMealEntryProps> = ({ className }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-screen bg-background"
    >
      <UnifiedMealChat className={className} />
    </motion.div>
  );
};

export default UnifiedMealEntry;