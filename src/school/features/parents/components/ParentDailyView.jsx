import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle, XCircle, AlertCircle, BookOpen,
  FileText, MessageSquare, Award, Users,
  Bell, LayoutDashboard, TrendingUp, ClipboardList, Zap,
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';

// ─── attendance config ────────────────────────────────────────────────────────

const ATT = {
  present:  { label: 'Present',      Icon: CheckCircle,  badgeBg: '#dcfce7', badgeText: '#15803d', dot: '#22c55e', cardBg: '#f0fdf4', cardBorder: '#bbf7d0', noteColor: '#16a34a' },
  late:     { label: 'Late',         Icon: Clock,        badgeBg: '#fef9c3', badgeText: '#a16207', dot: '#fbbf24', cardBg: '#fefce8', cardBorder: '#fde68a', noteColor: '#ca8a04' },
  absent:   { label: 'Absent',       Icon: XCircle,      badgeBg: '#fee2e2', badgeText: '#b91c1c', dot: '#f87171', cardBg: '#fff1f2', cardBorder: '#fecdd3', noteColor: '#dc2626' },
  sent_out: { label: 'Sent Out',     Icon: AlertCircle,  badgeBg: '#ede9fe', badgeText: '#6d28d9', dot: '#c084fc', cardBg: '#faf5ff', cardBorder: '#ddd6fe', noteColor: '#7c3aed' },
  default:  { label: 'Not Recorded', Icon: Clock,        badgeBg: '#f1f5f9', badgeText: '#64748b', dot: '#cbd5e1', cardBg: '#f8fafc', cardBorder: '#e2e8f0', noteColor: '#94a3b8' },
};

const COMMENT = {
  positive:        { label: 'Positive',   color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
  neutral:         { label: 'Neutral',    color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  needs_attention: { label: 'Needs Work', color: '#ef4444', bg: '#fff1f2', border: '#fecdd3' },
};

const CARD_SHADOW = '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)';

// ─── primitives ───────────────────────────────────────────────────────────────

const SectionLabel = ({ children }) =>
  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-6 pt-5 pb-3">{children}</p>;

const Empty = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-2">
    <Icon size={24} className="text-slate-200" />
    <p className="text-sm text-slate-400">{text}</p>
  </div>
);

const StatusPill = ({ status }) => {
  const cfg = ATT[status] || ATT.default;
  const I   = cfg.Icon;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
      style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeText }}>
      <I size={10} />{cfg.label}
    </span>
  );
};

// ─── main ─────────────────────────────────────────────────────────────────────

const ParentDailyViewPage = () => {
  const { supabase, setCurrentPage } = useApp();
  const theme = useTermTheme();
  const TermIcon = theme.icon;
  const { children, selectedChild, setSelectedChild, loading: childLoading } = useParentChildrenCtx();

  const [date,      setDate]      = useState(new Date());
  const [classes,   setClasses]   = useState([]);
  const [attMap,    setAttMap]    = useState({});
  const [homework,  setHomework]  = useState([]);
  const [hwStatus,  setHwStatus]  = useState({});
  const [grades,    setGrades]    = useState([]);
  const [comments,  setComments]  = useState([]);
  const [notices,   setNotices]   = useState([]);
  const [busy,      setBusy]      = useState(false);

  // ── load ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!selectedChild) return;
    setBusy(true);
    try {
      const key   = date.toISOString().split('T')[0];
      const start = `${key}T00:00:00`;
      const end   = `${key}T23:59:59`;

      const [
        { data: cls  },
        { data: att  },
        { data: hw   },
        { data: gr   },
        { data: comm },
      ] = await Promise.all([
        supabase.from('classes').select('*').eq('date_key', key).eq('class_name', selectedChild.class_name).order('time'),
        supabase.from('attendance').select('*').eq('date_key', key).eq('student_id', selectedChild.id),
        supabase.from('homework').select('*').eq('class_name', selectedChild.class_name).eq('due_date', key).order('subject'),
        supabase.from('grades').select('*').eq('student_id', selectedChild.id).eq('date', key),
        supabase.from('teacher_comments')
          .select('*, teachers(full_name,subjects)')
          .eq('student_id', selectedChild.id)
          .eq('is_visible_to_parent', true)
          .gte('created_at', start).lte('created_at', end),
      ]);

      setClasses(cls || []);
      const map = {};
      (att || []).forEach(a => { map[a.class_id] = a; });
      setAttMap(map);
      setHomework(hw || []);
      setGrades(gr   || []);
      setComments(comm || []);

      if (hw?.length) {
        const { data: sh } = await supabase.from('student_homework').select('*')
          .eq('student_id', selectedChild.id).in('homework_id', hw.map(h => h.id));
        const sm = {};
        (sh || []).forEach(s => { sm[s.homework_id] = s; });
        setHwStatus(sm);
      } else setHwStatus({});

      try {
        const { data: ann } = await supabase.from('announcements').select('*')
          .eq('is_active', true).lte('created_at', end)
          .order('created_at', { ascending: false }).limit(3);
        setNotices(ann || []);
      } catch { setNotices([]); }

    } catch (e) { console.error('DailyView error:', e); }
    finally { setBusy(false); }
  }, [selectedChild, date, supabase]);

  useEffect(() => { if (selectedChild) load(); }, [selectedChild, date, load]);

  // ── computed ─────────────────────────────────────────────────────────────

  const isToday      = date.toDateString() === new Date().toDateString();
  const attList      = Object.values(attMap);
  const presentCount = attList.filter(a => a.status === 'present').length;
  const lateCount    = attList.filter(a => a.status === 'late').length;
  const absentCount  = attList.filter(a => a.status === 'absent').length;

  const hwLabel = (id) => {
    const s = hwStatus[id];
    if (!s) return { text: 'Pending',      style: { backgroundColor: '#f1f5f9', color: '#64748b' } };
    switch (s.status) {
      case 'done':           return { text: '✓ Submitted',   style: { backgroundColor: '#dcfce7', color: '#15803d' } };
      case 'partially_done': return { text: '◐ In Progress', style: { backgroundColor: '#fef9c3', color: '#a16207' } };
      case 'not_done':       return { text: '✗ Not Done',    style: { backgroundColor: '#fee2e2', color: '#b91c1c' } };
      default:               return { text: 'Pending',       style: { backgroundColor: '#f1f5f9', color: '#64748b' } };
    }
  };

  const prev = () => { const d = new Date(date); d.setDate(d.getDate()-1); setDate(d); };
  const next = () => { const d = new Date(date); d.setDate(d.getDate()+1); setDate(d); };

  const fmt  = (d) => d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // ── guards ───────────────────────────────────────────────────────────────

  if (childLoading) return (
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

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
        style={{ ...theme.gradientStyle, boxShadow: '0 4px 24px rgba(15,23,42,.14), 0 1px 4px rgba(15,23,42,.06)' }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/[.06] pointer-events-none" />
        <div className="absolute -bottom-20 -left-12 w-56 h-56 rounded-full bg-black/[.04] pointer-events-none" />

        <div className="relative z-10">
          {/* title row */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-white/60 text-xs font-medium mb-1">Parent Portal</p>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Daily View</h1>
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
                    {children.map(c => <option key={c.id} value={c.id} className="text-slate-900">{c.name} — {c.class_name}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                </div>
              )}
            </div>
          </div>

          {/* date nav */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={prev}
              className="w-9 h-9 bg-white/[.12] hover:bg-white/[.2] border border-white/[.15] rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
              <ChevronLeft size={17} />
            </button>
            <div className="flex-1 text-center">
              <p className="font-semibold tracking-tight capitalize text-sm md:text-base">{fmt(date)}</p>
              {isToday
                ? <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium px-3 py-0.5 rounded-full bg-white/[.15]">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />Today
                  </span>
                : <button onClick={() => setDate(new Date())}
                    className="mt-1 text-xs text-white/60 hover:text-white/90 transition-colors underline underline-offset-2">
                    ← Back to today
                  </button>
              }
            </div>
            <button onClick={next}
              className="w-9 h-9 bg-white/[.12] hover:bg-white/[.2] border border-white/[.15] rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
              <ChevronRight size={17} />
            </button>
          </div>

          {/* daily stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { l:'Classes',  v: classes.length },
              { l:'Present',  v: presentCount   },
              { l:'Late',     v: lateCount       },
              { l:'Absent',   v: absentCount     },
            ].map(({ l, v }, i) => (
              <div key={i} className="bg-white/[.10] backdrop-blur-sm border border-white/[.12] rounded-xl px-2 py-3 text-center">
                <p className="text-xl font-bold leading-none">{v}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60 mt-1.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
        {busy && <div className="absolute bottom-4 right-4 w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />}
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      {!busy && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── LEFT: SCHEDULE + NOTICES ─────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Schedule */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
              <SectionLabel>Today's schedule{classes.length > 0 && ` · ${classes.length} classes`}</SectionLabel>

              {classes.length === 0
                ? <div className="pb-10"><Empty icon={Calendar} text="No classes scheduled for this day" /></div>
                : (
                  <div className="px-6 pb-6">
                    <div className="relative">
                      {classes.length > 1 && (
                        <div className="absolute top-5 bottom-5 w-px bg-slate-100" style={{ left: '60px' }} />
                      )}
                      <div className="space-y-3">
                        {classes.map(cls => {
                          const a   = attMap[cls.class_id];
                          const cfg = ATT[a?.status] || ATT.default;
                          return (
                            <div key={cls.id} className="flex items-start gap-3">
                              {/* time */}
                              <div className="w-12 flex-shrink-0 text-right pt-3.5">
                                <span className="text-[11px] font-semibold text-slate-400 tabular-nums">{cls.time || '—'}</span>
                              </div>
                              {/* dot */}
                              <div className="flex-shrink-0 pt-3 z-10">
                                <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                  style={{ backgroundColor: cfg.dot }} />
                              </div>
                              {/* card */}
                              <div className="flex-1 min-w-0 rounded-xl border p-4 transition-all"
                                style={{ backgroundColor: cfg.cardBg, borderColor: cfg.cardBorder }}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm leading-snug">{cls.subject}</p>
                                    {cls.title && cls.title !== cls.subject && (
                                      <p className="text-xs text-slate-400 mt-0.5">{cls.title}</p>
                                    )}
                                  </div>
                                  <StatusPill status={a?.status} />
                                </div>
                                {a?.comment && (
                                  <div className="mt-3 pt-3 border-t flex items-start gap-2"
                                    style={{ borderColor: `${cfg.dot}25` }}>
                                    <MessageSquare size={11} style={{ color: cfg.noteColor }} className="flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-slate-600 leading-snug">{a.comment}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )
              }
            </div>

            {/* Notices */}
            {notices.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
                <SectionLabel>Announcements</SectionLabel>
                <div className="px-6 pb-6 space-y-3">
                  {notices.map(n => (
                    <div key={n.id} className="p-4 rounded-xl bg-sky-50 border border-sky-100">
                      <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                      {n.content && <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{n.content}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: HOMEWORK · GRADES · COMMENTS · ACTIONS ────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Homework */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
              <SectionLabel>Homework due{homework.length > 0 && ` · ${homework.length}`}</SectionLabel>
              {homework.length === 0
                ? <div className="pb-10"><Empty icon={FileText} text="No homework due today" /></div>
                : (
                  <div className="px-6 pb-6 space-y-2.5">
                    {homework.map(h => {
                      const s = hwLabel(h.id);
                      return (
                        <div key={h.id} className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">{h.subject}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={s.style}>{s.text}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-800 leading-snug">{h.title}</p>
                          {h.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{h.description}</p>}
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>

            {/* Grades */}
            {grades.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
                <SectionLabel>Today's grades · {grades.length}</SectionLabel>
                <div className="px-6 pb-6 space-y-2.5">
                  {grades.map(g => {
                    const pct = Math.round((g.grade / g.max_grade) * 100);
                    const [gc, gbg] = pct >= 80 ? ['#15803d','#dcfce7'] : pct >= 60 ? ['#a16207','#fef9c3'] : ['#b91c1c','#fee2e2'];
                    return (
                      <div key={g.id} className="flex items-center gap-3 p-4 rounded-xl bg-violet-50 border border-violet-100">
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wide">
                            {g.subject}{g.assessment_type && <span className="font-normal text-slate-400 normal-case ml-1">· {g.assessment_type}</span>}
                          </span>
                          <p className="text-sm font-medium text-slate-800 truncate mt-0.5">{g.assessment_title}</p>
                        </div>
                        <div className="text-center px-3 py-2 rounded-xl flex-shrink-0" style={{ backgroundColor: gbg }}>
                          <p className="text-base font-bold leading-none" style={{ color: gc }}>
                            {g.grade}<span className="text-[10px] font-normal opacity-40">/{g.max_grade}</span>
                          </p>
                          <p className="text-[10px] font-semibold mt-0.5" style={{ color: gc }}>{pct}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Teacher comments */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
              <SectionLabel>Teacher comments{comments.length > 0 && ` · ${comments.length}`}</SectionLabel>
              {comments.length === 0
                ? <div className="pb-10"><Empty icon={MessageSquare} text="No comments for this day" /></div>
                : (
                  <div className="px-6 pb-6 space-y-3">
                    {comments.map(c => {
                      const cfg  = COMMENT[c.comment_type] || COMMENT.neutral;
                      const name = c.teachers?.full_name || 'Teacher';
                      const subj = c.teachers?.subjects?.[0] || '';
                      return (
                        <div key={c.id} className="p-4 rounded-xl border"
                          style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                              style={{ backgroundColor: cfg.color }}>
                              {name.split(' ').map(n => n[0]).join('').slice(0,2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">{name}</p>
                              {subj && <p className="text-[10px] text-slate-400">{subj}</p>}
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                              style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{c.comment}</p>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_SHADOW }}>
              <SectionLabel>Quick actions</SectionLabel>
              <div className="px-6 pb-6 grid grid-cols-2 gap-2">
                {[
                  { Icon: LayoutDashboard, label: 'Overview',     page: 'home',            color: theme.color },
                  { Icon: TrendingUp,      label: 'Grades',       page: 'parent-grades',   color: '#7c3aed'  },
                  { Icon: Calendar,        label: 'Calendar',     page: 'parent-calendar', color: '#0891b2'  },
                  { Icon: ClipboardList,   label: 'All Homework', page: 'parent-homework', color: '#ea580c'  },
                ].map(({ Icon, label, page, color }) => (
                  <button key={page} onClick={() => setCurrentPage?.(page)}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition-all group">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
                      <Icon size={15} style={{ color }} />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">{label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── TERM FOOTER ─────────────────────────────────────────────────────── */}
      {theme.hasActiveTerm && (
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: theme.withAlpha(.08), border: `1px solid ${theme.withAlpha(.15)}` }}>
          <div className="flex items-center gap-2">
            <TermIcon size={13} style={theme.textStyle} />
            <span className="text-xs font-semibold" style={theme.textStyle}>{theme.name} Term {theme.activeTerm?.academic_year}</span>
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

export default ParentDailyViewPage;
