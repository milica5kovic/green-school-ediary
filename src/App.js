import React from "react";
import {
  BookOpen,
  Calendar,
  FileText,
  Settings,
  CheckSquare,
  BarChart3,
} from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import { useAuth } from "./context/AuthContext";
import NavItem from "./components/shared/NavItem";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import ErrorMessage from "./components/shared/ErrorMessage";
import HomePage from "./components/home/HomePage";
import HomeworkPage from "./components/homework/HomeworkPage";
import SchedulePage from "./components/schedule/SchedulePage";
import SettingsPage from "./components/settings/SettingsPage";
import LoginPage from "./components/auth/LoginPage";
import GradesPage from "./components/grades/GradesPage";
import UnauthorizedPage from "./components/shared/UnauthorizedPage";
import ParentDashboard from "./components/parent/ParentDashboard";
import ParentGradesPage from "./components/parent/ParentGradesPage";
import ParentAttendancePage from "./components/parent/ParentAttendancePage";
import ParentHomeworkPage from "./components/parent/ParentHomeworkPage";
import ParentMyChildPage from "./components/parent/ParentMyChildPage";
import TodoPage from "./components/todo/TodoPage";
import DailyOverviewPage from "./components/pages/DailyOverviewPage";
import ParentDailyViewPage from "./components/pages/ParentDailyView";
import TestMakerPage from "./components/pages/TestMakerPage";
import ManagementPage from "./components/pages/ManagementPage";

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

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user || !profile) {
    return <LoginPage />;
  }

  // Render page based on role and route
  const renderPage = () => {
    if (loading) {
      return <LoadingSpinner message="Loading..." />;
    }

    if (error) {
      return <ErrorMessage message={error} onRetry={loadAllStudents} />;
    }

    // Parent routing
    if (isParent()) {
      switch (currentPage) {
        case "home":
          return <ParentDashboard />;
        case "homework":
          return <ParentHomeworkPage />;
        case "grading":
          return <ParentGradesPage />;
        case "parent-attendance":
          return <ParentAttendancePage />;
        case "parent-daily":
          return <ParentDailyViewPage />;
        case "my-child":
          return <ParentMyChildPage />;
        case "settings":
          return <SettingsPage />;
        default:
          return <ParentDashboard />;
      }
    }

    // Teacher/Admin routing
    switch (currentPage) {
      case "home":
        return <HomePage />;
      
      case "schedule":
        return <SchedulePage />;
      
      case "homework":
        return <HomeworkPage />;
      
      case "grading":
        return <GradesPage />;
      
      case "tasks":
        return <TodoPage />;
      
      case "test-maker":
        return <TestMakerPage />;
      
      case "daily-overview":
        if (!teacher?.class_teacher_for) {
          return <UnauthorizedPage />;
        }
        return <DailyOverviewPage />;
      
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
            <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
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
                {teacher?.full_name || profile?.full_name || profile?.email || "User"}
              </p>
              <p className="text-xs text-emerald-600">
                {teacher?.subjects?.join(", ") || profile?.role?.toUpperCase() || "User"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                {(teacher?.full_name || profile?.full_name)
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2) || "U"}
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:shadow-lg transition-all text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-6 border border-emerald-100">
          <nav className="space-y-2">
            {isParent() ? (
              // PARENT NAVIGATION
              <>
                <NavItem icon={BookOpen} label="Dashboard" page="home" />
                <NavItem icon={FileText} label="My Child" page="my-child" />
                <NavItem icon={BarChart3} label="Grades" page="grading" />
                <NavItem icon={Calendar} label="Attendance" page="parent-attendance" />
                <NavItem icon={Calendar} label="Daily View" page="parent-daily" />
                <NavItem icon={FileText} label="Homework" page="homework" />
                <NavItem icon={Settings} label="Settings" page="settings" />
              </>
            ) : (
              // TEACHER/ADMIN NAVIGATION
              <>
                <NavItem icon={BookOpen} label="Home" page="home" />
                <NavItem icon={Calendar} label="My Schedule" page="schedule" />
                <NavItem icon={CheckSquare} label="My Tasks" page="tasks" />
                <NavItem icon={FileText} label="Homework" page="homework" />
                <NavItem icon={BarChart3} label="Grading" page="grading" />
                
                {teacher?.class_teacher_for && (
                  <NavItem icon={Calendar} label="Daily Overview" page="daily-overview" />
                )}
                
                <NavItem icon={FileText} label="Test Maker" page="test-maker" />
                
                {isAdmin() && (
                  <NavItem icon={Settings} label="Management" page="management" />
                )}
                
                {isTeacher() && !isAdmin() && (
                  <NavItem icon={Settings} label="Settings" page="settings" />
                )}
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