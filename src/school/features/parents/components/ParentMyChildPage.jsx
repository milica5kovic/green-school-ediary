import React, { useState, useEffect, useCallback } from 'react';
import {
  User, ChevronDown, Award, MessageSquare, TrendingUp, Star,
  AlertCircle, CheckCircle, Target, Users
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { getGradeFromConfig, isPrimaryClass } from '../../../../core/utils/cambridgeGrading';

// ════════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ════════════════════════════════════════════════════════════════════════════
const CARD_SHADOW = '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)';
const HEADER_SHADOW = '0 4px 24px rgba(15,23,42,.14), 0 1px 4px rgba(15,23,42,.06)';

const SectionLabel = ({ children, className = '' }) => (
  <p className={`text-[10px] font-semibold uppercase tracking-widest text-slate-400 ${className}`}>{children}</p>
);

// ════════════════════════════════════════════════════════════════════════════
// PARENT MY CHILD PAGE - Uses useTermTheme for dynamic colors
// ════════════════════════════════════════════════════════════════════════════

const ParentMyChildPage = () => {
  const { supabase } = useApp();
  const theme = useTermTheme();
  const { gradingConfig } = useBranding();
  const TermIcon = theme.icon;

  const { children, selectedChild, setSelectedChild, loading } = useParentChildrenCtx();
  const [teacherComments, setTeacherComments] = useState([]);
  const [topSubjects, setTopSubjects] = useState([]);
  const [behaviorStats, setBehaviorStats] = useState({ positive: 0, neutral: 0, needsAttention: 0 });

  const loadChildDetails = useCallback(async () => {
    if (!selectedChild) return;

    try {
      // Load teacher comments
      const { data: comments } = await supabase
        .from('teacher_comments')
        .select(`*, teachers(full_name, subjects)`)
        .eq('student_id', selectedChild.id)
        .eq('is_visible_to_parent', true)
        .order('created_at', { ascending: false })
        .limit(10);

      setTeacherComments(comments || []);

      // Behavior stats
      const positive       = comments?.filter(c => c.comment_type === 'positive').length        || 0;
      const needsAttention = comments?.filter(c => c.comment_type === 'needs_attention').length  || 0;
      const neutral        = comments?.filter(c => c.comment_type === 'neutral').length          || 0;
      setBehaviorStats({ positive, neutral, needsAttention });

      // Load grades with Cambridge grading
      const { data: grades } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', selectedChild.id)
        .order('date', { ascending: false });

      if (grades && grades.length > 0) {
        const className = selectedChild.class_name;
        const subjectAverages = {};

        grades.forEach(grade => {
          if (!subjectAverages[grade.subject]) {
            subjectAverages[grade.subject] = { subject: grade.subject, grades: [], total: 0 };
          }
          subjectAverages[grade.subject].grades.push(grade);
          subjectAverages[grade.subject].total++;
        });

        const topSubjectsData = Object.values(subjectAverages).map(subj => {
          const avgPct = Math.round(subj.grades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0) / subj.total);
          const cambridge = getGradeFromConfig(avgPct, className, gradingConfig);
          return { subject: subj.subject, avgPct, count: subj.total, cambridge };
        }).sort((a, b) => b.avgPct - a.avgPct).slice(0, 5);

        setTopSubjects(topSubjectsData);
      }
    } catch (error) {
      console.error('Error loading child details:', error);
    }
  }, [selectedChild, supabase]);

  useEffect(() => { if (selectedChild) loadChildDetails(); }, [selectedChild, loadChildDetails]);

  const getBehaviorBadge = () => {
    const total = behaviorStats.positive + behaviorStats.neutral + behaviorStats.needsAttention;
    if (total === 0) return { label: 'No Data', colorHex: '#94a3b8', bgHex: '#f1f5f9', icon: AlertCircle };

    const positiveRate = (behaviorStats.positive / total) * 100;

    if (positiveRate >= 70) return { label: 'Excellent Behavior', colorHex: '#16a34a', bgHex: '#f0fdf4', icon: CheckCircle };
    if (positiveRate >= 50) return { label: 'Good Behavior',      colorHex: '#2563eb', bgHex: '#eff6ff', icon: Star };
    if (positiveRate >= 30) return { label: 'Improving',          colorHex: '#d97706', bgHex: '#fffbeb', icon: TrendingUp };
    return                         { label: 'Needs Attention',    colorHex: '#dc2626', bgHex: '#fff1f2', icon: AlertCircle };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 rounded-full animate-spin"
          style={{ borderColor: theme.withAlpha(0.3), borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-100" style={{ boxShadow: CARD_SHADOW }}>
        <Users size={48} className="mx-auto text-slate-200 mb-4" />
        <p className="text-slate-600 text-lg font-semibold tracking-tight">No student data available</p>
        <p className="text-slate-400 text-sm mt-2">Please contact your school administrator</p>
      </div>
    );
  }

  const behaviorBadge = getBehaviorBadge();
  const BehaviorIcon = behaviorBadge.icon;
  const primary = isPrimaryClass(selectedChild?.class_name);

  return (
    <div className="space-y-6">

      {/* ═══ HEADER ══════════════════════════════════════════ */}
      <div className="rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
        style={{ ...theme.gradientStyle, boxShadow: HEADER_SHADOW }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/[.06] pointer-events-none" />
        <div className="absolute -bottom-20 -left-12 w-56 h-56 rounded-full bg-black/[.04] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 bg-white/[.15] backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/[.20] flex-shrink-0">
                <span className="text-2xl font-bold tracking-tight">
                  {selectedChild?.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Student Profile</p>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-0.5">{selectedChild?.name}</h1>
                <p className="text-white/70 text-sm mt-0.5">
                  Class {selectedChild?.class_name} · {primary ? 'Cambridge Primary' : 'Cambridge IGCSE'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {theme.hasActiveTerm && (
                <div className="hidden sm:flex bg-white/[.12] backdrop-blur-sm px-3 py-1.5 rounded-lg items-center gap-1.5 border border-white/[.12]">
                  <TermIcon size={14} />
                  <span className="text-xs font-medium">{theme.name} Term</span>
                </div>
              )}
              {children.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedChild?.id || ''}
                    onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                    className="appearance-none bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-white focus:outline-none cursor-pointer">
                    {children.map(child => (
                      <option key={child.id} value={child.id} className="text-slate-900">
                        {child.name} — {child.class_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/70" size={14} />
                </div>
              )}
            </div>
          </div>

          {/* Behavior badge in header */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/[.12] backdrop-blur-sm rounded-xl border border-white/[.15]">
            <BehaviorIcon size={16} />
            <span className="text-sm font-semibold">{behaviorBadge.label}</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* ═══ TOP SUBJECTS ═══════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.withAlpha(0.1) }}>
              <Target size={15} style={theme.textStyle} />
            </div>
            <p className="font-semibold tracking-tight text-slate-900">Top Subjects</p>
          </div>

          {topSubjects.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
              <Award size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm font-medium">No grades recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {topSubjects.map((subj, idx) => (
                <div key={subj.subject}
                  className="p-4 rounded-xl border transition-all hover:shadow-sm"
                  style={{
                    backgroundColor: subj.cambridge.color + '0a',
                    borderColor: subj.cambridge.color + '30'
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: subj.cambridge.color }}>
                        {subj.cambridge.short}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{subj.subject}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{subj.count} assessment{subj.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold tracking-tight" style={{ color: subj.cambridge.color }}>
                        {subj.cambridge.display}
                      </p>
                      <p className="text-xs text-slate-400">{subj.avgPct}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ BEHAVIOR OVERVIEW ══════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <Star size={15} className="text-amber-500" />
            </div>
            <p className="font-semibold tracking-tight text-slate-900">Behavior Overview</p>
          </div>

          {/* Three stat tiles */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Positive',    value: behaviorStats.positive,       Icon: CheckCircle, bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
              { label: 'Neutral',     value: behaviorStats.neutral,        Icon: Star,        bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb' },
              { label: 'Needs Work',  value: behaviorStats.needsAttention, Icon: AlertCircle, bg: '#fffbeb', border: '#fde68a', color: '#d97706' },
            ].map(s => (
              <div key={s.label}
                className="rounded-xl p-4 text-center border"
                style={{ backgroundColor: s.bg, borderColor: s.border }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: s.color + '20' }}>
                  <s.Icon size={18} style={{ color: s.color }} />
                </div>
                <p className="text-2xl font-bold tracking-tight" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide mt-1" style={{ color: s.color + 'cc' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Overall badge */}
          <div className="p-4 rounded-xl border text-center"
            style={{ backgroundColor: behaviorBadge.bgHex, borderColor: behaviorBadge.colorHex + '30' }}>
            <SectionLabel className="mb-2">Current Status</SectionLabel>
            <div className="flex items-center justify-center gap-2">
              <BehaviorIcon size={18} style={{ color: behaviorBadge.colorHex }} />
              <p className="text-lg font-bold tracking-tight" style={{ color: behaviorBadge.colorHex }}>
                {behaviorBadge.label}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TEACHER COMMENTS ═════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.withAlpha(0.1) }}>
            <MessageSquare size={15} style={theme.textStyle} />
          </div>
          <p className="font-semibold tracking-tight text-slate-900">Teacher Feedback</p>
          {teacherComments.length > 0 && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
              {teacherComments.length}
            </span>
          )}
        </div>

        {teacherComments.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <MessageSquare size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 text-sm font-semibold">No teacher comments yet</p>
            <p className="text-xs text-slate-400 mt-1.5">Comments will appear here when teachers add them</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {teacherComments.map((comment) => {
              const isPositive = comment.comment_type === 'positive';
              const isAttention = comment.comment_type === 'needs_attention';

              const cardBg     = isPositive ? '#f0fdf4' : isAttention ? '#fffbeb' : '#f0f9ff';
              const cardBorder = isPositive ? '#bbf7d0' : isAttention ? '#fde68a' : '#bae6fd';
              const badgeBg    = isPositive ? '#dcfce7' : isAttention ? '#fef9c3' : '#e0f2fe';
              const badgeText  = isPositive ? '#15803d' : isAttention ? '#a16207' : '#0369a1';
              const badgeLabel = isPositive ? 'Positive'  : isAttention ? 'Needs Work' : 'Neutral';

              return (
                <div key={comment.id}
                  className="p-4 rounded-xl border transition-all hover:shadow-sm"
                  style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                  <div className="flex items-start justify-between mb-2.5 gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{comment.teachers?.full_name || 'Teacher'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{comment.teachers?.subjects?.join(', ') || 'Subject'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: badgeBg, color: badgeText }}>
                        {badgeLabel}
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

      {/* ═══ TERM FOOTER ══════════════════════════════════════ */}
      {theme.hasActiveTerm && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.08), border: `1px solid ${theme.withAlpha(0.18)}` }}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} style={theme.textStyle} />
            <span className="text-xs font-semibold" style={theme.textStyle}>
              {theme.name} Term {theme.activeTerm.academic_year}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 rounded-full h-1.5 hidden sm:block" style={{ backgroundColor: theme.withAlpha(0.18) }}>
              <div className="h-1.5 rounded-full" style={{ width: `${theme.progress}%`, backgroundColor: theme.color }} />
            </div>
            <span className="text-[10px] font-semibold" style={theme.textStyle}>
              {theme.daysRemaining}d left
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentMyChildPage;
