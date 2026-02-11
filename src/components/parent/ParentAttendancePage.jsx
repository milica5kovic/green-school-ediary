import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  TrendingUp, 
  Award, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
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
    sentOut: 0,
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

  const loadAttendance = useCallback(async () => {
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
      const sentOut = attendanceData?.filter(a => a.status === 'sent_out').length || 0;
      const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
      
      setStats({ total, present, absent, late, sentOut, percentage });
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  }, [selectedChild, supabase]);

  useEffect(() => {
    if (selectedChild) {
      loadAttendance();
    }
  }, [selectedChild, loadAttendance]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    
    // Start from Monday (1 = Monday, 0 = Sunday)
    let startPadding = firstDay.getDay() - 1;
    if (startPadding === -1) startPadding = 6; // If Sunday, show 6 empty cells
    
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

  const isWeekend = (date) => {
    if (!date) return false;
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <CalendarIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={24} />
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CalendarIcon size={40} className="text-gray-400" />
        </div>
        <p className="text-gray-600 text-lg">No student data available</p>
        <p className="text-gray-400 text-sm mt-2">Please contact your school administrator</p>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500 rounded-3xl shadow-2xl p-8 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Attendance Tracker</h1>
                  <p className="text-blue-100 text-sm">Daily attendance records & statistics</p>
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
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-100 text-xs font-medium">Total Days</p>
                <CalendarIcon size={14} className="opacity-70" />
              </div>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            
            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-100 text-xs font-medium">Present</p>
                <CheckCircle size={14} className="opacity-70" />
              </div>
              <p className="text-3xl font-bold">{stats.present}</p>
            </div>
            
            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-orange-100 text-xs font-medium">Late</p>
                <Clock size={14} className="opacity-70" />
              </div>
              <p className="text-3xl font-bold">{stats.late}</p>
            </div>
            
            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-red-100 text-xs font-medium">Absent</p>
                <XCircle size={14} className="opacity-70" />
              </div>
              <p className="text-3xl font-bold">{stats.absent}</p>
            </div>
            
            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-100 text-xs font-medium">Sent Out</p>
                <AlertCircle size={14} className="opacity-70" />
              </div>
              <p className="text-3xl font-bold">{stats.sentOut}</p>
            </div>
            
            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-100 text-xs font-medium">Rate</p>
                <TrendingUp size={14} className="opacity-70" />
              </div>
              <p className="text-3xl font-bold">{stats.percentage}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon size={24} className="text-blue-600" />
              {monthName}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={prevMonth}
                className="p-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <ChevronLeft size={20} className="text-blue-600" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <ChevronRight size={20} className="text-blue-600" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-2">
            {/* Week Days - Starting from Monday */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-sm font-bold text-gray-700 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {daysInMonth.map((date, idx) => {
                if (!date) {
                  return <div key={'empty-' + idx} className="aspect-square" />;
                }
                
                const attendanceRecord = getAttendanceForDate(date);
                const dayNumber = date.getDate();
                const today = isToday(date);
                const weekend = isWeekend(date);
                
                return (
                  <div
                    key={idx}
                    className={'aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all relative group hover:shadow-lg ' + (today ? 'border-blue-500 bg-blue-50 shadow-md' : weekend ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-blue-300')}
                  >
                    <span className={'text-lg font-bold mb-1 ' + (today ? 'text-blue-600' : weekend ? 'text-gray-400' : 'text-gray-700')}>
                      {dayNumber}
                    </span>
                    
                    {/* Attendance Dot */}
                    {attendanceRecord && (
                      <div className={'w-3 h-3 rounded-full ' + getStatusColor(attendanceRecord.status)} />
                    )}

                    {/* Tooltip on hover */}
                    {attendanceRecord && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                        <div className="bg-gray-900 text-white text-xs rounded-lg p-2 whitespace-nowrap shadow-xl">
                          <div className="font-semibold mb-1">
                            {attendanceRecord.status === 'sent_out' ? 'Sent Out' : attendanceRecord.status.charAt(0).toUpperCase() + attendanceRecord.status.slice(1)}
                          </div>
                          {attendanceRecord.comment && (
                            <div className="text-gray-300 max-w-[200px] whitespace-normal">
                              {attendanceRecord.comment}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-gray-600 font-medium">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm text-gray-600 font-medium">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-600 font-medium">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm text-gray-600 font-medium">Sent Out</span>
            </div>
          </div>
        </div>

        {/* Sidebar - Recent Records */}
        <div className="space-y-6">
          {/* Attendance Summary */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award size={20} className="text-blue-600" />
              Attendance Summary
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                <span className="text-sm font-medium text-gray-700">Present Rate</span>
                <span className="text-2xl font-bold text-green-600">{stats.percentage}%</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
                  <p className="text-xs text-emerald-700 mt-1">Present</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 text-center">
                  <p className="text-2xl font-bold text-orange-600">{stats.late}</p>
                  <p className="text-xs text-orange-700 mt-1">Late</p>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                  <p className="text-xs text-red-700 mt-1">Absent</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
                  <p className="text-2xl font-bold text-purple-600">{stats.sentOut}</p>
                  <p className="text-xs text-purple-700 mt-1">Sent Out</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Records */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-blue-600" />
              Recent Records
            </h3>
            
            {attendance.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No records yet</p>
            ) : (
              <div className="space-y-2">
                {[...attendance].reverse().slice(0, 10).map((record) => {
                  const statusConfig = {
                    present: { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100', label: 'Present' },
                    late: { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100', label: 'Late' },
                    absent: { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100', label: 'Absent' },
                    sent_out: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100', label: 'Sent Out' }
                  };
                  
                  const config = statusConfig[record.status] || statusConfig.present;
                  
                  return (
                    <div key={record.id} className={'p-3 rounded-xl border-2 transition-all hover:shadow-md ' + config.bg}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date(record.date_key).toLocaleDateString('en-GB', { 
                              weekday: 'short', 
                              day: 'numeric',
                              month: 'short'
                            })}
                          </p>
                          {record.comment && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{record.comment}</p>
                          )}
                        </div>
                        <span className={'text-xs font-bold px-3 py-1 rounded-lg ' + config.badge + ' ' + config.text}>
                          {config.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentAttendancePage;