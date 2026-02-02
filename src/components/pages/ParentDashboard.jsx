import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, TrendingUp, AlertCircle, Clock, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ParentDashboard = () => {
  const { supabase } = useApp();
  const [child, setChild] = useState(null);
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
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get parent record
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!parent) {
        setLoading(false);
        return;
      }
      
      // Get child
      const { data: studentParents } = await supabase
        .from('student_parents')
        .select('students(*)')
        .eq('parent_id', parent.id)
        .limit(1);
      
      const childData = studentParents?.[0]?.students;
      if (!childData) {
        setLoading(false);
        return;
      }
      
      setChild(childData);
      
      // Load all data in parallel
      await Promise.all([
        loadTodayClasses(childData),
        loadStats(childData),
        loadUrgentItems(childData),
        loadRecentActivity(childData),
        loadUpcomingWeek(childData)
      ]);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const loadTodayClasses = async (childData) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('date_key', today)
      .eq('class_name', childData.class_name)
      .order('time');
    
    setTodayClasses(data || []);
  };

  const loadStats = async (childData) => {
    // Attendance rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', childData.id)
      .gte('date_key', thirtyDaysAgo.toISOString().split('T')[0]);
    
    const totalDays = attendance?.length || 0;
    const presentDays = attendance?.filter(a => a.status === 'present').length || 0;
    const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;
    
    // Average grade
    const { data: grades } = await supabase
      .from('grades')
      .select('grade, max_grade')
      .eq('student_id', childData.id);
    
    const avgGrade = grades && grades.length > 0
      ? (grades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0) / grades.length).toFixed(1)
      : 0;
    
    // Homework counts
    const today = new Date().toISOString().split('T')[0];
    const { data: homework } = await supabase
      .from('homework')
      .select('status, due_date')
      .eq('class_name', childData.class_name);
    
    const overdueHomework = homework?.filter(h => 
      h.status === 'pending' && new Date(h.due_date) < new Date()
    ).length || 0;
    
    const pendingHomework = homework?.filter(h => h.status === 'pending').length || 0;
    
    setStats({ attendanceRate, avgGrade, overdueHomework, pendingHomework });
  };

  const loadUrgentItems = async (childData) => {
    const urgent = [];
    
    // Overdue homework
    const { data: homework } = await supabase
      .from('homework')
      .select('*')
      .eq('class_name', childData.class_name)
      .eq('status', 'pending');
    
    const today = new Date();
    homework?.forEach(hw => {
      const dueDate = new Date(hw.due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue < 0) {
        urgent.push({
          type: 'overdue',
          icon: '🔴',
          message: `Homework overdue: "${hw.title}"`,
          severity: 'high'
        });
      } else if (daysUntilDue <= 2) {
        urgent.push({
          type: 'due-soon',
          icon: '🟡',
          message: `Homework due ${daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : 'in 2 days'}: "${hw.title}"`,
          severity: 'medium'
        });
      }
    });
    
    // Low grades
    const { data: recentGrades } = await supabase
      .from('grades')
      .select('*')
      .eq('student_id', childData.id)
      .order('date', { ascending: false })
      .limit(5);
    
    recentGrades?.forEach(grade => {
      const percentage = (grade.grade / grade.max_grade) * 100;
      if (percentage < 60) {
        urgent.push({
          type: 'low-grade',
          icon: '📉',
          message: `Low grade in ${grade.subject}: ${percentage.toFixed(0)}% - Consider extra help`,
          severity: 'medium'
        });
      }
    });
    
    // Late/absent attendance
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const { data: recentAttendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', childData.id)
      .gte('date_key', lastWeek.toISOString().split('T')[0]);
    
    const lateCount = recentAttendance?.filter(a => a.status === 'late').length || 0;
    const absentCount = recentAttendance?.filter(a => a.status === 'absent').length || 0;
    
    if (lateCount >= 2) {
      urgent.push({
        type: 'attendance',
        icon: '⏰',
        message: `Late ${lateCount} times this week`,
        severity: 'medium'
      });
    }
    
    if (absentCount >= 2) {
      urgent.push({
        type: 'attendance',
        icon: '⚠️',
        message: `Absent ${absentCount} days this week`,
        severity: 'high'
      });
    }
    
    setUrgentItems(urgent.slice(0, 5)); // Max 5 urgent items
  };

  const loadRecentActivity = async (childData) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateKey = sevenDaysAgo.toISOString().split('T')[0];
  
  const activity = [];
  
  // Classes with parent notes
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .eq('class_name', childData.class_name)
    .gte('date_key', dateKey)
    .not('parent_visible_note', 'is', null)
    .order('created_at', { ascending: false });
  
  for (const cls of (classes || [])) {
    activity.push({
      type: 'class-note',
      icon: '📝',
      time: new Date(cls.created_at),
      message: `${cls.subject}: ${cls.parent_visible_note}`,
      subject: cls.subject
    });
  }
  
  // Attendance comments (BEHAVIOR NOTES)
  const { data: attendanceComments } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', childData.id)
    .gte('date_key', dateKey)
    .not('comment', 'is', null)
    .order('date_key', { ascending: false });
  
  attendanceComments?.forEach(att => {
    activity.push({
      type: 'behavior',
      icon: att.status === 'late' ? '⏰' : att.status === 'absent' ? '⚠️' : '💬',
      time: new Date(att.date_key),
      message: `Behavior note: ${att.comment}`,
      subject: 'Attendance'
    });
  });
  
  // Recent grades
  const { data: grades } = await supabase
    .from('grades')
    .select('*')
    .eq('student_id', childData.id)
    .gte('date', dateKey)
    .order('date', { ascending: false });
  
  grades?.forEach(grade => {
    activity.push({
      type: 'grade',
      icon: '📊',
      time: new Date(grade.date),
      message: `${grade.subject}: ${grade.assessment_title} - ${grade.grade}/${grade.max_grade} (${((grade.grade/grade.max_grade)*100).toFixed(0)}%)`,
      subject: grade.subject
    });
  });
  
  // Recent homework
  const { data: homework } = await supabase
    .from('homework')
    .select('*')
    .eq('class_name', childData.class_name)
    .gte('assigned_date', dateKey)
    .order('assigned_date', { ascending: false });
  
  homework?.forEach(hw => {
    activity.push({
      type: 'homework',
      icon: '✏️',
      time: new Date(hw.assigned_date),
      message: `New homework: ${hw.title} - Due ${new Date(hw.due_date).toLocaleDateString()}`,
      subject: hw.subject
    });
  });
  
  // Sort by time
  activity.sort((a, b) => b.time - a.time);
  setRecentActivity(activity.slice(0, 10));
};

  const loadUpcomingWeek = async (childData) => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const upcoming = [];
    
    // Upcoming homework
    const { data: homework } = await supabase
      .from('homework')
      .select('*')
      .eq('class_name', childData.class_name)
      .eq('status', 'pending')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', nextWeek.toISOString().split('T')[0])
      .order('due_date');
    
    homework?.forEach(hw => {
      upcoming.push({
        date: new Date(hw.due_date),
        icon: '✏️',
        message: `${hw.subject}: ${hw.title}`
      });
    });
    
    // Sort by date
    upcoming.sort((a, b) => a.date - b.date);
    setUpcomingThisWeek(upcoming.slice(0, 5));
  };

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-emerald-100">
        <BookOpen size={48} className="mx-auto text-emerald-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-800">No Children Linked</h3>
        <p className="text-gray-500 mt-2">Please contact the school administrator.</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="space-y-6">
    
      {/* Today's Snapshot */}
<div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg p-6">
  <p className="text-sm opacity-90 mb-2">📅 {today}</p>
  <div className="flex items-center gap-4 mb-4">
    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
      👨‍🎓
    </div>
    <div>
      <h2 className="text-2xl font-bold">{child.name}</h2>
      <p className="opacity-90">Class {child.class_name}</p>
    </div>
  </div>
  
  {todayClasses.length > 0 && (
    <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
      <p className="font-semibold mb-2">Today's Classes:</p>
      <div className="space-y-1">
        {todayClasses.map((cls, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <Clock size={14} />
            <span>{cls.time} - {cls.subject}</span>
          </div>
        ))}
      </div>
    </div>
  )}
</div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-blue-200 shadow">
          <p className="text-3xl font-bold text-blue-600">{stats.attendanceRate}%</p>
          <p className="text-sm text-gray-600 mt-1">Attendance</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-purple-200 shadow">
          <p className="text-3xl font-bold text-purple-600">{stats.avgGrade}%</p>
          <p className="text-sm text-gray-600 mt-1">Avg Grade</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-red-200 shadow">
          <p className="text-3xl font-bold text-red-600">{stats.overdueHomework}</p>
          <p className="text-sm text-gray-600 mt-1">Overdue</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-orange-200 shadow">
          <p className="text-3xl font-bold text-orange-600">{stats.pendingHomework}</p>
          <p className="text-sm text-gray-600 mt-1">Pending</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Urgent Items */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertCircle size={24} className="text-orange-600" />
            ⚠️ Needs Attention
          </h3>
          
          {urgentItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">✅ All good! No urgent items.</p>
          ) : (
            <div className="space-y-3">
              {urgentItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border-l-4 ${
                    item.severity === 'high' 
                      ? 'bg-red-50 border-red-500' 
                      : 'bg-orange-50 border-orange-500'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-800">
                    {item.icon} {item.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming This Week */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={24} className="text-emerald-600" />
            📅 This Week
          </h3>
          
          {upcomingThisWeek.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming items this week</p>
          ) : (
            <div className="space-y-3">
              {upcomingThisWeek.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={24} className="text-emerald-600" />
          📢 Recent Activity (Last 7 Days)
        </h3>
        
        {recentActivity.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{item.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(item.time)}</p>
                </div>
                {item.subject && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                    {item.subject}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;