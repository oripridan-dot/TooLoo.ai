// @version 2.2.453
// TooLoo.ai Skin Primitive: Card - Enhanced
// Container component with consistent styling, hover animations, and accessibility

import React, { forwardRef, memo } from 'react';

const variants = {
  default: `
    bg-[#0f1117] border-white/5
  `,
  elevated: `
    bg-[#151820] border-white/10
    shadow-lg shadow-black/20
  `,
  outlined: `
    bg-transparent border-white/10
  `,
  glass: `
    bg-white/5 border-white/10
    backdrop-blur-sm
  `,
  gradient: `
    bg-gradient-to-br from-[#0f1117] to-[#151820]
    border-white/10
  `,
  accent: `
    bg-cyan-500/5 border-cyan-500/20
  `,
  warning: `
    bg-amber-500/5 border-amber-500/20
  `,
  danger: `
    bg-red-500/5 border-red-500/20
  `,
  success: `
    bg-emerald-500/5 border-emerald-500/20
  `,
  neural: `
    bg-gradient-to-br from-purple-500/5 to-cyan-500/5
    border-purple-500/20
  `,
};

const sizes = {
  xs: 'p-2 rounded-md',
  sm: 'p-3 rounded-lg',
  md: 'p-4 rounded-xl',
  lg: 'p-6 rounded-xl',
  xl: 'p-8 rounded-2xl',
};

// Hover animation presets
const hoverStyles = {
  lift: 'hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30',
  glow: 'hover:border-white/30 hover:shadow-lg hover:shadow-cyan-500/10',
  scale: 'hover:scale-[1.02]',
  border: 'hover:border-white/20',
  subtle: 'hover:bg-white/5',
};

export const Card = memo(forwardRef(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      hover = false,
      hoverEffect = 'subtle',
      clickable = false,
      loading = false,
      as: Component = 'div',
      className = '',
      role,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    // Determine semantic role
    const computedRole = role || (clickable ? 'button' : undefined);
    const isInteractive = clickable || props.onClick;

    // Get hover style
    const hoverClass = hover || isInteractive 
      ? `transition-all duration-200 ${hoverStyles[hoverEffect] || hoverStyles.subtle}` 
      : '';

    return (
      <Component
        ref={ref}
        role={computedRole}
        aria-label={ariaLabel}
        tabIndex={isInteractive && !props.disabled ? 0 : undefined}
        className={`
          relative border overflow-hidden
          ${variants[variant] || variants.default}
          ${sizes[size] || sizes.md}
          ${hoverClass}
          ${isInteractive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0b0f]' : ''}
          ${props.disabled ? 'opacity-50 pointer-events-none' : ''}
          ${className}
        `}
        onKeyDown={(e) => {
          // Support Enter/Space for clickable cards
          if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            props.onClick?.(e);
          }
          props.onKeyDown?.(e);
        }}
        {...props}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}
        {children}
      </Component>
    );
  }
));

Card.displayName = 'Card';

// Card Header subcomponent
export const CardHeader = memo(({ children, className = '', action, ...props }) => (
  <div className={`flex items-start justify-between gap-4 mb-4 pb-4 border-b border-white/5 ${className}`} {...props}>
    <div className="flex-1 min-w-0">{children}</div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
));

CardHeader.displayName = 'CardHeader';

// Card Title subcomponent
export const CardTitle = memo(({ children, as: Component = 'h3', className = '', ...props }) => (
  <Component className={`text-lg font-semibold text-white truncate ${className}`} {...props}>
    {children}
  </Component>
));

CardTitle.displayName = 'CardTitle';

// Card Description subcomponent
export const CardDescription = memo(({ children, className = '', ...props }) => (
  <p className={`text-sm text-gray-500 mt-1 line-clamp-2 ${className}`} {...props}>
    {children}
  </p>
));

CardDescription.displayName = 'CardDescription';

// Card Content subcomponent
export const CardContent = memo(({ children, className = '', noPadding = false, ...props }) => (
  <div className={`${noPadding ? '' : ''} ${className}`} {...props}>
    {children}
  </div>
));

CardContent.displayName = 'CardContent';

// Card Footer subcomponent with alignment options
export const CardFooter = memo(({ children, className = '', align = 'end', ...props }) => {
  const alignmentClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };
  
  return (
    <div 
      className={`flex items-center gap-3 mt-4 pt-4 border-t border-white/5 ${alignmentClasses[align] || alignmentClasses.end} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';

// Card image for media cards
export const CardImage = memo(({ src, alt = '', className = '', aspectRatio = '16/9', overlay = false, ...props }) => (
  <div 
    className={`relative -mx-4 -mt-4 mb-4 overflow-hidden first:rounded-t-xl ${className}`}
    style={{ aspectRatio }}
  >
    <img 
      src={src} 
      alt={alt}
      className="w-full h-full object-cover"
      loading="lazy"
      {...props}
    />
    {overlay && (
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
    )}
  </div>
));

CardImage.displayName = 'CardImage';

export default Card;
