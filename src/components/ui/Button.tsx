import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'custom-btn';
  const variantClass = `custom-btn-${variant}`;
  const sizeClass = `custom-btn-${size}`;
  const widthClass = fullWidth ? 'custom-btn-full' : '';
  const loadingClass = isLoading ? 'custom-btn-loading' : '';

  return (
    <button
      className={`${baseClasses} ${variantClass} ${sizeClass} ${widthClass} ${loadingClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <span className="custom-btn-spinner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="20" />
          </svg>
        </span>
      )}
      {!isLoading && leftIcon && <span className="custom-btn-icon-left">{leftIcon}</span>}
      <span className="custom-btn-text">{children}</span>
      {!isLoading && rightIcon && <span className="custom-btn-icon-right">{rightIcon}</span>}
    </button>
  );
}
