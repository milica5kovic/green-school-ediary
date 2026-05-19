import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown,
  FileText, Award, X
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';

// ════════════════════════════════════════════════════════════════════════════
// PARENT CALENDAR PAGE - Uses useTermTheme for dynamic colors
// ════════════════════════════════════════════════════════════════════════════

const EVENT_COLORS = {
  holiday: { bg: 'bg-gray-200', text: 'text-gray-700', dot: 'bg-gray-500' },
  break: { bg: 'bg-gray-200', text: 'text-gray-700', dot: 'bg-gray-500' },
  Holiday: { bg: 'bg-gray-200', text: 'text-gray-700', dot: 'bg-gray-500' },
  Assembly: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  Trip: { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
  Sports: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  Meeting: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  Performance: { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
  exam_period: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
};

const getEventStyle = (type) => EVENT_COLORS[type] || { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };

const EVENT_TYPE_LABELS = {
  event: 'School Event',
  term_start: 'School Starts',
  break: 'School Break',
  holiday: 'Public Holiday',
  Holiday: 'Public Holiday',
  exam_period: 'Exam Period',
  outing: 'Outing',
};
const getEventTypeLabel = (type) => EVENT_TYPE_LABELS[type] || type;

const ParentCalendarPage = () => {
  const { supabase } = useApp();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  const { children, selectedChild, setSelectedChild, loading } = useParentChildrenCtx();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [scheduledTests, setScheduledTests] = useState([]);
  const [homeworkDue, setHomeworkDue] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  // ══════════════════════════════════════════════════════════════════════════
  // LOAD CALENDAR DATA
  // ══════════════════════════════════════════════════════════════════════════

  const loadCalendarData = useCallback(async () => {
    if (!supabase || !selectedChild) return;
    try {
      const className = selectedChild.class_name;

      const { data: events } = await supabase
        .from('school_events')
        .select('*')
        .order('start_date');
      
      const relevant = (events || []).filter(e => {
        const affected = Array.isArray(e.affects_classes) 
          ? e.affects_classes 
          : JSON.parse(e.affects_classes || '["All"]');
        return affected.includes('All') || affected.includes(className);
      });
      setSchoolEvents(relevant);

      const { data: tests } = await supabase
        .from('scheduled_tests')
        .select('*')
        .eq('class_name', className)
        .order('test_date');
      setScheduledTests(tests || []);

      const { data: hw } = await supabase
        .from('homework')
        .select('*')
        .eq('class_name', className)
        .order('due_date');
      setHomeworkDue(hw || []);
    } catch (err) { 
      console.error(err); 
    }
  }, [supabase, selectedChild]);

  useEffect(() => { 
    if (selectedChild) loadCalendarData(); 
  }, [selectedChild, loadCalendarData]);

  // ══════════════════════════════════════════════════════════════════════════
  // CALENDAR HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    let pad = firstDay.getDay() - 1;
    if (pad === -1) pad = 6;
    for (let i = 0; i < pad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };

  const toDateStr = (date) => {
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getEventsForDate = (date) => {
    if (!date) return { events: [], tests: [], homework: [] };
    const ds = toDateStr(date);
    const events = schoolEvents.filter(e => ds >= e.start_date && (!e.end_date ? ds === e.start_date : ds <= e.end_date));
    const tests = scheduledTests.filter(t => t.test_date === ds);
    const homework = homeworkDue.filter(h => h.due_date === ds);
    return { events, tests, homework };
  };

  const isToday = (date) => {
    if (!date) return false;
    const t = new Date();
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
  };

  const isWeekend = (date) => {
    if (!date) return false;
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  const today = new Date().toISOString().split('T')[0];
  const upcomingTests = scheduledTests.filter(t => t.test_date >= today).slice(0, 5);
  const upcomingEvents = schoolEvents.filter(e => e.start_date >= today).slice(0, 5);
  const upcomingHw = homeworkDue.filter(h => h.due_date >= today).slice(0, 5);

  const daysUntil = (d) => {
    const diff = Math.ceil((new Date(d + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff}d`;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // LOADING / EMPTY
  // ══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 rounded-full animate-spin"
          style={{ borderColor: theme.withAlpha(0.3), borderTopColor: 'transparent' }}></div>
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

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ═══ HEADER - Dynamic Gradient ═══ */}
      <div className="rounded-2xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden"
        style={theme.gradientStyle}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">School Calendar</h1>
              <p className="text-white/80 text-sm">Events, tests, homework & holidays</p>
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
                <select 
                  value={selectedChild?.id || ''}
                  onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                  className="appearance-none bg-white/20 backdrop-blur border border-white/30 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-white focus:outline-none cursor-pointer"
                >
                  {children.map(c => (
                    <option key={c.id} value={c.id} className="text-gray-900">
                      {c.name} — {c.class_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" size={14} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ CALENDAR + SIDEBAR ═══ */}
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

          {/* Week headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-gray-500 py-1">{day}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1.5">
            {daysInMonth.map((date, idx) => {
              if (!date) return <div key={'e-' + idx} className="aspect-square md:min-h-[80px]" />;

              const { events, tests, homework } = getEventsForDate(date);
              const todayFlag = isToday(date);
              const weekend = isWeekend(date);
              const hasItems = events.length > 0 || tests.length > 0 || homework.length > 0;
              const isBreak = events.some(e => e.event_type === 'Holiday' || e.event_type === 'holiday' || e.event_type === 'break');

              return (
                <div 
                  key={idx}
                  onClick={() => hasItems && setSelectedDay({ date, events, tests, homework })}
                  className={`aspect-square md:aspect-auto md:min-h-[80px] rounded-xl border p-1 md:p-1.5 transition-all flex flex-col
                    ${isBreak ? 'bg-gray-100 border-gray-300' : 
                      weekend ? 'bg-gray-50 border-gray-100' : 
                      hasItems ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer' : 'border-gray-200'}`}
                  style={todayFlag ? { borderColor: theme.color, backgroundColor: theme.withAlpha(0.05) } : {}}
                >
                  <span className={`text-xs font-semibold ${isBreak ? 'text-gray-400' : weekend ? 'text-gray-400' : 'text-gray-700'}`}
                    style={todayFlag ? theme.textStyle : {}}>
                    {date.getDate()}
                  </span>

                  {/* Mobile: dots only */}
                  <div className="flex gap-0.5 mt-auto md:hidden">
                    {events.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    {tests.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    {homework.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                  </div>

                  {/* Desktop: event pills */}
                  <div className="hidden md:block space-y-0.5 mt-0.5 overflow-hidden flex-1">
                    {events.slice(0, 2).map((e, i) => {
                      const style = getEventStyle(e.event_type);
                      return (
                        <div key={'ev-' + i} className={`text-[9px] px-1 py-0.5 ${style.bg} ${style.text} rounded font-medium truncate`}>
                          {e.title}
                        </div>
                      );
                    })}
                    {tests.slice(0, 1).map((t, i) => (
                      <div key={'t-' + i} className="text-[9px] px-1 py-0.5 bg-red-100 text-red-700 rounded font-medium truncate">
                        {t.subject} Test
                      </div>
                    ))}
                    {homework.slice(0, 1).map((h, i) => (
                      <div key={'hw-' + i} className="text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded font-medium truncate">
                        {h.subject} HW
                      </div>
                    ))}
                    {(events.length + tests.length + homework.length) > 3 && (
                      <p className="text-[8px] text-gray-400 text-center">+{events.length + tests.length + homework.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-5 pt-4 border-t border-gray-100">
            {[
              { dot: 'bg-blue-500', label: 'School Event' },
              { dot: 'bg-red-500', label: 'Test' },
              { dot: 'bg-amber-500', label: 'Homework Due' },
              { dot: 'bg-gray-500', label: 'Holiday/Break' },
            ].map((l, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${l.dot}`} />
                <span className="text-xs text-gray-600">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Upcoming */}
        <div className="space-y-5">
          {/* Upcoming Tests */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
              <Award size={16} className="text-red-600" />
              Upcoming Tests
            </h3>
            {upcomingTests.length > 0 ? (
              <div className="space-y-1.5">
                {upcomingTests.map(t => (
                  <div key={t.id} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[7px] font-medium text-red-500 leading-none">
                        {new Date(t.test_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
                      </span>
                      <span className="text-[11px] font-bold text-red-700 leading-none">
                        {new Date(t.test_date + 'T00:00:00').getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{t.title}</p>
                      <p className="text-[10px] text-gray-500">{t.subject}</p>
                    </div>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 flex-shrink-0">
                      {daysUntil(t.test_date)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No upcoming tests</p>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
              <CalendarIcon size={16} style={theme.textStyle} />
              Upcoming Events
            </h3>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-1.5">
                {upcomingEvents.map(e => (
                  <div key={e.id} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border"
                      style={{ backgroundColor: (e.color || theme.color) + '15', borderColor: (e.color || theme.color) + '40' }}>
                      <span className="text-[7px] font-medium leading-none" style={{ color: e.color || theme.color }}>
                        {new Date(e.start_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
                      </span>
                      <span className="text-[11px] font-bold leading-none" style={{ color: e.color || theme.color }}>
                        {new Date(e.start_date + 'T00:00:00').getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{e.title}</p>
                      <p className="text-[10px] text-gray-500">{getEventTypeLabel(e.event_type)}{e.location ? ` · ${e.location}` : ''}</p>
                    </div>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: theme.withAlpha(0.1), color: theme.color }}>
                      {daysUntil(e.start_date)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No upcoming events</p>
            )}
          </div>

          {/* Upcoming Homework */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
              <FileText size={16} className="text-amber-600" />
              Homework Due
            </h3>
            {upcomingHw.length > 0 ? (
              <div className="space-y-1.5">
                {upcomingHw.map(h => (
                  <div key={h.id} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 bg-amber-50 border border-amber-200 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[7px] font-medium text-amber-500 leading-none">
                        {new Date(h.due_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
                      </span>
                      <span className="text-[11px] font-bold text-amber-700 leading-none">
                        {new Date(h.due_date + 'T00:00:00').getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{h.title}</p>
                      <p className="text-[10px] text-gray-500">{h.subject}</p>
                    </div>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 
                      ${daysUntil(h.due_date) === 'Today' ? 'bg-red-100 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      {daysUntil(h.due_date)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No upcoming homework</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ DAY DETAIL MODAL ═══ */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header - Dynamic */}
            <div className="px-5 py-4 rounded-t-2xl flex items-center justify-between text-white"
              style={theme.gradientStyle}>
              <div>
                <h3 className="text-lg font-bold">
                  {selectedDay.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-white/80 text-xs mt-0.5">
                  {selectedDay.events.length + selectedDay.tests.length + selectedDay.homework.length} items
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {selectedDay.events.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                    <CalendarIcon size={14} style={theme.textStyle} /> School Events
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.events.map((e, i) => (
                      <div key={i} className="p-3 rounded-xl border"
                        style={{ backgroundColor: theme.withAlpha(0.05), borderColor: theme.withAlpha(0.2) }}>
                        <p className="font-semibold text-gray-800 text-sm">{e.title}</p>
                        <p className="text-xs mt-0.5" style={theme.textStyle}>{getEventTypeLabel(e.event_type)}{e.location ? ` · ${e.location}` : ''}</p>
                        {e.description && <p className="text-xs text-gray-600 mt-1.5">{e.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDay.tests.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                    <Award size={14} className="text-red-600" /> Tests
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.tests.map((t, i) => (
                      <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">{t.subject}</span>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm">{t.title}</p>
                        {t.topics_covered && <p className="text-xs text-gray-600 mt-1"><strong>Topics:</strong> {t.topics_covered}</p>}
                        {t.study_materials && <p className="text-xs text-gray-600 mt-1"><strong>Study:</strong> {t.study_materials}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedDay.homework.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                    <FileText size={14} className="text-amber-600" /> Homework Due
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.homework.map((h, i) => (
                      <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">{h.subject}</span>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm">{h.title}</p>
                        {h.description && <p className="text-xs text-gray-600 mt-1">{h.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="border-t px-5 py-3">
              <button onClick={() => setSelectedDay(null)}
                className="w-full text-white py-2.5 rounded-xl hover:shadow-lg transition-all font-semibold text-sm"
                style={theme.gradientStyle}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TERM FOOTER ═══ */}
      {theme.hasActiveTerm && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} style={theme.textStyle} />
            <span className="text-xs font-semibold" style={theme.textStyle}>{theme.name} Term {theme.activeTerm.academic_year}</span>
          </div>
          <span className="text-[10px] font-medium" style={theme.textStyle}>
            {theme.daysRemaining}d left
          </span>
        </div>
      )}
    </div>
  );
};

export default ParentCalendarPage;