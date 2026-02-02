import React from "react";
import {
  BookOpen,
  Calendar,
  FileText,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
import { useAuth } from "./context/AuthContext";
import NavItem from "./components/shared/NavItem";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import ErrorMessage from "./components/shared/ErrorMessage";
import HomePage from "./components/home/HomePage";
import HomeworkPage from "./components/homework/HomeworkPage";
import SchedulePage from "./components/schedule/SchedulePage";
import StudentsPage from "./components/students/StudentsPage";
import AttendanceLogPage from "./components/attendanceLog/AttendanceLogPage";
import SettingsPage from "./components/settings/SettingsPage";
import LoginPage from "./components/auth/LoginPage";
import GradesPage from "./components/pages/GradesPage";
import UnauthorizedPage from "./components/pages/UnauthorizedPage";
import ClassOverviewPage from "./components/pages/ClassOverviewPage";
import ParentDashboard from "./components/pages/ParentDashboard";
import ParentGradesPage from "./components/pages/ParentGradesPage";
import ParentAttendancePage from "./components/pages/ParentAttendancePage";
import ParentHomeworkPage from "./components/pages/ParentHomeworkPage";
import ParentMyChildPage from "./components/pages/ParentMyChildPage";

const ComingSoonPage = ({ title, icon: Icon }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-emerald-100">
      <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full mx-auto flex items-center justify-center mb-4">
        <Icon size={40} className="text-emerald-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-800 capitalize">{title}</h3>
      <p className="text-gray-500 mt-2">This section is coming soon 🌱</p>
    </div>
  );
};

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
  if (!user) {
    return <LoginPage />;
  }

const renderPage = () => {
  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadAllStudents} />;
  }

  switch (currentPage) {
    case "home":
      if (isParent()) {
        return <ParentDashboard />;
      }
      return <HomePage />;
    
    case "schedule":
      if (isParent()) {
        return <UnauthorizedPage />;
      }
      return <SchedulePage />;
    
    case "homework":
      if (isParent()) {
        return <ParentHomeworkPage />; // Parent homework view
      }
      return <HomeworkPage />;
    
    case "students":
  // ONLY admins can access Students page
  if (!isAdmin()) {
    return <UnauthorizedPage />;
  }
  return <StudentsPage />;
    
    case "grading":
      if (isParent()) {
        return <ParentGradesPage />; // Parent grades view
      }
      return <GradesPage />;
    
    case "my-child": // NEW parent route
      if (!isParent()) {
        return <UnauthorizedPage />;
      }
      return <ParentMyChildPage />;
    
    case "parent-attendance": // NEW parent route
      if (!isParent()) {
        return <UnauthorizedPage />;
      }
      return <ParentAttendancePage />;
    
    case "class-overview":
      if (!teacher?.class_teacher_for) {
        return <UnauthorizedPage />;
      }
      return <ClassOverviewPage />;
    
    case "attendance":
      if (isParent()) {
        return <UnauthorizedPage />;
      }
      return <AttendanceLogPage />;
    
    case "settings":
      return <SettingsPage />;
    
    case "unauthorized":
      return <UnauthorizedPage />;
    
    default:
      if (isParent()) {
        return <ParentDashboard />;
      }
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
          {teacher?.full_name || profile?.full_name || profile?.email || 'User'}
        </p>
        <p className="text-xs text-emerald-600">
          {teacher?.subjects?.join(', ') || profile?.role?.toUpperCase() || 'User'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
          {(teacher?.full_name || profile?.full_name)?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
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
    {/* PARENT NAVIGATION */}
    {isParent() ? (
      <>
        <NavItem icon={BookOpen} label="Dashboard" page="home" />
        <NavItem icon={Users} label="My Child" page="my-child" />
        <NavItem icon={BarChart3} label="Grades" page="grading" />
        <NavItem icon={Calendar} label="Attendance" page="parent-attendance" />
        <NavItem icon={FileText} label="Homework" page="homework" />
        <NavItem icon={Settings} label="Settings" page="settings" />
      </>
    ) : (
      <>
        {/* TEACHER/ADMIN NAVIGATION */}
        <NavItem icon={BookOpen} label="Home" page="home" />
        
        {/* Schedule - Teachers & Admins */}
        {(isTeacher() || isAdmin()) && (
          <NavItem icon={Calendar} label="My Schedule" page="schedule" />
        )}
        
        {/* Homework - Teachers & Admins */}
        {(isTeacher() || isAdmin()) && (
          <NavItem icon={FileText} label="Homework" page="homework" />
        )}
        
        {/* Students - ONLY ADMINS */}
        {isAdmin() && (
          <NavItem icon={Users} label="Students" page="students" />
        )}
        
        {/* Grading - Teachers & Admins */}
        {(isTeacher() || isAdmin()) && (
          <NavItem icon={BarChart3} label="Grading" page="grading" />
        )}
        
        {/* Class Overview - Class Teachers only */}
        {teacher?.class_teacher_for && (
          <NavItem 
            icon={ClipboardList} 
            label={`Class ${teacher.class_teacher_for}`} 
            page="class-overview" 
          />
        )}
        
        {/* Attendance Log - Teachers & Admins */}
        {(isTeacher() || isAdmin()) && (
          <NavItem
            icon={ClipboardList}
            label="Attendance Log"
            page="attendance"
          />
        )}
        
        {/* Settings - Everyone */}
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
