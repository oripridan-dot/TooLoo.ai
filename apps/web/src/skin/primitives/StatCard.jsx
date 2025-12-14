// @version 2.2.458
// TooLoo.ai Skin Primitive: StatCard - Enhanced
// Display statistics with trend indicators, animations, and accessibility

import React, { memo, useEffect, useState, useRef } from 'react';
import { Card } from './Card';

const TrendUpIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);

const TrendDownIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const TrendNeutralIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
  </svg>
);

const trendConfig = {
  up: { icon: TrendUpIcon, color: 'text-emerald-500', label: 'Increasing' },
  down: { icon: TrendDownIcon, color: 'text-red-500', label: 'Decreasing' },
  neutral: { icon: TrendNeutralIcon, color: 'text-gray-500', label: 'No change' },
};

const accentColors = {
  default: 'text-white bg-white/5 border-white/10',
  cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  gray: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  neural: 'text-cyan-400 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border-purple-500/20',
};

// Animated number hook
const useAnimatedNumber = (targetValue, duration = 600, enabled = true) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startValue = useRef(0);
  const startTime = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    if (!enabled || typeof targetValue !== 'number') {
      setDisplayValue(targetValue);
      return;
    }

    startValue.current = displayValue;
    startTime.current = null;

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
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
  }, [targetValue, duration, enabled]);

  return displayValue;
};

// Format number with commas
const formatNumber = (num, decimals = 0) => {
  if (typeof num !== 'number') return num;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const StatCard = memo(({
  title,
  value,
  numericValue, // For animation - pass actual number
  decimals = 0,
  prefix = '',
  suffix = '',
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  accent = 'cyan',
  size = 'md',
  animate = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) => {
  const sizes = {
    sm: {
      container: 'p-3',
      icon: 'w-8 h-8',
      iconInner: 'w-4 h-4',
      title: 'text-xs',
      value: 'text-xl',
      subtitle: 'text-xs',
    },
    md: {
      container: 'p-4',
      icon: 'w-10 h-10',
      iconInner: 'w-5 h-5',
      title: 'text-sm',
      value: 'text-2xl',
      subtitle: 'text-xs',
    },
    lg: {
      container: 'p-6',
      icon: 'w-12 h-12',
      iconInner: 'w-6 h-6',
      title: 'text-base',
      value: 'text-3xl',
      subtitle: 'text-sm',
    },
  };

  const s = sizes[size] || sizes.md;
  const accentClass = accentColors[accent] || accentColors.cyan;

  // Animate numeric value if provided
  const animatedNum = useAnimatedNumber(numericValue, 600, animate && typeof numericValue === 'number');
  const displayValue = animate && typeof numericValue === 'number' 
    ? `${prefix}${formatNumber(animatedNum, decimals)}${suffix}`
    : value;

  const trendInfo = trend ? trendConfig[trend] : null;
  const TrendIcon = trendInfo?.icon;

  return (
    <Card 
      variant="glass" 
      hover={!!onClick}
      clickable={!!onClick}
      onClick={onClick}
      loading={loading}
      className={`${s.container} ${className}`} 
      aria-label={`${title}: ${displayValue}`}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={`${s.title} text-gray-500 font-medium truncate`}>{title}</p>
          
          {loading ? (
            <div className="h-8 w-24 bg-white/10 rounded animate-pulse mt-1" />
          ) : (
            <p className={`${s.value} font-bold text-white mt-1 tracking-tight tabular-nums`}>
              {displayValue}
            </p>
          )}
          
          {subtitle && (
            <p className={`${s.subtitle} text-gray-500 mt-1 truncate`}>{subtitle}</p>
          )}

          {/* Trend indicator */}
          {trend && !loading && (
            <div 
              className="flex items-center gap-1 mt-2"
              aria-label={`Trend: ${trendInfo?.label}${trendValue ? ` ${trendValue}` : ''}`}
            >
              {TrendIcon && (
                <TrendIcon className={`w-4 h-4 ${trendInfo.color} ${trend === 'up' || trend === 'down' ? 'animate-bounce-subtle' : ''}`} />
              )}
              {trendValue && (
                <span className={`text-xs font-medium ${trendInfo.color}`}>
                  {trendValue}
                </span>
              )}
            </div>
          )}
        </div>

        {Icon && (
          <div
            className={`
              ${s.icon} rounded-xl border shrink-0
              flex items-center justify-center
              ${accentClass}
              transition-transform duration-200
              ${onClick ? 'group-hover:scale-110' : ''}
            `}
          >
            <Icon className={s.iconInner} aria-hidden="true" />
          </div>
        )}
      </div>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

// Mini stat for compact displays - enhanced
export const MiniStat = memo(({ 
  label, 
  value, 
  accent = 'gray', 
  trend,
  loading = false,
  className = '' 
}) => {
  const trendInfo = trend ? trendConfig[trend] : null;
  const TrendIcon = trendInfo?.icon;

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-1">
        {loading ? (
          <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
        ) : (
          <>
            {TrendIcon && <TrendIcon className={`w-3 h-3 ${trendInfo.color}`} />}
            <span className={`text-sm font-mono font-medium tabular-nums ${accentColors[accent]?.split(' ')[0] || 'text-gray-400'}`}>
              {value}
            </span>
          </>
        )}
      </div>
    </div>
  );
});

MiniStat.displayName = 'MiniStat';

// Stat group for displaying multiple stats in a row - enhanced
export const StatGroup = memo(({ 
  children, 
  columns = { default: 2, md: 4 },
  gap = 4,
  className = '' 
}) => {
  const gridCols = `grid-cols-${columns.default} md:grid-cols-${columns.md || columns.default}`;
  
  return (
    <div 
      className={`grid ${gridCols} gap-${gap} ${className}`}
      role="group"
      aria-label="Statistics"
    >
      {children}
    </div>
  );
});

StatGroup.displayName = 'StatGroup';

// Comparison stat for A/B displays
export const ComparisonStat = memo(({
  title,
  valueA,
  valueB,
  labelA = 'Current',
  labelB = 'Previous',
  accent = 'cyan',
  className = '',
}) => {
  const numA = typeof valueA === 'number' ? valueA : parseFloat(valueA) || 0;
  const numB = typeof valueB === 'number' ? valueB : parseFloat(valueB) || 0;
  const diff = numA - numB;
  const percentChange = numB !== 0 ? ((diff / numB) * 100) : 0;
  const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';

  return (
    <Card variant="glass" className={`p-4 ${className}`}>
      <p className="text-sm text-gray-500 font-medium mb-2">{title}</p>
      <div className="flex items-baseline gap-4">
        <div>
          <span className="text-2xl font-bold text-white tabular-nums">{valueA}</span>
          <span className="text-xs text-gray-600 ml-1">{labelA}</span>
        </div>
        <div className="text-gray-700">/</div>
        <div>
          <span className="text-lg text-gray-400 tabular-nums">{valueB}</span>
          <span className="text-xs text-gray-600 ml-1">{labelB}</span>
        </div>
      </div>
      <div className={`flex items-center gap-1 mt-2 ${trendConfig[trend].color}`}>
        {React.createElement(trendConfig[trend].icon, { className: 'w-4 h-4' })}
        <span className="text-xs font-medium">
          {diff > 0 ? '+' : ''}{diff.toFixed(0)} ({percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%)
        </span>
      </div>
    </Card>
  );
});

ComparisonStat.displayName = 'ComparisonStat';

export default StatCard;
