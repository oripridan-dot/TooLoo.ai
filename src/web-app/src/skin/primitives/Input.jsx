// @version 2.2.454
// TooLoo.ai Skin Primitive: Input - Enhanced
// Text input fields with validation states, accessibility, and better focus handling

import React, { useState, forwardRef, memo, useId, useCallback } from 'react';

const variants = {
  default: `
    bg-[#0f1117] border-white/10 text-white
    placeholder:text-gray-600
    hover:border-white/20
    focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20
  `,
  filled: `
    bg-white/5 border-transparent text-white
    placeholder:text-gray-600
    hover:bg-white/10
    focus:bg-[#0f1117] focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20
  `,
  ghost: `
    bg-transparent border-transparent text-white
    placeholder:text-gray-600
    hover:bg-white/5
    focus:bg-white/5 focus:border-cyan-500/50
  `,
  error: `
    bg-red-500/5 border-red-500/30 text-white
    placeholder:text-gray-600
    hover:border-red-500/50
    focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20
  `,
  success: `
    bg-emerald-500/5 border-emerald-500/30 text-white
    placeholder:text-gray-600
    hover:border-emerald-500/50
    focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20
  `,
};

const sizes = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

export const Input = memo(forwardRef(
  (
    {
      type = 'text',
      variant = 'default',
      size = 'md',
      icon: Icon,
      iconPosition = 'left',
      suffix,
      prefix,
      error,
      success,
      disabled = false,
      readOnly = false,
      fullWidth = true,
      clearable = false,
      onClear,
      loading = false,
      className = '',
      containerClassName = '',
      id: providedId,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(Boolean(props.value || props.defaultValue));
    const generatedId = useId();
    const inputId = providedId || generatedId;

    const hasIcon = !!Icon;
    const hasSuffix = !!suffix || clearable || loading;
    const hasPrefix = !!prefix;
    
    // Determine variant based on validation state
    const effectiveVariant = error ? 'error' : success ? 'success' : variant;

    const inputPadding = {
      left: (hasIcon && iconPosition === 'left') || hasPrefix ? 'pl-10' : '',
      right: (hasIcon && iconPosition === 'right') || hasSuffix ? 'pr-10' : '',
    };

    const handleChange = useCallback((e) => {
      setHasValue(Boolean(e.target.value));
      props.onChange?.(e);
    }, [props.onChange]);

    const handleClear = useCallback(() => {
      setHasValue(false);
      onClear?.();
      // Create a synthetic event for controlled inputs
      if (ref?.current) {
        const event = new Event('input', { bubbles: true });
        Object.defineProperty(event, 'target', { writable: false, value: { value: '' } });
        props.onChange?.(event);
        ref.current.focus();
      }
    }, [onClear, props.onChange, ref]);

    return (
      <div className={`relative ${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
        {/* Prefix */}
        {hasPrefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none select-none">
            {prefix}
          </div>
        )}

        {/* Left icon */}
        {hasIcon && iconPosition === 'left' && !hasPrefix && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${isFocused ? 'text-cyan-500' : 'text-gray-500'}`}>
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={ariaDescribedBy}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          onChange={handleChange}
          className={`
            rounded-lg border outline-none
            transition-all duration-200
            ${variants[effectiveVariant]}
            ${sizes[size] || sizes.md}
            ${inputPadding.left}
            ${inputPadding.right}
            ${fullWidth ? 'w-full' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${readOnly ? 'bg-white/5 cursor-default' : ''}
            ${className}
          `}
          {...props}
        />

        {/* Right side container */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* Loading spinner */}
          {loading && (
            <div className="w-4 h-4 border-2 border-gray-600 border-t-cyan-500 rounded-full animate-spin" aria-label="Loading" />
          )}

          {/* Clear button */}
          {clearable && hasValue && !loading && !disabled && !readOnly && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-500 hover:text-white transition-colors p-0.5 rounded hover:bg-white/10"
              aria-label="Clear input"
              tabIndex={-1}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Right icon */}
          {hasIcon && iconPosition === 'right' && !clearable && !loading && (
            <div className={`pointer-events-none transition-colors ${isFocused ? 'text-cyan-500' : 'text-gray-500'}`}>
              <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
          )}

          {/* Suffix */}
          {suffix && !clearable && !loading && (
            <div className="text-gray-500 select-none">{suffix}</div>
          )}
        </div>

        {/* Validation icon */}
        {(error || success) && !hasSuffix && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${error ? 'text-red-500' : 'text-emerald-500'}`}>
            {error ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}
      </div>
    );
  }
));

Input.displayName = 'Input';

// Search input with built-in icon
const SearchIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

export const SearchInput = memo(forwardRef((props, ref) => (
  <Input
    ref={ref}
    type="search"
    icon={SearchIcon}
    iconPosition="left"
    placeholder="Search..."
    clearable
    role="searchbox"
    {...props}
  />
)));

SearchInput.displayName = 'SearchInput';

// Textarea variant
export const Textarea = memo(forwardRef(
  (
    {
      variant = 'default',
      size = 'md',
      error,
      success,
      disabled = false,
      readOnly = false,
      rows = 4,
      fullWidth = true,
      resize = 'vertical',
      autoGrow = false,
      maxHeight = 300,
      className = '',
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = providedId || generatedId;
    
    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    const effectiveVariant = error ? 'error' : success ? 'success' : variant;

    // Auto-grow handler
    const handleInput = useCallback((e) => {
      if (autoGrow) {
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, maxHeight)}px`;
      }
      props.onInput?.(e);
    }, [autoGrow, maxHeight, props.onInput]);

    return (
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={error ? 'true' : undefined}
        onInput={handleInput}
        className={`
          rounded-lg border outline-none
          transition-all duration-200
          ${variants[effectiveVariant]}
          ${sizes[size] || sizes.md}
          ${autoGrow ? 'resize-none overflow-hidden' : resizeClasses[resize]}
          ${fullWidth ? 'w-full' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${readOnly ? 'bg-white/5 cursor-default' : ''}
          ${className}
        `}
        {...props}
      />
    );
  }
));

Textarea.displayName = 'Textarea';

// Form field wrapper with label and error - enhanced with accessibility
export const FormField = memo(({ 
  label, 
  error, 
  hint, 
  required, 
  children, 
  className = '',
  labelClassName = '',
  id: providedId,
}) => {
  const generatedId = useId();
  const fieldId = providedId || generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint && !error ? `${fieldId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  // Clone children to add aria attributes
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        id: fieldId,
        'aria-describedby': describedBy,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required ? 'true' : undefined,
      });
    }
    return child;
  });

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className={`block text-sm font-medium text-gray-400 ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      {enhancedChildren}
      {error && (
        <p id={errorId} className="text-xs text-red-400 flex items-center gap-1" role="alert">
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs text-gray-600">
          {hint}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

export default Input;
