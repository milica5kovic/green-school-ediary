import React from 'react';
import { useBranding } from '../../../core/context/BrandingContext';
import { getCardStyles, withAlpha } from './theme';

/**
 * Branded Card Component
 * 
 * Flexible card with multiple variants and optional header/footer.
 * Automatically uses school branding for 'branded' and 'filled' variants.
 * 
 * @example
 * // Basic card
 * <Card>Content here</Card>
 * 
 * // Card with header
 * <Card 
 *   header={<h3>Title</h3>}
 *   headerAction={<Button size="sm">Action</Button>}
 * >
 *   Content
 * </Card>
 * 
 * // Branded variant
 * <Card variant="branded">
 *   Uses school primary color for border
 * </Card>
 */
const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  style = {},
  header,
  headerAction,
  headerIcon,
  footer,
  noPadding = false,
  onClick,
  hoverable = false,
  ...props
}) => {
  const { primaryColor } = useBranding();
  const cardStyles = getCardStyles(primaryColor, variant);
  
  const paddingSizes = {
    none: '',
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
    xl: 'p-6',
  };

  const hasHeader = header || headerAction || headerIcon;
  
  return (
    <div
      className={`
        ${cardStyles.className}
        ${hoverable ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}
        ${className}
      `.trim()}
      style={{ ...cardStyles.style, ...style }}
      onClick={onClick}
      {...props}
    >
      {/* Header */}
      {hasHeader && (
        <div 
          className={`
            flex items-center justify-between gap-3
            ${noPadding ? 'px-4 py-3' : `px-${padding === 'lg' ? '5' : padding === 'xl' ? '6' : '4'} py-3`}
            border-b border-gray-100
          `.trim()}
        >
          <div className="flex items-center gap-3 min-w-0">
            {headerIcon && (
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: withAlpha(primaryColor, 0.1) }}
              >
                {React.isValidElement(headerIcon) 
                  ? React.cloneElement(headerIcon, { 
                      size: 20, 
                      style: { color: primaryColor } 
                    })
                  : headerIcon
                }
              </div>
            )}
            <div className="min-w-0">
              {typeof header === 'string' ? (
                <h3 className="text-lg font-bold text-gray-800 truncate">{header}</h3>
              ) : (
                header
              )}
            </div>
          </div>
          {headerAction && (
            <div className="flex-shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      )}
      
      {/* Content */}
      <div className={noPadding ? '' : paddingSizes[padding]}>
        {children}
      </div>
      
      {/* Footer */}
      {footer && (
        <div 
          className={`
            ${noPadding ? 'px-4 py-3' : `px-${padding === 'lg' ? '5' : padding === 'xl' ? '6' : '4'} py-3`}
            border-t border-gray-100 bg-gray-50 rounded-b-2xl
          `.trim()}
        >
          {footer}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STAT CARD - For displaying metrics
// ============================================================================

export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  variant = 'default',
  className = '',
}) => {
  const { primaryColor } = useBranding();
  
  const variants = {
    default: {
      bg: 'bg-white',
      border: 'border-gray-200',
      iconBg: withAlpha(primaryColor, 0.1),
      iconColor: primaryColor,
      valueColor: 'text-gray-900',
    },
    primary: {
      bg: withAlpha(primaryColor, 0.05),
      border: withAlpha(primaryColor, 0.2),
      iconBg: withAlpha(primaryColor, 0.15),
      iconColor: primaryColor,
      valueColor: primaryColor,
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      iconColor: '#16a34a',
      valueColor: 'text-green-700',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconBg: 'bg-amber-100',
      iconColor: '#d97706',
      valueColor: 'text-amber-700',
    },
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconBg: 'bg-red-100',
      iconColor: '#dc2626',
      valueColor: 'text-red-700',
    },
  };
  
  const v = variants[variant] || variants.default;
  
  return (
    <div 
      className={`rounded-xl p-4 border ${className}`}
      style={{ 
        backgroundColor: typeof v.bg === 'string' && v.bg.startsWith('bg-') ? undefined : v.bg,
        borderColor: typeof v.border === 'string' && v.border.startsWith('border-') ? undefined : v.border,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
          <p 
            className={`text-2xl font-bold ${typeof v.valueColor === 'string' && v.valueColor.startsWith('text-') ? v.valueColor : ''}`}
            style={{ color: typeof v.valueColor === 'string' && !v.valueColor.startsWith('text-') ? v.valueColor : undefined }}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <span>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
              {trendLabel && <span className="text-gray-400">{trendLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ 
              backgroundColor: typeof v.iconBg === 'string' && v.iconBg.startsWith('bg-') ? undefined : v.iconBg,
            }}
          >
            {React.isValidElement(icon) 
              ? React.cloneElement(icon, { 
                  size: 20, 
                  style: { color: v.iconColor } 
                })
              : icon
            }
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SECTION CARD - For page sections with title
// ============================================================================

export const SectionCard = ({
  title,
  subtitle,
  icon,
  action,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className = '',
  noPadding = false,
}) => {
  const { primaryColor } = useBranding();
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div 
        className={`
          flex items-center justify-between gap-3 px-5 py-4
          ${children ? 'border-b border-gray-100' : ''}
          ${collapsible ? 'cursor-pointer select-none' : ''}
        `.trim()}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: withAlpha(primaryColor, 0.1) }}
            >
              {React.isValidElement(icon) 
                ? React.cloneElement(icon, { size: 20, style: { color: primaryColor } })
                : icon
              }
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {collapsible && (
            <span className={`text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
              ▼
            </span>
          )}
        </div>
      </div>
      
      {/* Content */}
      {!isCollapsed && children && (
        <div className={noPadding ? '' : 'p-5'}>
          {children}
        </div>
      )}
    </div>
  );
};

export default Card;
