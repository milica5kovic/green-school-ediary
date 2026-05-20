import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, TrendingUp, Star, AlertCircle, CheckCircle,
  ChevronDown, Users, GraduationCap, BookOpen, CalendarCheck, Award
} from 'lucide-react';
import {
  PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { useApp } from '../../../../core/context/AppContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { getGradeFromConfig, isPrimaryClass } from '../../../../core/utils/cambridgeGrading';

// ════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ════════════════════════════════════════════════════════════════════════════
const CARD   = '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)';
const CARD_H = '0 1px 3px rgba(15,23,42,.06), 0 8px 32px rgba(15,23,42,.08)';

const ATT_COLORS = {
  present:  '#16a34a',
  late:     '#d97706',
  absent:   '#ef4444',
  sent_out: '#ea580c',
};

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

// Single-segment donut (overall grade)
const GradeDonut = ({ pct, color }) => {
  const data = [{ value: pct }, { value: 100 - pct }];
  return (
    <div className="relative flex items-center justify-center" style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={58} outerRadius={76}
            startAngle={90} endAngle={-270}
            paddingAngle={3}
            dataKey="value"
          >
            <Cell fill={color} />
            <Cell fill="#f1f5f9" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-4xl font-bold text-slate-900 tracking-tight">{pct}%</span>
        <span className="text-[11px] text-slate-400 font-medium mt-0.5">Overall</span>
      </div>
    </div>
  );
};

// Multi-segment donut (attendance)
const AttendanceDonut = ({ counts }) => {
  const total = counts.present + counts.late + counts.absent + counts.sent_out;
  if (total === 0) return (
    <div className="flex items-center justify-center h-[180px]">
      <p className="text-slate-400 text-sm">No attendance data</p>
    </div>
  );

  const segments = [
    { name: 'Present',  value: counts.present,  color: ATT_COLORS.present  },
    { name: 'Late',     value: counts.late,      color: ATT_COLORS.late     },
    { name: 'Absent',   value: counts.absent,    color: ATT_COLORS.absent   },
    { name: 'Sent Out', value: counts.sent_out,  color: ATT_COLORS.sent_out },
  ].filter(s => s.value > 0);

  const pct = Math.round((counts.present / total) * 100);

  return (
    <div className="relative" style={{ height: 180 }}>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={segments}
            cx="50%" cy="50%"
            innerRadius={58} outerRadius={76}
            paddingAngle={2}
            dataKey="value"
          >
            {segments.map((s, i) => <Cell key={i} fill={s.color} />)}
          </Pie>
          <Tooltip
            formatter={(val, name) => [`${val} sessions`, name]}
            contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-4xl font-bold text-slate-900 tracking-tight">{pct}%</span>
        <span className="text-[11px] text-slate-400 font-medium mt-0.5">Present</span>
      </div>
    </div>
  );
};

// Horizontal subject bar
const SubjectBar = ({ subject, avgPct, cambridge, count }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium text-slate-800 truncate max-w-[52%]">{subject}</span>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-slate-400">{count} {count === 1 ? 'assessment' : 'assessments'}</span>
        <span className="text-sm font-bold min-w-[2.5rem] text-right" style={{ color: cambridge.color }}>
          {cambridge.display}
        </span>
        <span className="text-xs text-slate-500 w-8 text-right">{avgPct}%</span>
      </div>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div
        className="h-2 rounded-full transition-all duration-700"
        style={{ width: `${avgPct}%`, backgroundColor: cambridge.color }}
      />
    </div>
  </div>
);

// Tab button
const Tab = ({ label, active, onClick, primaryColor }) => (
  <button
    onClick={onClick}
    className="px-5 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap"
    style={{
      borderBottomColor: active ? primaryColor : 'transparent',
      color: active ? primaryColor : '#94a3b8',
    }}
  >
    {label}
  </button>
);

// Overview stat tile
const StatTile = ({ icon: Icon, label, value, color, bg }) => (
  <div className="bg-white rounded-2xl border p-5" style={{ boxShadow: CARD, borderColor: color + '25' }}>
    <div className="flex items-center gap-2 mb-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
        <Icon size={15} style={{ color }} />
      </div>
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
    </div>
    <p className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</p>
  </div>
);

// Custom line chart tooltip
const GradeTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-600 mb-0.5">{label}</p>
      <p className="text-slate-900 font-bold text-sm">{payload[0].value}%</p>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
const ParentMyChildPage = () => {
  const { supabase }                    = useApp();
  const theme                           = useTermTheme();
  const { gradingConfig, primaryColor } = useBranding();
  const TermIcon                        = theme.icon;

  const { children, selectedChild, setSelectedChild, loading } = useParentChildrenCtx();

  // ── state ─────────────────────────────────────────────────────────────────
  const [activeTab,        setActiveTab]        = useState('overview');
  const [teacherComments,  setTeacherComments]  = useState([]);
  const [topSubjects,      setTopSubjects]      = useState([]);
  const [behaviorStats,    setBehaviorStats]    = useState({ positive: 0, neutral: 0, needsAttention: 0 });
  const [homeroomTeacher,  setHomeroomTeacher]  = useState(null);
  const [attCounts,        setAttCounts]        = useState({ present: 0, late: 0, absent: 0, sent_out: 0 });
  const [overallAvg,       setOverallAvg]       = useState(0);
  const [gradeTrend,       setGradeTrend]       = useState([]);
  const [cambridgeOverall, setCambridgeOverall] = useState(null);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const loadChildDetails = useCallback(async () => {
    if (!selectedChild) return;
    const cls = selectedChild.class_name;
    const id  = selectedChild.id;

    // Homeroom teacher
    try {
      const { data: teacherRows } = await supabase
        .from('teachers')
        .select('full_name, class_teacher_for')
        .not('class_teacher_for', 'is', null);

      const homeroom = teacherRows?.find(t => {
        const ctf = t.class_teacher_for;
        if (Array.isArray(ctf))    return ctf.includes(cls);
        if (typeof ctf === 'string') return ctf === cls;
        return false;
      });
      setHomeroomTeacher(homeroom?.full_name || null);
    } catch { setHomeroomTeacher(null); }

    // Teacher comments + behaviour stats
    try {
      const { data: comments } = await supabase
        .from('teacher_comments')
        .select('*, teachers(full_name, subjects)')
        .eq('student_id', id)
        .eq('is_visible_to_parent', true)
        .order('created_at', { ascending: false })
        .limit(10);

      setTeacherComments(comments || []);
      setBehaviorStats({
        positive:       comments?.filter(c => c.comment_type === 'positive').length        || 0,
        neutral:        comments?.filter(c => c.comment_type === 'neutral').length         || 0,
        needsAttention: comments?.filter(c => c.comment_type === 'needs_attention').length || 0,
      });
    } catch { setTeacherComments([]); }

    // Grades → subjects, overall, trend
    try {
      const { data: grades } = await supabase
        .from('grades')
        .select('subject, grade, max_grade, date')
        .eq('student_id', id)
        .order('date', { ascending: true });

      if (grades && grades.length > 0) {
        // Subject averages
        const subjMap = {};
        grades.forEach(g => {
          if (!subjMap[g.subject]) subjMap[g.subject] = { grades: [] };
          subjMap[g.subject].grades.push(g);
        });
        const subjData = Object.entries(subjMap)
          .map(([subject, { grades: gs }]) => {
            const avg = Math.round(gs.reduce((s, g) => s + (g.grade / g.max_grade * 100), 0) / gs.length);
            return { subject, avgPct: avg, count: gs.length, cambridge: getGradeFromConfig(avg, cls, gradingConfig) };
          })
          .sort((a, b) => b.avgPct - a.avgPct);
        setTopSubjects(subjData.slice(0, 6));

        // Overall avg
        const overall = Math.round(grades.reduce((s, g) => s + (g.grade / g.max_grade * 100), 0) / grades.length);
        setOverallAvg(overall);
        setCambridgeOverall(getGradeFromConfig(overall, cls, gradingConfig));

        // Monthly trend (last 6 months)
        const monthMap = {};
        grades.forEach(g => {
          if (!g.date) return;
          const key = new Date(g.date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
          if (!monthMap[key]) monthMap[key] = { sum: 0, n: 0 };
          monthMap[key].sum += (g.grade / g.max_grade) * 100;
          monthMap[key].n++;
        });
        const trend = Object.entries(monthMap)
          .map(([month, d]) => ({ month, avg: Math.round(d.sum / d.n) }))
          .slice(-6);
        setGradeTrend(trend);
      } else {
        setOverallAvg(0); setGradeTrend([]); setTopSubjects([]);
      }
    } catch { setOverallAvg(0); }

    // Attendance counts
    try {
      const { data: attData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', id);

      const counts = { present: 0, late: 0, absent: 0, sent_out: 0 };
      attData?.forEach(a => {
        const s = (a.status || '').toLowerCase().replace(/\s+/g, '_');
        if (s === 'present')  counts.present++;
        else if (s === 'late')     counts.late++;
        else if (s === 'absent')   counts.absent++;
        else if (s === 'sent_out') counts.sent_out++;
      });
      setAttCounts(counts);
    } catch { setAttCounts({ present: 0, late: 0, absent: 0, sent_out: 0 }); }

  }, [selectedChild, supabase, gradingConfig]);

  useEffect(() => {
    if (selectedChild) { setActiveTab('overview'); loadChildDetails(); }
  }, [selectedChild, loadChildDetails]);

  // ── derived ───────────────────────────────────────────────────────────────
  const getBehaviorBadge = () => {
    const total = behaviorStats.positive + behaviorStats.neutral + behaviorStats.needsAttention;
    if (total === 0) return { label: 'No Data',         color: '#94a3b8', bg: '#f8fafc' };
    const rate = (behaviorStats.positive / total) * 100;
    if (rate >= 70) return { label: 'Excellent',        color: '#16a34a', bg: '#f0fdf4' };
    if (rate >= 50) return { label: 'Good',             color: '#2563eb', bg: '#eff6ff' };
    if (rate >= 30) return { label: 'Improving',        color: '#d97706', bg: '#fffbeb' };
    return               { label: 'Needs Attention',    color: '#dc2626', bg: '#fff1f2' };
  };

  const attTotal      = attCounts.present + attCounts.late + attCounts.absent + attCounts.sent_out;
  const attPct        = attTotal > 0 ? Math.round((attCounts.present / attTotal) * 100) : 0;
  const behaviorBadge = getBehaviorBadge();
  const primary       = isPrimaryClass(selectedChild?.class_name);
  const accentColor   = primaryColor || '#0f172a';

  // ── loading / empty states ─────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 rounded-full animate-spin"
        style={{ borderColor: accentColor + '33', borderTopColor: 'transparent' }} />
    </div>
  );

  if (children.length === 0) return (
    <div className="bg-white rounded-2xl p-12 text-center border border-slate-100" style={{ boxShadow: CARD }}>
      <Users size={48} className="mx-auto text-slate-200 mb-4" />
      <p className="text-slate-600 text-lg font-semibold">No student data available</p>
      <p className="text-slate-400 text-sm mt-2">Please contact your school administrator</p>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ─── HEADER CARD ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: CARD_H }}>
        <div className="px-6 py-6">
          <div className="flex items-start justify-between gap-4">

            {/* Avatar + info */}
            <div className="flex items-center gap-4 min-w-0">
              {/* Avatar circle */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-white text-xl font-bold tracking-tight"
                style={{ backgroundColor: accentColor }}
              >
                {selectedChild?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>

              <div className="min-w-0">
                {/* Name + Active badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    {selectedChild?.name}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>

                {/* Class chip + programme */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: accentColor + 'dd' }}
                  >
                    Year {selectedChild?.class_name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {primary ? 'Cambridge Primary' : 'Cambridge IGCSE'}
                  </span>
                </div>

                {/* Info strip */}
                <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                  {homeroomTeacher && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <GraduationCap size={13} className="text-slate-400" />
                      Class Teacher: <strong className="text-slate-700 ml-0.5">{homeroomTeacher}</strong>
                    </div>
                  )}
                  {theme.hasActiveTerm && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.color }}>
                      <TermIcon size={13} />
                      <span className="font-medium">{theme.name} Term</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Child selector */}
            {children.length > 1 && (
              <div className="relative flex-shrink-0">
                <select
                  value={selectedChild?.id || ''}
                  onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 pr-8 text-sm font-medium text-slate-700 focus:outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  {children.map(child => (
                    <option key={child.id} value={child.id}>
                      {child.name} — {child.class_name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-slate-100 overflow-x-auto">
          {['Overview', 'Academics', 'Attendance'].map(t => (
            <Tab
              key={t}
              label={t}
              active={activeTab === t.toLowerCase()}
              onClick={() => setActiveTab(t.toLowerCase())}
              primaryColor={accentColor}
            />
          ))}
        </div>
      </div>

      {/* ─── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* 3 stat tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatTile
              icon={BookOpen}
              label="Overall Grade"
              value={overallAvg > 0 ? `${overallAvg}%` : '—'}
              color={cambridgeOverall?.color || '#64748b'}
              bg={cambridgeOverall ? cambridgeOverall.color + '15' : '#f8fafc'}
            />
            <StatTile
              icon={CalendarCheck}
              label="Attendance"
              value={attTotal > 0 ? `${attPct}%` : '—'}
              color={attPct >= 90 ? '#16a34a' : attPct >= 75 ? '#d97706' : attTotal > 0 ? '#ef4444' : '#64748b'}
              bg={attPct >= 90 ? '#f0fdf4' : attPct >= 75 ? '#fffbeb' : attTotal > 0 ? '#fff1f2' : '#f8fafc'}
            />
            <StatTile
              icon={Star}
              label="Behaviour"
              value={behaviorBadge.label}
              color={behaviorBadge.color}
              bg={behaviorBadge.bg}
            />
          </div>

          {/* Behaviour breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <Star size={15} className="text-amber-500" />
              </div>
              <p className="font-semibold tracking-tight text-slate-900">Behaviour Overview</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Positive',   value: behaviorStats.positive,       color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', Icon: CheckCircle },
                { label: 'Neutral',    value: behaviorStats.neutral,        color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', Icon: Star },
                { label: 'Needs Work', value: behaviorStats.needsAttention, color: '#d97706', bg: '#fffbeb', border: '#fde68a', Icon: AlertCircle },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4 text-center border"
                  style={{ backgroundColor: s.bg, borderColor: s.border }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: s.color + '20' }}>
                    <s.Icon size={17} style={{ color: s.color }} />
                  </div>
                  <p className="text-2xl font-bold tracking-tight" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: s.color + 'bb' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Teacher comments */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: accentColor + '15' }}>
                <MessageSquare size={15} style={{ color: accentColor }} />
              </div>
              <p className="font-semibold tracking-tight text-slate-900">Teacher Feedback</p>
              {teacherComments.length > 0 && (
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium ml-1">
                  {teacherComments.length}
                </span>
              )}
            </div>
            {teacherComments.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl">
                <MessageSquare size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm font-medium">No teacher comments yet</p>
                <p className="text-xs text-slate-400 mt-1">Comments appear here when teachers add them</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {teacherComments.map(comment => {
                  const pos = comment.comment_type === 'positive';
                  const att = comment.comment_type === 'needs_attention';
                  const bg     = pos ? '#f0fdf4' : att ? '#fffbeb' : '#f0f9ff';
                  const border = pos ? '#bbf7d0' : att ? '#fde68a' : '#bae6fd';
                  const badge  = pos ? { bg: '#dcfce7', text: '#15803d', label: 'Positive'   }
                                : att ? { bg: '#fef9c3', text: '#a16207', label: 'Needs Work' }
                                :       { bg: '#e0f2fe', text: '#0369a1', label: 'Neutral'    };
                  return (
                    <div key={comment.id} className="p-4 rounded-xl border"
                      style={{ backgroundColor: bg, borderColor: border }}>
                      <div className="flex items-start justify-between mb-2.5 gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">
                            {comment.teachers?.full_name || 'Teacher'}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {comment.teachers?.subjects?.join(', ') || 'Subject'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: badge.bg, color: badge.text }}>
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(comment.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{comment.comment}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── ACADEMICS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'academics' && (
        <>
          {/* Donut + Line chart */}
          <div className="grid md:grid-cols-2 gap-5">

            {/* Overall grade donut */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD }}>
              <p className="font-semibold text-slate-900 tracking-tight">Overall Grade</p>
              <p className="text-xs text-slate-400 mt-0.5 mb-5">Average across all subjects</p>
              {overallAvg > 0 ? (
                <>
                  <GradeDonut pct={overallAvg} color={cambridgeOverall?.color || accentColor} />
                  {cambridgeOverall && (
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <span className="px-4 py-1.5 rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: cambridgeOverall.color }}>
                        {cambridgeOverall.display}
                      </span>
                      <span className="text-sm text-slate-500">{cambridgeOverall.label}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-[180px]">
                  <p className="text-slate-400 text-sm">No grades recorded yet</p>
                </div>
              )}
            </div>

            {/* Grade trend */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD }}>
              <p className="font-semibold text-slate-900 tracking-tight">Grade Trend</p>
              <p className="text-xs text-slate-400 mt-0.5 mb-5">Monthly average over time</p>
              {gradeTrend.length >= 2 ? (
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={gradeTrend} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<GradeTip />} />
                    <Line
                      type="monotone" dataKey="avg"
                      stroke={accentColor} strokeWidth={2.5}
                      dot={{ r: 4, fill: accentColor, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: accentColor }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[190px]">
                  <p className="text-slate-400 text-sm">Not enough data for a trend yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Subject performance bars */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD }}>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: accentColor + '15' }}>
                <Award size={15} style={{ color: accentColor }} />
              </div>
              <p className="font-semibold tracking-tight text-slate-900">Subject Performance</p>
            </div>
            {topSubjects.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl">
                <Award size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm font-medium">No grades recorded yet</p>
              </div>
            ) : (
              <div className="space-y-5">
                {topSubjects.map(s => (
                  <SubjectBar
                    key={s.subject}
                    subject={s.subject}
                    avgPct={s.avgPct}
                    cambridge={s.cambridge}
                    count={s.count}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── ATTENDANCE TAB ───────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="grid md:grid-cols-2 gap-5 items-start">

          {/* Attendance donut + legend */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD }}>
            <p className="font-semibold text-slate-900 tracking-tight">Attendance Breakdown</p>
            <p className="text-xs text-slate-400 mt-0.5 mb-5">
              {attTotal > 0 ? `${attTotal} recorded sessions` : 'No sessions recorded'}
            </p>
            <AttendanceDonut counts={attCounts} />
            {attTotal > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                {[
                  { label: 'Present',  val: attCounts.present,  color: ATT_COLORS.present  },
                  { label: 'Late',     val: attCounts.late,      color: ATT_COLORS.late     },
                  { label: 'Absent',   val: attCounts.absent,    color: ATT_COLORS.absent   },
                  { label: 'Sent Out', val: attCounts.sent_out,  color: ATT_COLORS.sent_out },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-slate-500">{s.label}</span>
                    <span className="text-xs font-semibold text-slate-700 ml-auto">{s.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stat tiles + rate bar */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Present',  icon: CheckCircle,  value: attCounts.present,  color: ATT_COLORS.present,  bg: '#f0fdf4' },
                { label: 'Late',     icon: AlertCircle,  value: attCounts.late,      color: ATT_COLORS.late,     bg: '#fffbeb' },
                { label: 'Absent',   icon: AlertCircle,  value: attCounts.absent,    color: ATT_COLORS.absent,   bg: '#fff1f2' },
                { label: 'Sent Out', icon: TrendingUp,   value: attCounts.sent_out,  color: ATT_COLORS.sent_out, bg: '#fff7ed' },
              ].map(s => (
                <div key={s.label}
                  className="bg-white rounded-2xl border p-5 flex flex-col items-center justify-center text-center"
                  style={{ boxShadow: CARD, borderColor: s.color + '25' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: s.bg }}>
                    <s.icon size={18} style={{ color: s.color }} />
                  </div>
                  <p className="text-3xl font-bold tracking-tight" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Rate summary */}
            {attTotal > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: CARD }}>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Attendance Rate</p>
                <div className="flex items-end gap-2 mb-3">
                  <span
                    className="text-4xl font-bold tracking-tight"
                    style={{ color: attPct >= 90 ? '#16a34a' : attPct >= 75 ? '#d97706' : '#ef4444' }}
                  >
                    {attPct}%
                  </span>
                  <span className="text-sm text-slate-400 pb-1">of sessions attended</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-2.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${attPct}%`,
                      backgroundColor: attPct >= 90 ? '#16a34a' : attPct >= 75 ? '#d97706' : '#ef4444',
                    }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {attPct >= 90
                    ? 'Excellent attendance — keep it up!'
                    : attPct >= 75
                    ? 'Some sessions missed — room for improvement'
                    : 'Attendance needs attention'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TERM FOOTER ──────────────────────────────────────────────────── */}
      {theme.hasActiveTerm && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.07), border: `1px solid ${theme.withAlpha(0.15)}` }}>
          <div className="flex items-center gap-2">
            <TermIcon size={13} style={theme.textStyle} />
            <span className="text-xs font-semibold" style={theme.textStyle}>
              {theme.name} Term · {theme.activeTerm.academic_year}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 rounded-full h-1.5 hidden sm:block"
              style={{ backgroundColor: theme.withAlpha(0.18) }}>
              <div className="h-1.5 rounded-full"
                style={{ width: `${Math.round(theme.progress)}%`, backgroundColor: theme.color }} />
            </div>
            <span className="text-[11px] font-semibold" style={theme.textStyle}>
              {theme.daysRemaining}d left
            </span>
          </div>
        </div>
      )}

    </div>
  );
};

export default ParentMyChildPage;
