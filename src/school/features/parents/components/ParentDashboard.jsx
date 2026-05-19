import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, CheckCircle, XCircle, AlertTriangle,
  ClipboardList, BarChart3, ArrowRight, UserCheck,
  AlertCircle, Award, Users, BookOpen, ChevronRight,
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useActiveTerm from '../../../../shared/hooks/useActiveTerm';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { getGradeFromConfig, isPrimaryClass } from '../../../../core/utils/cambridgeGrading';

// ═══════════════════════════════════════════════════════════════════════════════
// PARENT DASHBOARD — Premium Scandinavian SaaS Design
// All data-loading logic preserved; only the visual layer is redesigned.
// ═══════════════════════════════════════════════════════════════════════════════

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** Clickable metric tile with a colored top-border accent */
const StatTile = ({ icon: Icon, label, value, sub, accent, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white rounded-2xl p-5 text-left w-full group transition-all hover:-translate-y-0.5 hover:shadow-md"
    style={{
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      borderTop: `3px solid ${accent}`,
    }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accent}18` }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <ChevronRight size={13} className="text-gray-200 group-hover:text-gray-400 transition-colors" />
    </div>
    <p className="text-2xl font-bold text-gray-900 leading-none mb-1.5">{value}</p>
    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest leading-none">{label}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">{sub}</p>}
  </button>
);

/** Section heading with optional right action */
const SectionHead = ({ icon: Icon, title, accent, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accent}15` }}>
        <Icon size={14} style={{ color: accent }} />
      </div>
      <h3 className="text-sm font-bold text-gray-900 tracking-tight">{title}</h3>
    </div>
    {action}
  </div>
);

/** Small "View all →" link */
const ViewAll = ({ label = 'View all', onClick, theme }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 text-[11px] font-semibold transition-opacity hover:opacity-60"
    style={theme.textStyle}
  >
    {label} <ArrowRight size={10} />
  </button>
);

/** Single grade row */
const GradeRow = ({ g }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
      style={{ backgroundColor: g.cambridge.color }}>
      {g.cambridge.short}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-800 truncate leading-tight">{g.assessment_title}</p>
      <p className="text-[11px] text-gray-400 mt-0.5 leading-none">
        {g.subject} · {new Date(g.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        {g.assessment_type ? ` · ${g.assessment_type}` : ''}
      </p>
    </div>
    <div className="text-right flex-shrink-0">
      <p className="text-sm font-bold leading-tight" style={{ color: g.cambridge.color }}>
        {g.cambridge.display}
      </p>
      <p className="text-[10px] text-gray-300 leading-none mt-0.5">{g.percentage}%</p>
    </div>
  </div>
);

/** Single class row (today's schedule) */
const ClassRow = ({ cls, accent, isLast }) => (
  <div className={`flex items-center gap-3 py-2.5 ${!isLast ? 'border-b border-gray-50' : ''}`}>
    <span className="text-[11px] font-bold text-gray-400 w-10 flex-shrink-0 tabular-nums">
      {cls.time || '—'}
    </span>
    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-800 leading-tight truncate">{cls.subject}</p>
      {cls.title && cls.title !== cls.subject && (
        <p className="text-[11px] text-gray-400 truncate leading-none mt-0.5">{cls.title}</p>
      )}
    </div>
  </div>
);

/** Date-badge row (events / tests) */
const DateRow = ({ title, sub, date, accent, badge, isLast }) => {
  const d   = new Date(date + 'T00:00:00');
  const day = d.getDate();
  const mon = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
  return (
    <div className={`flex items-center gap-3 py-2.5 ${!isLast ? 'border-b border-gray-50' : ''}`}>
      <div className="w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border"
        style={{ backgroundColor: `${accent}10`, borderColor: `${accent}30` }}>
        <span className="text-[8px] font-bold leading-none" style={{ color: accent }}>{mon}</span>
        <span className="text-sm font-bold leading-none mt-0.5" style={{ color: accent }}>{day}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate leading-tight">{title}</p>
        {sub && <p className="text-[11px] text-gray-400 truncate leading-none mt-0.5">{sub}</p>}
      </div>
      {badge && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
          badge === 'Today'     ? 'bg-red-50 text-red-500' :
          badge === 'Tomorrow' ? 'bg-orange-50 text-orange-500' :
                                 'bg-gray-50 text-gray-500'
        }`}>
          {badge}
        </span>
      )}
    </div>
  );
};

// ── Empty state helper ────────────────────────────────────────────────────────
const Empty = ({ icon: Icon, text }) => (
  <div className="text-center py-9 bg-gray-50 rounded-xl">
    <Icon size={26} className="mx-auto text-gray-200 mb-2" />
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
  const { primaryColor, gradingConfig } = useBranding();

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

  // ── Data loading (unchanged from original) ────────────────────────────────
  const loadData = useCallback(async () => {
    if (!supabase || !selectedChild) return;
    setDataLoading(true);
    try {
      const childId   = selectedChild.id;
      const className = selectedChild.class_name;
      const termStart = activeTerm?.start_date || '2026-01-01';
      const termEnd   = activeTerm?.end_date   || '2026-12-31';
      const termNum   = activeTerm?.term_number || null;

      // ── Attendance ──
      const { data: att } = await supabase.from('attendance').select('status')
        .eq('student_id', childId).gte('date_key', termStart).lte('date_key', termEnd);
      const attTotal   = att?.length || 0;
      const attPresent = att?.filter(a => a.status === 'present').length || 0;
      const attLate    = att?.filter(a => a.status === 'late').length    || 0;
      const attAbsent  = att?.filter(a => a.status === 'absent').length  || 0;
      const attRate    = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : null;
      setAttendanceStats({ total: attTotal, present: attPresent, late: attLate, absent: attAbsent, rate: attRate });

      // ── Grades → Cambridge ──
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
        const pct      = Math.round((g.grade / g.max_grade) * 100);
        const cambridge = getGradeFromConfig(pct, className, gradingConfig);
        return { ...g, percentage: pct, cambridge };
      });
      setRecentGrades(enriched.slice(0, 5));
      if (enriched.length > 0) {
        const avgPct = Math.round(enriched.reduce((s, g) => s + g.percentage, 0) / enriched.length);
        setOverallGrade(getGradeFromConfig(avgPct, className, gradingConfig));
      } else setOverallGrade(null);

      // ── Homework ──
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

      // ── Urgent items ──
      const urgent = [];
      if (hwOverdue > 0) urgent.push({ severity: 'high', icon: XCircle, message: `${hwOverdue} overdue assignment${hwOverdue > 1 ? 's' : ''}` });
      if (attRate !== null && attRate < 85) urgent.push({ severity: 'high', icon: AlertTriangle, message: `Attendance at ${attRate}% — below 85% threshold` });
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const { data: weekAtt } = await supabase.from('attendance').select('status').eq('student_id', childId).gte('date_key', weekAgo);
      const weekLate   = weekAtt?.filter(a => a.status === 'late').length   || 0;
      const weekAbsent = weekAtt?.filter(a => a.status === 'absent').length || 0;
      if (weekLate   >= 2) urgent.push({ severity: 'medium', icon: Clock,         message: `Late ${weekLate}× this week` });
      if (weekAbsent >= 2) urgent.push({ severity: 'high',   icon: AlertCircle,   message: `Absent ${weekAbsent} days this week` });
      const lowGrades = enriched.filter(g => g.cambridge.band !== null ? g.cambridge.band <= 2 : g.percentage < 40);
      if (lowGrades.length > 0) urgent.push({ severity: 'medium', icon: BarChart3, message: `${lowGrades.length} assessment${lowGrades.length > 1 ? 's' : ''} at Band 2 or below` });
      setUrgentItems(urgent);

      // ── Upcoming tests ──
      const { data: tests } = await supabase.from('scheduled_tests').select('*')
        .eq('class_name', className).gte('test_date', today).order('test_date').limit(4);
      setUpcomingTests(tests || []);

      // ── Events ──
      const { data: events } = await supabase.from('school_events').select('*')
        .gte('start_date', today).order('start_date').limit(8);
      const relevant = (events || []).filter(e => {
        const affected = Array.isArray(e.affects_classes) ? e.affects_classes : JSON.parse(e.affects_classes || '["All"]');
        return affected.includes('All') || affected.includes(className);
      });
      setUpcomingEvents(relevant.slice(0, 4));

      // ── Today's classes ──
      const { data: cls } = await supabase.from('classes').select('subject, time, title')
        .eq('date_key', today).eq('class_name', className).order('time');
      setTodayClasses(cls || []);
    } catch (err) { console.error('Dashboard load error:', err); }
    finally { setDataLoading(false); }
  }, [supabase, selectedChild, activeTerm, today, gradingConfig]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const daysUntil = (d) => {
    const diff = Math.ceil((new Date(d + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff}d`;
  };
  const nav       = (page) => setCurrentPage(page);
  const isPrimary = isPrimaryClass(selectedChild?.class_name);

  // Accent colors
  const attAccent    = attendanceStats?.rate == null ? '#9ca3af' : attendanceStats.rate >= 90 ? '#10b981' : attendanceStats.rate >= 80 ? '#f59e0b' : '#ef4444';
  const gradeAccent  = overallGrade?.color || '#8b5cf6';
  const hwAccent     = '#f59e0b';
  const todayAccent  = primaryColor;

  // ── Loading / empty states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: `${primaryColor}25`, borderTopColor: primaryColor }} />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
        <Users size={40} className="mx-auto text-gray-200 mb-4" />
        <p className="text-gray-700 font-semibold">No children linked to your account</p>
        <p className="text-gray-400 text-sm mt-1">Please contact the school administration.</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ══ GREETING HERO ═════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-6 relative overflow-hidden"
        style={{
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          borderTop: `3px solid ${primaryColor}`,
        }}>

        {/* Decorative blob */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${primaryColor}08 0%, transparent 70%)` }} />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-5">

          {/* Left: greeting + child pill */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{getGreeting()} 👋</h1>

            {/* Child chip */}
            <div className="inline-flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5 max-w-full">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}>
                {selectedChild?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 leading-tight truncate">{selectedChild?.name}</p>
                <p className="text-[11px] text-gray-400 leading-tight">
                  Class {selectedChild?.class_name}
                  {' · '}
                  {isPrimary ? 'Cambridge Primary' : 'Cambridge IGCSE'}
                </p>
              </div>

              {/* Child switcher (only if multiple children — subtle inline) */}
              {children.length > 1 && (
                <select
                  value={selectedChild?.id || ''}
                  onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                  className="text-[11px] bg-transparent focus:outline-none cursor-pointer text-gray-400 hover:text-gray-600 transition-colors ml-1"
                >
                  {children.map(c => (
                    <option key={c.id} value={c.id}>{c.name} · {c.class_name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Right: term progress card */}
          {theme.hasActiveTerm && (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex-shrink-0 min-w-[180px] sm:max-w-[200px] w-full sm:w-auto">
              <div className="flex items-center gap-1.5 mb-3">
                <TermIcon size={12} style={{ color: primaryColor }} />
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: primaryColor }}>
                  {theme.name} Term
                </span>
              </div>

              <div className="flex items-end justify-between mb-2">
                <span className="text-[11px] text-gray-400">{theme.activeTerm?.academic_year}</span>
                <span className="text-lg font-bold text-gray-800">{theme.daysRemaining}<span className="text-xs font-normal text-gray-400 ml-0.5">d</span></span>
              </div>

              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${theme.progress}%`, background: `linear-gradient(90deg, ${primaryColor}cc, ${primaryColor})` }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 text-right">{Math.round(theme.progress)}% complete</p>
            </div>
          )}
        </div>

        {/* Inline loading dot */}
        {dataLoading && (
          <div className="absolute bottom-4 right-4">
            <div className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: `${primaryColor}25`, borderTopColor: primaryColor }} />
          </div>
        )}
      </div>

      {/* ══ ALERTS ════════════════════════════════════════════════════════════ */}
      {urgentItems.length > 0 && (
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={13} className="text-amber-500" />
            <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Needs attention</p>
          </div>
          <div className="space-y-2">
            {urgentItems.map((item, i) => {
              const I = item.icon;
              return (
                <div key={i}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
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
        </div>
      )}

      {/* ══ STAT TILES ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={UserCheck}
          label="Attendance"
          value={attendanceStats?.rate != null ? `${attendanceStats.rate}%` : '—'}
          sub={attendanceStats ? `${attendanceStats.present} present · ${attendanceStats.absent} absent` : null}
          accent={attAccent}
          onClick={() => nav('parent-attendance')}
        />
        <StatTile
          icon={Award}
          label="Overall Grade"
          value={overallGrade?.display || '—'}
          sub={recentGrades.length > 0 ? `${recentGrades.length} assessments this term` : 'No grades yet'}
          accent={gradeAccent}
          onClick={() => nav('parent-grades')}
        />
        <StatTile
          icon={ClipboardList}
          label="Homework"
          value={homeworkStats ? `${homeworkStats.done}/${homeworkStats.total}` : '—'}
          sub={
            homeworkStats?.overdue > 0
              ? `⚠ ${homeworkStats.overdue} overdue`
              : homeworkStats?.rate != null ? `${homeworkStats.rate}% complete` : null
          }
          accent={hwAccent}
          onClick={() => nav('parent-homework')}
        />
        <StatTile
          icon={Calendar}
          label="Today's Classes"
          value={`${todayClasses.length}`}
          sub={
            todayClasses.length === 0
              ? 'No classes today'
              : todayClasses.slice(0, 2).map(c => c.subject).join(', ') + (todayClasses.length > 2 ? '…' : '')
          }
          accent={todayAccent}
          onClick={() => nav('parent-daily')}
        />
      </div>

      {/* ══ GRADES + HOMEWORK ROW ═════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Grades */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <SectionHead
            icon={BarChart3}
            title="Recent Grades"
            accent="#8b5cf6"
            action={<ViewAll onClick={() => nav('parent-grades')} theme={theme} />}
          />
          {recentGrades.length > 0
            ? recentGrades.map((g, i) => <GradeRow key={i} g={g} />)
            : <Empty icon={BarChart3} text="No grades recorded this term" />
          }
        </div>

        {/* Homework Status */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <SectionHead
            icon={ClipboardList}
            title="Homework Status"
            accent={hwAccent}
            action={<ViewAll onClick={() => nav('parent-homework')} theme={theme} />}
          />

          {homeworkStats && homeworkStats.total > 0 ? (
            <div className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] text-gray-400 font-medium">Term completion</span>
                  <span className="text-sm font-bold text-gray-700">{homeworkStats.rate}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex gap-px">
                  {homeworkStats.done > 0 && (
                    <div className="rounded-l-full"
                      style={{ width: `${(homeworkStats.done / homeworkStats.total) * 100}%`, backgroundColor: '#10b981' }} />
                  )}
                  {homeworkStats.partial > 0 && (
                    <div style={{ width: `${(homeworkStats.partial / homeworkStats.total) * 100}%`, backgroundColor: '#fbbf24' }} />
                  )}
                  {homeworkStats.notDone > 0 && (
                    <div className="rounded-r-full"
                      style={{ width: `${(homeworkStats.notDone / homeworkStats.total) * 100}%`, backgroundColor: '#fca5a5' }} />
                  )}
                </div>
                {/* Legend */}
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
                  { bg: '#f0fdf4', color: '#10b981', dark: '#065f46', Icon: CheckCircle, count: homeworkStats.done,    label: 'Done'     },
                  { bg: '#fffbeb', color: '#f59e0b', dark: '#92400e', Icon: Clock,        count: homeworkStats.partial, label: 'Partial'  },
                  { bg: '#fef2f2', color: '#ef4444', dark: '#991b1b', Icon: XCircle,      count: homeworkStats.notDone, label: 'Not Done' },
                ].map(({ bg, color, dark, Icon: I, count, label }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ backgroundColor: bg }}>
                    <I size={15} className="mx-auto mb-1.5" style={{ color }} />
                    <p className="text-lg font-bold leading-none" style={{ color: dark }}>{count}</p>
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
        </div>
      </div>

      {/* ══ TODAY + TESTS + EVENTS ════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Today's schedule */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <SectionHead
            icon={Calendar}
            title="Today's Schedule"
            accent={todayAccent}
            action={<ViewAll onClick={() => nav('parent-daily')} theme={theme} label="Daily view" />}
          />
          {todayClasses.length > 0 ? (
            todayClasses.slice(0, 7).map((cls, i) => (
              <ClassRow
                key={i}
                cls={cls}
                accent={todayAccent}
                isLast={i === Math.min(todayClasses.length, 7) - 1}
              />
            ))
          ) : (
            <Empty icon={Clock} text="No classes today" />
          )}
        </div>

        {/* Upcoming tests */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <SectionHead icon={BookOpen} title="Upcoming Tests" accent="#ef4444" />
          {upcomingTests.length > 0 ? (
            upcomingTests.map((t, i) => (
              <DateRow
                key={t.id}
                title={t.title}
                sub={t.subject}
                date={t.test_date}
                accent="#ef4444"
                badge={daysUntil(t.test_date)}
                isLast={i === upcomingTests.length - 1}
              />
            ))
          ) : (
            <Empty icon={BookOpen} text="No upcoming tests" />
          )}
        </div>

        {/* School events */}
        <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <SectionHead
            icon={Calendar}
            title="School Events"
            accent="#06b6d4"
            action={<ViewAll onClick={() => nav('parent-calendar')} theme={theme} label="Calendar" />}
          />
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((e, i) => (
              <DateRow
                key={e.id}
                title={e.title}
                sub={e.event_type || ''}
                date={e.start_date}
                accent={e.color || theme.color}
                badge={daysUntil(e.start_date)}
                isLast={i === upcomingEvents.length - 1}
              />
            ))
          ) : (
            <Empty icon={Calendar} text="No upcoming events" />
          )}
        </div>
      </div>

      {/* ══ TERM FOOTER ═══════════════════════════════════════════════════════ */}
      {theme.hasActiveTerm && (
        <div className="flex items-center justify-between rounded-xl px-4 py-3 border"
          style={{ backgroundColor: `${primaryColor}06`, borderColor: `${primaryColor}18` }}>
          <div className="flex items-center gap-2">
            <TermIcon size={12} style={{ color: primaryColor }} />
            <span className="text-[11px] font-semibold" style={{ color: primaryColor }}>
              {theme.name} Term · {theme.activeTerm?.academic_year}
            </span>
            <span className="text-[10px] text-gray-400 hidden sm:inline">
              {new Date(theme.activeTerm?.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(theme.activeTerm?.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1 rounded-full overflow-hidden bg-gray-200 hidden sm:block">
              <div className="h-full rounded-full" style={{ width: `${theme.progress}%`, backgroundColor: primaryColor }} />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: primaryColor }}>
              {theme.daysRemaining}d left
            </span>
          </div>
        </div>
      )}

    </div>
  );
};

export default ParentDashboard;
