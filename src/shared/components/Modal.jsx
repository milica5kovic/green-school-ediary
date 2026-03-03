import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import { useBranding } from '../../../core/context/BrandingContext';
import { withAlpha } from './theme';
import Button from './Button';

/**
 * Branded Modal Component
 * 
 * Full-featured modal with header, body, footer, and various variants.
 * Supports click-outside-to-close and escape key.
 * 
 * @example
 * // Basic modal
 * <Modal isOpen={isOpen} onClose={close} title="Edit Profile">
 *   <p>Modal content here</p>
 * </Modal>
 * 
 * // With icon and custom footer
 * <Modal 
 *   isOpen={isOpen} 
 *   onClose={close}
 *   icon={<Settings />}
 *   title="Settings"
 *   footer={
 *     <>
 *       <Button variant="white" onClick={close}>Cancel</Button>
 *       <Button onClick={save}>Save</Button>
 *     </>
 *   }
 * >
 *   Content
 * </Modal>
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
  closeOnClickOutside = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}) => {
  const { primaryColor } = useBranding();
  const modalRef = useRef(null);
  
  const sizes = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-[calc(100vw-2rem)]',
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closeOnClickOutside && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className={`
          bg-white rounded-2xl shadow-2xl w-full overflow-hidden
          animate-in zoom-in-95 duration-200
          ${sizes[size]}
          ${className}
        `.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: withAlpha(primaryColor, 0.1) }}
                >
                  {React.isValidElement(icon) 
                    ? React.cloneElement(icon, { size: 20, style: { color: primaryColor } })
                    : icon
                  }
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-lg font-bold text-gray-800 truncate">{title}</h3>
                )}
                {subtitle && (
                  <p className="text-sm text-gray-500 truncate">{subtitle}</p>
                )}
              </div>
            </div>
            
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="px-6 py-4 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// CONFIRM MODAL - For confirmations and alerts
// ============================================================================

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false,
  icon,
}) => {
  const { primaryColor } = useBranding();
  
  const variants = {
    primary: {
      icon: icon || <Info />,
      iconBg: withAlpha(primaryColor, 0.1),
      iconColor: primaryColor,
      buttonVariant: 'primary',
    },
    danger: {
      icon: icon || <AlertTriangle />,
      iconBg: 'rgba(239, 68, 68, 0.1)',
      iconColor: '#ef4444',
      buttonVariant: 'danger',
    },
    warning: {
      icon: icon || <AlertTriangle />,
      iconBg: 'rgba(245, 158, 11, 0.1)',
      iconColor: '#f59e0b',
      buttonVariant: 'primary',
    },
    success: {
      icon: icon || <CheckCircle />,
      iconBg: 'rgba(34, 197, 94, 0.1)',
      iconColor: '#22c55e',
      buttonVariant: 'primary',
    },
  };
  
  const v = variants[variant] || variants.primary;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center py-2">
        <div 
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: v.iconBg }}
        >
          {React.isValidElement(v.icon) 
            ? React.cloneElement(v.icon, { size: 28, style: { color: v.iconColor } })
            : v.icon
          }
        </div>
        
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        
        {message && (
          <p className="text-sm text-gray-600 mb-6">{message}</p>
        )}
        
        <div className="flex gap-3">
          <Button 
            variant="white" 
            onClick={onClose} 
            fullWidth
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button 
            variant={v.buttonVariant}
            onClick={onConfirm}
            fullWidth
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// DRAWER - Slide-in panel from side
// ============================================================================

export const Drawer = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  position = 'right',
  size = 'md',
  showCloseButton = true,
}) => {
  const { primaryColor } = useBranding();
  
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  };
  
  const positions = {
    right: 'right-0 h-full',
    left: 'left-0 h-full',
    top: 'top-0 w-full',
    bottom: 'bottom-0 w-full',
  };
  
  const animations = {
    right: isOpen ? 'translate-x-0' : 'translate-x-full',
    left: isOpen ? 'translate-x-0' : '-translate-x-full',
    top: isOpen ? 'translate-y-0' : '-translate-y-full',
    bottom: isOpen ? 'translate-y-0' : 'translate-y-full',
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`
          fixed inset-0 z-40 bg-black/50 transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`
          fixed z-50 bg-white shadow-2xl
          transition-transform duration-300 ease-out
          ${positions[position]}
          ${sizes[size]}
          ${animations[position]}
          ${position === 'right' || position === 'left' ? 'w-full' : 'h-auto'}
        `.trim()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              {title && <h3 className="text-lg font-bold text-gray-800">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            {footer}
          </div>
        )}
      </div>
    </>
  );
};

export default Modal;
