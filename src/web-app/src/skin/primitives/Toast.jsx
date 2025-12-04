// @version 2.2.452
// TooLoo.ai Skin Primitive: Toast - Enhanced
// Notification system with swipe-to-dismiss and improved accessibility

import React, { useState, useEffect, useCallback, createContext, useContext, useRef, memo } from 'react';
import { createPortal } from 'react-dom';

// Icons with aria-hidden
const CheckCircle = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const XCircle = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const AlertCircle = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const InfoCircle = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const toastVariants = {
  success: {
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    ariaLabel: 'Success notification',
  },
  error: {
    bg: 'bg-red-500/10 border-red-500/30',
    icon: XCircle,
    iconColor: 'text-red-500',
    ariaLabel: 'Error notification',
  },
  warning: {
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: AlertCircle,
    iconColor: 'text-amber-500',
    ariaLabel: 'Warning notification',
  },
  info: {
    bg: 'bg-cyan-500/10 border-cyan-500/30',
    icon: InfoCircle,
    iconColor: 'text-cyan-500',
    ariaLabel: 'Information notification',
  },
};

const positions = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

// Swipe dismiss threshold (pixels)
const SWIPE_THRESHOLD = 80;

// Single toast component with swipe-to-dismiss
const Toast = memo(({ id, message, description, variant = 'info', duration = 5000, onClose, action }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const toastRef = useRef(null);
  const timerRef = useRef(null);
  const remainingRef = useRef(duration);
  const startTimeRef = useRef(null);
  
  const config = toastVariants[variant] || toastVariants.info;
  const Icon = config.icon;

  // Handle timer with pause/resume
  useEffect(() => {
    if (duration <= 0) return;

    const startTimer = () => {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onClose?.(id), 200);
      }, remainingRef.current);
    };

    if (!isPaused && !isExiting) {
      startTimer();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Calculate remaining time
        if (startTimeRef.current) {
          const elapsed = Date.now() - startTimeRef.current;
          remainingRef.current = Math.max(0, remainingRef.current - elapsed);
        }
      }
    };
  }, [duration, id, onClose, isPaused, isExiting]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onClose?.(id), 200);
  }, [id, onClose]);

  // Touch/mouse handlers for swipe-to-dismiss
  const handleDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX - dragX;
    setIsDragging(true);
    setIsPaused(true);
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const newX = clientX - startXRef.current;
    setDragX(newX);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      // Swipe dismissed
      handleClose();
    } else {
      // Snap back
      setDragX(0);
      setIsPaused(false);
    }
  };

  // Mouse enter/leave for auto-dismiss pause
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => {
    if (!isDragging) setIsPaused(false);
  };

  const opacity = isExiting ? 0 : Math.max(0, 1 - Math.abs(dragX) / (SWIPE_THRESHOLD * 2));
  const exitTransform = isExiting ? (dragX >= 0 ? 'translateX(100%)' : 'translateX(-100%)') : '';

  return (
    <div
      ref={toastRef}
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-label={config.ariaLabel}
      className={`
        flex items-start gap-3 p-4 rounded-lg border
        shadow-lg shadow-black/30 backdrop-blur-sm
        transition-all cursor-grab active:cursor-grabbing select-none
        min-w-[280px] max-w-[400px]
        ${config.bg}
        ${isDragging ? '' : 'duration-200'}
      `}
      style={{
        opacity,
        transform: isExiting ? exitTransform : `translateX(${dragX}px)`,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{message}</p>
        {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
        {action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              action.onClick?.();
              handleClose();
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 mt-2 font-medium transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className="shrink-0 text-gray-500 hover:text-white transition-colors p-1 -m-1 rounded-md hover:bg-white/5"
        aria-label="Dismiss notification"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
});

Toast.displayName = 'Toast';

// Toast container with stacking
const ToastContainer = memo(({ toasts, position = 'top-right', onClose, maxVisible = 5 }) => {
  if (toasts.length === 0) return null;

  // Safe portal rendering
  const portalRoot = document.body;
  if (!portalRoot) return null;

  // Show only max visible, stack the rest
  const visibleToasts = toasts.slice(-maxVisible);
  const isTop = position.startsWith('top');

  return createPortal(
    <div 
      className={`fixed z-[100] flex flex-col gap-2 pointer-events-none ${positions[position]}`}
      style={{ 
        flexDirection: isTop ? 'column' : 'column-reverse',
      }}
      role="region"
      aria-label="Notifications"
    >
      {visibleToasts.map((toast, index) => (
        <div 
          key={toast.id} 
          className="pointer-events-auto"
          style={{
            // Stack effect for multiple toasts
            transform: index < visibleToasts.length - 1 ? `scale(${0.95 + index * 0.01})` : 'scale(1)',
            opacity: index < visibleToasts.length - 1 ? 0.9 : 1,
            zIndex: index,
          }}
        >
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
      {/* Overflow indicator */}
      {toasts.length > maxVisible && (
        <div className="text-xs text-gray-500 text-center pointer-events-none py-1">
          +{toasts.length - maxVisible} more
        </div>
      )}
    </div>,
    portalRoot
  );
});

ToastContainer.displayName = 'ToastContainer';

// Toast context
const ToastContext = createContext(null);

// Toast provider with improved API
export const ToastProvider = ({ children, position = 'top-right', maxVisible = 5 }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback((options) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast = { id, ...options };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const toast = useCallback(
    (message, options = {}) => {
      return addToast({ message, variant: 'info', ...options });
    },
    [addToast]
  );

  // Variant shortcuts
  toast.success = (message, options = {}) => addToast({ message, variant: 'success', ...options });
  toast.error = (message, options = {}) => addToast({ message, variant: 'error', ...options });
  toast.warning = (message, options = {}) => addToast({ message, variant: 'warning', ...options });
  toast.info = (message, options = {}) => addToast({ message, variant: 'info', ...options });
  
  // Promise toast
  toast.promise = async (promise, { loading, success, error }) => {
    const id = addToast({ message: loading, variant: 'info', duration: 0 });
    try {
      const result = await promise;
      removeToast(id);
      addToast({ message: typeof success === 'function' ? success(result) : success, variant: 'success' });
      return result;
    } catch (err) {
      removeToast(id);
      addToast({ message: typeof error === 'function' ? error(err) : error, variant: 'error' });
      throw err;
    }
  };

  // Clear all utility
  toast.clear = clearAll;

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} position={position} maxVisible={maxVisible} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

// Hook to use toast with safe fallback
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    console.warn('[useToast] Must be used within a ToastProvider. Returning no-op.');
    // Return a no-op function that logs warnings
    const noop = (msg) => console.warn('[Toast] Provider not found:', msg);
    noop.success = noop;
    noop.error = noop;
    noop.warning = noop;
    noop.info = noop;
    noop.promise = () => Promise.resolve();
    noop.clear = () => {};
    return noop;
  }
  return context;
};

export default Toast;
