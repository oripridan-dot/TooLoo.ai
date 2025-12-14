// @version 2.2.415
// TooLoo.ai Skin Primitive: Select
// Dropdown selection component

import React, { useState, useRef, useEffect, forwardRef } from 'react';

const variants = {
  default: `
    bg-[#0f1117] border-white/10 text-white
    hover:border-white/20
    focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20
  `,
  filled: `
    bg-white/5 border-transparent text-white
    hover:bg-white/10
    focus:bg-[#0f1117] focus:border-cyan-500/50
  `,
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

// Chevron icon
const ChevronDown = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// Check icon
const Check = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Native select (for forms)
export const NativeSelect = forwardRef(
  (
    {
      options = [],
      variant = 'default',
      size = 'md',
      placeholder,
      disabled = false,
      fullWidth = true,
      className = '',
      ...props
    },
    ref
  ) => (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
      <select
        ref={ref}
        disabled={disabled}
        className={`
        appearance-none rounded-lg border outline-none
        transition-all duration-200 cursor-pointer
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        pr-10
        ${className}
      `}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
    </div>
  )
);

NativeSelect.displayName = 'NativeSelect';

// Custom select with dropdown
export const Select = ({
  options = [],
  value,
  onChange,
  variant = 'default',
  size = 'md',
  placeholder = 'Select...',
  disabled = false,
  fullWidth = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSelect = (option) => {
    if (!option.disabled) {
      onChange?.(option.value);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${fullWidth ? 'w-full' : ''}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between
          rounded-lg border outline-none
          transition-all duration-200
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'border-cyan-500/50 ring-2 ring-cyan-500/20' : ''}
          ${className}
        `}
      >
        <span className={selectedOption ? 'text-white' : 'text-gray-600'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 py-1 rounded-lg border border-white/10 bg-[#151820] shadow-xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option)}
              className={`
                flex items-center justify-between w-full px-4 py-2 text-sm text-left
                transition-colors duration-150
                ${
                  option.disabled
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white cursor-pointer'
                }
                ${option.value === value ? 'bg-cyan-500/10 text-cyan-400' : ''}
              `}
            >
              <span>{option.label}</span>
              {option.value === value && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Select;
