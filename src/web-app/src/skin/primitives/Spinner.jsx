// @version 2.2.422
// TooLoo.ai Skin Primitive: Spinner
// Loading indicators

import React from 'react';

const sizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const accentColors = {
  white: 'text-white',
  cyan: 'text-cyan-500',
  purple: 'text-purple-500',
  emerald: 'text-emerald-500',
  amber: 'text-amber-500',
  gray: 'text-gray-500',
};

// Standard spinner (rotating circle)
export const Spinner = ({ size = 'md', accent = 'cyan', className = '' }) => (
  <svg
    className={`animate-spin ${sizes[size]} ${accentColors[accent]} ${className}`}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// Dots spinner
export const DotsSpinner = ({ size = 'md', accent = 'cyan', className = '' }) => {
  const dotSizes = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const gapSizes = {
    xs: 'gap-0.5',
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
    xl: 'gap-3',
  };

  return (
    <div className={`flex items-center ${gapSizes[size]} ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            rounded-full ${dotSizes[size]}
            ${accentColors[accent].replace('text-', 'bg-')}
            animate-pulse
          `}
          style={{
            animationDelay: `${i * 150}ms`,
            animationDuration: '600ms',
          }}
        />
      ))}
    </div>
  );
};

// Pulse spinner (breathing circle)
export const PulseSpinner = ({ size = 'md', accent = 'cyan', className = '' }) => (
  <div className={`relative ${sizes[size]} ${className}`}>
    <div
      className={`
        absolute inset-0 rounded-full
        ${accentColors[accent].replace('text-', 'bg-')}/30
        animate-ping
      `}
    />
    <div
      className={`
        relative rounded-full w-full h-full
        ${accentColors[accent].replace('text-', 'bg-')}
      `}
    />
  </div>
);

// Bar spinner (loading bar animation)
export const BarSpinner = ({ size = 'md', accent = 'cyan', className = '' }) => {
  const barHeights = {
    xs: 'h-3',
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
    xl: 'h-12',
  };

  return (
    <div className={`flex items-end gap-1 ${barHeights[size]} ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`
            w-1 rounded-full
            ${accentColors[accent].replace('text-', 'bg-')}
            animate-[bar-spin_1s_ease-in-out_infinite]
          `}
          style={{
            animationDelay: `${i * 100}ms`,
            height: '100%',
          }}
        />
      ))}
    </div>
  );
};

// Orbital spinner (rotating dots)
export const OrbitalSpinner = ({ size = 'md', accent = 'cyan', className = '' }) => (
  <div className={`relative ${sizes[size]} ${className}`}>
    <div className={`absolute inset-0 rounded-full border-2 border-white/10`} />
    <div
      className={`
        absolute inset-0 rounded-full border-2 border-transparent
        ${accentColors[accent].replace('text-', 'border-t-')}
        animate-spin
      `}
    />
  </div>
);

// Full page loading overlay
export const LoadingOverlay = ({ message = 'Loading...', accent = 'cyan', className = '' }) => (
  <div
    className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm ${className}`}
  >
    <Spinner size="xl" accent={accent} />
    {message && <p className="mt-4 text-sm text-gray-400">{message}</p>}
  </div>
);

// Skeleton loader (placeholder animation)
export const Skeleton = ({ width, height, circle = false, className = '' }) => (
  <div
    className={`
      bg-white/5 animate-pulse
      ${circle ? 'rounded-full' : 'rounded-lg'}
      ${className}
    `}
    style={{
      width: width || '100%',
      height: height || '1rem',
    }}
  />
);

// Skeleton text (multiple lines)
export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} height="0.875rem" width={i === lines - 1 ? '60%' : '100%'} />
    ))}
  </div>
);

export default Spinner;
