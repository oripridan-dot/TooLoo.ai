// @version 2.2.455
// TooLoo.ai Skin Primitive: Badge - Enhanced
// Status indicators and labels with animations and accessibility

import React, { memo, forwardRef } from 'react';

const variants = {
  default: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  primary: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  neural: 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-400 border-purple-500/30',

  // Solid variants
  'solid-default': 'bg-gray-500 text-white border-transparent',
  'solid-primary': 'bg-cyan-500 text-white border-transparent',
  'solid-success': 'bg-emerald-500 text-white border-transparent',
  'solid-warning': 'bg-amber-500 text-black border-transparent',
  'solid-danger': 'bg-red-500 text-white border-transparent',

  // Outline variants
  'outline-default': 'bg-transparent text-gray-400 border-gray-500/50',
  'outline-primary': 'bg-transparent text-cyan-400 border-cyan-500/50',
  'outline-success': 'bg-transparent text-emerald-400 border-emerald-500/50',
  'outline-warning': 'bg-transparent text-amber-400 border-amber-500/50',
  'outline-danger': 'bg-transparent text-red-400 border-red-500/50',
};

const sizes = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

// Dot color mapping for accessibility
const getDotColor = (variant) => {
  if (variant?.includes('success') || variant?.includes('emerald')) return 'bg-emerald-500';
  if (variant?.includes('warning') || variant?.includes('amber')) return 'bg-amber-500';
  if (variant?.includes('danger') || variant?.includes('red')) return 'bg-red-500';
  if (variant?.includes('primary') || variant?.includes('cyan')) return 'bg-cyan-500';
  if (variant?.includes('purple')) return 'bg-purple-500';
  if (variant?.includes('info') || variant?.includes('blue')) return 'bg-blue-500';
  if (variant?.includes('rose')) return 'bg-rose-500';
  return 'bg-gray-500';
};

export const Badge = memo(forwardRef(({
  children,
  variant = 'default',
  size = 'sm',
  icon: Icon,
  dot = false,
  dotPulse = false,
  pill = true,
  interactive = false,
  removable = false,
  onRemove,
  className = '',
  ...props
}, ref) => {
  const isInteractive = interactive || props.onClick || removable;
  
  return (
    <span
      ref={ref}
      role={isInteractive ? 'button' : 'status'}
      tabIndex={isInteractive ? 0 : undefined}
      className={`
        inline-flex items-center gap-1
        font-medium border select-none
        ${pill ? 'rounded-full' : 'rounded'}
        ${variants[variant] || variants.default}
        ${sizes[size] || sizes.sm}
        ${isInteractive ? 'cursor-pointer hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50' : ''}
        ${className}
      `}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          props.onClick?.(e);
        }
      }}
      {...props}
    >
      {dot && (
        <span
          className={`
            w-1.5 h-1.5 rounded-full shrink-0
            ${getDotColor(variant)}
            ${dotPulse ? 'animate-pulse' : ''}
          `}
          aria-hidden="true"
        />
      )}
      {Icon && <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />}
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 -mr-0.5 p-0.5 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Remove"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}));

Badge.displayName = 'Badge';

// Status badge with pulsing dot - enhanced with accessibility
export const StatusBadge = memo(({ 
  status, 
  label, 
  size = 'sm', 
  pulse = true, 
  showLabel = true,
  className = '' 
}) => {
  const statusConfig = {
    online: { variant: 'success', text: 'Online', color: 'bg-emerald-500' },
    offline: { variant: 'danger', text: 'Offline', color: 'bg-red-500' },
    idle: { variant: 'warning', text: 'Idle', color: 'bg-amber-500' },
    busy: { variant: 'purple', text: 'Busy', color: 'bg-purple-500' },
    error: { variant: 'danger', text: 'Error', color: 'bg-red-500' },
    pending: { variant: 'default', text: 'Pending', color: 'bg-gray-500' },
    connecting: { variant: 'info', text: 'Connecting', color: 'bg-blue-500' },
    active: { variant: 'success', text: 'Active', color: 'bg-emerald-500' },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const displayLabel = label || config.text;

  return (
    <Badge 
      variant={config.variant} 
      size={size} 
      className={className}
      aria-label={`Status: ${displayLabel}`}
    >
      <span className="relative">
        <span
          className={`
            w-1.5 h-1.5 rounded-full block
            ${config.color}
          `}
          aria-hidden="true"
        />
        {pulse && status === 'online' && (
          <span
            className={`
              absolute inset-0 w-1.5 h-1.5 rounded-full
              ${config.color}
              animate-ping opacity-75
            `}
            aria-hidden="true"
          />
        )}
      </span>
      {showLabel && displayLabel}
    </Badge>
  );
});

StatusBadge.displayName = 'StatusBadge';

// Count badge (for notifications, etc.) - enhanced with animation
export const CountBadge = memo(({
  count,
  max = 99,
  variant = 'danger',
  size = 'xs',
  animate = true,
  className = '',
}) => {
  const displayCount = count > max ? `${max}+` : count;

  if (count <= 0) return null;

  return (
    <Badge
      variant={`solid-${variant}`}
      size={size}
      pill
      className={`
        min-w-[18px] justify-center tabular-nums
        ${animate && count > 0 ? 'animate-in zoom-in-50 duration-200' : ''}
        ${className}
      `}
      aria-label={`${count} notifications`}
    >
      {displayCount}
    </Badge>
  );
});

CountBadge.displayName = 'CountBadge';

// Tag badge for filtering/categorization
export const TagBadge = memo(({
  children,
  variant = 'default',
  size = 'sm',
  selected = false,
  onSelect,
  removable = false,
  onRemove,
  className = '',
}) => (
  <Badge
    variant={selected ? `solid-${variant.replace('solid-', '').replace('outline-', '')}` : variant}
    size={size}
    pill={false}
    interactive={!!onSelect}
    removable={removable}
    onRemove={onRemove}
    onClick={onSelect}
    className={className}
    aria-pressed={selected}
  >
    {children}
  </Badge>
));

TagBadge.displayName = 'TagBadge';

export default Badge;
