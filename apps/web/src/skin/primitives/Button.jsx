// @version 2.2.450
// TooLoo.ai Skin Primitive: Button - Enhanced
// Production-ready interactive element with full accessibility

import React, { memo, forwardRef } from 'react';
import { Spinner } from './Spinner';

// ============================================================================
// VARIANT DEFINITIONS
// ============================================================================
const variants = {
  primary: `
    bg-cyan-500/20 text-cyan-400 border-cyan-500/30
    hover:bg-cyan-500/30 hover:border-cyan-500/50
    active:bg-cyan-500/40 active:scale-[0.98]
    focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]
  `,
  secondary: `
    bg-white/5 text-gray-300 border-white/10
    hover:bg-white/10 hover:text-white hover:border-white/20
    active:bg-white/15 active:scale-[0.98]
    focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]
  `,
  ghost: `
    bg-transparent text-gray-400 border-transparent
    hover:bg-white/5 hover:text-white
    active:bg-white/10 active:scale-[0.98]
    focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]
  `,
  danger: `
    bg-red-500/20 text-red-400 border-red-500/30
    hover:bg-red-500/30 hover:border-red-500/50
    active:bg-red-500/40 active:scale-[0.98]
    focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]
  `,
  success: `
    bg-emerald-500/20 text-emerald-400 border-emerald-500/30
    hover:bg-emerald-500/30 hover:border-emerald-500/50
    active:bg-emerald-500/40 active:scale-[0.98]
    focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]
  `,
  warning: `
    bg-amber-500/20 text-amber-400 border-amber-500/30
    hover:bg-amber-500/30 hover:border-amber-500/50
    active:bg-amber-500/40 active:scale-[0.98]
    focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]
  `,
  accent: `
    bg-gradient-to-r from-cyan-500 to-purple-500 text-white border-transparent
    hover:from-cyan-400 hover:to-purple-400 hover:shadow-lg hover:shadow-cyan-500/25
    active:from-cyan-600 active:to-purple-600 active:scale-[0.98]
    focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]
    shadow-lg shadow-cyan-500/20
  `,
};

const sizes = {
  xs: 'px-2 py-1 text-xs gap-1 min-h-[24px]',
  sm: 'px-3 py-1.5 text-sm gap-1.5 min-h-[32px]',
  md: 'px-4 py-2 text-sm gap-2 min-h-[40px]',
  lg: 'px-5 py-2.5 text-base gap-2 min-h-[48px]',
  xl: 'px-6 py-3 text-lg gap-2.5 min-h-[56px]',
};

const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

// ============================================================================
// BUTTON COMPONENT
// ============================================================================
export const Button = memo(forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon: Icon,
      iconPosition = 'left',
      loading = false,
      disabled = false,
      fullWidth = false,
      type = 'button',
      className = '',
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const variantClasses = variants[variant] || variants.primary;
    const sizeClasses = sizes[size] || sizes.md;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        aria-label={ariaLabel || (loading ? 'Loading...' : undefined)}
        className={`
          inline-flex items-center justify-center
          rounded-lg border
          font-medium select-none
          transition-all duration-200 ease-out
          focus:outline-none
          ${variantClasses}
          ${sizeClasses}
          ${fullWidth ? 'w-full' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <Spinner 
            size={size} 
            className={iconPosition === 'right' ? 'order-last' : ''} 
            aria-hidden="true"
          />
        )}

        {!loading && Icon && iconPosition === 'left' && (
          <Icon className={iconSizes[size]} aria-hidden="true" />
        )}

        {children && <span>{children}</span>}

        {!loading && Icon && iconPosition === 'right' && (
          <Icon className={iconSizes[size]} aria-hidden="true" />
        )}
      </button>
    );
  }
));

Button.displayName = 'Button';

// ============================================================================
// ICON BUTTON COMPONENT
// ============================================================================
export const IconButton = memo(forwardRef(
  (
    {
      icon: Icon,
      variant = 'ghost',
      size = 'md',
      loading = false,
      disabled = false,
      label,
      className = '',
      ...props
    },
    ref
  ) => {
    const iconOnlySizes = {
      xs: 'p-1 min-w-[24px] min-h-[24px]',
      sm: 'p-1.5 min-w-[32px] min-h-[32px]',
      md: 'p-2 min-w-[40px] min-h-[40px]',
      lg: 'p-2.5 min-w-[48px] min-h-[48px]',
      xl: 'p-3 min-w-[56px] min-h-[56px]',
    };

    const isDisabled = disabled || loading;
    const variantClasses = variants[variant] || variants.ghost;

    if (!Icon && !loading) {
      console.warn('[IconButton] No icon provided');
      return null;
    }

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        aria-label={label || 'Button'}
        title={label}
        className={`
          inline-flex items-center justify-center
          rounded-lg border border-transparent
          transition-all duration-200 ease-out
          focus:outline-none
          ${variantClasses}
          ${iconOnlySizes[size]}
          ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <Spinner size={size} aria-hidden="true" />
        ) : (
          Icon && <Icon className={iconSizes[size]} aria-hidden="true" />
        )}
      </button>
    );
  }
));

IconButton.displayName = 'IconButton';

export default Button;
