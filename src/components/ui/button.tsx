// src/components/ui/button.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'honey'
    | 'danger'
    | 'outline'
    | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 select-none focus:outline-none focus:ring-2 focus:ring-sage-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

    const variants = {
      // Sage primary
      primary:
        'bg-sage-500 hover:bg-sage-600 text-white shadow-warm-sm border border-transparent',
      // Soft cream secondary
      secondary:
        'bg-warm-100 hover:bg-warm-200 text-warm-900 border border-warm-200 shadow-warm-sm',
      // Honey warm accent
      honey:
        'bg-honey-100 hover:bg-honey-200 text-honey-800 border border-honey-200 shadow-warm-sm',
      // Blush danger / cancel
      danger:
        'bg-blush-50 hover:bg-blush-100 text-blush-700 border border-blush-200 shadow-warm-sm',
      // Outline sage
      outline:
        'bg-white hover:bg-sage-50 text-sage-700 border border-sage-500',
      // Ghost
      ghost:
        'bg-transparent hover:bg-warm-100/70 text-warm-800',
    };

    const sizes = {
      sm: 'px-3.5 py-1.5 text-sm rounded-xl gap-1.5',
      md: 'px-5 py-2.5 text-base rounded-2xl gap-2',
      lg: 'px-7 py-3.5 text-lg rounded-2xl gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
