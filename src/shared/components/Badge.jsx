import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';
import { useBranding } from '../../../core/context/BrandingContext';
import { withAlpha, getBadgeStyles, getAvatarStyles, getAlertStyles } from './theme';

/**
 * Branded Badge Component
 * 
 * Small labels for status, categories, counts.
 * Uses school branding for default variant.
 * 
 * @example
 * // Default branded badge
 * <Badge>Active</Badge>
 * 
 * // Semantic colors
 * <Badge color="success">Passed</Badge>
 * <Badge color="warning">Pending</Badge>
 * <Badge color="error">Failed</Badge>
 * 
 * // Variants
 * <Badge variant="solid">Solid</Badge>
 * <Badge variant="outline">Outline</Badge>
 */
export const Badge = ({
  children,
  variant = 'default',
  color,
  size = 'sm',
  icon,
  onRemove,
  className = '',
}) => {
  const { primaryColor } = useBranding();
  const styles = getBadgeStyles(primaryColor, variant, color);
  
  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span 
      className={`
        ${styles.className}
        ${sizes[size]}
        ${onRemove ? 'pr-1' : ''}
        ${className}
      `.trim()}
      style={styles.style}
    >
      {icon && (
        <span className="mr-1">
          {React.isValidElement(icon) ? React.cloneElement(icon, { size: 12 }) : icon}
        </span>
      )}
      {children}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
};

/**
 * Status Badge - Pre-configured for common statuses
 */
export const StatusBadge = ({ status, className = '' }) => {
  const statusConfig = {
    active: { color: 'success', label: 'Active' },
    inactive: { color: 'gray', label: 'Inactive' },
    pending: { color: 'warning', label: 'Pending' },
    approved: { color: 'success', label: 'Approved' },
    rejected: { color: 'error', label: 'Rejected' },
    draft: { color: 'gray', label: 'Draft' },
    published: { color: 'success', label: 'Published' },
    archived: { color: 'gray', label: 'Archived' },
    graduated: { color: 'info', label: 'Graduated' },
    withdrawn: { color: 'warning', label: 'Withdrawn' },
    transferred: { color: 'info', label: 'Transferred' },
    enrolled: { color: 'success', label: 'Enrolled' },
    present: { color: 'success', label: 'Present' },
    absent: { color: 'error', label: 'Absent' },
    late: { color: 'warning', label: 'Late' },
    excused: { color: 'info', label: 'Excused' },
  };
  
  const config = statusConfig[status?.toLowerCase()] || { color: 'gray', label: status };
  
  return (
    <Badge color={config.color} className={className}>
      {config.label}
    </Badge>
  );
};

// ============================================================================
// ALERT COMPONENT
// ============================================================================

/**
 * Branded Alert Component
 * 
 * For displaying important messages to users.
 * 
 * @example
 * <Alert type="success" title="Saved!">
 *   Your changes have been saved.
 * </Alert>
 * 
 * <Alert type="error" onClose={() => setError(null)}>
 *   {errorMessage}
 * </Alert>
 */
export const Alert = ({
  type = 'info',
  title,
  children,
  icon,
  onClose,
  action,
  className = '',
}) => {
  const styles = getAlertStyles(type);
  
  const defaultIcons = {
    info: <Info />,
    success: <CheckCircle />,
    warning: <AlertTriangle />,
    error: <XCircle />,
  };
  
  const displayIcon = icon !== undefined ? icon : defaultIcons[type];

  return (
    <div className={`${styles.className} ${className}`}>
      <div className="flex gap-3">
        {displayIcon && (
          <div className={`flex-shrink-0 ${styles.iconColor}`}>
            {React.isValidElement(displayIcon) 
              ? React.cloneElement(displayIcon, { size: 20 })
              : displayIcon
            }
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold mb-0.5">{title}</h4>
          )}
          {children && (
            <div className="text-sm opacity-90">{children}</div>
          )}
          {action && (
            <div className="mt-2">{action}</div>
          )}
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Inline Alert - Smaller, for form validation etc.
 */
export const InlineAlert = ({ type = 'error', children, className = '' }) => {
  const colors = {
    error: 'text-red-600',
    warning: 'text-amber-600',
    success: 'text-green-600',
    info: 'text-blue-600',
  };
  
  const icons = {
    error: <XCircle size={14} />,
    warning: <AlertTriangle size={14} />,
    success: <CheckCircle size={14} />,
    info: <Info size={14} />,
  };

  return (
    <div className={`flex items-center gap-1.5 text-xs ${colors[type]} ${className}`}>
      {icons[type]}
      <span>{children}</span>
    </div>
  );
};

// ============================================================================
// AVATAR COMPONENT
// ============================================================================

/**
 * Branded Avatar Component
 * 
 * Displays user initials or image with school-branded background.
 * 
 * @example
 * // With initials
 * <Avatar name="John Doe" />
 * 
 * // With image
 * <Avatar name="John Doe" src="/avatars/john.jpg" />
 * 
 * // Different sizes
 * <Avatar name="JD" size="lg" />
 */
export const Avatar = ({
  name,
  src,
  size = 'md',
  variant = 'circle',
  className = '',
  style = {},
}) => {
  const { primaryColor } = useBranding();
  const avatarStyles = getAvatarStyles(primaryColor, size);
  
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };
  
  const shapes = {
    circle: 'rounded-full',
    square: 'rounded-lg',
    rounded: 'rounded-xl',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`
          ${avatarStyles.className.replace('rounded-full', shapes[variant])}
          object-cover
          ${className}
        `.trim()}
        style={style}
      />
    );
  }

  return (
    <div
      className={`
        ${avatarStyles.className.replace('rounded-full', shapes[variant])}
        ${className}
      `.trim()}
      style={{ ...avatarStyles.style, ...style }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

/**
 * Avatar Group - Stack multiple avatars
 */
export const AvatarGroup = ({
  avatars,
  max = 4,
  size = 'md',
  className = '',
}) => {
  const { primaryColor } = useBranding();
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;
  
  const overlapSizes = {
    xs: '-ml-2',
    sm: '-ml-2',
    md: '-ml-3',
    lg: '-ml-4',
    xl: '-ml-5',
  };

  return (
    <div className={`flex items-center ${className}`}>
      {displayed.map((avatar, index) => (
        <div 
          key={index}
          className={`${index > 0 ? overlapSizes[size] : ''} ring-2 ring-white rounded-full`}
        >
          <Avatar {...avatar} size={size} />
        </div>
      ))}
      
      {remaining > 0 && (
        <div 
          className={`
            ${overlapSizes[size]} 
            ring-2 ring-white rounded-full
            bg-gray-200 text-gray-600 
            flex items-center justify-center font-medium
            ${getAvatarStyles(primaryColor, size).className.replace('text-white', '').replace(/bg-\S+/, '')}
          `.trim()}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

/**
 * Branded Spinner
 */
export const Spinner = ({ size = 'md', className = '' }) => {
  const { primaryColor } = useBranding();
  
  const sizes = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-3',
  };

  return (
    <div 
      className={`${sizes[size]} rounded-full animate-spin ${className}`}
      style={{ 
        borderColor: withAlpha(primaryColor, 0.2),
        borderTopColor: primaryColor,
      }}
    />
  );
};

/**
 * Loading Overlay
 */
export const LoadingOverlay = ({ message = 'Loading...' }) => {
  return (
    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-inherit">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-2" />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
};

/**
 * Skeleton Loader
 */
export const Skeleton = ({ 
  variant = 'text', 
  width, 
  height, 
  className = '' 
}) => {
  const variants = {
    text: 'h-4 rounded',
    title: 'h-6 rounded',
    avatar: 'rounded-full',
    card: 'rounded-xl',
    button: 'h-10 rounded-lg',
  };
  
  const defaultSizes = {
    avatar: { width: '40px', height: '40px' },
  };

  return (
    <div 
      className={`
        animate-pulse bg-gray-200
        ${variants[variant]}
        ${className}
      `.trim()}
      style={{
        width: width || defaultSizes[variant]?.width || '100%',
        height: height || defaultSizes[variant]?.height,
      }}
    />
  );
};

export default Badge;
