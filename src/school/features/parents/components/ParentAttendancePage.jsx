import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown, CheckCircle, XCircle, Clock, AlertCircle,
  Flame, MessageSquare, Users, BarChart3, Filter, AlertTriangle
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';

const STATUS = {
  present:  { label: 'Present',  Icon: CheckCircle, color: '#10b981' },
  late:     { label: 'Late',     Icon: Clock,       color: '#f59e0b' },
  absent:   { label: 'Absent',   Icon: XCircle,     color: '#ef4444' },
  sent_out: { label: 'Sent Out', Icon: AlertCircle, color: '#a855f7' },
};

const CARD = '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)';

// ─── circular gauge ───────────────────────────────────────────────────────────

const Gauge = ({ rate, color }) => {
  const R = 54, C = 2 * Math.PI * R;
  const offset = C * (1 - Math.min(rate, 100) / 100);
  return (
    <svg width="144" height="144" className="transform -rotate-90">
      <circle cx="72" cy="72" r={R} fill="none" stroke="#f1f5f9" strokeWidth="12" />
      <circle cx="72" cy="72" r={R} fill="none" stroke={color} strokeWidth="12"
        strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset .9s ease' }} />
    </svg>
  );
};

const todayKey = () => new Date().toISOString().split('T')[0];

const ParentAttendancePage = () => {
  const { supabase } = useApp();
  const theme = useTermTheme();
  const TermIcon = theme.icon;
  const { children, selectedChild, setSelectedChild, loading } = useParentChildrenCtx();

  const [records, setRecords] = useState([]);
  const [filter,  setFilter]  = useState('all');
  const [scope,   setScope]   = useState('term');

  const load = useCallback(async () => {
    if (!supabase || !selectedChild) return;
    try {
      const { data } = await supabase.from('attendance').select('*')
        .eq('student_id', selectedChild.id).order('date_key', { ascending: false });
      setRecords(data || []);
    } catch (e) { console.error('Error loading attendance:', e.message); }
  }, [supabase, selectedChild]);

  useEffect(() => { if (selectedChild) load(); }, [selectedChild, load]);

  const scoped = useMemo(() => {
    if (scope === 'term' && theme.activeTerm) {
      return records.filter(r => r.date_key >= theme.activeTerm.start_date && r.date_key <= theme.activeTerm.end_date);
    }
    return records;
  }, [records, scope, theme.activeTerm]);

  const stats = useMemo(() => {
    const total   = scoped.length;
    const present = scoped.filter(a => a.status === 'present').length;
    const late    = scoped.filter(a => a.status === 'late').length;
    const absent  = scoped.filter(a => a.status === 'absent').length;
    const sentOut = scoped.filter(a => a.status === 'sent_out').length;
    const rate    = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, late, absent, sentOut, rate };
  }, [scoped]);

  const streak = useMemo(() => {
    const sorted = [...records].sort((a,b) => b.date_key.localeCompare(a.date_key));
    let n = 0;
    for (const r of sorted) { if (r.status === 'present') n++; else break; }
    return n;
  }, [records]);

  const weeklyGrid = useMemo(() => {
    const map = {};
    scoped.forEach(a => { map[a.date_key] = a.status; });
    const today = new Date();
    const dow = today.getDay();
    const offset = dow === 0 ? 6 : dow - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - offset);
    return Array.from({ length: 10 }, (_, w) => {
      const mon = new Date(monday);
      mon.setDate(monday.getDate() - (9 - w) * 7);
      return {
        label: mon.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        days: Array.from({ length: 5 }, (_, d) => {
          const day = new Date(mon); day.setDate(mon.getDate() + d);
          const key = day.toISOString().split('T')[0];
          return { date: day, key, status: map[key] || null };
        }),
      };
    });
  }, [scoped]);

  const grouped = useMemo(() => {
    const list = filter === 'all' ? scoped : scoped.filter(a => a.status === filter);
    const grp = {};
    list.forEach(r => {
      const lbl = new Date(r.date_key+'T00:00:00').toLocaleDateString('en-GB', { month:'long', year:'numeric' });
      if (!grp[lbl]) grp[lbl] = [];
      grp[lbl].push(r);
    });
    return Object.entries(grp);
  }, [scoped, filter]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 rounded-full animate-spin"
        style={{ borderColor: theme.withAlpha(.2), borderTopColor: 'transparent' }} />
    </div>
  );

  if (!children.length) return (
    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center" style={{ boxShadow: CARD }}>
      <Users size={40} className="mx-auto text-slate-200 mb-4" />
      <p className="text-slate-700 font-semibold">No student data available</p>
      <p className="text-slate-400 text-sm mt-1">Please contact the school administration.</p>
    </div>
  );

  const today = todayKey();
  const gaugeColor = stats.rate >= 90 ? '#10b981' : stats.rate >= 80 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
        style={{ ...theme.gradientStyle, boxShadow: '0 4px 24px rgba(15,23,42,.14), 0 1px 4px rgba(15,23,42,.06)' }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/[.06] pointer-events-none" />
        <div className="absolute -bottom-20 -left-12 w-56 h-56 rounded-full bg-black/[.04] pointer-events-none" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-white/60 text-xs font-medium mb-1">Parent Portal</p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Attendance</h1>
            <p className="text-white/75 text-sm mt-1">{selectedChild?.name} · Class {selectedChild?.class_name}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {theme.hasActiveTerm && (
              <div className="hidden sm:flex bg-white/[.12] backdrop-blur-sm border border-white/[.15] px-3 py-1.5 rounded-xl items-center gap-1.5">
                <TermIcon size={13} className="opacity-80" />
                <span className="text-xs font-medium opacity-90">{theme.name} Term</span>
              </div>
            )}
            {children.length > 1 && (
              <div className="relative">
                <select value={selectedChild?.id || ''}
                  onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}
                  className="appearance-none bg-white/[.12] backdrop-blur-sm border border-white/[.2] rounded-xl px-3 py-2 pr-8 text-xs font-medium text-white focus:outline-none cursor-pointer">
                  {children.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SCOPE TOGGLE */}
      {theme.hasActiveTerm && (
        <div className="flex gap-2">
          {[{ key:'term', label:`${theme.name} Term` }, { key:'all', label:'All Time' }].map(opt => (
            <button key={opt.key} onClick={() => setScope(opt.key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={scope === opt.key
                ? { backgroundColor: theme.color, color: 'white', boxShadow: `0 2px 8px ${theme.color}40` }
                : { backgroundColor: 'white', border: '1px solid #e2e8f0', color: '#475569' }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* GAUGE + STAT CARDS */}
      <div className="grid md:grid-cols-5 gap-4">
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 flex flex-col items-center justify-center gap-4" style={{ boxShadow: CARD }}>
          <div className="relative">
            <Gauge rate={stats.rate} color={gaugeColor} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tracking-tight" style={{ color: gaugeColor }}>{stats.rate}%</span>
              <span className="text-xs text-slate-400 font-medium mt-0.5">attendance</span>
            </div>
          </div>
          {stats.rate < 85 && stats.total > 0 && (
            <div className="w-full px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2.5">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-red-700">Below 85% threshold</p>
            </div>
          )}
          {streak >= 3 && (
            <div className="w-full px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2.5">
              <Flame size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-amber-700">{streak} days present in a row 🔥</p>
            </div>
          )}
          <p className="text-xs text-slate-400">{stats.total} sessions recorded</p>
        </div>

        <div className="md:col-span-3 grid grid-cols-2 gap-3">
          {[
            { key:'present',  val: stats.present  },
            { key:'late',     val: stats.late      },
            { key:'absent',   val: stats.absent    },
            { key:'sent_out', val: stats.sentOut   },
          ].map(({ key, val }) => {
            const { label, Icon, color } = STATUS[key];
            const pct = stats.total > 0 ? Math.round((val / stats.total) * 100) : 0;
            return (
              <div key={key} className="rounded-2xl border p-5"
                style={{ backgroundColor: color+'0d', borderColor: color+'20' }}>
                <div className="flex items-center justify-between mb-3">
                  <Icon size={16} style={{ color }} />
                  <span className="text-[10px] font-semibold text-slate-400">{pct}%</span>
                </div>
                <p className="text-3xl font-bold tracking-tight" style={{ color }}>{val}</p>
                <p className="text-xs font-semibold mt-1" style={{ color: color+'cc' }}>{label}</p>
                <div className="mt-3 h-1 rounded-full" style={{ backgroundColor: color+'20' }}>
                  <div className="h-1 rounded-full transition-all" style={{ width:`${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WEEKLY HEATMAP */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">Last 10 weeks</p>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-14 flex-shrink-0" />
          <div className="flex-1 grid grid-cols-5 gap-1.5">
            {['Mon','Tue','Wed','Thu','Fri'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-400">{d}</div>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          {weeklyGrid.map((week, wi) => (
            <div key={wi} className="flex items-center gap-2">
              <div className="w-14 flex-shrink-0 text-[10px] text-slate-400 font-medium text-right pr-1">{week.label}</div>
              <div className="flex-1 grid grid-cols-5 gap-1.5">
                {week.days.map((day, di) => {
                  const isT    = day.key === today;
                  const future = day.key > today;
                  const cfg    = day.status ? STATUS[day.status] : null;
                  return (
                    <div key={di}
                      title={cfg ? `${day.date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}: ${cfg.label}` : ''}
                      className={`aspect-square rounded-lg flex items-center justify-center transition-all
                        ${future ? 'bg-slate-50 border border-dashed border-slate-200' : !cfg ? 'bg-slate-100' : ''}`}
                      style={cfg
                        ? { backgroundColor: cfg.color+'18', border:`1.5px solid ${cfg.color}35` }
                        : isT ? { border:`1.5px solid ${theme.color}`, backgroundColor: theme.withAlpha(.06) }
                        : {}}>
                      {cfg && <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: cfg.color }} />}
                      {isT && !cfg && <div className="w-2 h-2 rounded-full border-2" style={{ borderColor: theme.color }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-5 mt-5 pt-4 border-t border-slate-50">
          {Object.entries(STATUS).map(([k, { label, color }]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-slate-400">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-[10px] text-slate-400">No record</span>
          </div>
        </div>
      </div>

      {/* HISTORY */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD }}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Attendance history</p>
          <div className="flex gap-1.5 flex-wrap">
            {[{k:'all',l:'All'},{k:'late',l:'Late'},{k:'absent',l:'Absent'},{k:'sent_out',l:'Sent Out'}].map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                style={filter===f.k
                  ? { backgroundColor: theme.color, color:'white' }
                  : { backgroundColor:'#f1f5f9', color:'#64748b' }}>
                {f.l}
              </button>
            ))}
          </div>
        </div>
        {grouped.length === 0
          ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
              <CheckCircle size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400 font-medium">
                {filter === 'all' ? 'No attendance records yet' : `No ${STATUS[filter]?.label.toLowerCase()} records`}
              </p>
            </div>
          )
          : (
            <div className="space-y-6 max-h-[520px] overflow-y-auto">
              {grouped.map(([month, rows]) => (
                <div key={month}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">{month}</p>
                  <div className="space-y-1.5">
                    {rows.map(rec => {
                      const cfg  = STATUS[rec.status] || STATUS.present;
                      const Icon = cfg.Icon;
                      const d    = new Date(rec.date_key+'T00:00:00');
                      return (
                        <div key={rec.id}
                          className="flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm"
                          style={{ backgroundColor: cfg.color+'0a', borderColor: cfg.color+'20' }}>
                          <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: cfg.color+'18' }}>
                            <span className="text-[9px] font-bold uppercase leading-none" style={{ color: cfg.color }}>
                              {d.toLocaleDateString('en-GB',{weekday:'short'})}
                            </span>
                            <span className="text-lg font-bold leading-snug" style={{ color: cfg.color }}>{d.getDate()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Icon size={12} style={{ color: cfg.color }} />
                              <span className="text-sm font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                              <span className="text-xs text-slate-400">
                                {d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
                              </span>
                            </div>
                            {rec.comment && (
                              <div className="flex items-start gap-1.5 mt-1">
                                <MessageSquare size={10} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-slate-500 italic">{rec.comment}</p>
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
          )
        }
      </div>

      {/* TERM FOOTER */}
      {theme.hasActiveTerm && (
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: theme.withAlpha(.08), border:`1px solid ${theme.withAlpha(.15)}` }}>
          <div className="flex items-center gap-2">
            <TermIcon size={13} style={theme.textStyle} />
            <span className="text-xs font-semibold" style={theme.textStyle}>{theme.name} Term {theme.activeTerm?.academic_year}</span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              {new Date(theme.activeTerm?.start_date+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
              {' – '}
              {new Date(theme.activeTerm?.end_date+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1 rounded-full hidden sm:block" style={{ backgroundColor: theme.withAlpha(.15) }}>
              <div className="h-1 rounded-full" style={{ width:`${theme.progress}%`, backgroundColor: theme.color }} />
            </div>
            <span className="text-[10px] font-semibold" style={theme.textStyle}>{theme.daysRemaining}d left</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentAttendancePage;
