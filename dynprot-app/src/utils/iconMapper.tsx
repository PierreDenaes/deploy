import { Award, TrendingUp, Zap, Coffee, UtensilsCrossed, Moon, Target, AlertTriangle, Lightbulb } from 'lucide-react';
import React from 'react';

interface IconProps {
  className?: string;
}

export const getIcon = (iconName: string, props?: IconProps): React.ReactNode => {
  const iconProps = { className: "h-6 w-6", ...props };
  
  switch (iconName) {
    case 'Award':
      return <Award {...iconProps} />;
    case 'TrendingUp':
      return <TrendingUp {...iconProps} />;
    case 'Zap':
      return <Zap {...iconProps} />;
    case 'Coffee':
      return <Coffee {...iconProps} />;
    case 'UtensilsCrossed':
      return <UtensilsCrossed {...iconProps} />;
    case 'Moon':
      return <Moon {...iconProps} />;
    case 'Target':
      return <Target {...iconProps} />;
    case 'AlertTriangle':
      return <AlertTriangle {...iconProps} />;
    case 'Lightbulb':
      return <Lightbulb {...iconProps} />;
    default:
      return <Target {...iconProps} />;
  }
};