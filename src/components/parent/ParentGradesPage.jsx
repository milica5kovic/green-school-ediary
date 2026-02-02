import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';

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

  useEffect(() => {
    if (selectedChild) {
      loadGrades();
    }
  }, [selectedChild]);

  const loadGrades = async () => {
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
  };

  const calculateSubjectAverage = (subjectGrades) => {
    if (subjectGrades.length === 0) return 0;
    const sum = subjectGrades.reduce((acc, g) => acc + (g.grade / g.max_grade * 100), 0);
    return (sum / subjectGrades.length).toFixed(1);
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-gray-700';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getTrendIcon = (subjectGrades) => {
    if (subjectGrades.length < 2) return null;
    
    const sorted = [...subjectGrades].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = (sorted[0].grade / sorted[0].max_grade) * 100;
    const previous = (sorted[1].grade / sorted[1].max_grade) * 100;
    
    if (latest > previous) return { icon: '↗', color: 'text-emerald-600' };
    if (latest < previous) return { icon: '↘', color: 'text-red-600' };
    return { icon: '→', color: 'text-gray-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No student data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Grades</h1>
            <p className="text-sm text-gray-600 mt-1">Academic performance by subject</p>
          </div>
          
          {children.length > 1 && (
            <div className="relative">
              <select
                value={selectedChild?.id || ''}
                onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
              >
                {children.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.name} - Class {child.class_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          )}
        </div>
      </div>

      {/* Grades by Subject */}
      <div className="space-y-4">
        {Object.keys(gradesBySubject).length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No grades recorded yet</p>
          </div>
        ) : (
          Object.entries(gradesBySubject).map(([subject, subjectGrades]) => {
            const average = calculateSubjectAverage(subjectGrades);
            const trend = getTrendIcon(subjectGrades);
            
            return (
              <div key={subject} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{subject}</h3>
                    {trend && (
                      <span className={`text-lg ${trend.color}`}>{trend.icon}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-semibold ${getGradeColor(parseFloat(average))}`}>
                      {average}%
                    </p>
                    <p className="text-xs text-gray-500">Average</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {subjectGrades.map(grade => {
                    const percentage = ((grade.grade / grade.max_grade) * 100).toFixed(1);
                    
                    return (
                      <div key={grade.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{grade.assessment_title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {grade.assessment_type} • {new Date(grade.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${getGradeColor(parseFloat(percentage))}`}>
                            {grade.grade}/{grade.max_grade}
                          </p>
                          <p className="text-xs text-gray-500">{percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
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