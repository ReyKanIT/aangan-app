'use client';
import { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  sublabel?: string;
  error?: string;
  prefix?: string;
}

export default function InputField({ label, sublabel, error, prefix, className, ...props }: InputFieldProps) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block mb-1">
          <span className="font-body font-semibold text-brown text-base">{label}</span>
          {sublabel && <span className="ml-2 text-sm text-brown-light font-body">{sublabel}</span>}
        </label>
      )}
      <div className={cn('flex items-center border-2 rounded-lg overflow-hidden bg-white', error ? 'border-error' : 'border-gray-300 focus-within:border-haldi-gold')}>
        {prefix && (
          <span className="px-4 bg-cream-dark border-r-2 border-gray-300 text-brown font-semibold text-lg self-stretch flex items-center">
            {prefix}
          </span>
        )}
        <input
          className={cn(
            'flex-1 min-h-dadi px-4 text-brown font-body text-dadi bg-transparent outline-none placeholder-gray-400',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-error font-body">{error}</p>}
    </div>
  );
}
