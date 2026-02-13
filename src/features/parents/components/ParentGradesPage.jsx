import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, ChevronDown, Award, BarChart3, BookOpen, Calendar, Target, TrendingDown } from 'lucide-react';
import { useApp } from '../../../core/context/AppContext';

const ParentGradesPage = () => {
  const { supabase } = useApp();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [grades, setGrades] = useState([]);
  const [gradesBySubject, setGradesBySubject] = useState({});
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

  const loadGrades = useCallback(async () => {
    if (!selectedChild) return;
    
    try {
      const { data: gradesData } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', selectedChild.id)
        .order('date', { ascending: false });
      
      setGrades(gradesData || []);
      
      const grouped = {};
      gradesData?.forEach(grade => {
        if (!grouped[grade.subject]) {
          grouped[grade.subject] = [];
        }
        grouped[grade.subject].push(grade);
      });
      
      setGradesBySubject(grouped);
    } catch (error) {
      console.error('Error loading grades:', error);
    }
  }, [selectedChild, supabase]);

  useEffect(() => {
    if (selectedChild) {
      loadGrades();
    }
  }, [selectedChild, loadGrades]);

  const calculateOverallAverage = () => {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + (g.grade / g.max_grade * 100), 0);
    return (sum / grades.length).toFixed(1);
  };

  const calculateSubjectAverage = (subjectGrades) => {
    if (subjectGrades.length === 0) return 0;
    const sum = subjectGrades.reduce((acc, g) => acc + (g.grade / g.max_grade * 100), 0);
    return (sum / subjectGrades.length).toFixed(1);
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return {
      text: 'text-green-600',
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      border: 'border-green-300',
      badge: 'bg-green-100 text-green-700',
      icon: 'bg-green-100 text-green-600'
    };
    if (percentage >= 75) return {
      text: 'text-blue-600',
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      border: 'border-blue-300',
      badge: 'bg-blue-100 text-blue-700',
      icon: 'bg-blue-100 text-blue-600'
    };
    if (percentage >= 60) return {
      text: 'text-orange-600',
      bg: 'bg-gradient-to-br from-orange-50 to-yellow-50',
      border: 'border-orange-300',
      badge: 'bg-orange-100 text-orange-700',
      icon: 'bg-orange-100 text-orange-600'
    };
    return {
      text: 'text-red-600',
      bg: 'bg-gradient-to-br from-red-50 to-pink-50',
      border: 'border-red-300',
      badge: 'bg-red-100 text-red-700',
      icon: 'bg-red-100 text-red-600'
    };
  };

  const getTrendIcon = (subjectGrades) => {
    if (subjectGrades.length < 2) return null;
    
    const sorted = [...subjectGrades].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = (sorted[0].grade / sorted[0].max_grade) * 100;
    const previous = (sorted[1].grade / sorted[1].max_grade) * 100;
    const diff = latest - previous;
    
    if (diff > 5) return { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100', text: 'Improving' };
    if (diff < -5) return { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100', text: 'Declining' };
    return { icon: TrendingUp, color: 'text-gray-500', bg: 'bg-gray-100', text: 'Stable' };
  };

  const getGradeStats = () => {
    if (grades.length === 0) return { excellent: 0, good: 0, satisfactory: 0, needsWork: 0 };
    
    return {
      excellent: grades.filter(g => (g.grade / g.max_grade * 100) >= 90).length,
      good: grades.filter(g => {
        const pct = (g.grade / g.max_grade * 100);
        return pct >= 75 && pct < 90;
      }).length,
      satisfactory: grades.filter(g => {
        const pct = (g.grade / g.max_grade * 100);
        return pct >= 60 && pct < 75;
      }).length,
      needsWork: grades.filter(g => (g.grade / g.max_grade * 100) < 60).length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <Award className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-600" size={24} />
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Award size={40} className="text-gray-400" />
        </div>
        <p className="text-gray-600 text-lg">No student data available</p>
        <p className="text-gray-400 text-sm mt-2">Please contact your school administrator</p>
      </div>
    );
  }

  const overallAverage = calculateOverallAverage();
  const stats = getGradeStats();

  return (
    <div className="space-y-6">
      {/* Header with Analytics */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl shadow-2xl p-8 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Award size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Academic Grades</h1>
                  <p className="text-purple-100 text-sm">Performance tracking & analytics</p>
                </div>
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

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-100 text-xs font-medium">Overall Avg</p>
                <Target size={16} className="opacity-70" />
              </div>
              <p className="text-3xl font-bold">{overallAverage}%</p>
            </div>
            
            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-100 text-xs font-medium">Excellent</p>
                <Award size={16} className="opacity-70" />
              </div>
              <p className="text-3xl font-bold">{stats.excellent}</p>
            </div>
            
            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-100 text-xs font-medium">Good</p>
                <TrendingUp size={16} className="opacity-70" />
              </div>
              <p className="text-3xl font-bold">{stats.good}</p>
            </div>
            
            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-orange-100 text-xs font-medium">Fair</p>
                <BarChart3 size={16} className="opacity-70" />
              </div>
              <p className="text-3xl font-bold">{stats.satisfactory}</p>
            </div>
            
            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-red-100 text-xs font-medium">Needs Work</p>
                <TrendingDown size={16} className="opacity-70" />
              </div>
              <p className="text-3xl font-bold">{stats.needsWork}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grades by Subject */}
      <div className="space-y-4">
        {Object.keys(gradesBySubject).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-16 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award size={40} className="text-purple-400" />
            </div>
            <p className="text-gray-500 text-lg font-medium">No grades recorded yet</p>
            <p className="text-gray-400 text-sm mt-2">Grades will appear here once teachers enter them</p>
          </div>
        ) : (
          Object.entries(gradesBySubject).map(([subject, subjectGrades]) => {
            const average = calculateSubjectAverage(subjectGrades);
            const trend = getTrendIcon(subjectGrades);
            const colors = getGradeColor(parseFloat(average));
            const TrendIcon = trend?.icon;
            
            return (
              <div key={subject} className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all">
                {/* Subject Header */}
                <div className={'p-6 border-b-2 ' + colors.bg + ' ' + colors.border}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={'w-14 h-14 rounded-2xl flex items-center justify-center ' + colors.icon}>
                        <BookOpen size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{subject}</h3>
                        <p className="text-sm text-gray-600">{subjectGrades.length} assessments</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-3 justify-end mb-1">
                        <p className={'text-4xl font-bold ' + colors.text}>
                          {average}%
                        </p>
                        {trend && (
                          <div className={'px-3 py-1.5 rounded-xl flex items-center gap-1 ' + trend.bg}>
                            <TrendIcon size={16} className={trend.color} />
                            <span className={'text-xs font-semibold ' + trend.color}>{trend.text}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 font-medium">Subject Average</p>
                    </div>
                  </div>
                </div>
                
                {/* Grades List */}
                <div className="p-6">
                  <div className="space-y-3">
                    {subjectGrades.map((grade) => {
                      const percentage = ((grade.grade / grade.max_grade) * 100).toFixed(1);
                      const gradeColors = getGradeColor(parseFloat(percentage));
                      
                      return (
                        <div 
                          key={grade.id} 
                          className={'p-4 rounded-xl border-2 hover:shadow-md transition-all ' + gradeColors.bg + ' ' + gradeColors.border}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4 flex-1">
                              <div className={'w-12 h-12 rounded-xl flex items-center justify-center border-2 ' + gradeColors.icon + ' ' + gradeColors.border}>
                                <div className="text-center">
                                  <p className="text-lg font-bold leading-none">{percentage}</p>
                                  <p className="text-xs opacity-70">%</p>
                                </div>
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={'px-2 py-0.5 rounded-lg text-xs font-semibold ' + gradeColors.badge}>
                                    {grade.assessment_type}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-gray-600">
                                    <Calendar size={12} />
                                    {new Date(grade.date).toLocaleDateString('en-GB')}
                                  </span>
                                </div>
                                <p className="font-semibold text-gray-900">{grade.assessment_title}</p>
                                {grade.notes && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-1">{grade.notes}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className={'text-2xl font-bold ' + gradeColors.text}>
                                {grade.grade}
                              </p>
                              <p className="text-sm text-gray-500">/ {grade.max_grade}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ParentGradesPage;