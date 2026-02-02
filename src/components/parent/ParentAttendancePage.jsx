import React, { useState, useEffect, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ParentAttendancePage = () => {
  const { supabase } = useApp();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
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
      loadAttendance();
    }
  }, [selectedChild]);

  const loadAttendance = async () => {
    if (!selectedChild) return;
    
    try {
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', selectedChild.id)
        .order('date_key', { ascending: true });
      
      setAttendance(attendanceData || []);
      
      const total = attendanceData?.length || 0;
      const present = attendanceData?.filter(a => a.status === 'present').length || 0;
      const absent = attendanceData?.filter(a => a.status === 'absent').length || 0;
      const late = attendanceData?.filter(a => a.status === 'late').length || 0;
      const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
      
      setStats({ total, present, absent, late, percentage });
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const startPadding = firstDay.getDay();
    
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
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
    case 'present': return 'bg-emerald-500';
    case 'absent': return 'bg-red-500';
    case 'late': return 'bg-orange-500';
    case 'sent_out': return 'bg-purple-500';
    default: return 'bg-gray-200';
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

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Attendance</h1>
            <p className="text-sm text-gray-600 mt-1">Track daily attendance</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Days</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Present</p>
          <p className="text-2xl font-semibold text-emerald-600">{stats.present}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Absent</p>
          <p className="text-2xl font-semibold text-red-600">{stats.absent}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Late</p>
          <p className="text-2xl font-semibold text-orange-600">{stats.late}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <p className="text-sm text-gray-600 mb-1">Sent Out</p>
    <p className="text-2xl font-semibold text-purple-600">{stats.sentOut}</p>
  </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Rate</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.percentage}%</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{monthName}</h3>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
          
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
                className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-1 transition-all ${
                  today ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                title={attendanceRecord?.comment || ''}
              >
                <span className="text-sm font-medium text-gray-700">{dayNumber}</span>
                {attendanceRecord && (
                  <div className={`w-2 h-2 rounded-full mt-1 ${getStatusColor(attendanceRecord.status)}`} />
                )}
              </div>
            );
          })}
        </div>

       {/* Legend */}
<div className="flex justify-center gap-6 mt-6 pt-6 border-t border-gray-200">
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
    <span className="text-sm text-gray-600">Present</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
    <span className="text-sm text-gray-600">Late</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded-full bg-red-500"></div>
    <span className="text-sm text-gray-600">Absent</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
    <span className="text-sm text-gray-600">Sent Out</span>
  </div>
</div>
      </div>

      {/* Recent Records */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Records</h3>
        
        {attendance.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No attendance records yet</p>
        ) : (
          <div className="space-y-2">
            {[...attendance].reverse().slice(0, 10).map(record => (
              <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(record.status)}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(record.date_key).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    {record.comment && (
                      <p className="text-xs text-gray-500 mt-1">{record.comment}</p>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
  record.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
  record.status === 'late' ? 'bg-orange-100 text-orange-700' :
  record.status === 'absent' ? 'bg-red-100 text-red-700' :
  record.status === 'sent_out' ? 'bg-purple-100 text-purple-700' :
  'bg-gray-100 text-gray-700'
}`}>
  {record.status === 'sent_out' ? 'Sent Out' : record.status.charAt(0).toUpperCase() + record.status.slice(1)}
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