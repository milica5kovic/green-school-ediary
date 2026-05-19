import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, CheckCircle, XCircle, AlertTriangle,
  ClipboardList, BarChart3, ArrowRight, UserCheck,
  AlertCircle, Award, Users, BookOpen, ChevronDown,
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useActiveTerm from '../../../../shared/hooks/useActiveTerm';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { getGradeFromConfig, isPrimaryClass } from '../../../../core/utils/cambridgeGrading';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
};

const daysUntilLabel = (dateStr) => {
  const diff = Math.ceil(
    (new Date(dateStr + 'T00:00:00') - new Date(new Date().toISOString().split('T')[0] + 'T00:00:00')) / 86400000
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff}d`;
};

// ── Shared card shell ─────────────────────────────────────────────────────────
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-5 ${className}`}>
    {children}
  </div>
);

// ── Section heading inside a card ─────────────────────────────────────────────
const CardHead = ({ icon: Icon, title, color, action }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
      <Icon size={16} style={{ color }} />
      {title}
    </h3>
    {action}
  </div>
);

// ── View-all link ─────────────────────────────────────────────────────────────
const ViewAll = ({ label = 'View all', onClick, color }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 text-[11px] font-semibold hover:opacity-70 transition-opacity"
    style={{ color }}
  >
    {label} <ArrowRight size={10} />
  </button>
);

// ── Grade row ─────────────────────────────────────────────────────────────────
const GradeRow = ({ g }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
      style={{ backgroundColor: g.cambridge.color }}
    >
      {g.cambridge.short}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-800 truncate leading-tight">{g.assessment_title}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">
        {g.subject} · {new Date(g.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        {g.assessment_type ? ` · ${g.assessment_type}` : ''}
      </p>
    </div>
    <div className="text-right flex-shrink-0">
      <p className="text-sm font-bold" style={{ color: g.cambridge.color }}>{g.cambridge.display}</p>
      <p className="text-[10px] text-gray-400">{g.percentage}%</p>
    </div>
  </div>
);

// ── Schedule row ──────────────────────────────────────────────────────────────
const ClassRow = ({ cls, color, isLast }) => (
  <div className={`flex items-center gap-3 py-2.5 ${!isLast ? 'border-b border-gray-50' : ''}`}>
    <span className="text-[11px] font-bold text-gray-400 w-10 flex-shrink-0 tabular-nums">{cls.time || '—'}</span>
    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-800 truncate leading-tight">{cls.subject}</p>
    </div>
  </div>
);

// ── Date-badge row (tests / events) ──────────────────────────────────────────
const DateRow = ({ title, sub, date, color, badge, isLast }) => {
  const d = new Date(date + 'T00:00:00');
  return (
    <div className={`flex items-center gap-3 py-2.5 ${!isLast ? 'border-b border-gray-50' : ''}`}>
      <div
        className="w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border"
        style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
      >
        <span className="text-[8px] font-bold leading-none" style={{ color }}>
          {d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
        </span>
        <span className="text-sm font-bold leading-none mt-0.5" style={{ color }}>{d.getDate()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate leading-tight">{title}</p>
        {sub && <p className="text-[11px] text-gray-400 truncate leading-none mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
          badge === 'Today'    ? 'bg-red-50 text-red-500' :
          badge === 'Tomorrow' ? 'bg-orange-50 text-orange-500' :
                                 'bg-gray-50 text-gray-400'
        }`}>
          {badge}
        </span>
      )}
    </div>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────
const Empty = ({ icon: Icon, text }) => (
  <div className="text-center py-8 bg-gray-50 rounded-xl">
    <Icon size={24} className="mx-auto text-gray-300 mb-2" />
    <p className="text-xs text-gray-400">{text}</p>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const ParentDashboard = () => {
  const { supabase, setCurrentPage } = useApp();
  const { activeTerm } = useActiveTerm();
  const theme = useTermTheme();
  const TermIcon = theme.icon;
  const { gradingConfig } = useBranding();

  const { children, selectedChild, setSelectedChild, loading } = useParentChildrenCtx();
  const [dataLoading, setDataLoading] = useState(false);

  const [attendanceStats, setAttendanceStats] = useState(null);
  const [recentGrades,    setRecentGrades]    = useState([]);
  const [overallGrade,    setOverallGrade]    = useState(null);
  const [homeworkStats,   setHomeworkStats]   = useState(null);
  const [urgentItems,     setUrgentItems]     = useState([]);
  const [upcomingTests,   setUpcomingTests]   = useState([]);
  const [upcomingEvents,  setUpcomingEvents]  = useState([]);
  const [todayClasses,    setTodayClasses]    = useState([]);

  const today = new Date().toISOString().split('T')[0];

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!supabase || !selectedChild) return;
    setDataLoading(true);
    try {
      const childId   = selectedChild.id;
      const className = selectedChild.class_name;
      const termStart = activeTerm?.start_date || '2026-01-01';
      const termEnd   = activeTerm?.end_date   || '2026-12-31';
      const termNum   = activeTerm?.term_number || null;

      // Attendance
      const { data: att } = await supabase.from('attendance').select('status')
        .eq('student_id', childId).gte('date_key', termStart).lte('date_key', termEnd);
      const attTotal   = att?.length || 0;
      const attPresent = att?.filter(a => a.status === 'present').length || 0;
      const attLate    = att?.filter(a => a.status === 'late').length    || 0;
      const attAbsent  = att?.filter(a => a.status === 'absent').length  || 0;
      const attRate    = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : null;
      setAttendanceStats({ total: attTotal, present: attPresent, late: attLate, absent: attAbsent, rate: attRate });

      // Grades → Cambridge
      let allGrades = [];
      if (termNum) {
        const { data: tg } = await supabase.from('grades').select('*').eq('student_id', childId).eq('term_number', termNum).order('date', { ascending: false });
        const { data: lg } = await supabase.from('grades').select('*').eq('student_id', childId).is('term_number', null).gte('date', termStart).lte('date', termEnd).order('date', { ascending: false });
        allGrades = [...(tg || []), ...(lg || [])];
      } else {
        const { data: g } = await supabase.from('grades').select('*').eq('student_id', childId).order('date', { ascending: false });
        allGrades = g || [];
      }
      const enriched = allGrades.map(g => {
        const pct = Math.round((g.grade / g.max_grade) * 100);
        return { ...g, percentage: pct, cambridge: getGradeFromConfig(pct, className, gradingConfig) };
      });
      setRecentGrades(enriched.slice(0, 5));
      if (enriched.length > 0) {
        const avgPct = Math.round(enriched.reduce((s, g) => s + g.percentage, 0) / enriched.length);
        setOverallGrade(getGradeFromConfig(avgPct, className, gradingConfig));
      } else setOverallGrade(null);

      // Homework
      let hwQuery = supabase.from('homework').select('id, title, subject, due_date').eq('class_name', className);
      if (termNum) hwQuery = hwQuery.eq('term_number', termNum);
      const { data: hw } = await hwQuery;
      const hwIds = (hw || []).map(h => h.id);
      let hwDone = 0, hwPartial = 0, hwNotDone = 0, hwOverdue = 0;
      if (hwIds.length > 0) {
        const { data: sh } = await supabase.from('student_homework').select('homework_id, status')
          .eq('student_id', childId).in('homework_id', hwIds);
        const statusMap = {};
        (sh || []).forEach(s => { statusMap[s.homework_id] = s.status; });
        (hw || []).forEach(h => {
          const st = statusMap[h.id] || 'not_done';
          if (st === 'done') hwDone++;
          else if (st === 'partially_done') hwPartial++;
          else { hwNotDone++; if (h.due_date < today) hwOverdue++; }
        });
      }
      const hwTotal = hwIds.length;
      const hwRate  = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : null;
      setHomeworkStats({ total: hwTotal, done: hwDone, partial: hwPartial, notDone: hwNotDone, overdue: hwOverdue, rate: hwRate });

      // Urgent items
      const urgent = [];
      if (hwOverdue > 0)
        urgent.push({ severity: 'high',   icon: XCircle,       message: `${hwOverdue} overdue assignment${hwOverdue > 1 ? 's' : ''}` });
      if (attRate !== null && attRate < 85)
        urgent.push({ severity: 'high',   icon: AlertTriangle, message: `Attendance at ${attRate}% — below 85% threshold` });
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const { data: weekAtt } = await supabase.from('attendance').select('status').eq('student_id', childId).gte('date_key', weekAgo);
      const weekLate   = weekAtt?.filter(a => a.status === 'late').length   || 0;
      const weekAbsent = weekAtt?.filter(a => a.status === 'absent').length || 0;
      if (weekLate   >= 2) urgent.push({ severity: 'medium', icon: Clock,       message: `Late ${weekLate}× this week` });
      if (weekAbsent >= 2) urgent.push({ severity: 'high',   icon: AlertCircle, message: `Absent ${weekAbsent} days this week` });
      const lowGrades = enriched.filter(g => g.cambridge.band !== null ? g.cambridge.band <= 2 : g.percentage < 40);
      if (lowGrades.length > 0)
        urgent.push({ severity: 'medium', icon: BarChart3, message: `${lowGrades.length} assessment${lowGrades.length > 1 ? 's' : ''} at Band 2 or below` });
      setUrgentItems(urgent);

      // Upcoming tests
      const { data: tests } = await supabase.from('scheduled_tests').select('*')
        .eq('class_name', className).gte('test_date', today).order('test_date').limit(4);
      setUpcomingTests(tests || []);

      // Events
      const { data: events } = await supabase.from('school_events').select('*')
        .gte('start_date', today).order('start_date').limit(8);
      const relevant = (events || []).filter(e => {
        const affected = Array.isArray(e.affects_classes)
          ? e.affects_classes
          : JSON.parse(e.affects_classes || '["All"]');
        return affected.includes('All') || affected.includes(className);
      });
      setUpcomingEvents(relevant.slice(0, 4));

      // Today's classes
      const { data: cls } = await supabase.from('classes').select('subject, time, title')
        .eq('date_key', today).eq('class_name', className).order('time');
      setTodayClasses(cls || []);

    } catch (err) { console.error('Dashboard load error:', err); }
    finally { setDataLoading(false); }
  }, [supabase, selectedChild, activeTerm, today, gradingConfig]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Guards ────────────────────────────────────────────────────────────────
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

  const nav        = (page) => setCurrentPage?.(page);
  const isPrimary  = isPrimaryClass(selectedChild?.class_name);
  const attColor   = attendanceStats?.rate == null ? '#9ca3af'
    : attendanceStats.rate >= 90 ? '#10b981'
    : attendanceStats.rate >= 80 ? '#f59e0b' : '#ef4444';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ══ GRADIENT HEADER ════════════════════════════════════════════════ */}
      <div className="rounded-2xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden"
        style={theme.gradientStyle}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24 pointer-events-none" />

        <div className="relative z-10">
          {/* Top row */}
          <div className="flex items-start justify-between mb-5 gap-4">
            <div>
              <p className="text-white/70 text-sm">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold mt-0.5">{getGreeting()} 👋</h1>
              <p className="text-white/80 text-sm mt-1">
                {selectedChild?.name} · Class {selectedChild?.class_name}
                {' · '}
                {isPrimary ? 'Cambridge Primary' : 'Cambridge IGCSE'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
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
                    onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}
                    className="appearance-none bg-white/20 backdrop-blur border border-white/30 rounded-xl px-3 py-2 pr-8 text-sm font-medium text-white focus:outline-none cursor-pointer"
                  >
                    {children.map(c => (
                      <option key={c.id} value={c.id} className="text-gray-900">{c.name} — {c.class_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/70" size={14} />
                </div>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: UserCheck,
                label: 'Attendance',
                value: attendanceStats?.rate != null ? `${attendanceStats.rate}%` : '—',
                sub: attendanceStats ? `${attendanceStats.present} present · ${attendanceStats.absent} absent` : null,
              },
              {
                icon: Award,
                label: 'Overall Grade',
                value: overallGrade?.display || '—',
                sub: recentGrades.length > 0 ? `${recentGrades.length} assessments` : 'No grades yet',
              },
              {
                icon: ClipboardList,
                label: 'Homework',
                value: homeworkStats ? `${homeworkStats.done}/${homeworkStats.total}` : '—',
                sub: homeworkStats?.overdue > 0
                  ? `${homeworkStats.overdue} overdue`
                  : homeworkStats?.rate != null ? `${homeworkStats.rate}% complete` : null,
              },
              {
                icon: Calendar,
                label: "Today's Classes",
                value: `${todayClasses.length}`,
                sub: todayClasses.length === 0
                  ? 'No classes today'
                  : todayClasses.slice(0, 2).map(c => c.subject).join(', ') + (todayClasses.length > 2 ? '…' : ''),
              },
            ].map((s, i) => {
              const I = s.icon;
              return (
                <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                  <I size={14} className="text-white/70 mb-1.5" />
                  <p className="text-xl font-bold leading-none">{s.value}</p>
                  <p className="text-[10px] text-white/70 mt-1 font-medium uppercase tracking-wide">{s.label}</p>
                  {s.sub && <p className="text-[10px] text-white/60 mt-0.5 leading-snug">{s.sub}</p>}
                </div>
              );
            })}
          </div>

          {/* Loading dot */}
          {dataLoading && (
            <div className="absolute bottom-4 right-4">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* ══ ALERTS ════════════════════════════════════════════════════════════ */}
      {urgentItems.length > 0 && (
        <Card>
          <CardHead icon={AlertTriangle} title="Needs Attention" color="#f59e0b" />
          <div className="space-y-2">
            {urgentItems.map((item, i) => {
              const I = item.icon;
              return (
                <div key={i} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                  item.severity === 'high'
                    ? 'bg-red-50 text-red-700 border border-red-100'
                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  <I size={14} className="flex-shrink-0" />
                  {item.message}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ══ GRADES + HOMEWORK ═════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Grades */}
        <Card>
          <CardHead
            icon={BarChart3}
            title="Recent Grades"
            color="#8b5cf6"
            action={<ViewAll onClick={() => nav('parent-grades')} color={theme.color} />}
          />
          {recentGrades.length > 0
            ? recentGrades.map((g, i) => <GradeRow key={i} g={g} />)
            : <Empty icon={BarChart3} text="No grades recorded this term" />
          }
        </Card>

        {/* Homework Status */}
        <Card>
          <CardHead
            icon={ClipboardList}
            title="Homework Status"
            color="#f59e0b"
            action={<ViewAll onClick={() => nav('parent-homework')} color={theme.color} />}
          />
          {homeworkStats && homeworkStats.total > 0 ? (
            <div className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] text-gray-400 font-medium">Term completion</span>
                  <span className="text-sm font-bold text-gray-700">{homeworkStats.rate}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  {homeworkStats.done > 0 && (
                    <div style={{ width: `${(homeworkStats.done / homeworkStats.total) * 100}%`, backgroundColor: '#10b981' }} />
                  )}
                  {homeworkStats.partial > 0 && (
                    <div style={{ width: `${(homeworkStats.partial / homeworkStats.total) * 100}%`, backgroundColor: '#fbbf24' }} />
                  )}
                  {homeworkStats.notDone > 0 && (
                    <div style={{ width: `${(homeworkStats.notDone / homeworkStats.total) * 100}%`, backgroundColor: '#fca5a5' }} />
                  )}
                </div>
                <div className="flex gap-4 mt-2">
                  {[
                    { dot: '#10b981', label: 'Done',     count: homeworkStats.done },
                    { dot: '#fbbf24', label: 'Partial',  count: homeworkStats.partial },
                    { dot: '#fca5a5', label: 'Not done', count: homeworkStats.notDone },
                  ].map(({ dot, label, count }) => (
                    <span key={label} className="flex items-center gap-1 text-[10px] text-gray-500">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                      {label} · {count}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mini tiles */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { bg: '#f0fdf4', color: '#10b981', Icon: CheckCircle, count: homeworkStats.done,    label: 'Done'    },
                  { bg: '#fffbeb', color: '#f59e0b', Icon: Clock,       count: homeworkStats.partial, label: 'Partial' },
                  { bg: '#fef2f2', color: '#ef4444', Icon: XCircle,     count: homeworkStats.notDone, label: 'Not Done'},
                ].map(({ bg, color, Icon: I, count, label }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ backgroundColor: bg }}>
                    <I size={15} className="mx-auto mb-1.5" style={{ color }} />
                    <p className="text-lg font-bold leading-none" style={{ color }}>{count}</p>
                    <p className="text-[10px] font-semibold mt-1 leading-none" style={{ color }}>{label}</p>
                  </div>
                ))}
              </div>

              {homeworkStats.overdue > 0 && (
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100">
                  <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-600 font-medium">
                    {homeworkStats.overdue} assignment{homeworkStats.overdue > 1 ? 's' : ''} past due
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Empty icon={ClipboardList} text="No homework this term" />
          )}
        </Card>
      </div>

      {/* ══ SCHEDULE + TESTS + EVENTS ═════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Today's schedule */}
        <Card>
          <CardHead
            icon={Calendar}
            title="Today's Schedule"
            color={theme.color}
            action={<ViewAll label="Daily view" onClick={() => nav('parent-daily')} color={theme.color} />}
          />
          {todayClasses.length > 0 ? (
            todayClasses.slice(0, 7).map((cls, i) => (
              <ClassRow key={i} cls={cls} color={theme.color} isLast={i === Math.min(todayClasses.length, 7) - 1} />
            ))
          ) : (
            <Empty icon={Clock} text="No classes today" />
          )}
        </Card>

        {/* Upcoming tests */}
        <Card>
          <CardHead icon={BookOpen} title="Upcoming Tests" color="#ef4444" />
          {upcomingTests.length > 0 ? (
            upcomingTests.map((t, i) => (
              <DateRow
                key={t.id}
                title={t.title}
                sub={t.subject}
                date={t.test_date}
                color="#ef4444"
                badge={daysUntilLabel(t.test_date)}
                isLast={i === upcomingTests.length - 1}
              />
            ))
          ) : (
            <Empty icon={BookOpen} text="No upcoming tests" />
          )}
        </Card>

        {/* School events */}
        <Card>
          <CardHead
            icon={Calendar}
            title="School Events"
            color="#06b6d4"
            action={<ViewAll label="Calendar" onClick={() => nav('parent-calendar')} color={theme.color} />}
          />
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((e, i) => (
              <DateRow
                key={e.id}
                title={e.title}
                sub={e.event_type || ''}
                date={e.start_date}
                color={e.color || theme.color}
                badge={daysUntilLabel(e.start_date)}
                isLast={i === upcomingEvents.length - 1}
              />
            ))
          ) : (
            <Empty icon={Calendar} text="No upcoming events" />
          )}
        </Card>
      </div>

      {/* ══ TERM FOOTER ═══════════════════════════════════════════════════════ */}
      {theme.hasActiveTerm && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} style={theme.textStyle} />
            <span className="text-xs font-semibold" style={theme.textStyle}>
              {theme.name} Term · {theme.activeTerm?.academic_year}
            </span>
            <span className="text-[10px] text-gray-500 hidden sm:inline">
              {new Date(theme.activeTerm?.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(theme.activeTerm?.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 rounded-full h-1.5 hidden sm:block" style={{ backgroundColor: theme.withAlpha(0.2) }}>
              <div className="h-1.5 rounded-full" style={{ width: `${theme.progress}%`, backgroundColor: theme.color }} />
            </div>
            <span className="text-[10px] font-medium" style={theme.textStyle}>{theme.daysRemaining}d left</span>
          </div>
        </div>
      )}

    </div>
  );
};

export default ParentDashboard;
