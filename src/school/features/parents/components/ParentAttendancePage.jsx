import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown, CheckCircle, XCircle, Clock, AlertCircle,
  Flame, MessageSquare, Users, BarChart3, Filter, TrendingUp, AlertTriangle
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import useParentChildren from '../../../../shared/hooks/useParentChildren';

// ════════════════════════════════════════════════════════════════════════════
// PARENT ATTENDANCE PAGE — no calendar, heatmap + gauge + history list
// ════════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  present:  { label: 'Present',  icon: CheckCircle,  color: '#10b981' },
  late:     { label: 'Late',     icon: Clock,        color: '#f97316' },
  absent:   { label: 'Absent',   icon: XCircle,      color: '#ef4444' },
  sent_out: { label: 'Sent Out', icon: AlertCircle,  color: '#a855f7' },
};

// ── Circular gauge ─────────────────────────────────────────────────────────
const RateGauge = ({ rate, color }) => {
  const R = 54;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - Math.min(rate, 100) / 100);
  return (
    <svg width="144" height="144" className="transform -rotate-90">
      <circle cx="72" cy="72" r={R} fill="none" stroke="#e5e7eb" strokeWidth="14" />
      <circle cx="72" cy="72" r={R} fill="none" stroke={color} strokeWidth="14"
        strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.9s ease' }} />
    </svg>
  );
};

// ── Today's date key ───────────────────────────────────────────────────────
const todayKey = () => new Date().toISOString().split('T')[0];

const ParentAttendancePage = () => {
  const { supabase } = useApp();
  const theme = useTermTheme();
  const TermIcon = theme.icon;
  const { children, selectedChild, setSelectedChild, loading } = useParentChildren();

  const [attendance, setAttendance] = useState([]);
  const [filter, setFilter]         = useState('all');   // all | present | late | absent | sent_out
  const [scope,  setScope]          = useState('term');  // term | all

  // ─── Load ─────────────────────────────────────────────────────────────
  const loadAttendance = useCallback(async () => {
    if (!supabase || !selectedChild) return;
    try {
      const { data } = await supabase
        .from('attendance').select('*')
        .eq('student_id', selectedChild.id)
        .order('date_key', { ascending: false });
      setAttendance(data || []);
    } catch (err) { console.error(err); }
  }, [supabase, selectedChild]);

  useEffect(() => { if (selectedChild) loadAttendance(); }, [selectedChild, loadAttendance]);

  // ─── Scoped data ──────────────────────────────────────────────────────
  const scoped = useMemo(() => {
    if (scope === 'term' && theme.activeTerm) {
      return attendance.filter(
        a => a.date_key >= theme.activeTerm.start_date && a.date_key <= theme.activeTerm.end_date
      );
    }
    return attendance;
  }, [attendance, scope, theme.activeTerm]);

  // ─── Stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total   = scoped.length;
    const present = scoped.filter(a => a.status === 'present').length;
    const late    = scoped.filter(a => a.status === 'late').length;
    const absent  = scoped.filter(a => a.status === 'absent').length;
    const sentOut = scoped.filter(a => a.status === 'sent_out').length;
    const rate    = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, late, absent, sentOut, rate };
  }, [scoped]);

  // ─── Streak (consecutive present days up to today, all time) ──────────
  const streak = useMemo(() => {
    const sorted = [...attendance].sort((a, b) => b.date_key.localeCompare(a.date_key));
    let count = 0;
    for (const rec of sorted) {
      if (rec.status === 'present') count++;
      else break;
    }
    return count;
  }, [attendance]);

  // ─── Weekly heatmap (last 10 weeks, Mon–Fri) ──────────────────────────
  const weeklyGrid = useMemo(() => {
    const map = {};
    scoped.forEach(a => { map[a.date_key] = a.status; });

    const today  = new Date();
    const dow    = today.getDay(); // 0=Sun … 6=Sat
    const offset = dow === 0 ? 6 : dow - 1; // days since Monday
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - offset);

    const weeks = [];
    for (let w = 9; w >= 0; w--) {
      const monday = new Date(thisMonday);
      monday.setDate(thisMonday.getDate() - w * 7);
      const days = Array.from({ length: 5 }, (_, d) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + d);
        const key = day.toISOString().split('T')[0];
        return { date: day, key, status: map[key] || null };
      });
      weeks.push({
        label: monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        days,
      });
    }
    return weeks;
  }, [scoped]);

  // ─── Filtered + grouped history ───────────────────────────────────────
  const groupedHistory = useMemo(() => {
    const filtered = filter === 'all' ? scoped : scoped.filter(a => a.status === filter);
    const groups = {};
    filtered.forEach(rec => {
      const label = new Date(rec.date_key + 'T00:00:00')
        .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      if (!groups[label]) groups[label] = [];
      groups[label].push(rec);
    });
    return Object.entries(groups);
  }, [scoped, filter]);

  // ─── Render helpers ───────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 rounded-full animate-spin"
        style={{ borderColor: theme.withAlpha(0.3), borderTopColor: 'transparent' }} />
    </div>
  );

  if (children.length === 0) return (
    <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
      <Users size={48} className="mx-auto text-gray-300 mb-4" />
      <p className="text-gray-600 text-lg font-medium">No student data available</p>
      <p className="text-gray-400 text-sm mt-2">Please contact the school administration.</p>
    </div>
  );

  const today = todayKey();
  const gaugeColor =
    stats.rate >= 90 ? '#10b981' :
    stats.rate >= 80 ? '#f97316' : '#ef4444';

  return (
    <div className="space-y-5">

      {/* ═══ HEADER ══════════════════════════════════════════════════════ */}
      <div className="rounded-2xl shadow-lg p-6 text-white relative overflow-hidden"
        style={theme.gradientStyle}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Attendance</h1>
            <p className="text-white/70 text-sm mt-0.5">
              {selectedChild?.name} · Class {selectedChild?.class_name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {theme.hasActiveTerm && (
              <div className="hidden sm:flex bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg items-center gap-1.5">
                <TermIcon size={14} />
                <span className="text-xs font-medium">{theme.name} Term</span>
              </div>
            )}
            {children.length > 1 && (
              <div className="relative">
                <select value={selectedChild?.id || ''}
                  onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                  className="appearance-none bg-white/20 backdrop-blur border border-white/30 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-white focus:outline-none cursor-pointer">
                  {children.map(c => (
                    <option key={c.id} value={c.id} className="text-gray-900">{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" size={14} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ SCOPE TOGGLE ════════════════════════════════════════════════ */}
      {theme.hasActiveTerm && (
        <div className="flex gap-2">
          {[
            { key: 'term', label: `${theme.name} Term` },
            { key: 'all',  label: 'All Time' },
          ].map(opt => (
            <button key={opt.key} onClick={() => setScope(opt.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
                ${scope === opt.key
                  ? 'text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              style={scope === opt.key ? { backgroundColor: theme.color } : {}}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* ═══ GAUGE + STAT CARDS ══════════════════════════════════════════ */}
      <div className="grid md:grid-cols-5 gap-4">

        {/* Circular gauge */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <RateGauge rate={stats.rate} color={gaugeColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: gaugeColor }}>{stats.rate}%</span>
              <span className="text-xs text-gray-400 font-medium">attendance</span>
            </div>
          </div>

          {stats.rate < 85 && stats.total > 0 && (
            <div className="w-full px-3 py-2 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-700">Below 85% threshold</p>
            </div>
          )}

          {streak >= 3 && (
            <div className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
              <Flame size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-amber-700">{streak} days present in a row 🔥</p>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-1">{stats.total} total sessions recorded</p>
        </div>

        {/* 4 stat cards */}
        <div className="md:col-span-3 grid grid-cols-2 gap-3">
          {[
            { key: 'present',  val: stats.present  },
            { key: 'late',     val: stats.late      },
            { key: 'absent',   val: stats.absent    },
            { key: 'sent_out', val: stats.sentOut   },
          ].map(({ key, val }) => {
            const cfg  = STATUS_CONFIG[key];
            const Icon = cfg.icon;
            const pct  = stats.total > 0 ? Math.round((val / stats.total) * 100) : 0;
            return (
              <div key={key} className="rounded-2xl p-4 border"
                style={{ backgroundColor: cfg.color + '12', borderColor: cfg.color + '30' }}>
                <div className="flex items-center justify-between mb-2">
                  <Icon size={18} style={{ color: cfg.color }} />
                  <span className="text-[10px] font-bold" style={{ color: cfg.color, opacity: 0.7 }}>
                    {pct}%
                  </span>
                </div>
                <p className="text-3xl font-bold" style={{ color: cfg.color }}>{val}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: cfg.color, opacity: 0.8 }}>
                  {cfg.label}
                </p>
                <div className="mt-2.5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: cfg.color + '25' }}>
                  <div className="h-1.5 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ WEEKLY HEATMAP ══════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm">
          <BarChart3 size={16} style={theme.textStyle} />
          Last 10 Weeks
        </h3>

        {/* Day column headers */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-14 flex-shrink-0" />
          <div className="flex-1 grid grid-cols-5 gap-1.5">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400">{d}</div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          {weeklyGrid.map((week, wi) => (
            <div key={wi} className="flex items-center gap-2">
              <div className="w-14 flex-shrink-0 text-[10px] text-gray-400 font-medium text-right pr-1">
                {week.label}
              </div>
              <div className="flex-1 grid grid-cols-5 gap-1.5">
                {week.days.map((day, di) => {
                  const isToday  = day.key === today;
                  const isFuture = day.key > today;
                  const cfg      = day.status ? STATUS_CONFIG[day.status] : null;

                  return (
                    <div key={di}
                      title={cfg ? `${day.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}: ${cfg.label}` : ''}
                      className={`aspect-square rounded-lg flex items-center justify-center transition-all
                        ${isFuture ? 'bg-gray-50 border border-dashed border-gray-200' : !cfg ? 'bg-gray-100' : ''}`}
                      style={cfg ? {
                        backgroundColor: cfg.color + '22',
                        border: `1.5px solid ${cfg.color}50`
                      } : isToday ? {
                        border: `1.5px solid ${theme.color}`,
                        backgroundColor: theme.withAlpha(0.06)
                      } : {}}>
                      {cfg && (
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm"
                          style={{ backgroundColor: cfg.color }} />
                      )}
                      {isToday && !cfg && (
                        <div className="w-2 h-2 rounded-full border-2"
                          style={{ borderColor: theme.color }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-[10px] text-gray-500">{cfg.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
            <span className="text-[10px] text-gray-400">No record</span>
          </div>
        </div>
      </div>

      {/* ═══ HISTORY LIST ════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
            <Filter size={15} style={theme.textStyle} />
            Attendance History
          </h3>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: 'all',      label: 'All'      },
              { key: 'late',     label: 'Late'     },
              { key: 'absent',   label: 'Absent'   },
              { key: 'sent_out', label: 'Sent Out' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all
                  ${filter === f.key ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={filter === f.key ? { backgroundColor: theme.color } : {}}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {groupedHistory.length === 0 ? (
          <div className="text-center py-14 bg-gray-50 rounded-2xl">
            <CheckCircle size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">
              {filter === 'all' ? 'No attendance records yet' : `No ${STATUS_CONFIG[filter]?.label.toLowerCase()} records`}
            </p>
            <p className="text-gray-400 text-xs mt-1">Records appear once teachers mark attendance</p>
          </div>
        ) : (
          <div className="space-y-6 max-h-[520px] overflow-y-auto pr-0.5">
            {groupedHistory.map(([monthLabel, records]) => (
              <div key={monthLabel}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  {monthLabel}
                </p>
                <div className="space-y-1.5">
                  {records.map(rec => {
                    const cfg  = STATUS_CONFIG[rec.status] || STATUS_CONFIG.present;
                    const Icon = cfg.icon;
                    const d    = new Date(rec.date_key + 'T00:00:00');
                    return (
                      <div key={rec.id}
                        className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm"
                        style={{ backgroundColor: cfg.color + '0d', borderColor: cfg.color + '30' }}>
                        {/* Date badge */}
                        <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: cfg.color + '18' }}>
                          <span className="text-[9px] font-bold uppercase leading-none"
                            style={{ color: cfg.color }}>
                            {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                          </span>
                          <span className="text-lg font-bold leading-tight"
                            style={{ color: cfg.color }}>
                            {d.getDate()}
                          </span>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Icon size={12} style={{ color: cfg.color }} />
                              <span className="text-sm font-bold" style={{ color: cfg.color }}>
                                {cfg.label}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          {rec.comment && (
                            <div className="flex items-start gap-1.5 mt-1">
                              <MessageSquare size={10} className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-gray-600 italic leading-relaxed">{rec.comment}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ TERM FOOTER ═════════════════════════════════════════════════ */}
      {theme.hasActiveTerm && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} style={theme.textStyle} />
            <span className="text-xs font-semibold" style={theme.textStyle}>
              {theme.name} Term {theme.activeTerm?.academic_year}
            </span>
            <span className="text-[10px] text-gray-500 hidden sm:inline">
              {new Date(theme.activeTerm?.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(theme.activeTerm?.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 rounded-full h-1.5 hidden sm:block"
              style={{ backgroundColor: theme.withAlpha(0.2) }}>
              <div className="h-1.5 rounded-full"
                style={{ width: `${theme.progress}%`, backgroundColor: theme.color }} />
            </div>
            <span className="text-[10px] font-medium" style={theme.textStyle}>
              {theme.daysRemaining}d left
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentAttendancePage;
