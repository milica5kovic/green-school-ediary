import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, CheckCircle, XCircle, AlertTriangle,
  ClipboardList, ArrowRight, UserCheck,
  Award, Users, BookOpen, Bell, ChevronDown, GraduationCap,
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useAuth } from '../../../../core/context/AuthContext';
import useActiveTerm from '../../../../shared/hooks/useActiveTerm';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { getGradeFromConfig, isPrimaryClass } from '../../../../core/utils/cambridgeGrading';

// ─── helpers ─────────────────────────────────────────────────────────────────

const CARD_SHADOW = '0 1px 3px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.08)';

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
};

const timeAgo = (isoOrDate) => {
  try {
    const d = typeof isoOrDate === 'string' && isoOrDate.length === 10
      ? new Date(isoOrDate + 'T12:00:00')
      : new Date(isoOrDate);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 0)     return 'upcoming';
    if (diff < 3600)  return `${Math.max(1, Math.floor(diff / 60))}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    const days = Math.floor(diff / 86400);
    return days === 1 ? '1d ago' : `${days}d ago`;
  } catch { return ''; }
};

const EVENT_TYPE_LABELS = {
  exam_period:  'Exam Period',
  exam:         'Exam',
  outing:       'School Outing',
  trip:         'School Trip',
  residential:  'Residential Trip',
  ptm:          'Parent–Teacher Meeting',
  holiday:      'School Holiday',
  sports_day:   'Sports Day',
  assembly:     'Assembly',
  open_day:     'Open Day',
  graduation:   'Graduation',
  other:        'School Event',
};

// Renders a consistent Twemoji image regardless of OS/browser
const Emoji = ({ char, size = 24 }) => {
  const cp = [...char].map(c => c.codePointAt(0).toString(16)).join('-');
  return (
    <img
      src={`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cp}.svg`}
      alt={char}
      draggable={false}
      style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }}
    />
  );
};

const formatEventType = (type) => {
  if (!type) return 'Event';
  return EVENT_TYPE_LABELS[type.toLowerCase()]
    || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

// ─── main ─────────────────────────────────────────────────────────────────────

const ParentDashboard = () => {
  const { supabase, setCurrentPage } = useApp();
  const { user } = useAuth();
  const { activeTerm } = useActiveTerm();
  const { gradingConfig, primaryColor } = useBranding();
  const accent = primaryColor || '#16a34a';

  const { children, selectedChild, setSelectedChild, loading } = useParentChildrenCtx();
  const [busy,           setBusy]           = useState(false);
  const [parentName,     setParentName]     = useState('');
  const [attStats,       setAttStats]       = useState(null);
  const [overallGrade,   setOverallGrade]   = useState(null);
  const [hwStats,        setHwStats]        = useState(null);
  const [upcomingTests,  setUpcomingTests]  = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [ptmEvent,       setPtmEvent]       = useState(null);
  const [alerts,         setAlerts]         = useState([]);
  const [todayClasses,   setTodayClasses]   = useState([]);
  const [todayAtt,       setTodayAtt]       = useState([]);

  const today = new Date().toISOString().split('T')[0];

  // ── parent first name ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase || !user) return;
    supabase.from('parents').select('full_name').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data?.full_name) setParentName(data.full_name.trim().split(' ')[0]);
      }).catch(() => {});
  }, [supabase, user]);

  // ── main data load ─────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!supabase || !selectedChild) return;
    setBusy(true);
    try {
      const id      = selectedChild.id;
      const cls     = selectedChild.class_name;
      const tStart  = activeTerm?.start_date  || '2026-01-01';
      const tEnd    = activeTerm?.end_date    || '2026-12-31';
      const termNum = activeTerm?.term_number || null;
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

      // attendance
      const { data: att } = await supabase.from('attendance')
        .select('status, date_key')
        .eq('student_id', id).gte('date_key', tStart).lte('date_key', tEnd);
      const total   = att?.length || 0;
      const present = att?.filter(a => a.status === 'present').length || 0;
      const late    = att?.filter(a => a.status === 'late').length    || 0;
      const absent  = att?.filter(a => a.status === 'absent').length  || 0;
      const rate    = total > 0 ? Math.round((present / total) * 100) : null;
      const todayAtt = att?.find(a => a.date_key === today);
      setAttStats({ total, present, late, absent, rate, todayStatus: todayAtt?.status || null });

      // grades
      let raw = [];
      if (termNum) {
        const { data: tg } = await supabase.from('grades')
          .select('id,student_id,subject,assessment_title,assessment_type,grade,max_grade,date,term_number,class_name')
          .eq('student_id', id).eq('term_number', termNum).order('date', { ascending: false });
        const { data: lg } = await supabase.from('grades')
          .select('id,student_id,subject,assessment_title,assessment_type,grade,max_grade,date,term_number,class_name')
          .eq('student_id', id).is('term_number', null).gte('date', tStart).lte('date', tEnd).order('date', { ascending: false });
        raw = [...(tg || []), ...(lg || [])];
      } else {
        const { data: g } = await supabase.from('grades')
          .select('id,student_id,subject,assessment_title,assessment_type,grade,max_grade,date,term_number,class_name')
          .eq('student_id', id).order('date', { ascending: false });
        raw = g || [];
      }
      const enriched = raw.map(g => ({
        ...g,
        percentage: Math.round((g.grade / g.max_grade) * 100),
        cambridge: getGradeFromConfig(Math.round((g.grade / g.max_grade) * 100), cls, gradingConfig),
      }));
      if (enriched.length) {
        const avg = Math.round(enriched.reduce((s, g) => s + g.percentage, 0) / enriched.length);
        setOverallGrade({ ...getGradeFromConfig(avg, cls, gradingConfig), avg });
      } else setOverallGrade(null);

      // homework
      let hwQ = supabase.from('homework').select('id, title, subject, due_date').eq('class_name', cls);
      if (termNum) hwQ = hwQ.eq('term_number', termNum);
      const { data: hw } = await hwQ;
      const hwIds = (hw || []).map(h => h.id);
      let done = 0, partial = 0, notDone = 0, overdue = 0;
      let recentHw = [];
      if (hwIds.length) {
        const { data: sh } = await supabase.from('student_homework')
          .select('homework_id,status,submitted_at')
          .eq('student_id', id).in('homework_id', hwIds);
        const map = {};
        (sh || []).forEach(s => { map[s.homework_id] = s; });
        (hw || []).forEach(h => {
          const st = map[h.id]?.status || 'not_done';
          if (st === 'done') done++;
          else if (st === 'partially_done') partial++;
          else { notDone++; if (h.due_date < today) overdue++; }
          if (map[h.id]?.submitted_at && map[h.id].submitted_at >= twoWeeksAgo + 'T00:00:00') {
            recentHw.push({ ...h, submitted_at: map[h.id].submitted_at });
          }
        });
      }
      const hwTotal = hwIds.length;
      setHwStats({ total: hwTotal, done, partial, notDone, overdue, rate: hwTotal ? Math.round((done / hwTotal) * 100) : null });

      // alerts
      const al = [];
      if (overdue) al.push({ sev: 'high', msg: `${overdue} overdue assignment${overdue > 1 ? 's' : ''}` });
      if (rate !== null && rate < 85) al.push({ sev: 'high', msg: `Attendance at ${rate}% — below 85% threshold` });
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const wAtt = att?.filter(a => a.date_key >= weekAgo) || [];
      if (wAtt.filter(a => a.status === 'late').length   >= 2) al.push({ sev: 'medium', msg: `Late ${wAtt.filter(a=>a.status==='late').length}× this week` });
      if (wAtt.filter(a => a.status === 'absent').length >= 2) al.push({ sev: 'high',   msg: `Absent ${wAtt.filter(a=>a.status==='absent').length} days this week` });
      setAlerts(al);

      // upcoming tests + events
      const { data: tests } = await supabase.from('scheduled_tests')
        .select('id,title,subject,test_date,class_name,duration_minutes')
        .eq('class_name', cls).gte('test_date', today).order('test_date').limit(5);
      setUpcomingTests(tests || []);

      const { data: evts } = await supabase.from('school_events')
        .select('id,title,event_type,start_date,end_date,affects_classes')
        .gte('start_date', today).order('start_date').limit(10);
      const rel = (evts || []).filter(e => {
        try {
          const aff = Array.isArray(e.affects_classes) ? e.affects_classes : JSON.parse(e.affects_classes || '["All"]');
          return aff.includes('All') || aff.includes(cls);
        } catch { return true; }
      });
      setUpcomingEvents(rel.slice(0, 4));

      // PTM detection — look for events with 'ptm' or 'parent-teacher' in type or title
      const ptm = (evts || []).find(e => {
        const t  = (e.title      || '').toLowerCase();
        const ty = (e.event_type || '').toLowerCase();
        return ty.includes('ptm') || ty.includes('parent') || t.includes('parent-teacher') || t.includes('ptm');
      });
      setPtmEvent(ptm || null);

      // today's classes + per-class attendance
      const { data: tc } = await supabase.from('classes')
        .select('id, subject, time, title')
        .eq('date_key', today).eq('class_name', cls).order('time');
      setTodayClasses(tc || []);

      const { data: ta } = await supabase.from('attendance')
        .select('class_id, status, comment')
        .eq('student_id', id).eq('date_key', today);
      setTodayAtt(ta || []);

      // ── build activity feed ──────────────────────────────────────────────────
      const acts = [];

      // recent grades
      enriched.filter(g => g.date >= twoWeeksAgo).slice(0, 3).forEach(g => {
        acts.push({
          icon: Award, iconBg: '#f0fdf4', iconColor: '#16a34a',
          title: `${g.subject} graded — ${g.cambridge.display}`,
          sub: `${g.assessment_title} · ${g.percentage}%`,
          date: g.date + 'T12:00:00',
        });
      });

      // recent absent / late
      (att || []).filter(a => (a.status === 'absent' || a.status === 'late') && a.date_key >= twoWeeksAgo)
        .slice(0, 2).forEach(a => {
          acts.push({
            icon: a.status === 'absent' ? XCircle : Clock,
            iconBg:    a.status === 'absent' ? '#fff1f2' : '#fffbeb',
            iconColor: a.status === 'absent' ? '#ef4444' : '#f59e0b',
            title: a.status === 'absent'
              ? `${selectedChild.name} was absent`
              : `${selectedChild.name} was late`,
            sub: new Date(a.date_key + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
            date: a.date_key + 'T08:00:00',
          });
        });

      // homework submitted recently
      recentHw.slice(0, 2).forEach(h => {
        acts.push({
          icon: CheckCircle, iconBg: '#f0f9ff', iconColor: '#0284c7',
          title: 'Homework submitted',
          sub: `${h.title} — ${h.subject}`,
          date: h.submitted_at,
        });
      });

      // test coming up within 3 days
      (tests || []).filter(t => {
        const d = Math.ceil((new Date(t.test_date + 'T00:00:00') - new Date()) / 86400000);
        return d >= 0 && d <= 3;
      }).slice(0, 1).forEach(t => {
        acts.push({
          icon: BookOpen, iconBg: '#fff7ed', iconColor: '#ea580c',
          title: `Upcoming test: ${t.title}`,
          sub: `${t.subject} · ${new Date(t.test_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}`,
          date: today + 'T06:00:00',
        });
      });

      acts.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecentActivity(acts.slice(0, 6));

    } catch (err) { console.error('Dashboard error:', err.message); }
    finally { setBusy(false); }
  }, [supabase, selectedChild, activeTerm, today, gradingConfig]);

  useEffect(() => { loadData(); }, [loadData]);

  const nav  = (page) => setCurrentPage?.(page);
  const dDiff = (d) => Math.ceil((new Date(d + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);

  const dayBadge = (d) => {
    const n = dDiff(d);
    if (n === 0) return { label: 'Today',    cls: 'bg-red-50 text-red-500' };
    if (n === 1) return { label: 'Tomorrow', cls: 'bg-amber-50 text-amber-600' };
    return              { label: `${n}d`,    cls: 'bg-slate-50 text-slate-400' };
  };

  // ── derived attendance display ─────────────────────────────────────────────
  const todayStatus  = attStats?.todayStatus;
  const attLabel     = todayStatus === 'present' ? 'Present'
                     : todayStatus === 'absent'  ? 'Absent'
                     : todayStatus === 'late'    ? 'Late'
                     : '—';
  const attColor     = todayStatus === 'present' ? '#16a34a'
                     : todayStatus === 'absent'  ? '#ef4444'
                     : todayStatus === 'late'    ? '#f59e0b'
                     : '#94a3b8';

  // ── next upcoming item ─────────────────────────────────────────────────────
  const allUpcoming = [
    ...(upcomingTests.slice(0, 3).map(t => ({ title: t.title, sub: t.subject,           date: t.test_date,   color: '#ef4444' }))),
    ...(upcomingEvents.slice(0, 3).map(e => ({ title: e.title, sub: formatEventType(e.event_type), date: e.start_date, color: accent }))),
  ].sort((a, b) => a.date.localeCompare(b.date));

  // ── loading / empty states ─────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!children.length) return (
    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center" style={{ boxShadow: CARD_SHADOW }}>
      <Users size={40} className="mx-auto text-slate-200 mb-4" />
      <p className="text-slate-700 font-semibold">No student linked to your account</p>
      <p className="text-slate-400 text-sm mt-1">Please contact the school administration.</p>
    </div>
  );

  return (
    <div className="space-y-5 pb-6">

      {/* ── HEADER ────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {getGreeting()}{parentName ? `, ${parentName}` : ''}!
            <Emoji char="👋" size={26} />
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {"Here's what's happening with "}
            <span className="font-semibold text-slate-700">{selectedChild?.name}</span>
            {" today."}
          </p>
        </div>

        {/* child switcher */}
        {children.length > 1 && (
          <div className="relative flex-shrink-0">
            <select
              value={selectedChild?.id || ''}
              onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}
              className="appearance-none text-sm border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer"
              style={{ focusRingColor: accent }}
            >
              {children.map(c => <option key={c.id} value={c.id}>{c.name} — {c.class_name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>
        )}
      </div>

      {/* ── ALERTS ────────────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(({ sev, msg }, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
              sev === 'high' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              <AlertTriangle size={14} className="flex-shrink-0" />
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* ── 4 STAT CARDS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Attendance */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: CARD_SHADOW }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: `${attColor}18` }}>
            <UserCheck size={18} style={{ color: attColor }} />
          </div>
          <p className="text-2xl font-bold leading-none mb-1" style={{ color: attColor }}>{attLabel}</p>
          <p className="text-xs font-semibold text-slate-500 mb-1">Attendance</p>
          <p className="text-xs text-slate-400">
            {attStats ? `${attStats.present} / ${attStats.total} days this term` : '—'}
          </p>
        </div>

        {/* Grades */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: CARD_SHADOW }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: overallGrade ? `${overallGrade.color}18` : '#f1f5f9' }}>
            <Award size={18} style={{ color: overallGrade?.color || '#94a3b8' }} />
          </div>
          <p className="text-2xl font-bold leading-none mb-1"
            style={{ color: overallGrade?.color || '#94a3b8' }}>
            {overallGrade?.display || '—'}
          </p>
          <p className="text-xs font-semibold text-slate-500 mb-1">Grades Overview</p>
          <p className="text-xs text-slate-400">
            {overallGrade ? `${overallGrade.avg}% average` : 'No grades yet'}
          </p>
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: CARD_SHADOW }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-orange-50">
            <Calendar size={18} className="text-orange-500" />
          </div>
          <p className="text-2xl font-bold leading-none mb-1 text-slate-800">
            {allUpcoming[0]
              ? new Date(allUpcoming[0].date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : '—'}
          </p>
          <p className="text-xs font-semibold text-slate-500 mb-1">Upcoming</p>
          <p className="text-xs text-slate-400 truncate">
            {allUpcoming[0]?.title || 'Nothing scheduled'}
          </p>
        </div>

        {/* Homework */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: CARD_SHADOW }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: hwStats?.overdue ? '#fff1f2' : '#f0fdf4' }}>
            <ClipboardList size={18} style={{ color: hwStats?.overdue ? '#ef4444' : '#16a34a' }} />
          </div>
          <p className="text-2xl font-bold leading-none mb-1"
            style={{ color: hwStats?.overdue ? '#ef4444' : '#16a34a' }}>
            {hwStats ? `${hwStats.done}/${hwStats.total}` : '—'}
          </p>
          <p className="text-xs font-semibold text-slate-500 mb-1">Homework</p>
          <p className="text-xs text-slate-400">
            {hwStats?.overdue
              ? `${hwStats.overdue} overdue`
              : hwStats?.rate != null ? `${hwStats.rate}% done` : '—'}
          </p>
        </div>
      </div>

      {/* ── TODAY'S CLASSES + RIGHT COLUMN ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Today's Classes — spans 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Today's Classes</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <button onClick={() => nav('parent-daily')}
              className="text-xs font-semibold hover:underline transition-colors"
              style={{ color: accent }}>
              Daily view
            </button>
          </div>

          {todayClasses.length ? (() => {
            // build attendance map: class_id → {status, comment}
            const attMap = {};
            todayAtt.forEach(a => { if (a.class_id) attMap[a.class_id] = a; });

            const STATUS_CONFIG = {
              present:   { label: 'Present',   bg: '#f0fdf4', color: '#16a34a' },
              late:      { label: 'Late',       bg: '#fffbeb', color: '#d97706' },
              absent:    { label: 'Absent',     bg: '#fff1f2', color: '#ef4444' },
              sent_out:  { label: 'Sent out',   bg: '#fff7ed', color: '#ea580c' },
            };

            return todayClasses.map((c, i, arr) => {
              const att = attMap[c.id];
              const sc  = att ? STATUS_CONFIG[att.status] : null;
              return (
                <div key={i} className={`py-3.5 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}>
                  <div className="flex items-center gap-3">
                    {/* time */}
                    <span className="text-xs font-medium text-slate-400 w-12 tabular-nums flex-shrink-0">
                      {c.time || '—'}
                    </span>
                    {/* colour dot */}
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sc?.color || accent }} />
                    {/* subject + title */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{c.subject}</p>
                      {c.title && c.title !== c.subject && (
                        <p className="text-xs text-slate-400 mt-0.5">{c.title}</p>
                      )}
                    </div>
                    {/* status badge */}
                    {sc ? (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-300 flex-shrink-0">—</span>
                    )}
                  </div>
                  {/* comment (if any) */}
                  {att?.comment && (
                    <p className="text-xs text-slate-500 mt-1.5 ml-[60px] italic">
                      "{att.comment}"
                    </p>
                  )}
                </div>
              );
            });
          })() : (
            <div className="py-10 text-center">
              <GraduationCap size={24} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No classes today</p>
            </div>
          )}
        </div>

        {/* Right column: Recent Activity + Upcoming stacked */}
        <div className="flex flex-col gap-5">

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD_SHADOW }}>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Recent Activity</h3>
            <p className="text-xs text-slate-400 mb-4">Last 2 weeks</p>

            {recentActivity.length ? (
              recentActivity.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className={`flex items-start gap-3 py-3 ${i < recentActivity.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: item.iconBg }}>
                      <Icon size={13} style={{ color: item.iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 leading-snug">{item.title}</p>
                      {item.sub && <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.sub}</p>}
                    </div>
                    <span className="text-[11px] text-slate-400 flex-shrink-0 mt-0.5 tabular-nums">
                      {timeAgo(item.date)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center">
                <Bell size={20} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">No recent activity</p>
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD_SHADOW }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Upcoming</h3>
              <button onClick={() => nav('parent-calendar')}
                className="text-xs font-semibold hover:underline transition-colors"
                style={{ color: accent }}>
                View all
              </button>
            </div>

            {allUpcoming.slice(0, 5).length ? (
              allUpcoming.slice(0, 5).map((item, i, arr) => {
                const d = new Date(item.date + 'T00:00:00');
                const { label, cls: badgeCls } = dayBadge(item.date);
                return (
                  <div key={i} className={`flex items-center gap-3 py-3 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border"
                      style={{ backgroundColor: `${item.color}0d`, borderColor: `${item.color}25` }}>
                      <span className="text-[8px] font-bold leading-none" style={{ color: item.color }}>
                        {d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
                      </span>
                      <span className="text-sm font-bold leading-none mt-0.5" style={{ color: item.color }}>
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{item.sub}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeCls}`}>
                      {label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center">
                <Calendar size={22} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">Nothing coming up</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── PTM BANNER ────────────────────────────────────────────────────────── */}
      {ptmEvent && (
        <div
          className="rounded-2xl p-5 text-white relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            boxShadow: `0 4px 20px ${accent}40`,
          }}
        >
          {/* decorative circles */}
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -right-4 -bottom-12 w-32 h-32 rounded-full bg-black/[.05] pointer-events-none" />

          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Users size={22} className="text-white" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70 mb-0.5">
                  Parent–Teacher Meeting
                </p>
                <p className="font-semibold text-base leading-snug">{ptmEvent.title}</p>
                <p className="text-sm text-white/80 mt-0.5">
                  {new Date(ptmEvent.start_date + 'T00:00:00').toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })}
                </p>
              </div>
            </div>

            <span className="flex-shrink-0 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
              {dDiff(ptmEvent.start_date) === 0 ? 'Today'
               : dDiff(ptmEvent.start_date) === 1 ? 'Tomorrow'
               : `In ${dDiff(ptmEvent.start_date)} days`}
            </span>
          </div>
        </div>
      )}

      {/* subtle spinner when refreshing */}
      {busy && (
        <div className="fixed bottom-6 right-6 w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin pointer-events-none z-50" />
      )}

    </div>
  );
};

export default ParentDashboard;
