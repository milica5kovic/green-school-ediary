import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle, XCircle, AlertCircle, Clock,
  BookOpen, FileText, MessageSquare, Calendar,
  Users, GraduationCap, ClipboardList, Award,
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useActiveTerm from '../../../../shared/hooks/useActiveTerm';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { getGradeFromConfig, isPrimaryClass } from '../../../../core/utils/cambridgeGrading';

// ─── attendance config ────────────────────────────────────────────────────────

const ATT = {
  present:  { label: 'Present',   bg: '#dcfce7', color: '#15803d', dot: '#22c55e' },
  late:     { label: 'Late',      bg: '#fef3c7', color: '#d97706', dot: '#fbbf24' },
  absent:   { label: 'Absent',    bg: '#fee2e2', color: '#dc2626', dot: '#f87171' },
  sent_out: { label: 'Sent Out',  bg: '#ede9fe', color: '#7c3aed', dot: '#a78bfa' },
};

const CARD_SHADOW = '0 1px 3px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.08)';

// ─── helpers ─────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const cfg = ATT[status];
  if (!cfg) return <span className="text-xs text-slate-300">—</span>;
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
};

const StatTile = ({ icon: Icon, iconBg, iconColor, label, value, sub, valueColor }) => (
  <div className="flex items-center gap-3 px-4 py-3 border-l border-slate-100 first:border-l-0">
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
      <Icon size={16} style={{ color: iconColor }} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-1">{label}</p>
      <p className="text-sm font-bold leading-none" style={{ color: valueColor || '#0f172a' }}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5 leading-none">{sub}</p>}
    </div>
  </div>
);

// ─── main ─────────────────────────────────────────────────────────────────────

const ParentDailyViewPage = () => {
  const { supabase, setCurrentPage } = useApp();
  const { activeTerm } = useActiveTerm();
  const theme = useTermTheme();
  const TermIcon = theme.icon;
  const { gradingConfig, primaryColor } = useBranding();
  const accent = primaryColor || '#16a34a';
  const { children, selectedChild, setSelectedChild, loading: childLoading } = useParentChildrenCtx();

  const [date,         setDate]         = useState(new Date());
  const [classes,      setClasses]      = useState([]);
  const [attMap,       setAttMap]       = useState({});
  const [homework,     setHomework]     = useState([]);
  const [hwStatus,     setHwStatus]     = useState({});
  const [todayEvents,  setTodayEvents]  = useState([]);
  const [overallGrade, setOverallGrade] = useState(null);
  const [comments,     setComments]     = useState([]);
  const [busy,         setBusy]         = useState(false);

  const load = useCallback(async () => {
    if (!selectedChild || !supabase) return;
    setBusy(true);
    try {
      const key     = date.toISOString().split('T')[0];
      const cls     = selectedChild.class_name;
      const sid     = selectedChild.id;
      const tStart  = activeTerm?.start_date  || '2026-01-01';
      const tEnd    = activeTerm?.end_date    || '2026-12-31';
      const termNum = activeTerm?.term_number || null;

      const [
        { data: clsData },
        { data: attData },
        { data: hwData  },
        { data: evtData },
      ] = await Promise.all([
        supabase.from('classes')
          .select('id, subject, time, title, class_name, date_key')
          .eq('date_key', key).eq('class_name', cls).order('time'),
        supabase.from('attendance')
          .select('id, student_id, class_id, date_key, status, comment')
          .eq('date_key', key).eq('student_id', sid),
        supabase.from('homework')
          .select('id, title, subject, due_date, description')
          .eq('class_name', cls).eq('due_date', key).order('subject'),
        supabase.from('school_events')
          .select('id, title, event_type, start_date')
          .eq('start_date', key).order('title'),
      ]);

      setClasses(clsData || []);

      // attendance keyed by classes.id (not class_id FK)
      const amap = {};
      (attData || []).forEach(a => { amap[a.class_id] = a; });
      setAttMap(amap);

      setHomework(hwData || []);
      setTodayEvents(evtData || []);

      // homework submission status
      if (hwData?.length) {
        const { data: sh } = await supabase.from('student_homework')
          .select('id, homework_id, status, submitted_at')
          .eq('student_id', sid).in('homework_id', hwData.map(h => h.id));
        const sm = {};
        (sh || []).forEach(s => { sm[s.homework_id] = s; });
        setHwStatus(sm);
      } else setHwStatus({});

      // overall grade for term
      let grRaw = [];
      if (termNum) {
        const { data: tg } = await supabase.from('grades')
          .select('grade, max_grade').eq('student_id', sid).eq('term_number', termNum);
        const { data: lg } = await supabase.from('grades')
          .select('grade, max_grade').eq('student_id', sid).is('term_number', null)
          .gte('date', tStart).lte('date', tEnd);
        grRaw = [...(tg || []), ...(lg || [])];
      } else {
        const { data: g } = await supabase.from('grades')
          .select('grade, max_grade').eq('student_id', sid);
        grRaw = g || [];
      }
      if (grRaw.length) {
        const avg = Math.round(grRaw.reduce((s, g) => s + Math.round((g.grade / g.max_grade) * 100), 0) / grRaw.length);
        setOverallGrade({ ...getGradeFromConfig(avg, cls, gradingConfig), avg });
      } else setOverallGrade(null);

      // teacher comments
      try {
        const start = `${key}T00:00:00`;
        const end   = `${key}T23:59:59`;
        const { data: comm } = await supabase.from('teacher_comments')
          .select('*, teachers(full_name)')
          .eq('student_id', sid).eq('is_visible_to_parent', true)
          .gte('created_at', start).lte('created_at', end);
        setComments(comm || []);
      } catch { setComments([]); }

    } catch (e) { console.error('DailyView error:', e.message); }
    finally { setBusy(false); }
  }, [selectedChild, date, supabase, activeTerm, gradingConfig]);

  useEffect(() => { if (selectedChild) load(); }, [selectedChild, date, load]);

  // ── computed ───────────────────────────────────────────────────────────────
  const key        = date.toISOString().split('T')[0];
  const isToday    = date.toDateString() === new Date().toDateString();
  const attList    = Object.values(attMap);
  const nPresent   = attList.filter(a => a.status === 'present').length;
  const nLate      = attList.filter(a => a.status === 'late').length;
  const nAbsent    = attList.filter(a => a.status === 'absent').length;
  const nSentOut   = attList.filter(a => a.status === 'sent_out').length;
  const nMarked    = attList.length;
  const attRate    = classes.length > 0 ? Math.round((nPresent / classes.length) * 100) : null;

  const nHwPending = homework.filter(h => {
    const s = hwStatus[h.id]?.status;
    return !s || s === 'not_done';
  }).length;
  const nHwDone = homework.filter(h => hwStatus[h.id]?.status === 'done').length;

  // today's attendance status (overall)
  const todayOverallStatus = nAbsent > 0 ? 'absent'
    : nLate > 0 ? 'late'
    : nPresent > 0 ? 'present'
    : null;
  const todayAttCfg = todayOverallStatus ? ATT[todayOverallStatus] : null;

  const prev = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); };
  const next = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); };

  const hwLabel = (id) => {
    const s = hwStatus[id]?.status;
    if (s === 'done')           return { text: 'Submitted',   bg: '#dcfce7', color: '#15803d' };
    if (s === 'partially_done') return { text: 'In Progress', bg: '#fef3c7', color: '#d97706' };
    if (s === 'not_done')       return { text: 'Not Done',    bg: '#fee2e2', color: '#dc2626' };
    return                             { text: 'Pending',     bg: '#f1f5f9', color: '#64748b' };
  };

  // ── guards ────────────────────────────────────────────────────────────────
  if (childLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!children.length) return (
    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center" style={{ boxShadow: CARD_SHADOW }}>
      <Users size={40} className="mx-auto text-slate-200 mb-4" />
      <p className="text-slate-700 font-semibold">No student linked</p>
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 pb-6">

      {/* ── PAGE TITLE + DATE NAV ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daily View</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Overview of <span className="font-semibold text-slate-700">{selectedChild?.name}</span>'s day
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* child switcher */}
          {children.length > 1 && (
            <div className="relative">
              <select value={selectedChild?.id || ''}
                onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}
                className="appearance-none text-sm border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-slate-600 bg-white focus:outline-none cursor-pointer">
                {children.map(c => <option key={c.id} value={c.id}>{c.name} — {c.class_name}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
            </div>
          )}
        </div>
      </div>

      {/* ── DATE NAVIGATION ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 flex items-center justify-between px-4 py-3" style={{ boxShadow: CARD_SHADOW }}>
        <button onClick={prev}
          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ChevronLeft size={16} className="text-slate-500" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900 capitalize">
            {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {isToday && <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accent}15`, color: accent }}>Today</span>}
          </p>
          {!isToday && (
            <button onClick={() => setDate(new Date())} className="text-xs mt-0.5 hover:underline" style={{ color: accent }}>
              ← Back to today
            </button>
          )}
        </div>
        <button onClick={next}
          className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ChevronRight size={16} className="text-slate-500" />
        </button>
      </div>

      {/* ── STUDENT SUMMARY CARD ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex flex-wrap items-stretch divide-y sm:divide-y-0 sm:divide-x divide-slate-100">

          {/* student identity */}
          <div className="flex items-center gap-3 px-5 py-4 min-w-[200px]">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
              style={{ backgroundColor: accent }}>
              {selectedChild?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{selectedChild?.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">Class {selectedChild?.class_name}</p>
            </div>
          </div>

          {/* stat tiles */}
          <div className="flex flex-wrap flex-1 divide-x divide-slate-100">
            <StatTile
              icon={todayAttCfg ? CheckCircle : Clock}
              iconBg={todayAttCfg ? `${todayAttCfg.dot}18` : '#f1f5f9'}
              iconColor={todayAttCfg?.dot || '#94a3b8'}
              label="Attendance Today"
              value={todayAttCfg ? todayAttCfg.label : nMarked > 0 ? 'Mixed' : '—'}
              sub={nMarked > 0 ? `${nMarked} of ${classes.length} marked` : 'Not yet marked'}
              valueColor={todayAttCfg?.color}
            />
            <StatTile
              icon={GraduationCap}
              iconBg={`${accent}15`}
              iconColor={accent}
              label="Today's Classes"
              value={`${classes.length} ${classes.length === 1 ? 'Class' : 'Classes'}`}
              sub={nMarked > 0 ? `${nPresent} present · ${classes.length - nMarked} remaining` : 'Tap schedule below'}
            />
            <StatTile
              icon={ClipboardList}
              iconBg={nHwPending > 0 ? '#fff7ed' : '#f0fdf4'}
              iconColor={nHwPending > 0 ? '#ea580c' : '#16a34a'}
              label="Homework"
              value={homework.length > 0 ? `${nHwPending} Pending` : 'None due'}
              sub={nHwDone > 0 ? `${nHwDone} submitted` : undefined}
              valueColor={nHwPending > 0 ? '#ea580c' : '#16a34a'}
            />
            {overallGrade && (
              <StatTile
                icon={Award}
                iconBg={`${overallGrade.color}18`}
                iconColor={overallGrade.color}
                label="Overall Grade"
                value={`${overallGrade.display}  ${overallGrade.avg}%`}
                sub="This Term"
                valueColor={overallGrade.color}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── TODAY'S SCHEDULE (2/3) ──────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-2">
              <Calendar size={15} style={{ color: accent }} />
              <h3 className="text-sm font-semibold text-slate-900">Today's Schedule</h3>
            </div>
            {classes.length > 0 && (
              <span className="text-xs text-slate-400">{classes.length} {classes.length === 1 ? 'class' : 'classes'}</span>
            )}
          </div>

          {classes.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2">
              <Calendar size={28} className="text-slate-200" />
              <p className="text-sm text-slate-400">No classes scheduled for this day</p>
            </div>
          ) : (
            <>
              {/* column headers */}
              <div className="px-6 py-2 border-b border-slate-50 grid"
                style={{ gridTemplateColumns: '28px 80px 1fr 110px' }}>
                {['', 'TIME', 'SUBJECT', 'STATUS'].map((h, i) => (
                  <p key={i} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{h}</p>
                ))}
              </div>

              {/* timeline rows */}
              <div className="px-6 py-2 relative">
                {/* vertical connecting line */}
                {classes.length > 1 && (
                  <div className="absolute top-6 bottom-6 w-px bg-slate-100"
                    style={{ left: '34px' }} />
                )}

                {classes.map((cls, i) => {
                  const att = attMap[cls.id];
                  const cfg = att ? ATT[att.status] : null;
                  return (
                    <div key={cls.id} className="grid items-start py-3 gap-0 rounded-xl px-2 -mx-2 transition-colors hover:bg-slate-50/70"
                      style={{ gridTemplateColumns: '28px 80px 1fr 110px' }}>

                      {/* coloured dot */}
                      <div className="flex justify-center pt-1 z-10">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: cfg?.dot || '#e2e8f0' }} />
                      </div>

                      {/* time */}
                      <div className="pr-2">
                        <p className="text-xs font-semibold text-slate-700 tabular-nums leading-tight">{cls.time || '—'}</p>
                      </div>

                      {/* subject + lesson title + comment */}
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{cls.subject}</p>
                        {cls.title && cls.title !== cls.subject && (
                          <p className="text-xs text-slate-400 mt-0.5">{cls.title}</p>
                        )}
                        {att?.comment && (
                          <p className="text-xs italic mt-1.5 leading-snug" style={{ color: cfg?.color || '#64748b' }}>
                            "{att.comment}"
                          </p>
                        )}
                      </div>

                      {/* status badge */}
                      <div className="pt-0.5">
                        <StatusBadge status={att?.status} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* footer */}
              <div className="px-6 py-4 border-t border-slate-50">
                <button onClick={() => setCurrentPage?.('parent-attendance')}
                  className="flex items-center gap-1.5 text-xs font-semibold hover:underline transition-colors"
                  style={{ color: accent }}>
                  View Attendance History
                  <ChevronRight size={13} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Today's Homework */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-slate-900">Today's Homework</h3>
              </div>
              <button onClick={() => setCurrentPage?.('parent-homework')}
                className="text-xs font-semibold hover:underline" style={{ color: accent }}>
                View All
              </button>
            </div>

            {homework.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2">
                <FileText size={22} className="text-slate-200" />
                <p className="text-xs text-slate-400">No homework due today</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {homework.map(h => {
                  const lbl = hwLabel(h.id);
                  return (
                    <div key={h.id} className="px-6 py-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-orange-50">
                        <FileText size={15} className="text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 leading-snug">{h.title}</p>
                        {h.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-snug">{h.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar size={10} className="text-slate-300" />
                          <span className="text-[11px] text-slate-400">
                            Due {new Date(h.due_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: lbl.bg, color: lbl.color }}>
                        {lbl.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's Events */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <Calendar size={15} style={{ color: accent }} />
                <h3 className="text-sm font-semibold text-slate-900">Today's Events</h3>
              </div>
              <button onClick={() => setCurrentPage?.('parent-calendar')}
                className="text-xs font-semibold hover:underline" style={{ color: accent }}>
                View Calendar
              </button>
            </div>

            {todayEvents.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2">
                <Calendar size={22} className="text-slate-200" />
                <p className="text-xs text-slate-400">No events today</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {todayEvents.map(evt => (
                  <div key={evt.id} className="px-6 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${accent}15` }}>
                      <Calendar size={15} style={{ color: accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{evt.title}</p>
                      {evt.event_type && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {evt.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teacher Comments */}
          {comments.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
              <div className="flex items-center gap-2 px-6 pt-5 pb-4 border-b border-slate-50">
                <MessageSquare size={15} className="text-violet-500" />
                <h3 className="text-sm font-semibold text-slate-900">Teacher Comments</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {comments.map(c => (
                  <div key={c.id} className="px-6 py-4">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">
                      {c.teachers?.full_name || 'Teacher'}
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">{c.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── TODAY'S SUMMARY BAR ───────────────────────────────────────────── */}
      {classes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center gap-2 px-6 pt-4 pb-3 border-b border-slate-50">
            <GraduationCap size={14} className="text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Today's Summary</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-slate-100">
            {[
              { label: 'Classes',           value: classes.length,  color: '#0f172a'   },
              { label: 'Present',           value: nPresent,        color: '#16a34a'   },
              { label: 'Late',              value: nLate,           color: '#d97706'   },
              { label: 'Absent',            value: nAbsent,         color: '#dc2626'   },
              { label: 'Sent Out',          value: nSentOut,        color: '#7c3aed'   },
              { label: 'Daily Attendance',  value: attRate != null ? `${attRate}%` : '—', color: attRate >= 80 ? '#16a34a' : attRate != null ? '#dc2626' : '#94a3b8' },
            ].map(({ label, value, color }) => (
              <div key={label} className="py-4 text-center">
                <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-1.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TERM PROGRESS ─────────────────────────────────────────────────── */}
      {theme.hasActiveTerm && (
        <div className="bg-white rounded-2xl border border-slate-100 px-6 py-4 flex items-center gap-5" style={{ boxShadow: CARD_SHADOW }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${theme.color}15` }}>
            <TermIcon size={16} style={{ color: theme.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-900">
                {theme.name} Term · {theme.activeTerm?.academic_year}
              </p>
              <p className="text-xs font-semibold text-slate-500">{theme.daysRemaining} days left</p>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-2 rounded-full transition-all" style={{ width: `${Math.round(theme.progress)}%`, backgroundColor: theme.color }} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-[11px] text-slate-400">
                {new Date(theme.activeTerm?.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
              <p className="text-[11px] text-slate-400">
                {new Date(theme.activeTerm?.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
        </div>
      )}

      {busy && <div className="fixed bottom-6 right-6 w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin pointer-events-none z-50" />}

    </div>
  );
};

export default ParentDailyViewPage;
