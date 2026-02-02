import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ParentDailyViewPage = () => {
  const { supabase } = useApp();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyClasses, setDailyClasses] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);

  const loadChildren = useCallback(async () => {
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
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    if (selectedChild) {
      loadDailyData();
    }
  }, [selectedChild, selectedDate]);

  const loadDailyData = async () => {
    if (!selectedChild) return;
    
    try {
      const dateKey = selectedDate.toISOString().split('T')[0];
      
      // Load classes for this date and child's class
      const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .eq('date_key', dateKey)
        .eq('class_name', selectedChild.class_name)
        .order('time');
      
      setDailyClasses(classes || []);
      
      // Load attendance for this child for this date
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('date_key', dateKey)
        .eq('student_id', selectedChild.id);
      
      // Group by class_id
      const attendanceMap = {};
      attendance?.forEach(att => {
        attendanceMap[att.class_id] = att;
      });
      
      setAttendanceData(attendanceMap);
      
    } catch (error) {
      console.error('Error loading daily data:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">Present</span>;
      case 'late':
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Late</span>;
      case 'absent':
        return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">Absent</span>;
      case 'sent_out':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">Sent Out</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">Not Marked</span>;
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
        <p className="text-gray-600">No children linked to your account.</p>
      </div>
    );
  }

  const dateString = selectedDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const stats = {
    total: dailyClasses.length,
    present: Object.values(attendanceData).filter(a => a.status === 'present').length,
    late: Object.values(attendanceData).filter(a => a.status === 'late').length,
    absent: Object.values(attendanceData).filter(a => a.status === 'absent').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Daily Schedule & Attendance</h1>
            <p className="text-sm text-gray-600 mt-1">View classes and attendance for the day</p>
          </div>
          
          {children.length > 1 && (
            <div className="relative">
              <select
                value={selectedChild?.id || ''}
                onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar size={20} className="text-emerald-600" />
            <span className="font-medium">{dateString}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={prevDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextDay}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-600">Classes</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
            <p className="text-xl font-bold text-emerald-700">{stats.present}</p>
            <p className="text-xs text-emerald-600">Present</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <p className="text-xl font-bold text-orange-700">{stats.late}</p>
            <p className="text-xs text-orange-600">Late</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <p className="text-xl font-bold text-red-700">{stats.absent}</p>
            <p className="text-xs text-red-600">Absent</p>
          </div>
        </div>
      </div>

      {/* Classes */}
      {dailyClasses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No classes scheduled for this date</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dailyClasses.map(cls => {
            const attendance = attendanceData[cls.class_id];
            
            return (
              <div key={cls.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Clock size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{cls.subject}</h3>
                      <p className="text-sm text-gray-600">{cls.time}</p>
                      {cls.title && (
                        <p className="text-xs text-gray-500 mt-1">{cls.title}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {getStatusBadge(attendance?.status)}
                  </div>
                </div>
                
                {attendance?.comment && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-900 mb-1">Teacher Comment:</p>
                    <p className="text-sm text-blue-800">{attendance.comment}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ParentDailyViewPage;