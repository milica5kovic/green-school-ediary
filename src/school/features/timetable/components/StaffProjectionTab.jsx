import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../../core/context/AppContext';
import { getCurrentSchoolId } from '../../../../core/infrastructure/supabaseClient';
import { useBranding } from '../../../../core/context/BrandingContext';
import {
  TrendingUp, Users, BookOpen, AlertTriangle, CheckCircle, GraduationCap, Star,
} from 'lucide-react';

const DEFAULT_MAX_CLASS_SIZE = 15;
const DEFAULT_MAX_PERIODS    = 29;

// ── helpers ──────────────────────────────────────────────────────────────────
function yearNumber(yg) {
  const m = String(yg).match(/^Y(\d+)/i);
  return m ? parseInt(m[1], 10) : 99;
}
function isEarlyYear(yg) { return yearNumber(yg) >= 1 && yearNumber(yg) <= 4; }

function toYearGroup(className = '') {
  const m = String(className).match(/^(Y\d+)/i);
  return m ? m[1].toUpperCase() : '';
}

function sortYG(a, b) { return yearNumber(a) - yearNumber(b); }

// ── sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, muted }) {
  return (
    <div
      className="rounded-2xl p-4 border flex flex-col gap-0.5"
      style={{
        backgroundColor: accent ? `${accent}0d` : muted ? '#f9fafb' : '#fff',
        borderColor:     accent ? `${accent}25` : '#e5e7eb',
      }}
    >
      <div className="text-[26px] leading-none font-bold" style={{ color: accent || '#111827' }}>
        {value}
      </div>
      <div className="text-xs font-semibold text-gray-500 mt-1">{label}</div>
      {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
    </div>
  );
}

function Badge({ gap }) {
  if (gap > 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full whitespace-nowrap">
        <AlertTriangle size={10} /> +{gap} needed
      </span>
    );
  if (gap < 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full">
        {Math.abs(gap)} surplus
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
      <CheckCircle size={10} /> OK
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function StaffForecastTab() {
  const { supabase }      = useApp();
  const { primaryColor }  = useBranding();
  const schoolId          = getCurrentSchoolId();

  const [ttEntries,      setTtEntries]      = useState([]); // actual timetable
  const [assignments,    setAssignments]    = useState([]); // teacher_assignments
  const [teachers,       setTeachers]       = useState([]);
  const [currentStudents, setCurrentStudents] = useState({});
  const [loading,        setLoading]        = useState(true);
  const [ttSource,       setTtSource]       = useState(''); // 'published' | 'draft' | 'assignments'

  const [projected,     setProjected]     = useState({});
  const [maxClassSize,  setMaxClassSize]   = useState(DEFAULT_MAX_CLASS_SIZE);
  const [maxPeriods,    setMaxPeriods]     = useState(DEFAULT_MAX_PERIODS);

  useEffect(() => {
    if (!schoolId) return;
    (async () => {
      setLoading(true);

      const [{ data: asgn }, { data: tch }, { data: studs }] = await Promise.all([
        supabase.from('teacher_assignments')
          .select('teacher_id, subject, class_name, periods_per_week')
          .eq('school_id', schoolId),
        supabase.from('teachers').select('id').eq('school_id', schoolId),
        supabase.from('students').select('class_name')
          .eq('school_id', schoolId).eq('is_active', true),
      ]);

      setAssignments(asgn || []);
      setTeachers(tch || []);

      // Count students per year group
      const counts = {};
      (studs || []).forEach(s => {
        const yg = toYearGroup(s.class_name);
        if (yg) counts[yg] = (counts[yg] || 0) + 1;
      });
      setCurrentStudents(counts);

      // Try published timetable first, then draft
      let { data: pub } = await supabase
        .from('timetable_entries')
        .select('teacher_id, subject, class_name, day_of_week, slot_number, is_double, parallel_group')
        .eq('school_id', schoolId)
        .eq('status', 'published');

      if (pub?.length) {
        setTtEntries(pub);
        setTtSource('published');
      } else {
        let { data: dft } = await supabase
          .from('timetable_entries')
          .select('teacher_id, subject, class_name, day_of_week, slot_number, is_double, parallel_group')
          .eq('school_id', schoolId)
          .eq('status', 'draft');
        if (dft?.length) {
          setTtEntries(dft);
          setTtSource('draft');
        } else {
          setTtEntries([]);
          setTtSource('assignments');
        }
      }

      setLoading(false);
    })();
  }, [supabase, schoolId]);

  // ── derived year groups ────────────────────────────────────────────────────
  const yearGroups = useMemo(() => {
    const s = new Set([
      ...assignments.map(a => toYearGroup(a.class_name)),
      ...ttEntries.map(e => toYearGroup(e.class_name)),
    ].filter(Boolean));
    return [...s].sort(sortYG);
  }, [assignments, ttEntries]);

  const earlyYGs = useMemo(() => yearGroups.filter(isEarlyYear),  [yearGroups]);
  const upperYGs = useMemo(() => yearGroups.filter(yg => !isEarlyYear(yg)), [yearGroups]);

  // Current distinct classes per year group (from timetable first, then assignments)
  const currentClassesPerYG = useMemo(() => {
    const map = {};
    const source = ttEntries.length ? ttEntries : assignments;
    source.forEach(r => {
      const yg = toYearGroup(r.class_name);
      if (!yg) return;
      if (!map[yg]) map[yg] = new Set();
      map[yg].add(r.class_name);
    });
    return Object.fromEntries(Object.entries(map).map(([yg, s]) => [yg, s.size]));
  }, [ttEntries, assignments]);

  // Identify class teachers vs specialists.
  //
  // A CLASS TEACHER teaches many different subjects to the same single class (Y1–Y4).
  //   e.g. Y2A: Literacy, Maths, Science, Topic, PSHE … → class teacher
  //
  // A SPECIALIST teaches one (or two) subjects across many classes, possibly including
  //   early years alongside upper years.
  //   e.g. Humanities: Y1, Y2, Y3, Y4, Y7, Y8 → specialist (NOT a class teacher)
  //   e.g. Music:      Y2, Y4, Y6, Y9          → specialist
  //
  // Heuristic: a teacher is a class teacher if they teach ≥3 distinct subjects
  // to the SAME class_name, AND every class they teach is in Y1–Y4.
  const classTeacherIds = useMemo(() => {
    // teacher_id → { class_name → Set<subject> }
    const byTeacher = {};
    assignments.forEach(a => {
      if (!a.teacher_id || !a.class_name || !a.subject) return;
      if (!byTeacher[a.teacher_id]) byTeacher[a.teacher_id] = {};
      if (!byTeacher[a.teacher_id][a.class_name]) byTeacher[a.teacher_id][a.class_name] = new Set();
      byTeacher[a.teacher_id][a.class_name].add(a.subject);
    });

    const ids = new Set();
    Object.entries(byTeacher).forEach(([teacherId, byClass]) => {
      const classNames = Object.keys(byClass);
      const allEarlyClasses = classNames.every(cn => isEarlyYear(toYearGroup(cn)));
      // At least one class where they cover 3+ subjects → classic class teacher
      const coversMultipleSubjectsPerClass = classNames.some(cn => byClass[cn].size >= 3);
      if (allEarlyClasses && coversMultipleSubjectsPerClass) ids.add(teacherId);
    });
    return ids;
  }, [assignments]);

  // Pre-fill projected with current student counts
  useEffect(() => {
    if (!yearGroups.length || Object.keys(projected).length) return;
    const init = {};
    yearGroups.forEach(yg => { init[yg] = currentStudents[yg] || 0; });
    setProjected(init);
  }, [yearGroups, currentStudents]);

  // ── core projection logic ──────────────────────────────────────────────────
  const projection = useMemo(() => {
    if (!yearGroups.length) return null;

    // Projected classes per year group
    const projClasses = {};
    yearGroups.forEach(yg => {
      const n = Number(projected[yg]) || 0;
      projClasses[yg] = n > 0 ? Math.ceil(n / maxClassSize) : 0;
    });

    // ── Periods/week per (subject, class_name) from timetable OR assignments ─
    // From timetable: count actual entries per (subject, class_name)
    // From assignments: use periods_per_week field
    const periodsPerClassBySubject = {}; // subject → { class_name → periods }

    if (ttEntries.length) {
      // Count entries per (subject, class_name) — each entry = 1 period
      const counts = {};
      ttEntries.forEach(e => {
        if (!e.subject || !e.class_name) return;
        const key = `${e.subject}|||${e.class_name}`;
        counts[key] = (counts[key] || 0) + 1;
      });
      Object.entries(counts).forEach(([key, periods]) => {
        const [subject, class_name] = key.split('|||');
        if (!periodsPerClassBySubject[subject]) periodsPerClassBySubject[subject] = {};
        periodsPerClassBySubject[subject][class_name] = periods;
      });
    } else {
      // Fallback: teacher_assignments
      assignments.forEach(a => {
        if (!a.subject || !a.class_name) return;
        if (!periodsPerClassBySubject[a.subject]) periodsPerClassBySubject[a.subject] = {};
        periodsPerClassBySubject[a.subject][a.class_name] = a.periods_per_week || 1;
      });
    }

    // For each subject, average periods/week per class within each year group
    // (there may be multiple classes per year group, e.g. Y9A and Y9B)
    const avgPeriodsPerYG = {}; // subject → { yg → avg }
    Object.entries(periodsPerClassBySubject).forEach(([subject, byClass]) => {
      if (!avgPeriodsPerYG[subject]) avgPeriodsPerYG[subject] = {};
      yearGroups.forEach(yg => {
        const vals = Object.entries(byClass)
          .filter(([cn]) => toYearGroup(cn) === yg)
          .map(([, p]) => p);
        if (vals.length) {
          avgPeriodsPerYG[subject][yg] = vals.reduce((s, v) => s + v, 0) / vals.length;
        }
      });
    });

    // ── Class teacher needs (pure Y1–Y4 class teachers) ───────────────────
    const totalCurrentEarlyClasses  = earlyYGs.reduce((s, yg) => s + (currentClassesPerYG[yg] || 0), 0);
    const totalProjectedEarlyClasses = earlyYGs.reduce((s, yg) => s + (projClasses[yg] || 0), 0);
    const classTeacherGap = totalProjectedEarlyClasses - totalCurrentEarlyClasses;

    const earlyResults = earlyYGs.map(yg => ({
      yg,
      currentClasses:   currentClassesPerYG[yg] || 0,
      projectedClasses: projClasses[yg] || 0,
      gap: (projClasses[yg] || 0) - (currentClassesPerYG[yg] || 0),
    }));

    // ── Subject teacher needs (specialists — including those teaching early years) ─
    // Use ALL year groups (specialists may teach Y1-Y4 too)
    const subjectTeacherIds = {}; // subject → Set<teacher_id> — only specialists
    assignments.forEach(({ teacher_id, subject }) => {
      if (!subject || !teacher_id) return;
      if (classTeacherIds.has(teacher_id)) return; // skip pure class teachers
      if (!subjectTeacherIds[subject]) subjectTeacherIds[subject] = new Set();
      subjectTeacherIds[subject].add(teacher_id);
    });
    // Also pick up teachers from timetable entries not in assignments
    ttEntries.forEach(e => {
      if (!e.subject || !e.teacher_id) return;
      if (classTeacherIds.has(e.teacher_id)) return;
      if (!subjectTeacherIds[e.subject]) subjectTeacherIds[e.subject] = new Set();
      subjectTeacherIds[e.subject].add(e.teacher_id);
    });

    const allSubjects = new Set([
      ...Object.keys(avgPeriodsPerYG),
      ...Object.keys(subjectTeacherIds),
    ]);

    const subjectResults = [...allSubjects]
      .sort((a, b) => a.localeCompare(b))
      .map(subject => {
        // Projected total periods/week across ALL year groups for this subject
        let totalPeriodsNeeded = 0;
        const breakdown = {};
        yearGroups.forEach(yg => {
          const avg    = avgPeriodsPerYG[subject]?.[yg];
          const cls    = projClasses[yg] || 0;
          if (avg == null || cls === 0) return;
          const total = Math.round(avg * cls);
          totalPeriodsNeeded += total;
          breakdown[yg] = { avg: Math.round(avg * 10) / 10, cls, total };
        });

        const teachersNeeded  = totalPeriodsNeeded > 0
          ? Math.ceil(totalPeriodsNeeded / maxPeriods) : 0;
        const currentTeachers = subjectTeacherIds[subject]?.size || 0;
        const gap = teachersNeeded - currentTeachers;

        return { subject, totalPeriodsNeeded, teachersNeeded, currentTeachers, gap, breakdown };
      })
      .filter(r => r.totalPeriodsNeeded > 0 || r.currentTeachers > 0);

    const totalCurrentStudents   = Object.values(currentStudents).reduce((s, v) => s + v, 0);
    const totalProjectedStudents = yearGroups.reduce((s, yg) => s + (Number(projected[yg]) || 0), 0);
    const understaffedSubjects   = subjectResults.filter(r => r.gap > 0).length;

    return {
      projClasses, earlyResults, subjectResults,
      totalCurrentStudents, totalProjectedStudents,
      classTeacherGap, totalCurrentEarlyClasses, totalProjectedEarlyClasses,
      understaffedSubjects,
      totalCurrentTeachers: teachers.length,
      totalClassTeachers:   classTeacherIds.size,
    };
  }, [
    assignments, ttEntries, projected, maxClassSize, maxPeriods,
    yearGroups, earlyYGs, currentStudents, currentClassesPerYG,
    classTeacherIds, teachers,
  ]);

  // ── render ─────────────────────────────────────────────────────────────────
  if (loading) return <div className="p-12 text-center text-gray-400 text-sm">Loading…</div>;
  if (!yearGroups.length) return (
    <div className="p-12 text-center text-gray-400 text-sm">
      No timetable or assignment data found.
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${primaryColor}15` }}>
          <TrendingUp size={20} style={{ color: primaryColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-bold text-gray-800 text-lg">Staffing Forecast</h3>
            {ttSource && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: ttSource === 'published' ? '#dcfce7' : ttSource === 'draft' ? '#fef9c3' : '#f3f4f6',
                  color:           ttSource === 'published' ? '#16a34a' : ttSource === 'draft' ? '#a16207' : '#6b7280',
                }}>
                {ttSource === 'published' ? '● Published timetable'
                  : ttSource === 'draft'  ? '● Draft timetable'
                  : '● From assignments only'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Enter projected student numbers for next year. Y1–Y4 use class teachers (1 per class);
            specialist teachers are counted by total periods across all year groups they teach.
          </p>
        </div>
      </div>

      {/* Settings */}
      <div className="flex flex-wrap gap-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-500">Max students / class</span>
          <input type="number" min={1} max={50} value={maxClassSize}
            onChange={e => setMaxClassSize(Math.max(1, Number(e.target.value) || DEFAULT_MAX_CLASS_SIZE))}
            className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-center focus:outline-none focus:border-gray-400" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-gray-500">Max periods / teacher / week</span>
          <input type="number" min={1} max={40} value={maxPeriods}
            onChange={e => setMaxPeriods(Math.max(1, Number(e.target.value) || DEFAULT_MAX_PERIODS))}
            className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-center focus:outline-none focus:border-gray-400" />
        </label>
      </div>

      {/* Enrolment input */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Users size={15} style={{ color: primaryColor }} />
            Projected Enrolment
          </div>
          <span className="text-xs text-gray-400">
            Current total: <span className="font-semibold text-gray-600">
              {Object.values(currentStudents).reduce((s, v) => s + v, 0)} students
            </span>
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-2.5 text-left   text-xs font-medium text-gray-400 w-24">Year</th>
              <th className="px-3 py-2.5 text-left   text-xs font-medium text-gray-400">Type</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Students now</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Classes now</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Projected students</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Projected classes</th>
            </tr>
          </thead>
          <tbody>
            {yearGroups.map((yg, i) => {
              const early   = isEarlyYear(yg);
              const curr    = currentStudents[yg] || 0;
              const currCls = currentClassesPerYG[yg] ?? (curr > 0 ? Math.ceil(curr / maxClassSize) : null);
              const proj    = Number(projected[yg]) || 0;
              const projCls = proj > 0 ? Math.ceil(proj / maxClassSize) : null;
              const delta   = projCls != null && currCls != null ? projCls - currCls : null;
              return (
                <tr key={yg}
                  className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                  <td className="px-5 py-2.5 font-bold text-gray-800">{yg}</td>
                  <td className="px-3 py-2.5">
                    {early
                      ? <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Star size={9} />Early years</span>
                      : <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full"><GraduationCap size={9} />Upper school</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-500">{curr || '—'}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500">{currCls ?? '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <input type="number" min={0}
                      value={projected[yg] ?? ''}
                      onChange={e => setProjected(p => ({ ...p, [yg]: e.target.value }))}
                      className="w-20 rounded-xl border border-gray-200 bg-white px-2 py-1 text-sm text-center focus:outline-none focus:border-gray-400"
                      placeholder="0" />
                  </td>
                  <td className="px-4 py-2.5 text-center font-bold">
                    {projCls != null
                      ? <span style={{ color: delta > 0 ? '#ef4444' : delta < 0 ? '#3b82f6' : '#10b981' }}>
                          {projCls}
                          {delta !== 0 && delta != null &&
                            <span className="text-xs font-normal ml-1 opacity-60">
                              ({delta > 0 ? '+' : ''}{delta})
                            </span>}
                        </span>
                      : '—'}
                  </td>
                </tr>
              );
            })}
            {/* Totals */}
            {projection && (
              <tr className="border-t-2 border-gray-200 bg-gray-100/60 font-semibold">
                <td className="px-5 py-2.5 text-gray-700" colSpan={2}>Total</td>
                <td className="px-4 py-2.5 text-center text-gray-700">{projection.totalCurrentStudents || '—'}</td>
                <td className="px-4 py-2.5 text-center text-gray-600">
                  {Object.values(currentClassesPerYG).reduce((s, v) => s + v, 0)}
                </td>
                <td className="px-4 py-2.5 text-center font-bold" style={{ color: primaryColor }}>
                  {projection.totalProjectedStudents || '—'}
                </td>
                <td className="px-4 py-2.5 text-center font-bold" style={{ color: primaryColor }}>
                  {Object.values(projection.projClasses).reduce((s, v) => s + v, 0) || '—'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Results ── */}
      {projection && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Students now"
              value={projection.totalCurrentStudents}
              muted
            />
            <StatCard
              label="Projected students"
              value={projection.totalProjectedStudents || '—'}
              sub={
                projection.totalProjectedStudents > projection.totalCurrentStudents
                  ? `+${projection.totalProjectedStudents - projection.totalCurrentStudents} more`
                  : projection.totalProjectedStudents < projection.totalCurrentStudents
                    ? `${projection.totalProjectedStudents - projection.totalCurrentStudents} fewer`
                    : 'No change'
              }
              accent={primaryColor}
            />
            <StatCard
              label="Teachers now"
              value={projection.totalCurrentTeachers}
              sub={`incl. ${projection.totalClassTeachers} class teacher${projection.totalClassTeachers !== 1 ? 's' : ''}`}
              muted
            />
            <StatCard
              label={
                (projection.classTeacherGap > 0 || projection.understaffedSubjects > 0)
                  ? 'Staffing gaps'
                  : 'Fully staffed'
              }
              value={
                (projection.classTeacherGap > 0 || projection.understaffedSubjects > 0)
                  ? `${Math.max(0, projection.classTeacherGap) + projection.understaffedSubjects}`
                  : '✓'
              }
              sub={
                projection.classTeacherGap > 0 && projection.understaffedSubjects > 0
                  ? `${projection.classTeacherGap} class · ${projection.understaffedSubjects} subject`
                  : projection.classTeacherGap > 0
                    ? `${projection.classTeacherGap} new class teacher${projection.classTeacherGap > 1 ? 's' : ''}`
                    : projection.understaffedSubjects > 0
                      ? `${projection.understaffedSubjects} subject${projection.understaffedSubjects > 1 ? 's' : ''} short`
                      : undefined
              }
              accent={
                projection.classTeacherGap > 0 || projection.understaffedSubjects > 0
                  ? '#ef4444' : '#10b981'
              }
            />
          </div>

          {/* Early Years class teachers */}
          {earlyYGs.length > 0 && (
            <div className="rounded-2xl border border-amber-100 bg-white overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-100 bg-amber-50">
                <Star size={14} className="text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">Early Years Class Teachers (Y1–Y4)</span>
                <span className="text-xs text-amber-400 ml-1">· 1 class teacher per class</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left   text-xs font-medium text-gray-400">Year</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Classes now</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Class teachers now</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Projected classes</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Class teachers needed</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.earlyResults.map((r, i) => (
                    <tr key={r.yg}
                      className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'}`}>
                      <td className="px-5 py-2.5 font-bold text-gray-800">{r.yg}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{r.currentClasses   || '—'}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{r.currentClasses   || '—'}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-gray-800">{r.projectedClasses || '—'}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-gray-800">{r.projectedClasses || '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        {r.projectedClasses === 0
                          ? <span className="text-xs text-gray-300">No classes</span>
                          : <Badge gap={r.gap} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-2 text-[11px] text-amber-500 bg-amber-50 border-t border-amber-100">
                Specialist teachers (Music, PE, Art…) who also teach early years are counted separately in the subject table below.
              </div>
            </div>
          )}

          {/* Specialist subject teachers */}
          {projection.subjectResults.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50">
                <BookOpen size={14} style={{ color: primaryColor }} />
                <span className="text-sm font-semibold text-gray-700">Specialist Teachers — by Subject</span>
                <span className="text-xs text-gray-400 ml-1">
                  · periods across all year groups ÷ {maxPeriods} max/teacher
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-2.5 text-left   text-xs font-medium text-gray-400">Subject</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Projected periods / week</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Teachers now</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Teachers needed</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.subjectResults.map((r, i) => (
                    <tr key={r.subject}
                      className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="px-5 py-2.5 font-semibold text-gray-800">{r.subject}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{r.totalPeriodsNeeded || '—'}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{r.currentTeachers}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-gray-800">{r.teachersNeeded || '—'}</td>
                      <td className="px-4 py-2.5 text-center"><Badge gap={r.gap} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-2 text-[11px] text-gray-400 bg-gray-50 border-t border-gray-100">
                One teacher may cover multiple subjects. "Teachers needed" = total projected periods ÷ {maxPeriods}.
                Based on {ttSource === 'published' ? 'published timetable' : ttSource === 'draft' ? 'draft timetable' : 'assignment data'}.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
