// @version 2.2.456
// TooLoo.ai Skin Primitive: Progress - Enhanced
// Progress indicators and bars with accessibility and animations

import React, { memo, useEffect, useState, useRef } from 'react';

const accentColors = {
  cyan: 'bg-cyan-500',
  purple: 'bg-purple-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  blue: 'bg-blue-500',
  gradient: 'bg-gradient-to-r from-cyan-500 to-purple-500',
  neural: 'bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500',
};

const trackColors = {
  default: 'bg-white/10',
  subtle: 'bg-white/5',
  dark: 'bg-black/20',
};

const sizes = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
  xl: 'h-4',
};

// Animated counter hook
const useAnimatedValue = (targetValue, duration = 500) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startValue = useRef(0);
  const startTime = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    startValue.current = displayValue;
    startTime.current = null;

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue.current + (targetValue - startValue.current) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      }
    };

    rafId.current = requestAnimationFrame(animate);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [targetValue, duration]);

  return displayValue;
};

// Linear progress bar - enhanced with accessibility
export const Progress = memo(
  ({
    value = 0,
    max = 100,
    size = 'md',
    accent = 'cyan',
    track = 'default',
    showLabel = false,
    label,
    animated = false,
    striped = false,
    indeterminate = false,
    animateValue = false,
    className = '',
    'aria-label': ariaLabel,
  }) => {
    const rawPercentage = Math.min(100, Math.max(0, (value / max) * 100));
    const animatedPercentage = useAnimatedValue(rawPercentage, animateValue ? 500 : 0);
    const percentage = animateValue ? animatedPercentage : rawPercentage;

    return (
      <div className={className}>
        {(showLabel || label) && (
          <div className="flex justify-between mb-1 text-xs">
            <span className="text-gray-400">{label}</span>
            {showLabel && (
              <span className="text-gray-500 tabular-nums">{Math.round(percentage)}%</span>
            )}
          </div>
        )}
        <div
          className={`w-full rounded-full overflow-hidden ${trackColors[track]} ${sizes[size]}`}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : Math.round(percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={ariaLabel || label || 'Progress'}
          aria-busy={indeterminate}
        >
          {indeterminate ? (
            <div
              className={`
              h-full w-1/3 rounded-full
              ${accentColors[accent]}
              animate-[shimmer_1.5s_ease-in-out_infinite]
            `}
            />
          ) : (
            <div
              className={`
              h-full rounded-full transition-all duration-300 ease-out
              ${accentColors[accent]}
              ${striped ? 'bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,0.15)25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)50%,rgba(255,255,255,0.15)75%,transparent_75%,transparent)]' : ''}
              ${animated && striped ? 'animate-[progress-stripe_1s_linear_infinite]' : ''}
            `}
              style={{ width: `${percentage}%` }}
            />
          )}
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

// Circular progress (ring) - enhanced with accessibility
export const CircularProgress = memo(
  ({
    value = 0,
    max = 100,
    size = 'md',
    accent = 'cyan',
    strokeWidth = 4,
    showValue = false,
    indeterminate = false,
    animateValue = false,
    className = '',
    'aria-label': ariaLabel,
  }) => {
    const rawPercentage = Math.min(100, Math.max(0, (value / max) * 100));
    const animatedPercentage = useAnimatedValue(rawPercentage, animateValue ? 500 : 0);
    const percentage = animateValue ? animatedPercentage : rawPercentage;

    const sizeConfig = {
      xs: { size: 24, text: 'text-[10px]' },
      sm: { size: 32, text: 'text-xs' },
      md: { size: 48, text: 'text-sm' },
      lg: { size: 64, text: 'text-base' },
      xl: { size: 80, text: 'text-lg' },
      '2xl': { size: 96, text: 'text-xl' },
    };

    const config = sizeConfig[size] || sizeConfig.md;
    const radius = (config.size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    // Convert bg color to stroke color
    const strokeColor = accentColors[accent]?.replace('bg-', 'text-') || 'text-cyan-500';

    return (
      <div
        className={`relative inline-flex items-center justify-center ${className}`}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel || 'Progress'}
        aria-busy={indeterminate}
      >
        <svg
          width={config.size}
          height={config.size}
          className={`-rotate-90 ${indeterminate ? 'animate-spin' : ''}`}
        >
          {/* Background track */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/10"
          />
          {/* Progress */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
            className={`${strokeColor} transition-all duration-300`}
          />
        </svg>
        {showValue && !indeterminate && (
          <span className={`absolute ${config.text} font-medium text-white tabular-nums`}>
            {Math.round(percentage)}%
          </span>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = 'CircularProgress';

// Indeterminate loading bar - enhanced
export const LoadingBar = memo(({ size = 'md', accent = 'cyan', label, className = '' }) => (
  <div className={className}>
    {label && <div className="mb-1 text-xs text-gray-400">{label}</div>}
    <div
      className={`w-full rounded-full overflow-hidden bg-white/10 ${sizes[size]}`}
      role="progressbar"
      aria-busy="true"
      aria-label={label || 'Loading'}
    >
      <div
        className={`
          h-full w-1/3 rounded-full
          ${accentColors[accent]}
          animate-[shimmer_1.5s_ease-in-out_infinite]
        `}
      />
    </div>
  </div>
));

LoadingBar.displayName = 'LoadingBar';

// Steps progress - enhanced with accessibility
export const Steps = memo(
  ({
    steps,
    currentStep,
    accent = 'cyan',
    orientation = 'horizontal',
    size = 'md',
    clickable = false,
    onStepClick,
    className = '',
  }) => {
    const sizeConfig = {
      sm: { indicator: 'w-6 h-6 text-xs', text: 'text-xs' },
      md: { indicator: 'w-8 h-8 text-sm', text: 'text-xs' },
      lg: { indicator: 'w-10 h-10 text-base', text: 'text-sm' },
    };

    const config = sizeConfig[size] || sizeConfig.md;
    const isVertical = orientation === 'vertical';

    return (
      <div
        className={`flex ${isVertical ? 'flex-col' : 'items-center'} ${className}`}
        role="navigation"
        aria-label="Progress steps"
      >
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = clickable && (isCompleted || isCurrent || index === currentStep + 1);

          return (
            <React.Fragment key={step.id || `progress-step-${step.label || ''}-${index}`}>
              {/* Step indicator */}
              <div className={`flex ${isVertical ? 'items-start' : 'flex-col items-center'}`}>
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(index)}
                  disabled={!isClickable}
                  className={`
                  flex items-center justify-center ${config.indicator} rounded-full border-2
                  font-medium transition-all duration-200
                  ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                  ${
                    isCompleted
                      ? `${accentColors[accent]} border-transparent text-white`
                      : isCurrent
                        ? `border-cyan-500 bg-cyan-500/20 text-cyan-400`
                        : 'border-white/20 bg-transparent text-gray-500'
                  }
                  ${isClickable && !isCompleted && !isCurrent ? 'hover:border-white/40' : ''}
                  focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0b0f]
                `}
                  aria-label={`Step ${index + 1}: ${step.label || ''} ${isCompleted ? '(completed)' : isCurrent ? '(current)' : ''}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </button>
                {step.label && (
                  <span
                    className={`
                    ${isVertical ? 'ml-3' : 'mt-2'} ${config.text} font-medium
                    ${isCompleted || isCurrent ? 'text-white' : 'text-gray-500'}
                  `}
                  >
                    {step.label}
                  </span>
                )}
                {step.description && !isVertical && (
                  <span className={`${config.text} text-gray-600 mt-0.5`}>{step.description}</span>
                )}
              </div>

              {/* Connector */}
              {index < steps.length - 1 && (
                <div
                  className={`
                  ${isVertical ? 'w-0.5 h-8 ml-[0.9375rem] my-2' : 'flex-1 h-0.5 mx-2'}
                  ${isCompleted ? accentColors[accent] : 'bg-white/10'}
                  transition-colors duration-300
                `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }
);

Steps.displayName = 'Steps';

export default Progress;
