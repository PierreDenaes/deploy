import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getQuickActions, TimeContext } from '@/utils/temporalLogic';

interface QuickActionsProps {
  timeContext: TimeContext;
  onActionSelect: (actionValue: string) => void;
  className?: string;
}

export default function QuickActions({
  timeContext,
  onActionSelect,
  className
}: QuickActionsProps) {
  const quickActions = getQuickActions(timeContext);
  
  if (quickActions.length === 0) {
    return null;
  }

  const getPriorityStyles = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary/20';
      case 'medium':
        return 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-secondary/20';
      case 'low':
        return 'bg-muted text-muted-foreground hover:bg-muted/80 border-muted/20';
      default:
        return 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-secondary/20';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn("space-y-3", className)}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold">Actions rapides</span>
        <div className="flex-1 h-px bg-current opacity-20"></div>
      </div>
      
      <div className="flex gap-2 flex-wrap">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.value}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * index }}
          >
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95",
                "px-4 py-2 text-sm font-medium border rounded-full",
                "hover:shadow-md active:shadow-sm",
                getPriorityStyles(action.priority)
              )}
              onClick={() => onActionSelect(action.value)}
            >
              <span className="mr-2 text-base">{action.icon}</span>
              {action.label}
            </Badge>
          </motion.div>
        ))}
      </div>
      
      {/* Contextual hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-xs opacity-70 italic"
      >
        Suggestions basées sur l'heure et vos habitudes
      </motion.p>
    </motion.div>
  );
}