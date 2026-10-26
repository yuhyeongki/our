// src/components/ui/badge.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'pending'
    | 'accepted'
    | 'completed'
    | 'cancelled'
    | 'anonymous'
    | 'named'
    | 'urgent'
    | 'category'
    | 'sage'
    | 'honey'
    | 'blush'
    | 'mist';
  size?: 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
      default: 'bg-warm-100 text-warm-800 border-warm-200',
      pending: 'bg-honey-100 text-honey-800 border-honey-200 font-medium',
      accepted: 'bg-sage-100 text-sage-800 border-sage-200 font-medium',
      completed: 'bg-warm-200/80 text-warm-700 border-warm-300 font-medium',
      cancelled: 'bg-warm-100 text-warm-500 border-warm-200 line-through',
      anonymous: 'bg-mist-100 text-mist-700 border-mist-200 font-medium',
      named: 'bg-blush-100 text-blush-800 border-blush-200 font-medium',
      urgent:
        'bg-blush-500 text-white border-blush-600 font-bold shadow-sm',
      category: 'bg-sage-50 text-sage-700 border-sage-200/80',
      sage: 'bg-sage-100 text-sage-800 border-sage-200',
      honey: 'bg-honey-100 text-honey-800 border-honey-200',
      blush: 'bg-blush-100 text-blush-800 border-blush-200',
      mist: 'bg-mist-100 text-mist-700 border-mist-200',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs rounded-lg',
      md: 'px-2.5 py-1 text-xs sm:text-sm rounded-xl',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center border font-normal transition-colors select-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
