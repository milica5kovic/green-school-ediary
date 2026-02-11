import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  User,
  TrendingUp,
  Award,
  BookOpen,
  MessageSquare,
  X,
  ChevronDown,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const DailyOverviewPage = () => {
  const { supabase, studentsService } = useApp();
  const { getClassTeacherFor } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [students, setStudents] = useState([]);
  const [dailyClasses, setDailyClasses] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentFullData, setStudentFullData] = useState(null);
  const [loadingStudentData, setLoadingStudentData] = useState(false);

  const className = getClassTeacherFor();

  const loadData = useCallback(async () => {
    if (!className || !supabase || !studentsService) return;
    
    try {
      setLoading(true);
      const dateKey = selectedDate.toISOString().split('T')[0];
      
      // Load students in this class
      const classStudents = await studentsService.getStudentsByClass(className);
      setStudents(classStudents);
      
      // Load classes for this date and class
      const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .eq('date_key', dateKey)
        .eq('class_name', className)
        .order('time');
      
      setDailyClasses(classes || []);
      
      // Load attendance for all students for THIS DATE ONLY
      const studentIds = classStudents.map(s => s.id);
      
      if (studentIds.length > 0) {
        const { data: attendance } = await supabase
          .from('attendance')
          .select('*')
          .eq('date_key', dateKey)
          .in('student_id', studentIds);
        
        // Group attendance by student_id and class_id
        const attendanceMap = {};
        attendance?.forEach(att => {
          const key = `${att.student_id}-${att.class_id}`;
          attendanceMap[key] = att;
        });
        
        setAttendanceData(attendanceMap);
      } else {
        setAttendanceData({});
      }
      
    } catch (error) {
      console.error('Error loading daily overview:', error);
    } finally {
      setLoading(false);
    }
  }, [className, selectedDate, supabase, studentsService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

const loadStudentFullData = async (student) => {
  setSelectedStudent(student);
  setLoadingStudentData(true);
  
  try {
    // Load all grades for this school year
    const { data: grades } = await supabase
      .from('grades')
      .select('*')
      .eq('student_id', student.id)
      .order('date', { ascending: false });
    
    // Load ALL attendance (not just 30 days)
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', student.id)
      .order('date_key', { ascending: false });
    
    // Load all teacher comments
    const { data: comments } = await supabase
      .from('teacher_comments')
      .select(`
        *,
        teachers(full_name)
      `)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    
    // Calculate grade average
    const gradeAverage = grades?.length > 0
      ? (grades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0) / grades.length).toFixed(1)
      : 0;
    
    // Calculate attendance stats (ALL TIME)
    const attendanceStats = {
      total: attendance?.length || 0,
      present: attendance?.filter(a => a.status === 'present').length || 0,
      late: attendance?.filter(a => a.status === 'late').length || 0,
      absent: attendance?.filter(a => a.status === 'absent').length || 0,
      sentOut: attendance?.filter(a => a.status === 'sent_out').length || 0
    };
    
    attendanceStats.rate = attendanceStats.total > 0
      ? ((attendanceStats.present / attendanceStats.total) * 100).toFixed(1)
      : 0;
    
    // Group grades by subject
    const gradesBySubject = {};
    grades?.forEach(grade => {
      if (!gradesBySubject[grade.subject]) {
        gradesBySubject[grade.subject] = [];
      }
      gradesBySubject[grade.subject].push(grade);
    });
    
    // Calculate subject averages
    const subjectAverages = Object.keys(gradesBySubject).map(subject => {
      const subjectGrades = gradesBySubject[subject];
      const avg = subjectGrades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0) / subjectGrades.length;
      return { subject, average: avg.toFixed(1), count: subjectGrades.length };
    }).sort((a, b) => b.average - a.average);
    
    setStudentFullData({
      grades: grades || [],
      attendance: attendance || [],
      comments: comments || [],
      gradeAverage,
      attendanceStats,
      subjectAverages,
      gradesBySubject
    });
    
  } catch (error) {
    console.error('Error loading student data:', error);
  } finally {
    setLoadingStudentData(false);
  }
};

  const getAttendanceStatus = (studentId, classId) => {
    const key = `${studentId}-${classId}`;
    return attendanceData[key]?.status || null;
  };

  const getAttendanceComment = (studentId, classId) => {
    const key = `${studentId}-${classId}`;
    return attendanceData[key]?.comment || '';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">P</span>;
      case 'late':
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">L</span>;
      case 'absent':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">A</span>;
      case 'sent_out':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">SO</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">-</span>;
    }
  };

  const prevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const calculateDailyStats = () => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let sentOut = 0;

    dailyClasses.forEach(cls => {
      students.forEach(student => {
        const status = getAttendanceStatus(student.id, cls.class_id);
        
        if (status === 'present') present++;
        else if (status === 'absent') absent++;
        else if (status === 'late') late++;
        else if (status === 'sent_out') sentOut++;
      });
    });

    return { present, absent, late, sentOut };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const dateString = selectedDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const stats = calculateDailyStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">Daily Overview - Class {className}</h2>
            <p className="text-emerald-100 mt-1">View attendance for all classes</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={prevDay}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextDay}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/90">
          <Calendar size={18} />
          <span className="font-medium">{dateString}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-purple-600">{dailyClasses.length}</p>
          <p className="text-sm text-gray-600">Classes</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-emerald-200 p-4">
          <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
          <p className="text-sm text-gray-600">Present</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-4">
          <p className="text-2xl font-bold text-orange-600">{stats.late}</p>
          <p className="text-sm text-gray-600">Late</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
          <p className="text-sm text-gray-600">Absent</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-4">
          <p className="text-2xl font-bold text-purple-600">{stats.sentOut}</p>
          <p className="text-sm text-gray-600">Sent Out</p>
        </div>
      </div>

      {/* Classes */}
      {dailyClasses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No classes scheduled for this date</p>
          <p className="text-sm text-gray-400 mt-2">Classes are only shown for weekdays when they are scheduled</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dailyClasses.map(cls => (
            <div key={cls.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Class Header */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <Clock size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{cls.time} - {cls.subject}</h3>
                    {cls.title && (
                      <p className="text-sm text-gray-600">{cls.title}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Students Table */}
              <div className="p-4">
                <div className="grid gap-2">
                  {students.map(student => {
                    const status = getAttendanceStatus(student.id, cls.class_id);
                    const comment = getAttendanceComment(student.id, cls.class_id);
                    
                    return (
                      <div
                        key={student.id}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {/* Student Info */}
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                            <span className="text-emerald-700 font-semibold text-sm">
                              {student.student_no}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{student.name}</span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-3">
                          {getStatusBadge(status)}
                        </div>

                        {/* Comment (Read-only) */}
                        {comment && (
                          <div className="flex-1 max-w-md">
                            <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-xs text-blue-900">{comment}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student List with Analytics */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <User size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Class Students</h3>
            <p className="text-sm text-gray-600">Click on any student to view detailed analytics</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map(student => (
            <button
              key={student.id}
              onClick={() => loadStudentFullData(student)}
              className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">
                    {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{student.name}</p>
                  <p className="text-sm text-gray-600">No. {student.student_no}</p>
                </div>
                <ChevronDown size={18} className="text-indigo-400 rotate-[-90deg]" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Student Analytics Modal */}
 
{selectedStudent && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* Modal Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
            <User size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{selectedStudent.name}</h3>
            <p className="text-indigo-100 text-sm">Student No. {selectedStudent.student_no} • Class {className}</p>
          </div>
        </div>
        <button 
          onClick={() => setSelectedStudent(null)}
          className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Modal Content */}
      {loadingStudentData ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : studentFullData && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-green-700">Average</p>
                <Award size={16} className="text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">{studentFullData.gradeAverage}%</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-blue-700">Attendance</p>
                <CheckCircle size={16} className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700">{studentFullData.attendanceStats.rate}%</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-purple-700">Grades</p>
                <BarChart3 size={16} className="text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-700">{studentFullData.grades.length}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 border-2 border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-orange-700">Comments</p>
                <MessageSquare size={16} className="text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-700">{studentFullData.comments.length}</p>
            </div>
          </div>

          {/* Attendance Breakdown */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Calendar size={18} className="text-blue-600" />
              Attendance Breakdown (All Time)
            </h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xl font-bold text-green-700">{studentFullData.attendanceStats.present}</p>
                <p className="text-xs text-green-600">Present</p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xl font-bold text-orange-700">{studentFullData.attendanceStats.late}</p>
                <p className="text-xs text-orange-600">Late</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xl font-bold text-red-700">{studentFullData.attendanceStats.absent}</p>
                <p className="text-xs text-red-600">Absent</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xl font-bold text-purple-700">{studentFullData.attendanceStats.sentOut}</p>
                <p className="text-xs text-purple-600">Sent Out</p>
              </div>
            </div>
          </div>

          {/* Subject Performance */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <BookOpen size={18} className="text-purple-600" />
              Subject Performance
            </h4>
            <div className="space-y-2">
              {studentFullData.subjectAverages.map((subject, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{subject.subject}</span>
                      <span className="text-xs font-bold text-gray-900">{subject.average}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={'h-1.5 rounded-full transition-all ' + 
                          (subject.average >= 90 ? 'bg-green-500' :
                           subject.average >= 75 ? 'bg-blue-500' :
                           subject.average >= 60 ? 'bg-orange-500' : 'bg-red-500')}
                        style={{ width: `${subject.average}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{subject.count} grades</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Grades */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <TrendingUp size={18} className="text-green-600" />
              All Grades ({studentFullData.grades.length})
            </h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {studentFullData.grades.map((grade, idx) => {
                const percentage = ((grade.grade / grade.max_grade) * 100).toFixed(0);
                return (
                  <div key={idx} className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                            {grade.subject}
                          </span>
                          <span className="text-xs font-medium text-gray-900 truncate">{grade.assessment_title}</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {new Date(grade.date).toLocaleDateString()} • {grade.assessment_type}
                        </p>
                        {grade.notes && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{grade.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Grade as fraction */}
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Grade</p>
                          <p className={'text-lg font-bold leading-tight ' + 
                            (percentage >= 90 ? 'text-green-600' :
                             percentage >= 75 ? 'text-blue-600' :
                             percentage >= 60 ? 'text-orange-600' : 'text-red-600')}>
                            {grade.grade}<span className="text-xs text-gray-400">/{grade.max_grade}</span>
                          </p>
                        </div>
                        {/* Percentage badge */}
                        <div className={'px-2 py-1 rounded-lg font-bold text-xs ' +
                          (percentage >= 90 ? 'bg-green-100 text-green-700' :
                           percentage >= 75 ? 'bg-blue-100 text-blue-700' :
                           percentage >= 60 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700')}>
                          {percentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Teacher Comments */}
          {studentFullData.comments.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <MessageSquare size={18} className="text-orange-600" />
                Teacher Comments ({studentFullData.comments.length})
              </h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {studentFullData.comments.map((comment, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-xs font-semibold text-blue-900">
                          {comment.teachers?.full_name || 'Teacher'}
                        </p>
                        <p className="text-xs text-blue-700">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {comment.comment_type && (
                        <span className={'px-2 py-0.5 rounded text-xs font-semibold ' +
                          (comment.comment_type === 'positive' ? 'bg-green-100 text-green-700' :
                           comment.comment_type === 'negative' ? 'bg-red-100 text-red-700' :
                           'bg-gray-100 text-gray-700')}>
                          {comment.comment_type}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Attendance */}
          <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <Clock size={18} className="text-cyan-600" />
              Attendance History ({studentFullData.attendance.length} records)
            </h4>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {studentFullData.attendance.map((att, idx) => {
                const statusConfig = {
                  present: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'Present', icon: CheckCircle },
                  late: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'Late', icon: Clock },
                  absent: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Absent', icon: XCircle },
                  sent_out: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: 'Sent Out', icon: AlertCircle }
                };
                
                const config = statusConfig[att.status] || statusConfig.present;
                const StatusIcon = config.icon;
                
                return (
                  <div key={idx} className={`p-2 rounded-lg border ${config.bg} ${config.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon size={14} className={config.text} />
                        <span className="text-xs font-medium text-gray-900">
                          {new Date(att.date_key).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      <span className={`text-xs font-semibold ${config.text}`}>
                        {config.label}
                      </span>
                    </div>
                    {att.comment && (
                      <p className="text-xs text-gray-600 mt-1">{att.comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Footer */}
      <div className="border-t px-6 py-3 bg-gray-50">
        <button
          onClick={() => setSelectedStudent(null)}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl hover:shadow-lg transition-all font-semibold text-sm"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
      {/* Info Notice */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> This is a read-only view. Attendance is marked by subject teachers during their classes. 
          Click on any student below to view their complete academic profile and analytics.
        </p>
      </div>
    </div>
  );
};

export default DailyOverviewPage;