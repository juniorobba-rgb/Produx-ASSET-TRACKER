import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'info';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
        {
          'bg-slate-500/20 text-slate-300 border-slate-500/30': variant === 'default',
          'bg-emerald-500/20 text-emerald-400 border-emerald-500/30': variant === 'success',
          'bg-amber-500/20 text-amber-400 border-amber-500/30': variant === 'warning',
          'bg-blue-500/20 text-blue-400 border-blue-500/30': variant === 'info',
        },
        className
      )}
      {...props}
    />
  );
}
