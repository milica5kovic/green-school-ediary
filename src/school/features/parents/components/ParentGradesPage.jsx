import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, TrendingUp, TrendingDown,
  BookOpen, Globe, Monitor, Palette, Music, Activity,
  BookMarked, Award, BarChart3, GraduationCap, Users
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useActiveTerm from '../../../../shared/hooks/useActiveTerm';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { getGradeFromConfig, isPrimaryClass } from '../../../../core/utils/cambridgeGrading';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════
const CARD = '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)';

// Map subject name keywords → icon
const SUBJECT_ICON_MAP = [
  [['english', 'language', 'literacy', 'reading', 'writing'], BookOpen],
  [['science', 'biology', 'chemistry', 'physics'],            BookMarked],
  [['geography', 'social', 'history', 'humanities'],          Globe],
  [['computer', 'ict', 'technology', 'coding', 'digital'],    Monitor],
  [['art', 'design', 'creative'],                             Palette],
  [['music', 'singing'],                                      Music],
  [['pe', 'physical', 'sport', 'gym'],                        Activity],
  [['maths', 'math', 'numeracy', 'statistics'],               BarChart3],
];

const getSubjectIcon = subject => {
  const key = (subject || '').toLowerCase();
  const match = SUBJECT_ICON_MAP.find(([kws]) => kws.some(k => key.includes(k)));
  return match ? match[1] : BookMarked;
};

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

// Stat tile used in the 4-card row
const StatCard = ({ label, value, sub, icon: Icon, accent }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-3" style={{ boxShadow: CARD }}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: accent + '18' }}>
        <Icon size={15} style={{ color: accent }} />
      </div>
    </div>
    <div>
      <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// Progress delta badge  (↑ +7%, ↓ −3%, — same)
const ProgressBadge = ({ delta }) => {
  if (delta === null || delta === undefined) return <span className="text-slate-300 text-sm">—</span>;
  if (delta === 0) return (
    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">0%</span>
  );
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${
      up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    }`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? '+' : ''}{delta}%
    </span>
  );
};

// Grade badge pill
const GradeBadge = ({ cambridge, size = 'md' }) => {
  if (!cambridge) return null;
  const cls = size === 'sm'
    ? 'text-[11px] px-2 py-0.5 rounded-lg font-bold'
    : 'text-sm px-3 py-1 rounded-xl font-bold';
  return (
    <span className={cls} style={{ backgroundColor: cambridge.color + '18', color: cambridge.color, border: `1px solid ${cambridge.color}35` }}>
      {cambridge.display}
    </span>
  );
};

// Grading scale sidebar card — shows only the child's relevant scale
const GradingScaleCard = ({ gradingConfig, isPrimary, accent }) => {
  const tier = isPrimary ? gradingConfig?.primary : (gradingConfig?.secondary || gradingConfig?.lower_secondary);
  const grades = tier?.grades;
  if (!grades?.length) return null;

  const legendGroups = [
    { label: 'Excellent',        filter: g => (g.min ?? 0) >= 85 },
    { label: 'Good',             filter: g => (g.min ?? 0) >= 70 && (g.min ?? 0) < 85 },
    { label: 'Satisfactory',     filter: g => (g.min ?? 0) >= 55 && (g.min ?? 0) < 70 },
    { label: 'Needs Improvement',filter: g => (g.min ?? 0) >= 40 && (g.min ?? 0) < 55 },
    { label: 'Unsatisfactory',   filter: g => (g.min ?? 0) < 40 },
  ].filter(lg => grades.some(lg.filter));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 sticky top-4" style={{ boxShadow: CARD }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: accent + '18' }}>
          <Award size={13} style={{ color: accent }} />
        </div>
        <p className="font-semibold text-slate-900 text-sm">Grading Scale</p>
      </div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
        {isPrimary ? 'Primary (Years 1–6)' : 'Lower Secondary (Years 7–9+)'}
      </p>

      {/* Grade chips */}
      <div className="space-y-1.5 mb-5">
        {grades.map((g, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-6 rounded text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: g.color }}>
                {g.label || g.display}
              </span>
              <span className="text-xs text-slate-500">{g.label || g.display}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {g.min !== undefined ? `${g.min}%+` : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      {legendGroups.length > 0 && (
        <>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Grade Legend</p>
          <div className="space-y-1.5">
            {legendGroups.map(lg => {
              const firstGrade = grades.find(lg.filter);
              return (
                <div key={lg.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: firstGrade?.color || '#94a3b8' }} />
                  <span className="text-xs text-slate-600">{lg.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
const ParentGradesPage = () => {
  const { supabase }                                  = useApp();
  const { activeTerm, terms }                         = useActiveTerm();
  const theme                                         = useTermTheme();
  const { gradingConfig, primaryColor }               = useBranding();
  const { children, selectedChild, setSelectedChild, loading } = useParentChildrenCtx();

  const accentColor = primaryColor || '#059669';

  // ── state ─────────────────────────────────────────────────────────────────
  const [selectedTerm,    setSelectedTerm]    = useState(null);
  const [currGrades,      setCurrGrades]      = useState([]);
  const [prevGrades,      setPrevGrades]      = useState([]);
  const [subjectTeachers, setSubjectTeachers] = useState({});  // { subject: 'Mrs Smith' }
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [busy,            setBusy]            = useState(false);

  // Default to active term
  useEffect(() => {
    if (activeTerm && !selectedTerm) setSelectedTerm(activeTerm);
  }, [activeTerm, selectedTerm]);

  // ── fetch teachers by subject ─────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    supabase.from('teachers').select('full_name, subjects').not('subjects', 'is', null)
      .then(({ data }) => {
        const map = {};
        data?.forEach(t => {
          const subjs = Array.isArray(t.subjects) ? t.subjects : [t.subjects];
          subjs.forEach(s => { if (s && !map[s]) map[s] = t.full_name; });
        });
        setSubjectTeachers(map);
      });
  }, [supabase]);

  // ── fetch grades for selected term + previous term ─────────────────────────
  const loadGrades = useCallback(async () => {
    if (!supabase || !selectedChild || !selectedTerm) return;
    setBusy(true);
    try {
      const id  = selectedChild.id;
      const tn  = selectedTerm.term_number;
      const cls = selectedChild.class_name;

      // Current term grades (by term_number OR by date range)
      const [{ data: tg }, { data: lg }] = await Promise.all([
        supabase.from('grades').select('*').eq('student_id', id).eq('term_number', tn).order('date', { ascending: false }),
        supabase.from('grades').select('*').eq('student_id', id).is('term_number', null)
          .gte('date', selectedTerm.start_date).lte('date', selectedTerm.end_date).order('date', { ascending: false }),
      ]);
      const all = [...(tg || []), ...(lg || [])];
      const enriched = all.map(g => {
        const pct = Math.round((g.grade / g.max_grade) * 100);
        return { ...g, percentage: pct, cambridge: getGradeFromConfig(pct, cls, gradingConfig) };
      });
      setCurrGrades(enriched);

      // Previous term grades (term_number - 1, same academic year)
      const prevTerm = terms?.find(t =>
        t.term_number === tn - 1 && t.academic_year === selectedTerm.academic_year
      );
      if (prevTerm) {
        const [{ data: ptg }, { data: plg }] = await Promise.all([
          supabase.from('grades').select('*').eq('student_id', id).eq('term_number', tn - 1).order('date'),
          supabase.from('grades').select('*').eq('student_id', id).is('term_number', null)
            .gte('date', prevTerm.start_date).lte('date', prevTerm.end_date).order('date'),
        ]);
        const prevAll = [...(ptg || []), ...(plg || [])];
        setPrevGrades(prevAll.map(g => ({ ...g, percentage: Math.round((g.grade / g.max_grade) * 100) })));
      } else {
        setPrevGrades([]);
      }
    } catch (err) { console.error('loadGrades:', err); }
    finally { setBusy(false); }
  }, [supabase, selectedChild, selectedTerm, gradingConfig, terms]);

  useEffect(() => { loadGrades(); }, [loadGrades]);

  // ── derived: subject rows ──────────────────────────────────────────────────
  const subjectRows = useMemo(() => {
    const map = {};
    currGrades.forEach(g => {
      if (!map[g.subject]) map[g.subject] = { grades: [] };
      map[g.subject].grades.push(g);
    });

    const prevMap = {};
    prevGrades.forEach(g => {
      if (!prevMap[g.subject]) prevMap[g.subject] = { total: 0, n: 0 };
      prevMap[g.subject].total += g.percentage;
      prevMap[g.subject].n++;
    });

    return Object.entries(map).map(([subject, { grades: gs }]) => {
      const currAvg = Math.round(gs.reduce((s, g) => s + g.percentage, 0) / gs.length);
      const prevAvg = prevMap[subject] ? Math.round(prevMap[subject].total / prevMap[subject].n) : null;
      const delta   = prevAvg !== null ? currAvg - prevAvg : null;
      const cambridge = getGradeFromConfig(currAvg, selectedChild?.class_name || 'Y1', gradingConfig);
      return { subject, grades: gs, teacher: subjectTeachers[subject] || null, currAvg, prevAvg, delta, cambridge };
    }).sort((a, b) => b.currAvg - a.currAvg);
  }, [currGrades, prevGrades, subjectTeachers, selectedChild, gradingConfig]);

  // ── derived: stat tiles ────────────────────────────────────────────────────
  const overallAvg = useMemo(() => {
    if (!currGrades.length) return null;
    const avg = Math.round(currGrades.reduce((s, g) => s + g.percentage, 0) / currGrades.length);
    return { pct: avg, cambridge: getGradeFromConfig(avg, selectedChild?.class_name || 'Y1', gradingConfig) };
  }, [currGrades, selectedChild, gradingConfig]);

  const highestSubject = useMemo(() => subjectRows[0] || null, [subjectRows]);

  const improvement = useMemo(() => {
    if (!prevGrades.length || !currGrades.length) return null;
    const prevAvg = Math.round(prevGrades.reduce((s, g) => s + g.percentage, 0) / prevGrades.length);
    const currAvg = overallAvg?.pct ?? 0;
    return currAvg - prevAvg;
  }, [prevGrades, currGrades, overallAvg]);

  const isPrimary = isPrimaryClass(selectedChild?.class_name);

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 rounded-full animate-spin"
        style={{ borderColor: accentColor + '33', borderTopColor: 'transparent' }} />
    </div>
  );

  if (!children.length) return (
    <div className="bg-white rounded-2xl p-12 text-center border border-slate-100" style={{ boxShadow: CARD }}>
      <Users size={48} className="mx-auto text-slate-200 mb-4" />
      <p className="text-slate-600 text-lg font-semibold">No student data available</p>
      <p className="text-slate-400 text-sm mt-2">Please contact your school administrator</p>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ─── HEADER ───────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ backgroundColor: accentColor, boxShadow: `0 4px 24px ${accentColor}55` }}
      >
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/[.06] pointer-events-none" />
        <div className="absolute -bottom-14 -left-8 w-40 h-40 rounded-full bg-black/[.06] pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          {/* Student info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {selectedChild?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight">{selectedChild?.name}</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 border border-white/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                  Active
                </span>
              </div>
              <p className="text-white/70 text-sm mt-0.5">
                Year {selectedChild?.class_name} · {isPrimary ? 'Cambridge Primary' : 'Cambridge IGCSE'}
              </p>
            </div>
          </div>

          {/* Controls: child selector + term selector */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Child selector */}
            {children.length > 1 && (
              <div className="relative">
                <select
                  value={selectedChild?.id || ''}
                  onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}
                  className="appearance-none bg-white/20 border border-white/30 rounded-xl px-3 py-2 pr-8 text-sm font-medium text-white focus:outline-none cursor-pointer"
                >
                  {children.map(c => (
                    <option key={c.id} value={c.id} className="text-slate-900">{c.name} — {c.class_name}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/70" />
              </div>
            )}

            {/* Term selector */}
            {terms && terms.length > 0 && (
              <div className="relative">
                <select
                  value={selectedTerm?.id || ''}
                  onChange={e => { setSelectedTerm(terms.find(t => t.id === e.target.value)); setExpandedSubject(null); }}
                  className="appearance-none bg-white/20 border border-white/30 rounded-xl px-3 py-2 pr-8 text-sm font-semibold text-white focus:outline-none cursor-pointer"
                >
                  {terms.map(t => (
                    <option key={t.id} value={t.id} className="text-slate-900">
                      Term {t.term_number} · {t.academic_year}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/70" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4 STAT TILES ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Overall Average"
          value={overallAvg ? `${overallAvg.pct}%` : '—'}
          sub={overallAvg?.cambridge?.display ? `Grade ${overallAvg.cambridge.display}` : 'No grades yet'}
          icon={BarChart3}
          accent={overallAvg?.cambridge?.color || accentColor}
        />
        <StatCard
          label="Highest Subject"
          value={highestSubject ? `${highestSubject.currAvg}%` : '—'}
          sub={highestSubject?.subject || 'No data'}
          icon={Award}
          accent={highestSubject?.cambridge?.color || accentColor}
        />
        <StatCard
          label="vs Previous Term"
          value={improvement !== null ? `${improvement > 0 ? '+' : ''}${improvement}%` : '—'}
          sub={improvement !== null ? (improvement >= 0 ? 'Improvement' : 'Declined') : 'No previous term'}
          icon={improvement !== null && improvement >= 0 ? TrendingUp : TrendingDown}
          accent={improvement === null ? '#94a3b8' : improvement >= 0 ? '#16a34a' : '#ef4444'}
        />
        <StatCard
          label="Assessments"
          value={currGrades.length || '—'}
          sub={currGrades.length > 0 ? `Across ${subjectRows.length} subject${subjectRows.length !== 1 ? 's' : ''}` : 'This term'}
          icon={GraduationCap}
          accent={accentColor}
        />
      </div>

      {/* ─── MAIN CONTENT + SIDEBAR ───────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_240px] gap-5 items-start">

        {/* Subject grades table */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD }}>

          {/* Table header */}
          <div className="grid gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-100"
            style={{ gridTemplateColumns: '2fr 1.4fr 72px 72px 80px 72px' }}>
            {['Subject', 'Teacher', 'Prev', 'Now', 'Progress', 'Grade'].map(h => (
              <p key={h} className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{h}</p>
            ))}
          </div>

          {busy ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 rounded-full animate-spin"
                style={{ borderColor: accentColor + '33', borderTopColor: 'transparent' }} />
            </div>
          ) : subjectRows.length === 0 ? (
            <div className="text-center py-16">
              <BarChart3 size={36} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500 font-medium text-sm">No grades this term</p>
              <p className="text-xs text-slate-400 mt-1">Grades will appear as teachers enter them</p>
            </div>
          ) : (
            <div>
              {subjectRows.map((row, idx) => {
                const SubjectIcon = getSubjectIcon(row.subject);
                const isExpanded  = expandedSubject === row.subject;
                const isLast      = idx === subjectRows.length - 1;

                return (
                  <div key={row.subject}>
                    {/* Subject row */}
                    <button
                      onClick={() => setExpandedSubject(isExpanded ? null : row.subject)}
                      className={`w-full grid gap-3 px-5 py-4 items-center text-left transition-colors ${
                        isExpanded ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                      } ${!isLast || isExpanded ? 'border-b border-slate-100' : ''}`}
                      style={{ gridTemplateColumns: '2fr 1.4fr 72px 72px 80px 72px' }}
                    >
                      {/* Subject name + icon */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: (row.cambridge?.color || accentColor) + '18' }}>
                          <SubjectIcon size={15} style={{ color: row.cambridge?.color || accentColor }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{row.subject}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <ChevronRight
                              size={12}
                              className="transition-transform text-slate-300"
                              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            />
                            <span className="text-[11px] text-slate-400">{row.grades.length} assessment{row.grades.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* Teacher */}
                      <p className="text-xs text-slate-500 truncate">
                        {row.teacher || <span className="text-slate-300">—</span>}
                      </p>

                      {/* Prev term */}
                      <p className="text-sm font-medium text-slate-400">
                        {row.prevAvg !== null ? `${row.prevAvg}%` : <span className="text-slate-300">—</span>}
                      </p>

                      {/* This term */}
                      <p className="text-sm font-semibold text-slate-900">{row.currAvg}%</p>

                      {/* Progress */}
                      <div>
                        <ProgressBadge delta={row.delta} />
                      </div>

                      {/* Grade badge */}
                      <GradeBadge cambridge={row.cambridge} size="sm" />
                    </button>

                    {/* Expanded: individual assessments */}
                    {isExpanded && (
                      <div className={`bg-slate-50/80 ${!isLast ? 'border-b border-slate-100' : ''}`}>
                        {row.grades.map((g, i) => (
                          <div key={g.id || i}
                            className="grid items-center gap-3 px-5 py-3 border-b border-slate-100/80 last:border-0"
                            style={{ gridTemplateColumns: '1fr auto auto auto' }}
                          >
                            {/* Assessment title + date */}
                            <div className="pl-11 min-w-0">
                              <p className="text-sm text-slate-700 font-medium truncate">{g.assessment_title || 'Assessment'}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {g.date
                                  ? new Date(g.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : '—'}
                                {g.assessment_type && <span className="ml-1 text-slate-300">· {g.assessment_type}</span>}
                              </p>
                            </div>
                            {/* Score */}
                            <p className="text-xs text-slate-500 font-medium whitespace-nowrap">{g.grade}/{g.max_grade}</p>
                            {/* % */}
                            <p className="text-sm font-semibold text-slate-700 w-10 text-right">{g.percentage}%</p>
                            {/* Grade */}
                            <GradeBadge cambridge={g.cambridge} size="sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Grading scale sidebar */}
        <GradingScaleCard
          gradingConfig={gradingConfig}
          isPrimary={isPrimary}
          accent={accentColor}
        />
      </div>

      {/* ─── TERM FOOTER ──────────────────────────────────────────────────── */}
      {selectedTerm && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: accentColor + '0f', border: `1px solid ${accentColor}28` }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: accentColor }}>
              Term {selectedTerm.term_number} · {selectedTerm.academic_year}
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              {new Date(selectedTerm.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(selectedTerm.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 h-1.5 rounded-full hidden sm:block" style={{ backgroundColor: accentColor + '20' }}>
              <div className="h-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: accentColor,
                  width: `${Math.min(100, Math.max(0,
                    ((Date.now() - new Date(selectedTerm.start_date).getTime()) /
                     (new Date(selectedTerm.end_date).getTime() - new Date(selectedTerm.start_date).getTime())) * 100
                  ))}%`
                }}
              />
            </div>
            <span className="text-[11px] font-semibold" style={{ color: accentColor }}>
              {Math.max(0, Math.ceil((new Date(selectedTerm.end_date + 'T00:00:00') - new Date()) / 86400000))}d left
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentGradesPage;
