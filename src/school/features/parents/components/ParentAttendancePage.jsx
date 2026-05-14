import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, UserCheck
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import useParentChildren from '../../../../shared/hooks/useParentChildren';

// ════════════════════════════════════════════════════════════════════════════
// PARENT ATTENDANCE PAGE - Uses useTermTheme for dynamic colors
// ════════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  present: { color: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Present', icon: CheckCircle },
  late: { color: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Late', icon: Clock },
  absent: { color: 'bg-red-500', light: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Absent', icon: XCircle },
  sent_out: { color: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Sent Out', icon: AlertCircle },
};

const ParentAttendancePage = () => {
  const { supabase } = useApp();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  const { children, selectedChild, setSelectedChild, loading } = useParentChildren();
  const [attendance, setAttendance] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, sentOut: 0, rate: 0 });
  const [termStats, setTermStats] = useState(null);

  // ─── Load attendance ──────────────────────────────────
  const loadAttendance = useCallback(async () => {
    if (!supabase || !selectedChild) return;
    try {
      const { data } = await supabase.from('attendance').select('*')
        .eq('student_id', selectedChild.id).order('date_key', { ascending: true });
      setAttendance(data || []);

      // Total stats
      const total = data?.length || 0;
      const present = data?.filter(a => a.status === 'present').length || 0;
      const absent = data?.filter(a => a.status === 'absent').length || 0;
      const late = data?.filter(a => a.status === 'late').length || 0;
      const sentOut = data?.filter(a => a.status === 'sent_out').length || 0;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      setStats({ total, present, absent, late, sentOut, rate });

      // Term-specific stats
      if (theme.activeTerm) {
        const termData = (data || []).filter(a => a.date_key >= theme.activeTerm.start_date && a.date_key <= theme.activeTerm.end_date);
        const tTotal = termData.length;
        const tPresent = termData.filter(a => a.status === 'present').length;
        const tAbsent = termData.filter(a => a.status === 'absent').length;
        const tLate = termData.filter(a => a.status === 'late').length;
        const tSentOut = termData.filter(a => a.status === 'sent_out').length;
        const tRate = tTotal > 0 ? Math.round((tPresent / tTotal) * 100) : 0;
        setTermStats({ total: tTotal, present: tPresent, absent: tAbsent, late: tLate, sentOut: tSentOut, rate: tRate });
      }
    } catch (err) { console.error(err); }
  }, [supabase, selectedChild, theme.activeTerm]);

  useEffect(() => { if (selectedChild) loadAttendance(); }, [selectedChild, loadAttendance]);

  // ─── Calendar helpers ─────────────────────────────────
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    let startPadding = firstDay.getDay() - 1;
    if (startPadding === -1) startPadding = 6;
    for (let i = 0; i < startPadding; i++) days.push(null);
    for (let day = 1; day <= lastDay.getDate(); day++) days.push(new Date(year, month, day));
    return days;
  };

  const getAttForDate = (date) => {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return attendance.find(a => a.date_key === `${y}-${m}-${d}`);
  };

  const isToday = (date) => {
    if (!date) return false;
    const t = new Date();
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
  };

  const isWeekend = (date) => {
    if (!date) return false;
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  // ─── Loading / Empty ──────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 rounded-full animate-spin"
          style={{ borderColor: theme.withAlpha(0.3), borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
        <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600 text-lg font-medium">No student data available</p>
        <p className="text-gray-400 text-sm mt-2">Please contact the school administration.</p>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const displayStats = termStats || stats;

  return (
    <div className="space-y-6">

      {/* ═══ HEADER - Dynamic Gradient ═══════════════════════ */}
      <div className="rounded-2xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden"
        style={theme.gradientStyle}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
                <CalendarIcon size={24} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Attendance</h1>
                <p className="text-white/70 text-sm">Daily attendance records & statistics</p>
              </div>
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
                    {children.map(c => <option key={c.id} value={c.id} className="text-gray-900">{c.name} — {c.class_name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" size={14} />
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Total Days', value: displayStats.total, icon: CalendarIcon },
              { label: 'Present', value: displayStats.present, icon: CheckCircle },
              { label: 'Late', value: displayStats.late, icon: Clock },
              { label: 'Absent', value: displayStats.absent, icon: XCircle },
              { label: 'Sent Out', value: displayStats.sentOut, icon: AlertCircle },
              { label: 'Rate', value: `${displayStats.rate}%`, icon: TrendingUp },
            ].map((s, i) => (
              <div key={i} className="bg-white/15 backdrop-blur rounded-xl p-3 border border-white/20">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white/70 text-[10px] font-medium">{s.label}</p>
                  <s.icon size={12} className="text-white/50" />
                </div>
                <p className="text-2xl md:text-3xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CALENDAR + SIDEBAR ══════════════════════════ */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon size={20} style={theme.textStyle} />
              {monthName}
            </h3>
            <div className="flex gap-1.5">
              <button onClick={prevMonth} className="p-2 rounded-xl transition-colors"
                style={{ backgroundColor: theme.withAlpha(0.1) }}>
                <ChevronLeft size={18} style={theme.textStyle} />
              </button>
              <button onClick={nextMonth} className="p-2 rounded-xl transition-colors"
                style={{ backgroundColor: theme.withAlpha(0.1) }}>
                <ChevronRight size={18} style={theme.textStyle} />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-gray-500 py-1">{day}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {daysInMonth.map((date, idx) => {
              if (!date) return <div key={'e-' + idx} className="aspect-square" />;

              const record = getAttForDate(date);
              const today = isToday(date);
              const weekend = isWeekend(date);
              const cfg = record ? STATUS_CONFIG[record.status] : null;

              return (
                <div key={idx} className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative group transition-all
                  ${weekend ? 'border-gray-100 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}
                `} style={today ? { borderColor: theme.color, backgroundColor: theme.withAlpha(0.05) } : {}}>
                  <span className={`text-sm font-semibold ${weekend ? 'text-gray-400' : 'text-gray-700'}`}
                    style={today ? theme.textStyle : {}}>
                    {date.getDate()}
                  </span>
                  {record && (
                    <div className={`w-2.5 h-2.5 rounded-full mt-0.5 ${cfg.color}`} />
                  )}

                  {/* Tooltip */}
                  {record && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 pointer-events-none">
                      <div className="bg-gray-900 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                        <span className="font-semibold">{cfg.label}</span>
                        {record.comment && <p className="text-gray-300 mt-0.5 max-w-[160px] whitespace-normal">{record.comment}</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-5 pt-4 border-t border-gray-100">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                <span className="text-xs text-gray-600">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Term Summary */}
          {theme.hasActiveTerm && termStats && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                <UserCheck size={16} style={theme.textStyle} />
                {theme.name} Term Summary
              </h3>
              <div className={`p-4 rounded-xl border mb-3 ${
                termStats.rate >= 90 ? 'bg-emerald-50 border-emerald-200' : termStats.rate >= 80 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
              }`}>
                <p className="text-xs text-gray-500 mb-0.5">Present Rate</p>
                <p className={`text-3xl font-bold ${
                  termStats.rate >= 90 ? 'text-emerald-600' : termStats.rate >= 80 ? 'text-amber-600' : 'text-red-600'
                }`}>{termStats.rate}%</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { ...STATUS_CONFIG.present, val: termStats.present },
                  { ...STATUS_CONFIG.late, val: termStats.late },
                  { ...STATUS_CONFIG.absent, val: termStats.absent },
                  { ...STATUS_CONFIG.sent_out, val: termStats.sentOut },
                ].map((s, i) => (
                  <div key={i} className={`${s.light} border ${s.border} rounded-xl p-3 text-center`}>
                    <p className={`text-xl font-bold ${s.text}`}>{s.val}</p>
                    <p className={`text-[10px] ${s.text} font-medium mt-0.5`}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Records */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
              <Clock size={16} style={theme.textStyle} />
              Recent Records
            </h3>

            {attendance.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400">No records yet</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {[...attendance].reverse().slice(0, 15).map((record) => {
                  const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.present;
                  const RecIcon = cfg.icon;
                  return (
                    <div key={record.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${cfg.light} ${cfg.border}`}>
                      <RecIcon size={14} className={cfg.text} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800">
                          {new Date(record.date_key + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        {record.comment && <p className="text-[10px] text-gray-500 truncate">{record.comment}</p>}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.light} ${cfg.text}`}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ TERM FOOTER ═════════════════════════════════ */}
      {theme.hasActiveTerm && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} style={theme.textStyle} />
            <span className="text-xs font-semibold" style={theme.textStyle}>{theme.name} Term {theme.activeTerm.academic_year}</span>
            <span className="text-[10px] text-gray-500 hidden sm:inline">
              {new Date(theme.activeTerm.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(theme.activeTerm.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 rounded-full h-1.5 hidden sm:block" style={{ backgroundColor: theme.withAlpha(0.2) }}>
              <div className="h-1.5 rounded-full" style={{ width: `${theme.progress}%`, backgroundColor: theme.color }} />
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