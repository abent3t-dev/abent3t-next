'use client';

import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// Spinner component for loading state
const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// Variant styles
const variantStyles = {
  primary: [
    'bg-[#52AF32] text-white',
    'hover:bg-[#67B52E]',
    'active:bg-[#52AF32]',
    'focus:ring-[#52AF32]/50',
    'disabled:bg-[#52AF32]/50',
  ].join(' '),
  secondary: [
    'bg-white text-[#424846] border border-gray-300',
    'hover:bg-gray-50',
    'active:bg-gray-100',
    'focus:ring-[#52AF32]/50',
    'disabled:bg-gray-100 disabled:text-[#424846]/50',
  ].join(' '),
  outline: [
    'bg-transparent text-[#52AF32] border border-[#52AF32]',
    'hover:bg-[#52AF32]/10',
    'active:bg-[#52AF32]/20',
    'focus:ring-[#52AF32]/50',
    'disabled:border-[#52AF32]/50 disabled:text-[#52AF32]/50',
  ].join(' '),
  danger: [
    'bg-[#ef4444] text-white',
    'hover:bg-[#dc2626]',
    'active:bg-[#b91c1c]',
    'focus:ring-[#ef4444]/50',
    'disabled:bg-[#ef4444]/50',
  ].join(' '),
  ghost: [
    'bg-transparent text-[#424846]',
    'hover:bg-gray-100',
    'active:bg-gray-200',
    'focus:ring-[#52AF32]/50',
    'disabled:text-[#424846]/50',
  ].join(' '),
  link: [
    'bg-transparent text-[#52AF32] p-0',
    'hover:underline',
    'active:text-[#67B52E]',
    'focus:ring-[#52AF32]/50',
    'disabled:text-[#52AF32]/50 disabled:no-underline',
  ].join(' '),
};

// Size styles
const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

// Spinner sizes
const spinnerSizes = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    // Base styles
    const baseStyles = [
      'inline-flex items-center justify-center gap-2',
      'font-medium rounded-lg',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:cursor-not-allowed',
    ].join(' ');

    // Combine all styles
    const buttonStyles = [
      baseStyles,
      variant !== 'link' ? sizeStyles[size] : sizeStyles[size].replace(/px-\d+\s*py-\d+\.?\d*/, ''),
      variantStyles[variant],
      fullWidth ? 'w-full' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        className={buttonStyles}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner className={spinnerSizes[size]} />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
