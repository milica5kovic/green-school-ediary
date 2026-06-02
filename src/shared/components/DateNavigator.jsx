import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../core/context/AppContext';
import useTermTheme from '../hooks/useTermTheme';

// ============================================================================
// DATE NAVIGATOR — compact, theme-aware, with term strip and "Today" jump
// ============================================================================

const DateNavigator = () => {
  const { selectedDate, setSelectedDate } = useApp();
  const theme = useTermTheme();

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  };

  const sel        = new Date(selectedDate);
  const todayDate  = new Date();
  const isToday    = sel.toDateString() === todayDate.toDateString();
  const dayName    = sel.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr    = sel.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div
      className="bg-white rounded-2xl border overflow-hidden"
      style={{ borderColor: theme.withAlpha(0.18) }}
    >
      {/* ── Date row ── */}
      <div className="flex items-center px-2 py-3 gap-1">
        <button
          onClick={() => changeDate(-1)}
          className="p-2.5 rounded-xl hover:bg-gray-50 text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
          aria-label="Previous day"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-base font-bold text-gray-900">{dayName}</span>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all hover:opacity-80"
                style={{ backgroundColor: theme.withAlpha(0.12), color: theme.color }}
              >
                → Today
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{dateStr}</p>
        </div>

        <button
          onClick={() => changeDate(1)}
          className="p-2.5 rounded-xl hover:bg-gray-50 text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
          aria-label="Next day"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Term strip ── */}
      {theme.hasActiveTerm && (
        <div
          className="flex items-center justify-between px-5 py-2 border-t"
          style={{
            borderColor: theme.withAlpha(0.1),
            backgroundColor: theme.withAlpha(0.04),
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: theme.color }}
            />
            <span className="text-xs font-semibold" style={{ color: theme.color }}>
              {theme.name} Term
            </span>
            <span className="text-xs text-gray-400">
              {new Date(theme.activeTerm.start_date + 'T00:00:00')
                .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(theme.activeTerm.end_date + 'T00:00:00')
                .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <span className="text-xs font-bold tabular-nums" style={{ color: theme.color }}>
            {theme.daysRemaining}d left
          </span>
        </div>
      )}
    </div>
  );
};

export default DateNavigator;
