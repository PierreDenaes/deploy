import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 haptic [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-ios',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-ios',
        outline: 'border border-border bg-background hover:bg-muted/50 text-foreground rounded-xl shadow-ios',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl shadow-ios',
        ghost: 'hover:bg-muted/50 text-foreground rounded-xl',
        link: 'text-primary underline-offset-4 hover:underline',
        ios: 'bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-ios-lg font-bold tracking-tight',
      },
      size: {
        default: 'h-11 px-6 py-3',
        sm: 'h-9 px-4 py-2 rounded-xl text-xs',
        lg: 'h-12 px-8 py-3 text-base',
        icon: 'h-11 w-11 rounded-2xl',
        xs: 'h-7 px-3 py-1 rounded-lg text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
