// @version 2.2.459
// TooLoo.ai Skin Primitive: Tooltip - Enhanced
// Hover information component with better positioning and accessibility

import React, { useState, useRef, useEffect, useCallback, memo, useId } from 'react';
import { createPortal } from 'react-dom';

// Calculate best position to avoid viewport overflow
const calculateBestPosition = (triggerRect, tooltipRect, preferredPosition, gap = 8) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  const positions = {
    top: {
      top: triggerRect.top + scrollY - tooltipRect.height - gap,
      left: triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2,
      fits: triggerRect.top - tooltipRect.height - gap > 0,
    },
    bottom: {
      top: triggerRect.bottom + scrollY + gap,
      left: triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2,
      fits: triggerRect.bottom + tooltipRect.height + gap < viewportHeight,
    },
    left: {
      top: triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2,
      left: triggerRect.left + scrollX - tooltipRect.width - gap,
      fits: triggerRect.left - tooltipRect.width - gap > 0,
    },
    right: {
      top: triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2,
      left: triggerRect.right + scrollX + gap,
      fits: triggerRect.right + tooltipRect.width + gap < viewportWidth,
    },
  };

  // Try preferred position first
  if (positions[preferredPosition].fits) {
    return { position: preferredPosition, ...positions[preferredPosition] };
  }

  // Fall back to opposite position
  const opposites = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
  const opposite = opposites[preferredPosition];
  if (positions[opposite].fits) {
    return { position: opposite, ...positions[opposite] };
  }

  // Fall back to any fitting position
  for (const [pos, data] of Object.entries(positions)) {
    if (data.fits) {
      return { position: pos, ...data };
    }
  }

  // Default to preferred if nothing fits
  return { position: preferredPosition, ...positions[preferredPosition] };
};

// Arrow classes by position
const arrowClasses = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-[#1a1f28] border-l-transparent border-r-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[#1a1f28] border-l-transparent border-r-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-[#1a1f28] border-t-transparent border-b-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-[#1a1f28] border-t-transparent border-b-transparent border-l-transparent',
};

export const Tooltip = memo(({
  children,
  content,
  position = 'top',
  delay = 200,
  hideDelay = 0,
  disabled = false,
  interactive = false,
  maxWidth = 250,
  showArrow = true,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const showTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const tooltipId = useId();

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const result = calculateBestPosition(triggerRect, tooltipRect, position);

    // Clamp to viewport edges
    let left = Math.max(8, Math.min(result.left, window.innerWidth - tooltipRect.width - 8));
    let top = Math.max(8, result.top);

    setTooltipStyle({ top, left });
    setActualPosition(result.position);
  }, [position]);

  const showTooltip = useCallback(() => {
    if (disabled || !content) return;
    
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Update position after render
      requestAnimationFrame(updatePosition);
    }, delay);
  }, [disabled, content, delay, updatePosition]);

  const hideTooltip = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    if (hideDelay > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, hideDelay);
    } else {
      setIsVisible(false);
    }
  }, [hideDelay]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isVisible) return;

    const handleUpdate = () => requestAnimationFrame(updatePosition);
    
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isVisible, updatePosition]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  if (!content) return children;

  // Safe portal rendering
  const portalRoot = document.body;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-describedby={isVisible ? tooltipId : undefined}
        className={`inline-block ${className}`}
      >
        {children}
      </span>

      {isVisible && portalRoot &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={{
              ...tooltipStyle,
              maxWidth,
            }}
            onMouseEnter={interactive ? showTooltip : undefined}
            onMouseLeave={interactive ? hideTooltip : undefined}
            className={`
              fixed z-[100] px-3 py-2
              text-xs text-white leading-relaxed
              bg-[#1a1f28] rounded-lg
              border border-white/10
              shadow-lg shadow-black/30
              ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}
              animate-in fade-in zoom-in-95 duration-150
            `}
          >
            {content}
            {showArrow && (
              <span
                className={`absolute border-[6px] ${arrowClasses[actualPosition]}`}
                aria-hidden="true"
              />
            )}
          </div>,
          portalRoot
        )}
    </>
  );
});

Tooltip.displayName = 'Tooltip';

// Info icon with tooltip - enhanced
export const InfoTooltip = memo(({ 
  content, 
  size = 'sm',
  variant = 'default',
  className = '' 
}) => {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
  };

  const variantClasses = {
    default: 'bg-white/10 text-gray-500 hover:text-white hover:bg-white/20',
    info: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30',
    warning: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30',
  };

  return (
    <Tooltip content={content} className={className}>
      <span 
        className={`
          inline-flex items-center justify-center rounded-full cursor-help transition-colors
          ${sizeClasses[size]}
          ${variantClasses[variant]}
        `}
        tabIndex={0}
        role="button"
        aria-label="More information"
      >
        <svg className={iconSizes[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </span>
    </Tooltip>
  );
});

InfoTooltip.displayName = 'InfoTooltip';

// Keyboard shortcut tooltip
export const ShortcutTooltip = memo(({ 
  shortcut, 
  description, 
  children,
  position = 'top',
  className = '' 
}) => {
  const content = (
    <div className="flex flex-col gap-1">
      <span>{description}</span>
      <kbd className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono text-gray-400">
        {shortcut}
      </kbd>
    </div>
  );

  return (
    <Tooltip content={content} position={position} className={className}>
      {children}
    </Tooltip>
  );
});

ShortcutTooltip.displayName = 'ShortcutTooltip';

export default Tooltip;
