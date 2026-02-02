import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, AlertTriangle, Calendar, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ParentDashboard = () => {
  const { supabase } = useApp();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [todayClasses, setTodayClasses] = useState([]);
  const [stats, setStats] = useState({
    attendanceRate: 0,
    avgGrade: 0,
    overdueHomework: 0,
    pendingHomework: 0
  });
  const [urgentItems, setUrgentItems] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingThisWeek, setUpcomingThisWeek] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!parent) {
        setLoading(false);
        return;
      }
      
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
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (selectedChild) {
      loadChildData();
    }
  }, [selectedChild]);

  const loadChildData = async () => {
    if (!selectedChild) return;
    
    try {
      await Promise.all([
        loadTodayClasses(),
        loadStats(),
        loadUrgentItems(),
        loadRecentActivity(),
        loadUpcomingWeek()
      ]);
    } catch (error) {
      console.error('Error loading child data:', error);
    }
  };

  const loadTodayClasses = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('date_key', today)
      .eq('class_name', selectedChild.class_name)
      .order('time');
    
    setTodayClasses(data || []);
  };

  const loadStats = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', selectedChild.id)
      .gte('date_key', thirtyDaysAgo.toISOString().split('T')[0]);
    
    const totalDays = attendance?.length || 0;
    const presentDays = attendance?.filter(a => a.status === 'present').length || 0;
    const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;
    
    const { data: grades } = await supabase
      .from('grades')
      .select('grade, max_grade')
      .eq('student_id', selectedChild.id);
    
    const avgGrade = grades && grades.length > 0
      ? (grades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0) / grades.length).toFixed(1)
      : 0;
    
    const today = new Date().toISOString().split('T')[0];
    const { data: homework } = await supabase
      .from('homework')
      .select('status, due_date')
      .eq('class_name', selectedChild.class_name);
    
    const overdueHomework = homework?.filter(h => 
      h.status === 'pending' && new Date(h.due_date) < new Date()
    ).length || 0;
    
    const pendingHomework = homework?.filter(h => h.status === 'pending').length || 0;
    
    setStats({ attendanceRate, avgGrade, overdueHomework, pendingHomework });
  };

  const loadUrgentItems = async () => {
    const urgent = [];
    
    const { data: homework } = await supabase
      .from('homework')
      .select('*')
      .eq('class_name', selectedChild.class_name)
      .eq('status', 'pending');
    
    const today = new Date();
    homework?.forEach(hw => {
      const dueDate = new Date(hw.due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue < 0) {
        urgent.push({
          type: 'overdue',
          message: `Overdue: ${hw.title}`,
          severity: 'high'
        });
      } else if (daysUntilDue <= 2) {
        urgent.push({
          type: 'due-soon',
          message: `Due ${daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : 'in 2 days'}: ${hw.title}`,
          severity: 'medium'
        });
      }
    });
    
    const { data: recentGrades } = await supabase
      .from('grades')
      .select('*')
      .eq('student_id', selectedChild.id)
      .order('date', { ascending: false })
      .limit(5);
    
    recentGrades?.forEach(grade => {
      const percentage = (grade.grade / grade.max_grade) * 100;
      if (percentage < 60) {
        urgent.push({
          type: 'low-grade',
          message: `Low grade in ${grade.subject}: ${percentage.toFixed(0)}%`,
          severity: 'medium'
        });
      }
    });
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const { data: recentAttendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', selectedChild.id)
      .gte('date_key', lastWeek.toISOString().split('T')[0]);
    
    const lateCount = recentAttendance?.filter(a => a.status === 'late').length || 0;
    const absentCount = recentAttendance?.filter(a => a.status === 'absent').length || 0;
    
    if (lateCount >= 2) {
      urgent.push({
        type: 'attendance',
        message: `Late ${lateCount} times this week`,
        severity: 'medium'
      });
    }
    
    if (absentCount >= 2) {
      urgent.push({
        type: 'attendance',
        message: `Absent ${absentCount} days this week`,
        severity: 'high'
      });
    }
    
    setUrgentItems(urgent.slice(0, 5));
  };

  const loadRecentActivity = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateKey = sevenDaysAgo.toISOString().split('T')[0];
    
    const activity = [];
    
    const { data: classes } = await supabase
      .from('classes')
      .select('*')
      .eq('class_name', selectedChild.class_name)
      .gte('date_key', dateKey)
      .not('parent_visible_note', 'is', null)
      .order('created_at', { ascending: false });
    
    for (const cls of (classes || [])) {
      activity.push({
        type: 'class-note',
        time: new Date(cls.created_at),
        message: `${cls.subject}: ${cls.parent_visible_note}`,
        subject: cls.subject
      });
    }
    
    const { data: attendanceComments } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', selectedChild.id)
      .gte('date_key', dateKey)
      .not('comment', 'is', null)
      .order('date_key', { ascending: false });
    
    attendanceComments?.forEach(att => {
      activity.push({
        type: 'behavior',
        time: new Date(att.date_key),
        message: `${att.comment}`,
        subject: 'Attendance'
      });
    });
    
    const { data: grades } = await supabase
      .from('grades')
      .select('*')
      .eq('student_id', selectedChild.id)
      .gte('date', dateKey)
      .order('date', { ascending: false });
    
    grades?.forEach(grade => {
      activity.push({
        type: 'grade',
        time: new Date(grade.date),
        message: `${grade.subject}: ${grade.assessment_title} - ${grade.grade}/${grade.max_grade}`,
        subject: grade.subject
      });
    });
    
    const { data: homework } = await supabase
      .from('homework')
      .select('*')
      .eq('class_name', selectedChild.class_name)
      .gte('assigned_date', dateKey)
      .order('assigned_date', { ascending: false });
    
    homework?.forEach(hw => {
      activity.push({
        type: 'homework',
        time: new Date(hw.assigned_date),
        message: `New homework: ${hw.title}`,
        subject: hw.subject
      });
    });
    
    activity.sort((a, b) => b.time - a.time);
    setRecentActivity(activity.slice(0, 10));
  };

  const loadUpcomingWeek = async () => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const upcoming = [];
    
    const { data: homework } = await supabase
      .from('homework')
      .select('*')
      .eq('class_name', selectedChild.class_name)
      .eq('status', 'pending')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', nextWeek.toISOString().split('T')[0])
      .order('due_date');
    
    homework?.forEach(hw => {
      upcoming.push({
        date: new Date(hw.due_date),
        message: `${hw.subject}: ${hw.title}`
      });
    });
    
    upcoming.sort((a, b) => a.date - b.date);
    setUpcomingThisWeek(upcoming.slice(0, 5));
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const getActivityIcon = (type) => {
    switch(type) {
      case 'class-note': return { icon: '📝', color: 'bg-blue-100 text-blue-700' };
      case 'behavior': return { icon: '💬', color: 'bg-purple-100 text-purple-700' };
      case 'grade': return { icon: '📊', color: 'bg-emerald-100 text-emerald-700' };
      case 'homework': return { icon: '✏️', color: 'bg-orange-100 text-orange-700' };
      default: return { icon: '📌', color: 'bg-gray-100 text-gray-700' };
    }
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
        <p className="text-sm text-gray-500 mt-2">Please contact the school administrator.</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* Header with Child Selector */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-emerald-100">{today}</p>
            <h1 className="text-2xl font-bold mt-1">Dashboard</h1>
          </div>
          
          {children.length > 1 && (
            <div className="relative">
              <select
                value={selectedChild?.id || ''}
                onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                className="appearance-none bg-white/20 backdrop-blur border border-white/30 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-white placeholder-white/70 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
              >
                {children.map(child => (
                  <option key={child.id} value={child.id} className="text-gray-900">
                    {child.name} - Class {child.class_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" size={16} />
            </div>
          )}
        </div>

        {selectedChild && (
          <div className="flex items-center gap-3 p-4 bg-white/10 backdrop-blur rounded-lg border border-white/20">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-lg font-semibold text-white">
                {selectedChild.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-white">{selectedChild.name}</h3>
              <p className="text-sm text-emerald-100">Class {selectedChild.class_name}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid - COLORFUL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-4">
          <p className="text-sm text-blue-100 mb-1">Attendance</p>
          <p className="text-3xl font-bold">{stats.attendanceRate}%</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-4">
          <p className="text-sm text-purple-100 mb-1">Avg Grade</p>
          <p className="text-3xl font-bold">{stats.avgGrade}%</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg shadow-lg p-4">
          <p className="text-sm text-red-100 mb-1">Overdue</p>
          <p className="text-3xl font-bold">{stats.overdueHomework}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-lg p-4">
          <p className="text-sm text-orange-100 mb-1">Pending</p>
          <p className="text-3xl font-bold">{stats.pendingHomework}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Urgent Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={18} className="text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Needs Attention</h3>
          </div>
          
          {urgentItems.length === 0 ? (
            <div className="text-center py-6 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm text-emerald-700 font-medium">✓ All clear!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {urgentItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg text-sm border ${
                    item.severity === 'high' 
                      ? 'bg-red-50 text-red-900 border-red-200' 
                      : 'bg-orange-50 text-orange-900 border-orange-200'
                  }`}
                >
                  {item.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming This Week */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calendar size={18} className="text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900">This Week</h3>
          </div>
          
          {upcomingThisWeek.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-500">Nothing scheduled</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingThisWeek.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="text-xs font-medium text-blue-700 min-w-[60px] bg-white px-2 py-1 rounded">
                    {item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <p className="text-sm text-gray-900">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity - COLORFUL ICONS */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
        </div>
        
        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item, idx) => {
              const activityStyle = getActivityIcon(item.type);
              
              return (
                <div key={idx} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activityStyle.color}`}>
                    <span className="text-sm">{activityStyle.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{item.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{formatRelativeTime(item.time)}</span>
                      {item.subject && (
                        <>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs text-emerald-600 font-medium">{item.subject}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;