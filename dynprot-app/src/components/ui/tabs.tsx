import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>, 
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Container de base - Style iOS segmented control
      'relative inline-flex items-center justify-center',
      'p-1 bg-muted/30 rounded-2xl backdrop-blur-xl',
      'border border-border/20 shadow-ios-sm',
      'h-14',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base du trigger
      'relative flex-1 inline-flex items-center justify-center whitespace-nowrap',
      'px-4 py-3 text-base font-semibold rounded-xl z-10',
      'transition-all duration-300 ease-out',
      
      // Focus et accessibilité
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0',
      'disabled:pointer-events-none disabled:opacity-50',
      
      // États non-actifs (par défaut)
      'text-muted-foreground hover:text-foreground/80',
      
      // État actif - Design iOS clean
      'data-[state=active]:text-foreground data-[state=active]:bg-background',
      'data-[state=active]:shadow-ios data-[state=active]:border data-[state=active]:border-border/20',
      
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-6 ring-offset-background',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };