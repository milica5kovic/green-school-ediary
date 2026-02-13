import React, { useState } from "react";
import {
  
  Calendar,
  FileText,
  Settings,
  CheckSquare,
  BarChart3,
  Home,
  Users,
  Clock,
  Award,
  User,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  BookMarked,
  UserCircle,
  CalendarCheck,
  ClipboardCheck,
  
  LogOut,
  Shield,
  UserCog
} from "lucide-react";
import { AppProvider, useApp } from './core/context/AppContext';
import { useAuth } from './core/context/AuthContext';
import NavItem from './shared/navigation/NavItem';
import LoadingSpinner from './shared/components/LoadingSpinner';
import ErrorMessage from './shared/components/ErrorMessage';

// Teacher/Admin Pages
import HomePage from './features/dashboard/components/HomePage';
import AdminDashboard from './features/admin/components/AdminDashboard';
import SchedulePage from './features/schedule/components/SchedulePage';
import TeacherCalendarPage from './features/calendar/components/TeacherCalendarPage';
import AdminCalendarPage from './features/calendar/components/AdminCalendarPage';
import TodoPage from './features/tasks/components/TodoPage';
import HomeworkPage from './features/homework/components/HomeworkPage';
import GradesPage from './features/grading/components/GradesPage';
import DailyOverviewPage from './features/attendance/components/DailyOverviewPage';
import TestMakerPage from './features/tests/components/TestMakerPage';
import ManagementPage from './features/management/components/ManagementPage';
import SettingsPage from './features/settings/components/SettingsPage';

// Parent Pages
import ParentDashboard from './features/parents/components/ParentDashboard';
import ParentMyChildPage from './features/parents/components/ParentMyChildPage';
import ParentGradesPage from './features/parents/components/ParentGradesPage';
import ParentAttendancePage from './features/parents/components/ParentAttendancePage';
import ParentCalendarPage from './features/parents/components/ParentCalendarPage';
import ParentDailyViewPage from './features/parents/components/ParentDailyView';
import ParentHomeworkPage from './features/parents/components/ParentHomeworkPage';

// Shared
import LoginPage from './features/auth/components/LoginPage';
import UnauthorizedPage from './shared/components/UnauthorizedPage';
const AppContent = () => {
  const { currentPage, loading, error, loadAllStudents } = useApp();
  const {
    user,
    profile,
    teacher,
    loading: authLoading,
    signOut,
    isAdmin,
    
    isParent,
  } = useAuth();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  if (!user || !profile) {
    return <LoginPage />;
  }

  // ✅ ROLE DETECTION
  const isSuperAdmin = profile?.role === 'admin' && teacher !== null;
  const isPureAdmin = profile?.role === 'admin' && teacher === null;
  // const isPureTeacher = profile?.role === 'teacher';

const renderPage = () => {
  if (loading) return <LoadingSpinner message="Loading..." />;
  if (error) return <ErrorMessage message={error} onRetry={loadAllStudents} />;

  // ========== PARENT ROUTES ==========
  if (isParent()) {
    switch (currentPage) {
      case "home":
        return <ParentDashboard />;
      case "my-child":
        return <ParentMyChildPage />;
      case "grading":
        return <ParentGradesPage />;
      case "parent-attendance":
        return <ParentAttendancePage />;
      case "parent-calendar":
        return <ParentCalendarPage />;
      case "parent-daily":
        return <ParentDailyViewPage />;
      case "homework":
        return <ParentHomeworkPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <ParentDashboard />;
    }
  }

  // ========== TEACHER / ADMIN ROUTES ==========
  switch (currentPage) {
    case "home":
      // Pure Admin → Admin Dashboard
      // Super Admin & Teacher → Teacher Home
      return isPureAdmin ? <AdminDashboard /> : <HomePage />;
    
    case "admin-dashboard":
      // Only for Super Admin (has both views available)
      return isSuperAdmin ? <AdminDashboard /> : <UnauthorizedPage />;
    
    case "schedule":
      return isPureAdmin ? <UnauthorizedPage /> : <SchedulePage />;
    
    case "teacher-calendar":
      return isPureAdmin ? <UnauthorizedPage /> : <TeacherCalendarPage />;
    
    case "admin-calendar":
      return isAdmin() ? <AdminCalendarPage /> : <UnauthorizedPage />;
    
    case "tasks":
      return isPureAdmin ? <UnauthorizedPage /> : <TodoPage />;
    
    case "homework":
      return isPureAdmin ? <UnauthorizedPage /> : <HomeworkPage />;
    
    case "grading":
      return isPureAdmin ? <UnauthorizedPage /> : <GradesPage />;
    
    case "daily-overview":
      if (!teacher?.class_teacher_for) {
        return <UnauthorizedPage />;
      }
      return <DailyOverviewPage />;
    
    case "test-maker":
      return isPureAdmin ? <UnauthorizedPage /> : <TestMakerPage />;
    
    case "management":
      return isAdmin() ? <ManagementPage /> : <UnauthorizedPage />;
    
    case "reports":
      return isAdmin() ? <AdminDashboard /> : <UnauthorizedPage />; // Placeholder
    
    case "settings":
      return <SettingsPage />;
    
    case "unauthorized":
      return <UnauthorizedPage />;
    
    default:
      return isPureAdmin ? <AdminDashboard /> : <HomePage />;
  }
};

  const handleSignOut = async () => {
    setProfileMenuOpen(false);
    await signOut();
  };

  const getUserRole = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (isPureAdmin) return 'Administrator';
    if (teacher) return teacher.subjects?.slice(0, 2).join(', ') || 'Teacher';
    return profile?.role?.toUpperCase();
  };

  const getUserBadge = () => {
    if (isSuperAdmin) return (
      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex items-center gap-1">
        <Shield size={12} />
        Super Admin
      </span>
    );
    if (isPureAdmin) return (
      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold flex items-center gap-1">
        <UserCog size={12} />
        Admin
      </span>
    );
    if (teacher) return (
      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
        Teacher
      </span>
    );
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* ========== HEADER ========== */}
      <header className="bg-white border-b-2 border-emerald-500 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12">
                <img 
                  src="/logo.svg" 
                  alt="Logo" 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.classList.add('bg-gradient-to-br', 'from-emerald-500', 'to-teal-600', 'flex', 'items-center', 'justify-center', 'rounded-xl');
                    e.target.parentElement.innerHTML = '<svg class="text-white w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>';
                  }} 
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Green School E-Diary</h1>
                <p className="text-xs text-emerald-600 font-medium">Digital Learning Management</p>
              </div>
            </div>

            {/* Right: User Profile */}
            <div className="flex items-center gap-3">
              <div className="text-right border-r border-gray-300 pr-3">
                <p className="text-sm font-semibold text-gray-900">
                  {teacher?.full_name || profile?.full_name || 'User'}
                </p>
                {getUserBadge()}
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl flex items-center justify-center transition-all shadow-md"
                >
                  <User size={20} className="text-white" />
                </button>

                {/* Dropdown Menu */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                    <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
                      <p className="text-xs text-gray-600 font-medium">{getUserRole()}</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <LogOut size={16} />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========== LAYOUT ========== */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
      {/* ========== SIDEBAR NAVIGATION ========== */}
<aside className="w-64 bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-6 border border-emerald-100">
  <nav className="space-y-2">
    {isParent() ? (
      /* ========== PARENT NAVIGATION ========== */
      <>
        <NavItem icon={LayoutDashboard} label="Dashboard" page="home" />
        <NavItem icon={UserCircle} label="My Child" page="my-child" />
        <NavItem icon={Award} label="Grades" page="grading" />
        <NavItem icon={CalendarCheck} label="Attendance" page="parent-attendance" />
        <NavItem icon={Calendar} label="Calendar" page="parent-calendar" />
        <NavItem icon={CalendarDays} label="Daily View" page="parent-daily" />
        <NavItem icon={ClipboardList} label="Homework" page="homework" />
        <NavItem icon={Settings} label="Settings" page="settings" />
      </>
    ) : isSuperAdmin ? (
      /* ========== SUPER ADMIN NAVIGATION - Has Both Views ========== */
      <>
        <NavItem icon={Home} label="Teacher Home" page="home" />
        <NavItem icon={LayoutDashboard} label="Admin Dashboard" page="admin-dashboard" />
        <div className="border-t border-gray-200 my-2"></div>
        <NavItem icon={Clock} label="My Schedule" page="schedule" />
        <NavItem icon={Calendar} label="Calendar" page="teacher-calendar" />
        <NavItem icon={CalendarDays} label="School Calendar" page="admin-calendar" />
        <NavItem icon={CheckSquare} label="My Tasks" page="tasks" />
        <NavItem icon={BookMarked} label="Homework" page="homework" />
        <NavItem icon={GraduationCap} label="Grading" page="grading" />
        {teacher?.class_teacher_for && (
          <NavItem icon={ClipboardCheck} label="Daily Overview" page="daily-overview" />
        )}
        <NavItem icon={FileText} label="Test Maker" page="test-maker" />
        <div className="border-t border-gray-200 my-2"></div>
        <NavItem icon={Users} label="Management" page="management" />
        <NavItem icon={Settings} label="Settings" page="settings" />
      </>
    ) : isPureAdmin ? (
      /* ========== PURE ADMIN NAVIGATION ========== */
      <>
        <NavItem icon={LayoutDashboard} label="Dashboard" page="home" />
        <NavItem icon={CalendarDays} label="School Calendar" page="admin-calendar" />
        <NavItem icon={Users} label="Management" page="management" />
        <NavItem icon={BarChart3} label="Reports" page="reports" />
        <NavItem icon={Settings} label="Settings" page="settings" />
      </>
    ) : (
      /* ========== TEACHER NAVIGATION ========== */
      <>
        <NavItem icon={Home} label="Home" page="home" />
        <NavItem icon={Clock} label="My Schedule" page="schedule" />
        <NavItem icon={Calendar} label="Calendar" page="teacher-calendar" />
        <NavItem icon={CheckSquare} label="My Tasks" page="tasks" />
        <NavItem icon={BookMarked} label="Homework" page="homework" />
        <NavItem icon={GraduationCap} label="Grading" page="grading" />
        {teacher?.class_teacher_for && (
          <NavItem icon={ClipboardCheck} label="Daily Overview" page="daily-overview" />
        )}
        <NavItem icon={FileText} label="Test Maker" page="test-maker" />
        <NavItem icon={Settings} label="Settings" page="settings" />
      </>
    )}
  </nav>
</aside>

        {/* ========== MAIN CONTENT ========== */}
        <main className="flex-1">{renderPage()}</main>
      </div>

      {/* Click outside to close dropdown */}
      {profileMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileMenuOpen(false)}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;