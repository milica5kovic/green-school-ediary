import React, { forwardRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useBranding } from '../../../core/context/BrandingContext';
import { getButtonStyles, withAlpha } from './theme';

/**
 * Branded Button Component
 * 
 * Automatically uses school's primary color from BrandingContext.
 * Supports multiple variants, sizes, and states.
 * 
 * @example
 * // Primary button (default)
 * <Button>Click me</Button>
 * 
 * // Secondary outline button
 * <Button variant="secondary">Cancel</Button>
 * 
 * // With icon and loading state
 * <Button icon={<Save />} loading={saving}>Save</Button>
 * 
 * // Different sizes
 * <Button size="sm">Small</Button>
 * <Button size="lg">Large</Button>
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  style = {},
  type = 'button',
  onClick,
  ...props
}, ref) => {
  const { primaryColor } = useBranding();
  const [isHovered, setIsHovered] = useState(false);
  
  const buttonStyles = getButtonStyles(primaryColor, variant, size);
  
  const isDisabled = disabled || loading;
  
  const combinedClassName = `
    ${buttonStyles.className}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  const combinedStyle = {
    ...buttonStyles.style,
    ...(isHovered && !isDisabled ? buttonStyles.hoverStyle : {}),
    ...style,
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={combinedClassName}
      style={combinedStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} className="animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      
      {children && <span>{children}</span>}
      
      {iconRight && !loading && (
        <span className="flex-shrink-0">{iconRight}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

// ============================================================================
// BUTTON GROUP
// ============================================================================

export const ButtonGroup = ({ children, className = '' }) => {
  return (
    <div className={`inline-flex rounded-lg overflow-hidden ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        return React.cloneElement(child, {
          className: `
            ${child.props.className || ''}
            ${index === 0 ? 'rounded-r-none' : ''}
            ${index === React.Children.count(children) - 1 ? 'rounded-l-none' : ''}
            ${index !== 0 && index !== React.Children.count(children) - 1 ? 'rounded-none' : ''}
            ${index !== 0 ? 'border-l-0' : ''}
          `.trim(),
        });
      })}
    </div>
  );
};

// ============================================================================
// ICON BUTTON
// ============================================================================

export const IconButton = forwardRef(({
  icon,
  variant = 'ghost',
  size = 'md',
  label,
  className = '',
  ...props
}, ref) => {
  const { primaryColor } = useBranding();
  const [isHovered, setIsHovered] = useState(false);
  
  const sizes = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };
  
  const iconSizes = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          className: 'text-white rounded-lg transition-colors',
          style: { backgroundColor: primaryColor },
          hoverStyle: { backgroundColor: withAlpha(primaryColor, 0.9) },
        };
      case 'secondary':
        return {
          className: 'rounded-lg transition-colors',
          style: { 
            backgroundColor: withAlpha(primaryColor, 0.1),
            color: primaryColor,
          },
          hoverStyle: { backgroundColor: withAlpha(primaryColor, 0.2) },
        };
      case 'outline':
        return {
          className: 'border rounded-lg transition-colors',
          style: { 
            borderColor: primaryColor,
            color: primaryColor,
          },
          hoverStyle: { backgroundColor: withAlpha(primaryColor, 0.1) },
        };
      case 'ghost':
      default:
        return {
          className: 'text-gray-500 rounded-lg transition-colors hover:bg-gray-100',
          style: {},
          hoverStyle: { color: primaryColor },
        };
    }
  };

  const variantStyles = getVariantStyles();
  
  return (
    <button
      ref={ref}
      type="button"
      className={`
        ${sizes[size]} 
        ${variantStyles.className}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `.trim()}
      style={{
        ...variantStyles.style,
        ...(isHovered ? variantStyles.hoverStyle : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={label}
      title={label}
      {...props}
    >
      {React.isValidElement(icon) 
        ? React.cloneElement(icon, { size: iconSizes[size] })
        : icon
      }
    </button>
  );
});

IconButton.displayName = 'IconButton';

export default Button;
