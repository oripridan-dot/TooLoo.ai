// @version 2.2.423
// TooLoo.ai Skin Primitive: Divider
// Visual separators

import React from 'react';

const variants = {
  default: 'border-white/10',
  subtle: 'border-white/5',
  strong: 'border-white/20',
  accent: 'border-cyan-500/30',
  gradient: 'bg-gradient-to-r from-transparent via-white/20 to-transparent border-none h-px',
};

// Horizontal divider
export const Divider = ({ variant = 'default', label, className = '' }) => {
  if (label) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className={`flex-1 border-t ${variants[variant]}`} />
        <span className="text-xs text-gray-500 shrink-0">{label}</span>
        <div className={`flex-1 border-t ${variants[variant]}`} />
      </div>
    );
  }

  if (variant === 'gradient') {
    return <div className={`${variants[variant]} ${className}`} />;
  }

  return <hr className={`border-t ${variants[variant]} ${className}`} />;
};

// Vertical divider
export const VerticalDivider = ({ variant = 'default', className = '' }) => {
  if (variant === 'gradient') {
    return (
      <div
        className={`w-px bg-gradient-to-b from-transparent via-white/20 to-transparent ${className}`}
      />
    );
  }

  return <div className={`w-px border-l ${variants[variant]} ${className}`} />;
};

// Section divider with icon
export const SectionDivider = ({ icon: Icon, label, variant = 'default', className = '' }) => (
  <div className={`flex items-center gap-4 ${className}`}>
    <div className={`flex-1 border-t ${variants[variant]}`} />
    <div className="flex items-center gap-2 text-gray-500">
      {Icon && <Icon className="w-4 h-4" />}
      {label && <span className="text-xs font-medium uppercase tracking-wider">{label}</span>}
    </div>
    <div className={`flex-1 border-t ${variants[variant]}`} />
  </div>
);

// Spacer (invisible divider for layout)
export const Spacer = ({ size = 'md' }) => {
  const sizes = {
    xs: 'h-2',
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
    xl: 'h-12',
  };

  return <div className={sizes[size]} />;
};

export default Divider;
