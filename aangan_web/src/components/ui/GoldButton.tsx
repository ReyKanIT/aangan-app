'use client';
import { cn } from '@/lib/utils/cn';
import { ButtonHTMLAttributes } from 'react';

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'gold' | 'green' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export default function GoldButton({
  children,
  loading,
  variant = 'gold',
  size = 'md',
  className,
  disabled,
  ...props
}: GoldButtonProps) {
  const base = 'inline-flex items-center justify-center font-body font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

  const variants = {
    gold: 'bg-haldi-gold hover:bg-haldi-gold-dark text-white focus:ring-haldi-gold',
    green: 'bg-mehndi-green hover:bg-green-700 text-white focus:ring-mehndi-green',
    outline: 'border-2 border-haldi-gold text-haldi-gold hover:bg-haldi-gold hover:text-white focus:ring-haldi-gold',
    ghost: 'text-haldi-gold hover:bg-cream-dark focus:ring-haldi-gold',
    danger: 'bg-error hover:bg-red-700 text-white focus:ring-red-500',
  };

  const sizes = {
    sm: 'min-h-[40px] px-4 text-sm',
    md: 'min-h-dadi px-6 text-base',
    lg: 'min-h-[56px] px-8 text-lg',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {children}
        </span>
      ) : children}
    </button>
  );
}
