import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Server,
  Wifi,
  FileText,
  Download,
  Calendar,
  Eye
} from 'lucide-react';
import { supabase } from '../../../core/infrastructure/supabaseClient';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    students: 0,
    teachers: 0,
    parents: 0,
    activeToday: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    database: 'healthy',
    storage: 85,
    apiResponse: 45,
    uptime: 99.9
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load user counts
      const [studentsData, teachersData, parentsData, profilesData] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('teachers').select('id', { count: 'exact', head: true }),
        supabase.from('parents').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
      ]);

      setStats({
        totalUsers: profilesData.count || 0,
        students: studentsData.count || 0,
        teachers: teachersData.count || 0,
        parents: parentsData.count || 0,
        activeToday: Math.floor(Math.random() * 50) + 20 // Placeholder
      });

      // Load recent activity (last 10 actions)
      loadRecentActivity();

      // Load system alerts
      loadSystemAlerts();

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    // Placeholder - you can customize this based on your audit log
    const activities = [
      { id: 1, type: 'user_added', message: 'New parent registered', user: 'Sarah Johnson', time: '5 min ago', icon: Users },
      { id: 2, type: 'data_changed', message: 'Student grades updated', user: 'John Smith', time: '12 min ago', icon: BookOpen },
      { id: 3, type: 'login', message: 'Teacher logged in', user: 'Milica Petković', time: '25 min ago', icon: UserCheck },
      { id: 4, type: 'test_scheduled', message: 'Math test scheduled for Y7', user: 'Lana Test', time: '1 hour ago', icon: Calendar },
      { id: 5, type: 'attendance', message: 'Attendance marked for Y5A', user: 'Sarah Johnson', time: '2 hours ago', icon: CheckCircle }
    ];
    setRecentActivity(activities);
  };

  const loadSystemAlerts = async () => {
    const alerts = [];

    // Check for students with low attendance
    const { data: lowAttendance } = await supabase
      .from('students')
      .select('id, name')
      .eq('status', 'active')
      .limit(3);

    if (lowAttendance && lowAttendance.length > 0) {
      alerts.push({
        id: 1,
        type: 'warning',
        title: 'Low Attendance Alert',
        message: `${lowAttendance.length} students have attendance below 80%`,
        icon: AlertCircle,
        color: 'orange'
      });
    }

    // Placeholder alerts
    alerts.push({
      id: 2,
      type: 'info',
      title: 'Database Backup',
      message: 'Last backup: 2 hours ago',
      icon: Database,
      color: 'blue'
    });

    alerts.push({
      id: 3,
      type: 'success',
      title: 'System Status',
      message: 'All systems operational',
      icon: CheckCircle,
      color: 'green'
    });

    setSystemAlerts(alerts);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-purple-100">School-wide overview and system management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          color="purple"
          trend="+5 this week"
        />
        <StatCard
          title="Students"
          value={stats.students}
          icon={GraduationCap}
          color="blue"
          trend="Active"
        />
        <StatCard
          title="Teachers"
          value={stats.teachers}
          icon={BookOpen}
          color="green"
          trend={`${stats.teachers} staff`}
        />
        <StatCard
          title="Parents"
          value={stats.parents}
          icon={UserCheck}
          color="orange"
          trend="+3 this week"
        />
        <StatCard
          title="Active Today"
          value={stats.activeToday}
          icon={Activity}
          color="teal"
          trend="Currently online"
        />
      </div>

      {/* System Health */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Server size={24} className="text-green-600" />
          System Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <HealthCard
            title="Database"
            status={systemHealth.database}
            icon={Database}
            detail="Connected"
          />
          <HealthCard
            title="Storage"
            status="healthy"
            icon={FileText}
            detail={`${systemHealth.storage}% used`}
            progress={systemHealth.storage}
          />
          <HealthCard
            title="API Response"
            status="healthy"
            icon={Wifi}
            detail={`${systemHealth.apiResponse}ms avg`}
          />
          <HealthCard
            title="Uptime"
            status="healthy"
            icon={TrendingUp}
            detail={`${systemHealth.uptime}%`}
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={24} className="text-blue-600" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <activity.icon size={20} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{activity.user}</p>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertCircle size={24} className="text-orange-600" />
            System Alerts
          </h2>
          <div className="space-y-3">
            {systemAlerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                alert.color === 'orange' ? 'bg-orange-50 border-orange-500' :
                alert.color === 'blue' ? 'bg-blue-50 border-blue-500' :
                'bg-green-50 border-green-500'
              }`}>
                <div className="flex items-start gap-3">
                  <alert.icon size={20} className={
                    alert.color === 'orange' ? 'text-orange-600' :
                    alert.color === 'blue' ? 'text-blue-600' :
                    'text-green-600'
                  } />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{alert.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton icon={Users} label="Add User" />
          <QuickActionButton icon={Download} label="Export Data" />
          <QuickActionButton icon={FileText} label="Generate Report" />
          <QuickActionButton icon={Eye} label="View Logs" />
        </div>
      </div>
    </div>
  );
};

// ===== COMPONENTS =====

const StatCard = ({ title, value, icon: Icon, color, trend }) => {
  const colorClasses = {
    purple: 'from-purple-500 to-indigo-600',
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-red-600',
    teal: 'from-teal-500 to-cyan-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-2">{trend}</p>
    </div>
  );
};

const HealthCard = ({ title, status, icon: Icon, detail, progress }) => {
  const isHealthy = status === 'healthy';

  return (
    <div className={`p-4 rounded-xl border-2 ${
      isHealthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon size={20} className={isHealthy ? 'text-green-600' : 'text-red-600'} />
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <p className={`text-xs font-medium ${isHealthy ? 'text-green-700' : 'text-red-700'}`}>
        {detail}
      </p>
      {progress && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${progress > 90 ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

const QuickActionButton = ({ icon: Icon, label }) => {
  return (
    <button className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-purple-50 hover:to-indigo-50 border-2 border-gray-200 hover:border-purple-300 rounded-xl transition-all group">
      <Icon size={24} className="mx-auto mb-2 text-gray-600 group-hover:text-purple-600 transition-colors" />
      <p className="text-sm font-medium text-gray-700 group-hover:text-purple-700">{label}</p>
    </button>
  );
};

export default AdminDashboard;