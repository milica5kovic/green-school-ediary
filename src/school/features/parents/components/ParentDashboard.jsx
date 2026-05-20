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

// ─── helpers ─────────────────────────────────────────────────────────────────

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
};

const badge = (diff) => {
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff}d`;
};

const CARD_SHADOW = '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)';

// ─── primitives ───────────────────────────────────────────────────────────────

const Prose = ({ children, size = 'sm', muted }) =>
  <p className={`text-${size} ${muted ? 'text-slate-400' : 'text-slate-600'} leading-snug`}>{children}</p>;

const Divider = () => <div className="h-px bg-slate-50 my-1" />;

const Empty = ({ icon: Icon, text }) => (
  <div className="py-8 flex flex-col items-center gap-2">
    <Icon size={22} className="text-slate-200" />
    <p className="text-xs text-slate-400">{text}</p>
  </div>
);

const SectionLabel = ({ children }) =>
  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">{children}</p>;

// ─── grade row ────────────────────────────────────────────────────────────────

const GradeRow = ({ g }) => (
  <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm"
      style={{ backgroundColor: g.cambridge.color }}>
      {g.cambridge.short}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-800 truncate">{g.assessment_title}</p>
      <p className="text-xs text-slate-400 mt-0.5">
        {g.subject} · {new Date(g.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        {g.assessment_type ? ` · ${g.assessment_type}` : ''}
      </p>
    </div>
    <div className="text-right flex-shrink-0">
      <p className="text-sm font-semibold" style={{ color: g.cambridge.color }}>{g.cambridge.display}</p>
      <p className="text-xs text-slate-400">{g.percentage}%</p>
    </div>
  </div>
);

// ─── class row ────────────────────────────────────────────────────────────────

const ClassRow = ({ cls, color, isLast }) => (
  <div className={`flex items-center gap-3 py-3 ${!isLast ? 'border-b border-slate-50' : ''}`}>
    <span className="text-xs font-semibold text-slate-400 w-10 tabular-nums flex-shrink-0">{cls.time || '—'}</span>
    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
    <p className="text-sm text-slate-700 flex-1 min-w-0 truncate">{cls.subject}</p>
  </div>
);

// ─── event / test row ─────────────────────────────────────────────────────────

const DateRow = ({ title, sub, date, color, diff, isLast }) => {
  const d = new Date(date + 'T00:00:00');
  const lbl = badge(diff);
  return (
    <div className={`flex items-center gap-3 py-3 ${!isLast ? 'border-b border-slate-50' : ''}`}>
      <div className="w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border"
        style={{ backgroundColor: `${color}0d`, borderColor: `${color}25` }}>
        <span className="text-[8px] font-bold leading-none" style={{ color }}>
          {d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
        </span>
        <span className="text-sm font-bold leading-none mt-0.5" style={{ color }}>{d.getDate()}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 truncate">{title}</p>
        {sub && <p className="text-xs text-slate-400 truncate mt-0.5">{sub}</p>}
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
        lbl === 'Today'    ? 'bg-red-50 text-red-500' :
        lbl === 'Tomorrow' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
        {lbl}
      </span>
    </div>
  );
};

// ─── main ─────────────────────────────────────────────────────────────────────

const ParentDashboard = () => {
  const { supabase, setCurrentPage } = useApp();
  const { activeTerm } = useActiveTerm();
  const theme = useTermTheme();
  const TermIcon = theme.icon;
  const { gradingConfig } = useBranding();

  const { children, selectedChild, setSelectedChild, loading } = useParentChildrenCtx();
  const [busy, setBusy] = useState(false);

  const [attStats,      setAttStats]      = useState(null);
  const [recentGrades,  setRecentGrades]  = useState([]);
  const [overallGrade,  setOverallGrade]  = useState(null);
  const [hwStats,       setHwStats]       = useState(null);
  const [alerts,        setAlerts]        = useState([]);
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [upcomingEvents,setUpcomingEvents]= useState([]);
  const [todayClasses,  setTodayClasses]  = useState([]);

  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    if (!supabase || !selectedChild) return;
    setBusy(true);
    try {
      const id        = selectedChild.id;
      const cls       = selectedChild.class_name;
      const tStart    = activeTerm?.start_date  || '2026-01-01';
      const tEnd      = activeTerm?.end_date    || '2026-12-31';
      const termNum   = activeTerm?.term_number || null;

      // attendance
      const { data: att } = await supabase.from('attendance').select('status')
        .eq('student_id', id).gte('date_key', tStart).lte('date_key', tEnd);
      const total   = att?.length || 0;
      const present = att?.filter(a => a.status === 'present').length || 0;
      const late    = att?.filter(a => a.status === 'late').length    || 0;
      const absent  = att?.filter(a => a.status === 'absent').length  || 0;
      const rate    = total > 0 ? Math.round((present / total) * 100) : null;
      setAttStats({ total, present, late, absent, rate });

      // grades
      let raw = [];
      if (termNum) {
        const { data: tg } = await supabase.from('grades').select('id,student_id,subject,assessment_title,assessment_type,grade,max_grade,date,term_number,class_name').eq('student_id', id).eq('term_number', termNum).order('date', { ascending: false });
        const { data: lg } = await supabase.from('grades').select('id,student_id,subject,assessment_title,assessment_type,grade,max_grade,date,term_number,class_name').eq('student_id', id).is('term_number', null).gte('date', tStart).lte('date', tEnd).order('date', { ascending: false });
        raw = [...(tg || []), ...(lg || [])];
      } else {
        const { data: g } = await supabase.from('grades').select('id,student_id,subject,assessment_title,assessment_type,grade,max_grade,date,term_number,class_name').eq('student_id', id).order('date', { ascending: false });
        raw = g || [];
      }
      const enriched = raw.map(g => ({
        ...g,
        percentage: Math.round((g.grade / g.max_grade) * 100),
        cambridge:  getGradeFromConfig(Math.round((g.grade / g.max_grade) * 100), cls, gradingConfig),
      }));
      setRecentGrades(enriched.slice(0, 5));
      if (enriched.length) {
        const avg = Math.round(enriched.reduce((s, g) => s + g.percentage, 0) / enriched.length);
        setOverallGrade(getGradeFromConfig(avg, cls, gradingConfig));
      } else setOverallGrade(null);

      // homework
      let hwQ = supabase.from('homework').select('id, title, subject, due_date').eq('class_name', cls);
      if (termNum) hwQ = hwQ.eq('term_number', termNum);
      const { data: hw } = await hwQ;
      const hwIds = (hw || []).map(h => h.id);
      let done = 0, partial = 0, notDone = 0, overdue = 0;
      if (hwIds.length) {
        const { data: sh } = await supabase.from('student_homework').select('homework_id,status')
          .eq('student_id', id).in('homework_id', hwIds);
        const map = {};
        (sh || []).forEach(s => { map[s.homework_id] = s.status; });
        (hw || []).forEach(h => {
          const st = map[h.id] || 'not_done';
          if (st === 'done') done++;
          else if (st === 'partially_done') partial++;
          else { notDone++; if (h.due_date < today) overdue++; }
        });
      }
      const hwTotal = hwIds.length;
      setHwStats({ total: hwTotal, done, partial, notDone, overdue, rate: hwTotal ? Math.round((done / hwTotal) * 100) : null });

      // alerts
      const al = [];
      if (overdue)                       al.push({ sev: 'high',   Icon: XCircle,       msg: `${overdue} overdue assignment${overdue > 1 ? 's' : ''}` });
      if (rate !== null && rate < 85)    al.push({ sev: 'high',   Icon: AlertTriangle, msg: `Attendance at ${rate}% — below 85% threshold` });
      const wAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const { data: wAtt } = await supabase.from('attendance').select('status').eq('student_id', id).gte('date_key', wAgo);
      const wLate   = wAtt?.filter(a => a.status === 'late').length   || 0;
      const wAbsent = wAtt?.filter(a => a.status === 'absent').length || 0;
      if (wLate   >= 2) al.push({ sev: 'medium', Icon: Clock,       msg: `Late ${wLate}× this week` });
      if (wAbsent >= 2) al.push({ sev: 'high',   Icon: AlertCircle, msg: `Absent ${wAbsent} days this week` });
      const low = enriched.filter(g => g.cambridge.band !== null ? g.cambridge.band <= 2 : g.percentage < 40);
      if (low.length) al.push({ sev: 'medium', Icon: BarChart3, msg: `${low.length} assessment${low.length > 1 ? 's' : ''} at Band 2 or below` });
      setAlerts(al);

      // upcoming tests + events + today
      const { data: tests } = await supabase.from('scheduled_tests').select('id,title,subject,test_date,class_name,duration_minutes').eq('class_name', cls).gte('test_date', today).order('test_date').limit(4);
      setUpcomingTests(tests || []);
      const { data: evts } = await supabase.from('school_events').select('id,title,event_type,start_date,end_date,affects_classes').gte('start_date', today).order('start_date').limit(8);
      const rel = (evts || []).filter(e => {
        const aff = Array.isArray(e.affects_classes) ? e.affects_classes : JSON.parse(e.affects_classes || '["All"]');
        return aff.includes('All') || aff.includes(cls);
      });
      setUpcomingEvents(rel.slice(0, 4));
      const { data: tc } = await supabase.from('classes').select('subject,time,title').eq('date_key', today).eq('class_name', cls).order('time');
      setTodayClasses(tc || []);
    } catch (err) { console.error('Dashboard error:', err.message); }
    finally { setBusy(false); }
  }, [supabase, selectedChild, activeTerm, today, gradingConfig]);

  useEffect(() => { loadData(); }, [loadData]);

  const nav  = (page) => setCurrentPage?.(page);
  const diff = (d) => Math.ceil((new Date(d + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
  const isPrimary = isPrimaryClass(selectedChild?.class_name);
  const attColor  = attStats?.rate == null ? '#94a3b8'
    : attStats.rate >= 90 ? '#10b981'
    : attStats.rate >= 80 ? '#f59e0b' : '#ef4444';

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 rounded-full animate-spin"
        style={{ borderColor: theme.withAlpha(.2), borderTopColor: 'transparent' }} />
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
    <div className="space-y-5">

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
        style={{ ...theme.gradientStyle, boxShadow: '0 4px 24px rgba(15,23,42,.14), 0 1px 4px rgba(15,23,42,.06)' }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/[.06] pointer-events-none" />
        <div className="absolute -bottom-20 -left-12 w-56 h-56 rounded-full bg-black/[.04] pointer-events-none" />

        <div className="relative z-10">
          {/* title row */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-white/60 text-xs font-medium mb-1">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{getGreeting()}</h1>
              <p className="text-white/75 text-sm mt-1">
                {selectedChild?.name} · Class {selectedChild?.class_name} ·{' '}
                {isPrimary ? 'Cambridge Primary' : 'Cambridge IGCSE'}
              </p>
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
                    {children.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name} — {c.class_name}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                </div>
              )}
            </div>
          </div>

          {/* stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { Icon: UserCheck,    label: 'Attendance',     value: attStats?.rate != null ? `${attStats.rate}%` : '—', sub: attStats ? `${attStats.present} present` : null },
              { Icon: Award,        label: 'Overall Grade',  value: overallGrade?.display || '—', sub: `${recentGrades.length} assessments` },
              { Icon: ClipboardList,label: 'Homework',       value: hwStats ? `${hwStats.done}/${hwStats.total}` : '—', sub: hwStats?.overdue ? `${hwStats.overdue} overdue` : hwStats?.rate != null ? `${hwStats.rate}% done` : null },
              { Icon: Calendar,     label: "Today's Classes",value: `${todayClasses.length}`, sub: todayClasses.length ? todayClasses.slice(0,2).map(c=>c.subject).join(', ') : 'No classes' },
            ].map(({ Icon, label, value, sub }, i) => (
              <div key={i} className="bg-white/[.10] backdrop-blur-sm border border-white/[.12] rounded-xl px-3 py-3">
                <Icon size={13} className="opacity-60 mb-2" />
                <p className="text-lg font-bold leading-none">{value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mt-1.5">{label}</p>
                {sub && <p className="text-[10px] opacity-50 mt-0.5 truncate">{sub}</p>}
              </div>
            ))}
          </div>
        </div>
        {busy && <div className="absolute bottom-4 right-4 w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />}
      </div>

      {/* ── ALERTS ───────────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD_SHADOW }}>
          <SectionLabel>Needs attention</SectionLabel>
          <div className="space-y-2">
            {alerts.map(({ sev, Icon, msg }, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                sev === 'high'
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                <Icon size={14} className="flex-shrink-0" />
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GRADES + HOMEWORK ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Grades */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center justify-between mb-1">
            <SectionLabel>Recent grades</SectionLabel>
            <button onClick={() => nav('parent-grades')}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors mb-3">
              View all <ArrowRight size={10} />
            </button>
          </div>
          {recentGrades.length
            ? recentGrades.map((g, i) => <GradeRow key={i} g={g} />)
            : <Empty icon={BarChart3} text="No grades recorded this term" />}
        </div>

        {/* Homework */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center justify-between mb-1">
            <SectionLabel>Homework status</SectionLabel>
            <button onClick={() => nav('parent-homework')}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors mb-3">
              View all <ArrowRight size={10} />
            </button>
          </div>

          {hwStats && hwStats.total > 0 ? (
            <div className="space-y-5">
              {/* progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Term completion</span>
                  <span className="text-sm font-semibold text-slate-700">{hwStats.rate}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                  {hwStats.done    > 0 && <div style={{ width: `${hwStats.done    / hwStats.total * 100}%`, backgroundColor: '#10b981' }} />}
                  {hwStats.partial > 0 && <div style={{ width: `${hwStats.partial / hwStats.total * 100}%`, backgroundColor: '#f59e0b' }} />}
                  {hwStats.notDone > 0 && <div style={{ width: `${hwStats.notDone / hwStats.total * 100}%`, backgroundColor: '#fca5a5' }} />}
                </div>
                <div className="flex gap-4 mt-2.5">
                  {[{ dot:'#10b981', l:'Done', n:hwStats.done }, { dot:'#f59e0b', l:'Partial', n:hwStats.partial }, { dot:'#fca5a5', l:'Not done', n:hwStats.notDone }].map(({ dot, l, n }) => (
                    <span key={l} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />{l} · {n}
                    </span>
                  ))}
                </div>
              </div>

              {/* tiles */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { bg:'#f0fdf4', c:'#10b981', Icon:CheckCircle, n:hwStats.done,    l:'Done'    },
                  { bg:'#fffbeb', c:'#f59e0b', Icon:Clock,        n:hwStats.partial, l:'Partial' },
                  { bg:'#fff1f2', c:'#ef4444', Icon:XCircle,      n:hwStats.notDone, l:'Not Done'},
                ].map(({ bg, c, Icon: I, n, l }) => (
                  <div key={l} className="rounded-xl p-3.5 text-center" style={{ backgroundColor: bg }}>
                    <I size={14} className="mx-auto mb-1.5" style={{ color: c }} />
                    <p className="text-xl font-bold leading-none" style={{ color: c }}>{n}</p>
                    <p className="text-[10px] font-semibold mt-1" style={{ color: c }}>{l}</p>
                  </div>
                ))}
              </div>

              {hwStats.overdue > 0 && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                  <AlertTriangle size={13} className="flex-shrink-0" />
                  {hwStats.overdue} assignment{hwStats.overdue > 1 ? 's' : ''} past due
                </div>
              )}
            </div>
          ) : <Empty icon={ClipboardList} text="No homework this term" />}
        </div>
      </div>

      {/* ── SCHEDULE + TESTS + EVENTS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center justify-between mb-1">
            <SectionLabel>Today's schedule</SectionLabel>
            <button onClick={() => nav('parent-daily')}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors mb-3">
              Daily view <ArrowRight size={10} />
            </button>
          </div>
          {todayClasses.length
            ? todayClasses.slice(0,7).map((c, i) => <ClassRow key={i} cls={c} color={theme.color} isLast={i === Math.min(todayClasses.length,7)-1} />)
            : <Empty icon={Clock} text="No classes today" />}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD_SHADOW }}>
          <SectionLabel>Upcoming tests</SectionLabel>
          {upcomingTests.length
            ? upcomingTests.map((t,i) => <DateRow key={t.id} title={t.title} sub={t.subject} date={t.test_date} color="#ef4444" diff={diff(t.test_date)} isLast={i===upcomingTests.length-1} />)
            : <Empty icon={BookOpen} text="No upcoming tests" />}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center justify-between mb-1">
            <SectionLabel>School events</SectionLabel>
            <button onClick={() => nav('parent-calendar')}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors mb-3">
              Calendar <ArrowRight size={10} />
            </button>
          </div>
          {upcomingEvents.length
            ? upcomingEvents.map((e,i) => <DateRow key={e.id} title={e.title} sub={e.event_type||''} date={e.start_date} color={e.color||theme.color} diff={diff(e.start_date)} isLast={i===upcomingEvents.length-1} />)
            : <Empty icon={Calendar} text="No upcoming events" />}
        </div>
      </div>

      {/* ── TERM FOOTER ──────────────────────────────────────────────────────── */}
      {theme.hasActiveTerm && (
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: theme.withAlpha(.08), border: `1px solid ${theme.withAlpha(.15)}` }}>
          <div className="flex items-center gap-2">
            <TermIcon size={13} style={theme.textStyle} />
            <span className="text-xs font-semibold" style={theme.textStyle}>{theme.name} Term · {theme.activeTerm?.academic_year}</span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              {new Date(theme.activeTerm?.start_date+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
              {' – '}
              {new Date(theme.activeTerm?.end_date  +'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})}
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

export default ParentDashboard;
