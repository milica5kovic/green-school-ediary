import React from "react";
import {
  BookOpen,
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
  Target
} from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import { useAuth } from "./context/AuthContext";
import NavItem from "./components/shared/NavItem";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import ErrorMessage from "./components/shared/ErrorMessage";

// Teacher/Admin Pages
import HomePage from "./components/home/HomePage";
import SchedulePage from "./components/schedule/SchedulePage";
import TeacherCalendarPage from "./components/teacher/TeacherCalendarPage";
import AdminCalendarPage from "./components/admin/AdminCalendarPage";
import TodoPage from "./components/todo/TodoPage";
import HomeworkPage from "./components/homework/HomeworkPage";
import GradesPage from "./components/grades/GradesPage";
import DailyOverviewPage from "./components/pages/DailyOverviewPage";
import TestMakerPage from "./components/pages/TestMakerPage";
import ManagementPage from "./components/pages/ManagementPage";
import SettingsPage from "./components/settings/SettingsPage";

// Parent Pages
import ParentDashboard from "./components/parent/ParentDashboard";
import ParentMyChildPage from "./components/parent/ParentMyChildPage";
import ParentGradesPage from "./components/parent/ParentGradesPage";
import ParentAttendancePage from "./components/parent/ParentAttendancePage";
import ParentCalendarPage from "./components/parent/ParentCalendarPage"; // ← ADDED
import ParentDailyViewPage from "./components/pages/ParentDailyView";
import ParentHomeworkPage from "./components/parent/ParentHomeworkPage";

// Shared
import LoginPage from "./components/auth/LoginPage";
import UnauthorizedPage from "./components/shared/UnauthorizedPage";

const AppContent = () => {
  const { currentPage, loading, error, loadAllStudents } = useApp();
  const {
    user,
    profile,
    teacher,
    loading: authLoading,
    signOut,
    isAdmin,
    isTeacher,
    isParent,
  } = useAuth();

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

  const renderPage = () => {
    if (loading) return <LoadingSpinner message="Loading..." />;
    if (error) return <ErrorMessage message={error} onRetry={loadAllStudents} />;

    // PARENT ROUTES
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
        case "parent-calendar": // ← ADDED
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

    // TEACHER / ADMIN ROUTES
    switch (currentPage) {
      case "home":
        return <HomePage />;
      case "schedule":
        return <SchedulePage />;
      case "teacher-calendar":
        return <TeacherCalendarPage />;
      case "admin-calendar":
        if (!isAdmin()) {
          return <UnauthorizedPage />;
        }
        return <AdminCalendarPage />;
      case "tasks":
        return <TodoPage />;
      case "homework":
        return <HomeworkPage />;
      case "grading":
        return <GradesPage />;
      case "daily-overview":
        if (!teacher?.class_teacher_for) {
          return <UnauthorizedPage />;
        }
        return <DailyOverviewPage />;
      case "test-maker":
        return <TestMakerPage />;
      case "management":
        if (!isAdmin()) {
          return <UnauthorizedPage />;
        }
        return <ManagementPage />;
      case "settings":
        return <SettingsPage />;
      case "unauthorized":
        return <UnauthorizedPage />;
      default:
        return <HomePage />;
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Green School E-Diary
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Digital Learning Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-700">
                {teacher?.full_name || profile?.full_name || profile?.email}
              </p>
              <p className="text-xs text-emerald-600">
                {teacher?.subjects?.join(", ") || profile?.role?.toUpperCase()}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium text-sm hover:shadow-lg transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-6 border border-emerald-100">
          <nav className="space-y-2">
            {isParent() ? (
              <>
                <NavItem icon={LayoutDashboard} label="Dashboard" page="home" />
                <NavItem icon={UserCircle} label="My Child" page="my-child" />
                <NavItem icon={Award} label="Grades" page="grading" />
                <NavItem icon={CalendarCheck} label="Attendance" page="parent-attendance" />
                <NavItem icon={Calendar} label="Calendar" page="parent-calendar" /> {/* ← ADDED */}
                <NavItem icon={CalendarDays} label="Daily View" page="parent-daily" />
                <NavItem icon={ClipboardList} label="Homework" page="homework" />
                <NavItem icon={Settings} label="Settings" page="settings" />
              </>
            ) : (
              <>
                <NavItem icon={Home} label="Home" page="home" />
                <NavItem icon={Clock} label="My Schedule" page="schedule" />
                <NavItem icon={Calendar} label="Calendar" page="teacher-calendar" />
                
                {isAdmin() && (
                  <NavItem 
                    icon={CalendarDays} 
                    label="School Calendar" 
                    page="admin-calendar" 
                  />
                )}
                
                <NavItem icon={CheckSquare} label="My Tasks" page="tasks" />
                <NavItem icon={BookMarked} label="Homework" page="homework" />
                <NavItem icon={GraduationCap} label="Grading" page="grading" />
                {teacher?.class_teacher_for && (
                  <NavItem
                    icon={ClipboardCheck}
                    label="Daily Overview"
                    page="daily-overview"
                  />
                )}
                <NavItem icon={FileText} label="Test Maker" page="test-maker" />
                {isAdmin() && (
                  <NavItem icon={Users} label="Management" page="management" />
                )}
                <NavItem icon={Settings} label="Settings" page="settings" />
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">{renderPage()}</main>
      </div>
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