import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ParentGradesPage = () => {
  const { supabase } = useApp();
  const [child, setChild] = useState(null);
  const [grades, setGrades] = useState([]);
  const [gradesBySubject, setGradesBySubject] = useState({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get parent record
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!parent) return;
      
      // Get child
      const { data: studentParents } = await supabase
        .from('student_parents')
        .select('students(*)')
        .eq('parent_id', parent.id)
        .limit(1);
      
      const childData = studentParents?.[0]?.students;
      if (!childData) return;
      
      setChild(childData);
      
      // Load all grades
      const { data: gradesData } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', childData.id)
        .order('date', { ascending: false });
      
      setGrades(gradesData || []);
      
      // Group by subject
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
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateSubjectAverage = (subjectGrades) => {
    if (subjectGrades.length === 0) return 0;
    const sum = subjectGrades.reduce((acc, g) => acc + (g.grade / g.max_grade * 100), 0);
    return (sum / subjectGrades.length).toFixed(1);
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-purple-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  const getGradeTrend = (subjectGrades) => {
    if (subjectGrades.length < 2) return null;
    
    // Get last 2 grades
    const sorted = [...subjectGrades].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = (sorted[0].grade / sorted[0].max_grade) * 100;
    const previous = (sorted[1].grade / sorted[1].max_grade) * 100;
    
    if (latest > previous) return { trend: 'up', icon: '📈', color: 'text-green-600' };
    if (latest < previous) return { trend: 'down', icon: '📉', color: 'text-red-600' };
    return { trend: 'stable', icon: '➡️', color: 'text-gray-600' };
  };

  const getChartData = () => {
    // Get last 10 grades chronologically
    const sorted = [...grades].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-10);
    
    return sorted.map(grade => ({
      date: new Date(grade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      percentage: ((grade.grade / grade.max_grade) * 100).toFixed(1),
      subject: grade.subject
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading grades...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <p className="text-gray-500">No student data available</p>
      </div>
    );
  }

  const chartData = getChartData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Grades - {child.name}</h2>
        <p className="text-gray-500">Academic performance by subject</p>
      </div>

      {/* Grade Trend Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={24} className="text-emerald-600" />
            Grade Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={2} name="Grade %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Grades by Subject */}
      <div className="space-y-4">
        {Object.keys(gradesBySubject).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-emerald-100">
            <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No grades recorded yet</p>
          </div>
        ) : (
          Object.entries(gradesBySubject).map(([subject, subjectGrades]) => {
            const average = calculateSubjectAverage(subjectGrades);
            const trend = getGradeTrend(subjectGrades);
            
            return (
              <div key={subject} className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-800">{subject}</h3>
                    {trend && (
                      <span className={`text-sm font-medium ${trend.color}`}>
                        {trend.icon} {trend.trend === 'up' ? 'Improving' : trend.trend === 'down' ? 'Declining' : 'Stable'}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${getGradeColor(parseFloat(average))}`}>
                      {average}%
                    </p>
                    <p className="text-sm text-gray-500">Average</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {subjectGrades.map(grade => {
                    const percentage = ((grade.grade / grade.max_grade) * 100).toFixed(1);
                    
                    return (
                      <div key={grade.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div>
                          <p className="font-medium text-gray-800">{grade.assessment_title}</p>
                          <p className="text-sm text-gray-500">
                            {grade.assessment_type} • {new Date(grade.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${getGradeColor(parseFloat(percentage))}`}>
                            {grade.grade}/{grade.max_grade}
                          </p>
                          <p className="text-sm text-gray-500">{percentage}%</p>
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