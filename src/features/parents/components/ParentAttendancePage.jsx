import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle, XCircle, Clock, AlertCircle, TrendingUp,
  Snowflake, Flower2, Sun, UserCheck
} from 'lucide-react';
import { useApp } from '../../../core/context/AppContext';
import useActiveTerm from '../../../shared/hooks/useActiveTerm';

const TERM_CONFIG = {
  1: { name: 'Winter', icon: Snowflake, gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  2: { name: 'Spring', icon: Flower2, gradient: 'from-pink-500 to-rose-600', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  3: { name: 'Summer', icon: Sun, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

const STATUS_CONFIG = {
  present: { color: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Present', icon: CheckCircle },
  late: { color: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Late', icon: Clock },
  absent: { color: 'bg-red-500', light: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Absent', icon: XCircle },
  sent_out: { color: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Sent Out', icon: AlertCircle },
};

const ParentAttendancePage = () => {
  const { supabase } = useApp();
  const { activeTerm } = useActiveTerm();

  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, sentOut: 0, rate: 0 });
  const [termStats, setTermStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const termConfig = activeTerm ? TERM_CONFIG[activeTerm.term_number] : null;
  const TermIcon = termConfig?.icon || CalendarIcon;

  // ─── Load children ────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (!supabase) return;
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: parent } = await supabase.from('parents').select('id').eq('user_id', user.id).single();
        if (!parent) return;
        const { data: links } = await supabase.from('student_parents').select('students(*)').eq('parent_id', parent.id);
        const list = links?.map(l => l.students).filter(Boolean) || [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0]);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [supabase]);

  // ─── Load attendance ──────────────────────────────────
  const loadAttendance = useCallback(async () => {
    if (!supabase || !selectedChild) return;
    try {
      // ALL attendance for calendar display
      const { data } = await supabase.from('attendance').select('*')
        .eq('student_id', selectedChild.id).order('date_key', { ascending: true });
      setAttendance(data || []);

      // Total stats (all time)
      const total = data?.length || 0;
      const present = data?.filter(a => a.status === 'present').length || 0;
      const absent = data?.filter(a => a.status === 'absent').length || 0;
      const late = data?.filter(a => a.status === 'late').length || 0;
      const sentOut = data?.filter(a => a.status === 'sent_out').length || 0;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      setStats({ total, present, absent, late, sentOut, rate });

      // Term-specific stats
      if (activeTerm) {
        const termData = (data || []).filter(a => a.date_key >= activeTerm.start_date && a.date_key <= activeTerm.end_date);
        const tTotal = termData.length;
        const tPresent = termData.filter(a => a.status === 'present').length;
        const tAbsent = termData.filter(a => a.status === 'absent').length;
        const tLate = termData.filter(a => a.status === 'late').length;
        const tSentOut = termData.filter(a => a.status === 'sent_out').length;
        const tRate = tTotal > 0 ? Math.round((tPresent / tTotal) * 100) : 0;
        setTermStats({ total: tTotal, present: tPresent, absent: tAbsent, late: tLate, sentOut: tSentOut, rate: tRate });
      }
    } catch (err) { console.error(err); }
  }, [supabase, selectedChild, activeTerm]);

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
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
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

      {/* ═══ HEADER ═══════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden">
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
                <p className="text-emerald-100 text-sm">Daily attendance records & statistics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeTerm && termConfig && (
                <div className="hidden sm:flex bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg items-center gap-1.5">
                  <TermIcon size={14} />
                  <span className="text-xs font-medium">{termConfig.name} Term</span>
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

          {/* Stats row inside header */}
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
                  <p className="text-emerald-100 text-[10px] font-medium">{s.label}</p>
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
              <CalendarIcon size={20} className="text-emerald-600" />
              {monthName}
            </h3>
            <div className="flex gap-1.5">
              <button onClick={prevMonth} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              <button onClick={nextMonth} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                <ChevronRight size={18} className="text-gray-600" />
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
                  ${today ? 'border-emerald-400 bg-emerald-50 shadow-sm' : weekend ? 'border-gray-100 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}
                `}>
                  <span className={`text-sm font-semibold ${today ? 'text-emerald-600' : weekend ? 'text-gray-400' : 'text-gray-700'}`}>
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
          {activeTerm && termStats && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                <UserCheck size={16} className="text-emerald-600" />
                {termConfig?.name} Term Summary
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
              <Clock size={16} className="text-blue-600" />
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
      {activeTerm && termConfig && (
        <div className={`${termConfig.bg} border ${termConfig.border} rounded-xl px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} className={termConfig.text} />
            <span className={`text-xs font-semibold ${termConfig.text}`}>{termConfig.name} Term {activeTerm.academic_year}</span>
            <span className="text-[10px] text-gray-500 hidden sm:inline">
              {new Date(activeTerm.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(activeTerm.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <span className={`text-[10px] font-medium ${termConfig.text}`}>
            {Math.max(0, Math.ceil((new Date(activeTerm.end_date + 'T00:00:00') - new Date()) / 86400000))}d left
          </span>
        </div>
      )}
    </div>
  );
};

export default ParentAttendancePage;