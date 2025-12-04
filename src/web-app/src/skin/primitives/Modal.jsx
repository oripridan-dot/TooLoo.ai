// @version 2.2.451
// TooLoo.ai Skin Primitive: Modal - Enhanced
// Accessible dialog/popup component with focus trap and portal safety

import React, { useEffect, useCallback, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { Button, IconButton } from './Button';

// X icon
const XIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[90vw] max-h-[90vh]',
};

// Focus trap hook
const useFocusTrap = (isOpen, containerRef) => {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first element on open
    firstFocusable?.focus();

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [isOpen, containerRef]);
};

export const Modal = memo(({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showClose = true,
  initialFocus = null,
  className = '',
}) => {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Save the previously focused element
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Handle escape key
  const handleEscape = useCallback(
    (e) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    },
    [closeOnEscape, onClose]
  );

  // Setup and cleanup
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      // Prevent scroll on iOS
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';

      // Restore focus to previous element
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, handleEscape]);

  // Focus trap
  useFocusTrap(isOpen, containerRef);

  if (!isOpen) return null;

  // Safe portal rendering
  const portalRoot = document.body;
  if (!portalRoot) {
    console.warn('[Modal] Document body not available');
    return null;
  }

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        className={`
          relative w-full ${sizes[size]}
          bg-[#0f1117] rounded-xl border border-white/10
          shadow-2xl shadow-black/50
          animate-in fade-in zoom-in-95 duration-200
          focus:outline-none
          ${className}
        `}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between p-4 border-b border-white/5">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-white truncate">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="text-sm text-gray-500 mt-1">
                  {description}
                </p>
              )}
            </div>
            {showClose && (
              <IconButton
                icon={XIcon}
                variant="ghost"
                size="sm"
                onClick={onClose}
                label="Close dialog"
                className="shrink-0 -mr-2 -mt-1 ml-4"
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto overscroll-contain">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-white/5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    portalRoot
  );
});

Modal.displayName = 'Modal';

// Confirmation dialog
export const ConfirmDialog = memo(({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    description={description}
    size="sm"
    footer={
      <>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </>
    }
  />
));

ConfirmDialog.displayName = 'ConfirmDialog';

// Alert dialog (info only)
export const AlertDialog = memo(({
  isOpen,
  onClose,
  title,
  description,
  buttonText = 'OK',
  variant = 'primary',
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    description={description}
    size="sm"
    footer={
      <Button variant={variant} onClick={onClose}>
        {buttonText}
      </Button>
    }
  />
));

AlertDialog.displayName = 'AlertDialog';

export default Modal;
