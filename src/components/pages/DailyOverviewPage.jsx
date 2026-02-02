import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
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
      
    } catch (error) {
      console.error('Error loading daily overview:', error);
    } finally {
      setLoading(false);
    }
  }, [className, selectedDate, supabase, studentsService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Calculate stats for SELECTED DATE ONLY
  const calculateDailyStats = () => {
    const allAttendance = Object.values(attendanceData);
    const present = allAttendance.filter(a => a.status === 'present').length;
    const absent = allAttendance.filter(a => a.status === 'absent').length;
    const late = allAttendance.filter(a => a.status === 'late').length;
    const sentOut = allAttendance.filter(a => a.status === 'sent_out').length;
    
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{students.length}</p>
          <p className="text-sm text-gray-600">Students</p>
        </div>
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

      {/* Info Notice */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> This is a read-only view. Attendance is marked by subject teachers during their classes. 
          You can view the status and comments for all students in your class.
        </p>
      </div>
    </div>
  );
};

export default DailyOverviewPage;