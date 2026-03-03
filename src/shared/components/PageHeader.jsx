import React from 'react';
import { useBranding } from '../../../core/context/BrandingContext';
import { withAlpha } from './theme';

/**
 * PageHeader - Universal branded header for all pages
 * 
 * Two variants:
 * 1. Simple (default) - Clean header with title, subtitle, and actions
 * 2. Banner - Full-width colored banner with decorative elements
 * 
 * @example
 * // Simple header
 * <PageHeader
 *   icon={<Calendar />}
 *   title="Calendar"
 *   subtitle="Schedule tests & view school events"
 *   actions={<Button icon={<Plus />}>Add Event</Button>}
 * />
 * 
 * // Banner header with stats
 * <PageHeader
 *   variant="banner"
 *   icon={<Calendar />}
 *   title="Spring Term 2025-26"
 *   subtitle="12 January – 2 April 2026"
 *   stats={{ value: 30, label: "days remaining" }}
 *   progress={62.5}
 *   actions={<Button variant="white">View All</Button>}
 * />
 */

// ════════════════════════════════════════════════════════════════════════════
// SIMPLE HEADER - Clean, minimal design
// ════════════════════════════════════════════════════════════════════════════

export const PageHeader = ({
  icon,
  title,
  subtitle,
  actions,
  children,
  className = '',
}) => {
  const { primaryColor } = useBranding();

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: withAlpha(primaryColor, 0.1) }}
          >
            {React.isValidElement(icon) 
              ? React.cloneElement(icon, { size: 22, style: { color: primaryColor } })
              : icon
            }
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          {subtitle && (
            <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-2">
          {actions || children}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// BANNER HEADER - Full-width colored banner
// ════════════════════════════════════════════════════════════════════════════

export const PageBanner = ({
  icon,
  title,
  subtitle,
  actions,
  stats,
  progress,
  children,
  className = '',
}) => {
  const { primaryColor } = useBranding();

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl p-6 text-white ${className}`}
      style={{ 
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${withAlpha(primaryColor, 0.8)} 100%)` 
      }}
    >
      {/* Decorative circles */}
      <div 
        className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
      />
      <div 
        className="absolute bottom-0 left-0 w-48 h-48 rounded-full -ml-24 -mb-24"
        style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                {React.isValidElement(icon) 
                  ? React.cloneElement(icon, { size: 24, className: 'text-white' })
                  : icon
                }
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              {subtitle && (
                <p className="text-white/80 text-sm mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right side: stats or actions */}
          <div className="flex items-center gap-4">
            {stats && (
              <div className="text-right">
                <p className="text-2xl font-bold">{stats.value}</p>
                <p className="text-white/70 text-xs">{stats.label}</p>
              </div>
            )}
            {actions}
          </div>
        </div>

        {/* Progress bar */}
        {progress !== undefined && (
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div 
                className="bg-white h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}

        {/* Additional content */}
        {children}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SECTION HEADER - For sections within pages
// ════════════════════════════════════════════════════════════════════════════

export const SectionHeader = ({
  icon,
  title,
  subtitle,
  actions,
  count,
  className = '',
}) => {
  const { primaryColor } = useBranding();

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: withAlpha(primaryColor, 0.1) }}
          >
            {React.isValidElement(icon) 
              ? React.cloneElement(icon, { size: 18, style: { color: primaryColor } })
              : icon
            }
          </div>
        )}
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          {count !== undefined && (
            <span 
              className="px-2 py-0.5 text-xs font-medium rounded-full"
              style={{ 
                backgroundColor: withAlpha(primaryColor, 0.1),
                color: primaryColor 
              }}
            >
              {count}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-gray-500 text-sm hidden sm:block">• {subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// STAT BANNER - Mini banner for stats
// ════════════════════════════════════════════════════════════════════════════

export const StatBanner = ({
  icon,
  title,
  value,
  subtitle,
  trend,
  className = '',
}) => {
  const { primaryColor } = useBranding();

  return (
    <div 
      className={`relative overflow-hidden rounded-xl p-4 text-white ${className}`}
      style={{ backgroundColor: primaryColor }}
    >
      {/* Decorative */}
      <div 
        className="absolute top-0 right-0 w-20 h-20 rounded-full -mr-10 -mt-10"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
      />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              {React.isValidElement(icon) 
                ? React.cloneElement(icon, { size: 20 })
                : icon
              }
            </div>
          )}
          <div>
            <p className="text-white/80 text-xs font-medium">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>

        {(subtitle || trend !== undefined) && (
          <div className="text-right">
            {trend !== undefined && (
              <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
            {subtitle && (
              <p className="text-white/60 text-xs">{subtitle}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// EMPTY STATE - For when there's no data
// ════════════════════════════════════════════════════════════════════════════

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  const { primaryColor } = useBranding();

  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && (
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: withAlpha(primaryColor, 0.1) }}
        >
          {React.isValidElement(icon) 
            ? React.cloneElement(icon, { size: 32, style: { color: primaryColor } })
            : icon
          }
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm mb-4 max-w-sm mx-auto">{description}</p>
      )}
      {action}
    </div>
  );
};

export default PageHeader;