import React from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import useTermTheme from '../../shared/hooks/useTermTheme';

// ════════════════════════════════════════════════════════════════════════════
// TERM BANNER - Full width banner with term info
// ════════════════════════════════════════════════════════════════════════════

/**
 * TermBanner - Displays current term with progress bar
 * 
 * @param {boolean} showProgress - Show progress bar (default: true)
 * @param {boolean} showRefresh - Show refresh button (default: false)
 * @param {function} onRefresh - Refresh callback
 * @param {boolean} refreshing - Is refreshing
 * @param {ReactNode} actions - Additional actions to show on right
 * 
 * @example
 * <TermBanner showRefresh onRefresh={handleRefresh} refreshing={loading} />
 */
export const TermBanner = ({ 
  showProgress = true, 
  showRefresh = false,
  onRefresh,
  refreshing = false,
  actions,
  className = ''
}) => {
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  if (!theme.hasActiveTerm) {
    return null;
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl p-5 text-white ${className}`}
      style={theme.gradientStyle}
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

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <TermIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {theme.name} Term {theme.activeTerm.academic_year}
              </h2>
              <p className="text-white/80 text-sm mt-0.5">
                {new Date(theme.activeTerm.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                {' – '}
                {new Date(theme.activeTerm.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold">{theme.daysRemaining}</p>
              <p className="text-white/70 text-xs">days remaining</p>
            </div>
            
            {showRefresh && onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              </button>
            )}
            
            {actions}
          </div>
        </div>

        {showProgress && (
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div 
                className="bg-white h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${theme.progress}%` }}
              />
            </div>
            <p className="text-white/60 text-xs mt-1.5">
              {Math.round(theme.progress)}% complete
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// TERM PILL - Small inline term indicator
// ════════════════════════════════════════════════════════════════════════════

/**
 * TermPill - Small pill showing current term
 * 
 * @example
 * <TermPill />
 * // Renders: [❄️ Winter Term]
 */
export const TermPill = ({ className = '' }) => {
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  if (!theme.hasActiveTerm) {
    return null;
  }

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${className}`}
      style={theme.bgMediumStyle}
    >
      <TermIcon size={14} style={theme.textStyle} />
      <span className="text-xs font-medium" style={theme.textStyle}>
        {theme.name} Term
      </span>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// TERM FOOTER - Bottom strip with term info
// ════════════════════════════════════════════════════════════════════════════

/**
 * TermFooter - Footer strip showing term status
 * 
 * @example
 * <TermFooter />
 */
export const TermFooter = ({ className = '' }) => {
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  if (!theme.hasActiveTerm) {
    return null;
  }

  return (
    <div 
      className={`rounded-xl px-4 py-3 flex items-center justify-between ${className}`}
      style={{ 
        backgroundColor: theme.withAlpha(0.1),
        borderWidth: '1px',
        borderColor: theme.withAlpha(0.2)
      }}
    >
      <div className="flex items-center gap-2">
        <TermIcon size={14} style={theme.textStyle} />
        <span className="text-xs font-semibold" style={theme.textStyle}>
          {theme.name} Term {theme.activeTerm.academic_year}
        </span>
      </div>
      <span className="text-[10px] font-medium" style={theme.textStyle}>
        {theme.daysRemaining} days left
      </span>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// PAGE HEADER - Header with term-colored icon
// ════════════════════════════════════════════════════════════════════════════

/**
 * PageHeader - Page header with term-colored icon and gradient
 * 
 * @param {ReactNode} icon - Lucide icon component
 * @param {string} title - Page title
 * @param {string} subtitle - Page subtitle
 * @param {ReactNode} actions - Action buttons
 * 
 * @example
 * <PageHeader 
 *   icon={<Calendar />}
 *   title="Calendar"
 *   subtitle="Schedule tests & view events"
 *   actions={<Button>Add Test</Button>}
 * />
 */
export const PageHeader = ({
  icon,
  title,
  subtitle,
  actions,
  className = ''
}) => {
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl p-6 md:p-8 text-white ${className}`}
      style={theme.gradientStyle}
    >
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24" />

      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              {icon || <TermIcon size={24} />}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
              {subtitle && (
                <p className="text-white/80 text-sm">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {theme.hasActiveTerm && (
              <div className="hidden sm:flex bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg items-center gap-1.5">
                <TermIcon size={14} />
                <span className="text-xs font-medium">{theme.name} Term</span>
              </div>
            )}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// NO TERM WARNING
// ════════════════════════════════════════════════════════════════════════════

/**
 * NoTermWarning - Warning when no active term configured
 */
export const NoTermWarning = ({ className = '' }) => {
  const theme = useTermTheme();

  if (theme.hasActiveTerm) {
    return null;
  }

  return (
    <div 
      className={`rounded-2xl p-5 flex items-center gap-4 ${className}`}
      style={{ backgroundColor: '#fef3c7', border: '2px solid #fcd34d' }}
    >
      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <Calendar size={24} className="text-amber-600" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-amber-900">No Active Term Configured</p>
        <p className="text-sm text-amber-700">
          Go to Settings → Academic Terms to set up the current term.
        </p>
      </div>
      <a 
        href="/settings" 
        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors"
      >
        Configure
      </a>
    </div>
  );
};

export default TermBanner;