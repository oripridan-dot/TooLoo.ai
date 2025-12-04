// @version 2.2.416
// TooLoo.ai Skin Primitive: Toggle
// Switch/checkbox components

import React from 'react';

const sizes = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translate: 'translate-x-4',
  },
  md: {
    track: 'w-10 h-5',
    thumb: 'w-4 h-4',
    translate: 'translate-x-5',
  },
  lg: {
    track: 'w-12 h-6',
    thumb: 'w-5 h-5',
    translate: 'translate-x-6',
  },
};

const accents = {
  cyan: 'bg-cyan-500',
  purple: 'bg-purple-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
};

export const Toggle = ({
  checked = false,
  onChange,
  size = 'md',
  accent = 'cyan',
  disabled = false,
  label,
  description,
  className = '',
}) => {
  const s = sizes[size];

  return (
    <label
      className={`flex items-start gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={`
          relative inline-flex shrink-0 items-center rounded-full
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]
          ${s.track}
          ${checked ? accents[accent] : 'bg-white/10'}
          ${disabled ? '' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block rounded-full bg-white shadow
            transform transition-transform duration-200
            ${s.thumb}
            ${checked ? s.translate : 'translate-x-0.5'}
          `}
        />
      </button>

      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && <span className="block text-sm font-medium text-white">{label}</span>}
          {description && <span className="block text-xs text-gray-500 mt-0.5">{description}</span>}
        </div>
      )}
    </label>
  );
};

// Checkbox variant
export const Checkbox = ({
  checked = false,
  onChange,
  size = 'md',
  accent = 'cyan',
  disabled = false,
  label,
  description,
  indeterminate = false,
  className = '',
}) => {
  const checkboxSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <label
      className={`flex items-start gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? 'mixed' : checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={`
          relative inline-flex items-center justify-center shrink-0
          rounded border-2 transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]
          ${checkboxSizes[size]}
          ${
            checked || indeterminate
              ? `${accents[accent]} border-transparent`
              : 'bg-transparent border-white/20 hover:border-white/40'
          }
          ${disabled ? '' : 'cursor-pointer'}
        `}
      >
        {checked && !indeterminate && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {indeterminate && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        )}
      </button>

      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && <span className="block text-sm font-medium text-white">{label}</span>}
          {description && <span className="block text-xs text-gray-500 mt-0.5">{description}</span>}
        </div>
      )}
    </label>
  );
};

// Radio button
export const Radio = ({
  checked = false,
  onChange,
  name,
  value,
  size = 'md',
  accent = 'cyan',
  disabled = false,
  label,
  description,
  className = '',
}) => {
  const radioSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <label
      className={`flex items-start gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(value)}
        className={`
          relative inline-flex items-center justify-center shrink-0
          rounded-full border-2 transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]
          ${radioSizes[size]}
          ${
            checked
              ? `border-cyan-500 ${accents[accent].replace('bg-', 'border-')}`
              : 'border-white/20 hover:border-white/40'
          }
          ${disabled ? '' : 'cursor-pointer'}
        `}
      >
        {checked && <span className={`${dotSizes[size]} rounded-full ${accents[accent]}`} />}
      </button>

      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && <span className="block text-sm font-medium text-white">{label}</span>}
          {description && <span className="block text-xs text-gray-500 mt-0.5">{description}</span>}
        </div>
      )}
    </label>
  );
};

export default Toggle;
