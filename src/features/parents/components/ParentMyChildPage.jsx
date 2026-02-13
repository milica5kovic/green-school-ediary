import React, { useState, useEffect, useCallback } from 'react';
import { User, ChevronDown, Award, MessageSquare, TrendingUp, Star, AlertCircle, CheckCircle, Target } from 'lucide-react';
import { useApp } from '../../../core/context/AppContext';

const ParentMyChildPage = () => {
  const { supabase } = useApp();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [teacherComments, setTeacherComments] = useState([]);
  const [topSubjects, setTopSubjects] = useState([]);
  const [behaviorStats, setBehaviorStats] = useState({
    positive: 0,
    neutral: 0,
    needsAttention: 0
  });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!parent) return;
      
      const { data: studentParents } = await supabase
        .from('student_parents')
        .select('students(*)')
        .eq('parent_id', parent.id);
      
      const childrenList = studentParents?.map(sp => sp.students).filter(Boolean) || [];
      setChildren(childrenList);
      
      if (childrenList.length > 0) {
        setSelectedChild(childrenList[0]);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadChildDetails = useCallback(async () => {
    if (!selectedChild) return;
    
    try {
      // Load teacher comments
      const { data: comments } = await supabase
        .from('teacher_comments')
        .select(`
          *,
          teachers(full_name, subjects)
        `)
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
      
      // Load grades and calculate top subjects
      const { data: grades } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', selectedChild.id)
        .order('date', { ascending: false });
      
      if (grades && grades.length > 0) {
        const subjectAverages = {};
        
        grades.forEach(grade => {
          if (!subjectAverages[grade.subject]) {
            subjectAverages[grade.subject] = {
              subject: grade.subject,
              grades: [],
              total: 0
            };
          }
          subjectAverages[grade.subject].grades.push(grade);
          subjectAverages[grade.subject].total++;
        });
        
        const topSubjectsData = Object.values(subjectAverages).map(subj => {
          const avg = subj.grades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0) / subj.total;
          return {
            subject: subj.subject,
            average: avg.toFixed(1),
            count: subj.total
          };
        }).sort((a, b) => b.average - a.average).slice(0, 5);
        
        setTopSubjects(topSubjectsData);
      }
      
    } catch (error) {
      console.error('Error loading child details:', error);
    }
  }, [selectedChild, supabase]);

  useEffect(() => {
    if (selectedChild) {
      loadChildDetails();
    }
  }, [selectedChild, loadChildDetails]);

  const getSubjectColor = (average) => {
    if (average >= 90) return {
      bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
      border: 'border-green-300',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-700'
    };
    if (average >= 75) return {
      bg: 'bg-gradient-to-r from-blue-50 to-cyan-50',
      border: 'border-blue-300',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-700'
    };
    if (average >= 60) return {
      bg: 'bg-gradient-to-r from-orange-50 to-yellow-50',
      border: 'border-orange-300',
      text: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-700'
    };
    return {
      bg: 'bg-gradient-to-r from-red-50 to-pink-50',
      border: 'border-red-300',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-700'
    };
  };

  const getBehaviorBadge = () => {
    const total = behaviorStats.positive + behaviorStats.neutral + behaviorStats.needsAttention;
    if (total === 0) return { label: 'No Data', color: 'bg-gray-100 text-gray-600', icon: AlertCircle };
    
    const positiveRate = (behaviorStats.positive / total) * 100;
    
    if (positiveRate >= 70) return { 
      label: 'Excellent Behavior', 
      color: 'bg-green-100 text-green-700 border-green-300', 
      icon: CheckCircle 
    };
    if (positiveRate >= 50) return { 
      label: 'Good Behavior', 
      color: 'bg-blue-100 text-blue-700 border-blue-300', 
      icon: Star 
    };
    if (positiveRate >= 30) return { 
      label: 'Improving', 
      color: 'bg-orange-100 text-orange-700 border-orange-300', 
      icon: TrendingUp 
    };
    return { 
      label: 'Needs Attention', 
      color: 'bg-red-100 text-red-700 border-red-300', 
      icon: AlertCircle 
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
          <User className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-600" size={24} />
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={40} className="text-gray-400" />
        </div>
        <p className="text-gray-600 text-lg">No student data available</p>
        <p className="text-gray-400 text-sm mt-2">Please contact your school administrator</p>
      </div>
    );
  }

  const behaviorBadge = getBehaviorBadge();
  const BehaviorIcon = behaviorBadge.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 via-emerald-600 to-green-500 rounded-3xl shadow-2xl p-8 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm border-2 border-white border-opacity-30">
                <span className="text-2xl font-bold">
                  {selectedChild?.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">{selectedChild?.name}</h1>
                <p className="text-teal-100 text-sm">Class {selectedChild?.class_name}</p>
              </div>
            </div>
            
            {children.length > 1 && (
              <div className="relative">
                <select
                  value={selectedChild?.id || ''}
                  onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                  className="appearance-none bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 cursor-pointer"
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

          {/* Behavior Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 backdrop-blur-md rounded-xl border border-white border-opacity-30">
            <BehaviorIcon size={20} />
            <span className="font-semibold">{behaviorBadge.label}</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Subjects */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target size={24} className="text-emerald-600" />
            Top Subjects
          </h3>
          
          {topSubjects.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Award size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No grades recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topSubjects.map((subj, idx) => {
                const colors = getSubjectColor(parseFloat(subj.average));
                
                return (
                  <div 
                    key={subj.subject}
                    className={'p-4 rounded-xl border-2 transition-all hover:shadow-md ' + colors.bg + ' ' + colors.border}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border-2 border-current">
                          <span className={'text-xl font-bold ' + colors.text}>#{idx + 1}</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{subj.subject}</p>
                          <p className="text-xs text-gray-600">{subj.count} assessments</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={'text-3xl font-bold ' + colors.text}>{subj.average}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Behavior Tracking */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star size={24} className="text-yellow-600" />
            Behavior Overview
          </h3>
          
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center border-2 border-green-200">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">{behaviorStats.positive}</p>
              <p className="text-xs text-green-700 font-medium mt-1">Positive</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 text-center border-2 border-blue-200">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star size={24} className="text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{behaviorStats.neutral}</p>
              <p className="text-xs text-blue-700 font-medium mt-1">Neutral</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 text-center border-2 border-orange-200">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle size={24} className="text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-600">{behaviorStats.needsAttention}</p>
              <p className="text-xs text-orange-700 font-medium mt-1">Needs Work</p>
            </div>
          </div>

          {/* Current Badge */}
          <div className={'p-4 rounded-xl border-2 text-center ' + behaviorBadge.color}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <BehaviorIcon size={24} />
              <p className="text-lg font-bold">Current Status</p>
            </div>
            <p className="text-2xl font-bold">{behaviorBadge.label}</p>
          </div>
        </div>
      </div>

      {/* Teacher Comments */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare size={24} className="text-purple-600" />
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
                <div key={comment.id} className={'p-4 rounded-xl border-2 hover:shadow-md transition-all ' + cardColor}>
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
    </div>
  );
};

export default ParentMyChildPage;