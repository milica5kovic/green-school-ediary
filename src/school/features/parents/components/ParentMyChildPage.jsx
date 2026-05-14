import React, { useState, useEffect, useCallback } from 'react';
import { User, ChevronDown, Award, MessageSquare, TrendingUp, Star, AlertCircle, CheckCircle, Target, Users } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import useParentChildren from '../../../../shared/hooks/useParentChildren';
import { getCambridgeGrade, isPrimaryClass } from '../../../../core/utils/cambridgeGrading';

// ════════════════════════════════════════════════════════════════════════════
// PARENT MY CHILD PAGE - Uses useTermTheme for dynamic colors
// ════════════════════════════════════════════════════════════════════════════

const ParentMyChildPage = () => {
  const { supabase } = useApp();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  const { children, selectedChild, setSelectedChild, loading } = useParentChildren();
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
      
      // Calculate behavior stats
      const positive = comments?.filter(c => 
        c.comment.toLowerCase().includes('excellent') || 
        c.comment.toLowerCase().includes('great') ||
        c.comment.toLowerCase().includes('good')
      ).length || 0;
      
      const needsAttention = comments?.filter(c => 
        c.comment.toLowerCase().includes('improve') || 
        c.comment.toLowerCase().includes('concern') ||
        c.comment.toLowerCase().includes('needs')
      ).length || 0;
      
      const neutral = (comments?.length || 0) - positive - needsAttention;
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
          const cambridge = getCambridgeGrade(avgPct, className);
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
    if (total === 0) return { label: 'No Data', color: 'bg-gray-100 text-gray-600', icon: AlertCircle };
    
    const positiveRate = (behaviorStats.positive / total) * 100;
    
    if (positiveRate >= 70) return { label: 'Excellent Behavior', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle };
    if (positiveRate >= 50) return { label: 'Good Behavior', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Star };
    if (positiveRate >= 30) return { label: 'Improving', color: 'bg-orange-100 text-orange-700 border-orange-300', icon: TrendingUp };
    return { label: 'Needs Attention', color: 'bg-red-100 text-red-700 border-red-300', icon: AlertCircle };
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
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
        <Users size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600 text-lg font-medium">No student data available</p>
        <p className="text-gray-400 text-sm mt-2">Please contact your school administrator</p>
      </div>
    );
  }

  const behaviorBadge = getBehaviorBadge();
  const BehaviorIcon = behaviorBadge.icon;
  const primary = isPrimaryClass(selectedChild?.class_name);

  return (
    <div className="space-y-6">
      {/* ═══ HEADER - Dynamic Gradient ═══════════════════════ */}
      <div className="rounded-2xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden"
        style={theme.gradientStyle}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur border-2 border-white/30">
                <span className="text-2xl font-bold">
                  {selectedChild?.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">{selectedChild?.name}</h1>
                <p className="text-white/70 text-sm">Class {selectedChild?.class_name} · {primary ? 'Cambridge Primary' : 'Cambridge IGCSE'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
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
                    onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                    className="appearance-none bg-white/20 backdrop-blur border border-white/30 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-white focus:outline-none cursor-pointer"
                  >
                    {children.map(child => (
                      <option key={child.id} value={child.id} className="text-gray-900">
                        {child.name} - {child.class_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" size={16} />
                </div>
              )}
            </div>
          </div>

          {/* Behavior Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur rounded-xl border border-white/20">
            <BehaviorIcon size={20} />
            <span className="font-semibold">{behaviorBadge.label}</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ═══ TOP SUBJECTS ═══════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target size={20} style={theme.textStyle} />
            Top Subjects
          </h3>
          
          {topSubjects.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Award size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No grades recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topSubjects.map((subj, idx) => (
                <div key={subj.subject}
                  className="p-4 rounded-xl border-2 transition-all hover:shadow-md"
                  style={{ 
                    backgroundColor: subj.cambridge.color + '10',
                    borderColor: subj.cambridge.color + '40'
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: subj.cambridge.color }}>
                        {subj.cambridge.short}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{subj.subject}</p>
                        <p className="text-xs text-gray-600">{subj.count} assessment{subj.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold" style={{ color: subj.cambridge.color }}>
                        {subj.cambridge.display}
                      </p>
                      <p className="text-xs text-gray-400">{subj.avgPct}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ BEHAVIOR TRACKING ══════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star size={20} className="text-yellow-600" />
            Behavior Overview
          </h3>
          
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center border-2 border-green-200">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{behaviorStats.positive}</p>
              <p className="text-[10px] text-green-700 font-medium mt-1">Positive</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 text-center border-2 border-blue-200">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star size={20} className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{behaviorStats.neutral}</p>
              <p className="text-[10px] text-blue-700 font-medium mt-1">Neutral</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 text-center border-2 border-orange-200">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle size={20} className="text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-600">{behaviorStats.needsAttention}</p>
              <p className="text-[10px] text-orange-700 font-medium mt-1">Needs Work</p>
            </div>
          </div>

          {/* Current Badge */}
          <div className={`p-4 rounded-xl border-2 text-center ${behaviorBadge.color}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <BehaviorIcon size={20} />
              <p className="text-sm font-bold">Current Status</p>
            </div>
            <p className="text-xl font-bold">{behaviorBadge.label}</p>
          </div>
        </div>
      </div>

      {/* ═══ TEACHER COMMENTS ═════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare size={20} style={theme.textStyle} />
          Teacher Feedback
        </h3>
        
        {teacherComments.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No teacher comments yet</p>
            <p className="text-sm text-gray-400 mt-2">Comments will appear here when teachers add them</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {teacherComments.map((comment) => {
              const isPositive = comment.comment.toLowerCase().includes('excellent') || 
                                comment.comment.toLowerCase().includes('great') ||
                                comment.comment.toLowerCase().includes('good');
              const isNegative = comment.comment.toLowerCase().includes('improve') || 
                                comment.comment.toLowerCase().includes('concern') ||
                                comment.comment.toLowerCase().includes('needs');
              
              const cardColor = isPositive 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                : isNegative 
                ? 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200'
                : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200';
              
              return (
                <div key={comment.id} className={`p-4 rounded-xl border-2 hover:shadow-md transition-all ${cardColor}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{comment.teachers?.full_name || 'Teacher'}</p>
                      <p className="text-xs text-gray-600">{comment.teachers?.subjects?.join(', ') || 'Subject'}</p>
                    </div>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-lg">
                      {new Date(comment.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{comment.comment}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ TERM FOOTER ═════════════════════════════════════ */}
      {theme.hasActiveTerm && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} style={theme.textStyle} />
            <span className="text-xs font-semibold" style={theme.textStyle}>{theme.name} Term {theme.activeTerm.academic_year}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 rounded-full h-1.5 hidden sm:block" style={{ backgroundColor: theme.withAlpha(0.2) }}>
              <div className="h-1.5 rounded-full" style={{ width: `${theme.progress}%`, backgroundColor: theme.color }} />
            </div>
            <span className="text-[10px] font-medium" style={theme.textStyle}>
              {theme.daysRemaining}d left
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentMyChildPage;