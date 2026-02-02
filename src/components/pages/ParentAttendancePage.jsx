import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ParentAttendancePage = () => {
  const { supabase } = useApp();
  const [child, setChild] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0
  });
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
      
      // Load attendance for current school year
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', childData.id)
        .order('date_key', { ascending: true });
      
      setAttendance(attendanceData || []);
      
      // Calculate stats
      const total = attendanceData?.length || 0;
      const present = attendanceData?.filter(a => a.status === 'present').length || 0;
      const absent = attendanceData?.filter(a => a.status === 'absent').length || 0;
      const late = attendanceData?.filter(a => a.status === 'late').length || 0;
      const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
      
      setStats({ total, present, absent, late, percentage });
      
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const startPadding = firstDay.getDay(); // 0 = Sunday
    
    // Add padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    // Add all days in month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getAttendanceForDate = (date) => {
    if (!date) return null;
    const dateKey = date.toISOString().split('T')[0];
    return attendance.find(a => a.date_key === dateKey);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'absent': return 'bg-red-500';
      case 'late': return 'bg-orange-500';
      default: return 'bg-gray-200';
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'present': return '✅';
      case 'absent': return '❌';
      case 'late': return '🟡';
      default: return '';
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance...</p>
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

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Attendance - {child.name}</h2>
        <p className="text-gray-500">Track daily attendance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-4 shadow">
          <p className="text-3xl font-bold">{stats.total}</p>
          <p className="text-sm opacity-90 mt-1">Total Days</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-green-200 shadow">
          <p className="text-3xl font-bold text-green-600">{stats.present}</p>
          <p className="text-sm text-gray-600 mt-1">Present</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-red-200 shadow">
          <p className="text-3xl font-bold text-red-600">{stats.absent}</p>
          <p className="text-sm text-gray-600 mt-1">Absent</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-orange-200 shadow">
          <p className="text-3xl font-bold text-orange-600">{stats.late}</p>
          <p className="text-sm text-gray-600 mt-1">Late</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-blue-200 shadow">
          <p className="text-3xl font-bold text-blue-600">{stats.percentage}%</p>
          <p className="text-sm text-gray-600 mt-1">Rate</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <CalendarIcon size={24} className="text-emerald-600" />
            {monthName}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={nextMonth}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {daysInMonth.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }
            
            const attendanceRecord = getAttendanceForDate(date);
            const dayNumber = date.getDate();
            const today = isToday(date);
            
            return (
              <div
                key={idx}
                className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-2 transition-all ${
                  today ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'
                } ${attendanceRecord ? 'hover:shadow-lg cursor-pointer' : ''}`}
                title={attendanceRecord?.comment || ''}
              >
                <span className="text-sm font-semibold text-gray-700">{dayNumber}</span>
                {attendanceRecord && (
                  <div className="mt-1">
                    <div className={`w-6 h-6 rounded-full ${getStatusColor(attendanceRecord.status)} flex items-center justify-center text-xs`}>
                      {getStatusEmoji(attendanceRecord.status)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
            <span className="text-sm text-gray-600">Late</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-600">Absent</span>
          </div>
        </div>
      </div>

      {/* Recent Attendance Records */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={24} className="text-emerald-600" />
          Recent Records
        </h3>
        
        {attendance.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No attendance records yet</p>
        ) : (
          <div className="space-y-2">
            {[...attendance].reverse().slice(0, 10).map(record => (
              <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${getStatusColor(record.status)} flex items-center justify-center text-xl`}>
                    {getStatusEmoji(record.status)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      {new Date(record.date_key).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    {record.comment && (
                      <p className="text-sm text-gray-500">{record.comment}</p>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  record.status === 'present' ? 'bg-green-100 text-green-700' :
                  record.status === 'late' ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentAttendancePage;