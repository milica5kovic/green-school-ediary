import React, { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, BookOpen, ClipboardCheck, Download, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

const ClassOverviewPage = () => {
  const { teacher, getClassTeacherFor } = useAuth();
  const { supabase, studentsService } = useApp();
  
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const className = getClassTeacherFor();

const loadClassData = useCallback(async () => {
  if (!className || !supabase || !studentsService) {
    console.log('Missing dependencies:', { className, supabase: !!supabase, studentsService: !!studentsService });
    setLoading(false);
    return;
  }
  
  try {
    setLoading(true);
    console.log('Loading data for class:', className);
    
    // Load students in this class
    const classStudents = await studentsService.getStudentsByClass(className);
    console.log('Students loaded:', classStudents.length);
    
    if (classStudents.length === 0) {
      setStudents([]);
      setGrades([]);
      setAttendance([]);
      setHomework([]);
      setLoading(false);
      return;
    }
    
    const studentIds = classStudents.map(s => s.id);
    
    // Load grades for these students
    const { data: gradesData, error: gradesError } = await supabase
      .from('grades')
      .select('*')
      .in('student_id', studentIds)
      .order('date', { ascending: false });
    
    if (gradesError) {
      console.error('Grades error:', gradesError);
    }
    
    // Load attendance (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateKey = thirtyDaysAgo.toISOString().split('T')[0];
    
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .in('student_id', studentIds)
      .gte('date_key', dateKey);
    
    if (attendanceError) {
      console.error('Attendance error:', attendanceError);
    }
    
    // Load homework for this class
    const { data: homeworkData, error: homeworkError } = await supabase
      .from('homework')
      .select('*')
      .eq('class_name', className)
      .order('due_date', { ascending: false })
      .limit(10);
    
    if (homeworkError) {
      console.error('Homework error:', homeworkError);
    }
    
    setStudents(classStudents);
    setGrades(gradesData || []);
    setAttendance(attendanceData || []);
    setHomework(homeworkData || []);
    
    console.log('Data loaded successfully');
    
  } catch (error) {
    console.error('Error loading class data:', error);
    alert('Failed to load class data: ' + error.message);
  } finally {
    setLoading(false);
  }
}, [className, supabase, studentsService]);
  useEffect(() => {
    loadClassData();
  }, [loadClassData]);

  // Calculate student stats
  const getStudentStats = (studentId) => {
    // Attendance
    const studentAttendance = attendance.filter(a => a.student_id === studentId);
    const totalDays = studentAttendance.length;
    const presentDays = studentAttendance.filter(a => a.status === 'present').length;
    const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;
    
    // Grades
    const studentGrades = grades.filter(g => g.student_id === studentId);
    const avgGrade = studentGrades.length > 0
      ? (studentGrades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0) / studentGrades.length).toFixed(1)
      : 0;
    
    return {
      attendanceRate: parseFloat(attendanceRate),
      avgGrade: parseFloat(avgGrade),
      totalGrades: studentGrades.length,
      totalAttendance: totalDays
    };
  };

  // Calculate class averages
  const classStats = {
    totalStudents: students.length,
    avgAttendance: students.length > 0
      ? (students.reduce((sum, s) => sum + getStudentStats(s.id).attendanceRate, 0) / students.length).toFixed(1)
      : 0,
    avgGrade: students.length > 0
      ? (students.reduce((sum, s) => sum + getStudentStats(s.id).avgGrade, 0) / students.length).toFixed(1)
      : 0,
    totalHomework: homework.length,
    pendingHomework: homework.filter(h => h.status === 'pending').length
  };

  // Get subjects taught in this class
  const subjects = [...new Set(grades.map(g => g.subject))];

  const exportClassReport = () => {
    alert('Class report PDF export coming soon!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading class data...</p>
        </div>
      </div>
    );
  }

  if (!className) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-red-200">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h3 className="text-xl font-bold text-gray-800">Not a Class Teacher</h3>
        <p className="text-gray-500 mt-2">You are not assigned as a class teacher.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Class Overview - {className}</h2>
            <p className="text-gray-500 mt-1">Complete view of your class</p>
          </div>
          <button
            onClick={exportClassReport}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Download size={20} />
            Export Report
          </button>
        </div>

        {/* Class Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-4">
            <p className="text-3xl font-bold">{classStats.totalStudents}</p>
            <p className="text-sm opacity-90 mt-1">Total Students</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-blue-200">
            <p className="text-3xl font-bold text-blue-600">{classStats.avgAttendance}%</p>
            <p className="text-sm text-gray-600 mt-1">Avg Attendance</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-purple-200">
            <p className="text-3xl font-bold text-purple-600">{classStats.avgGrade}%</p>
            <p className="text-sm text-gray-600 mt-1">Avg Grade</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-orange-200">
            <p className="text-3xl font-bold text-orange-600">{classStats.totalHomework}</p>
            <p className="text-sm text-gray-600 mt-1">Total Homework</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-green-200">
            <p className="text-3xl font-bold text-green-600">{subjects.length}</p>
            <p className="text-sm text-gray-600 mt-1">Subjects</p>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Users size={24} className="text-emerald-600" />
          Student Performance
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-emerald-50 border-b border-emerald-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-700">No.</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-700">Student Name</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-700">Attendance</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-700">Avg Grade</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-700">Total Grades</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map(student => {
                const stats = getStudentStats(student.id);
                const attendanceColor = stats.attendanceRate >= 90 ? 'text-green-600' :
                                       stats.attendanceRate >= 80 ? 'text-blue-600' :
                                       stats.attendanceRate >= 70 ? 'text-orange-600' : 'text-red-600';
                
                const gradeColor = stats.avgGrade >= 80 ? 'text-green-600' :
                                  stats.avgGrade >= 70 ? 'text-blue-600' :
                                  stats.avgGrade >= 60 ? 'text-orange-600' : 'text-red-600';
                
                return (
                  <tr key={student.id} className="hover:bg-emerald-50 transition-colors">
                    <td className="px-6 py-4 text-center font-semibold text-gray-600">{student.student_no}</td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{student.name}</td>
                    <td className={`px-6 py-4 text-center font-bold ${attendanceColor}`}>
                      {stats.attendanceRate}%
                      <span className="text-xs text-gray-400 ml-1">({stats.totalAttendance})</span>
                    </td>
                    <td className={`px-6 py-4 text-center font-bold ${gradeColor}`}>
                      {stats.avgGrade}%
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600">{stats.totalGrades}</td>
                    <td className="px-6 py-4 text-center">
                      {stats.attendanceRate < 80 || stats.avgGrade < 60 ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                          ⚠️ Attention Needed
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          ✓ On Track
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Homework */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BookOpen size={24} className="text-emerald-600" />
          Recent Homework
        </h3>
        
        {homework.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No homework assigned yet</p>
        ) : (
          <div className="space-y-3">
            {homework.slice(0, 5).map(hw => (
              <div key={hw.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-800">{hw.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{hw.subject}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      Due: {new Date(hw.due_date).toLocaleDateString()}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${
                      hw.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {hw.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassOverviewPage;