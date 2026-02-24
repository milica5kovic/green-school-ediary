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
  UserPlus,
  LogOut,
  Shield,
  UserCog
} from "lucide-react";

// Core contexts - putanja iz src/school/ do src/core/
import { AppProvider, useApp } from '../../src/core/context/AppContext';
import { useAuth } from '../../src/core/context/AuthContext';
import { useTenant } from '../../src/core/context/TenantContext';

// Shared components - putanja iz src/school/ do src/shared/
import NavItem from '../../src/shared/navigation/NavItem';
import LoadingSpinner from '../../src/shared/components/LoadingSpinner'

import ErrorMessage from '../../src/shared/components/ErrorMessage';
import UnauthorizedPage from '../../src/shared/components/UnauthorizedPage';

// Teacher/Admin Pages - putanja iz src/school/ do src/school/features/
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
// NAPOMENA: promeni u 'componenets' ako ti folder ima typo
import AdmissionsPortal from './features/admissions/components/AdmissionsPortal';

// Parent Pages
import ParentDashboard from './features/parents/components/ParentDashboard';
import ParentMyChildPage from './features/parents/components/ParentMyChildPage';
import ParentGradesPage from './features/parents/components/ParentGradesPage';
import ParentAttendancePage from './features/parents/components/ParentAttendancePage';
import ParentCalendarPage from './features/parents/components/ParentCalendarPage';
import ParentDailyViewPage from './features/parents/components/ParentDailyView';
import ParentHomeworkPage from './features/parents/components/ParentHomeworkPage';

// ============================================================================
// SCHOOL APP - Wrapper sa AppProvider
// ============================================================================
const SchoolApp = () => {
  return (
    <AppProvider>
      <SchoolAppContent />
    </AppProvider>
  );
};

// ============================================================================
// SCHOOL APP CONTENT - Glavna komponenta
// ============================================================================
const SchoolAppContent = () => {
  const { currentPage, loading, error, loadAllStudents } = useApp();
  const { school, primaryColor, schoolName, logoUrl } = useTenant();
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

  // ✅ ROLE DETECTION - pozivamo funkcije!
  const isSuperAdmin = profile?.role === 'admin' && teacher !== null;
  const isPureAdmin = profile?.role === 'admin' && teacher === null;

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
        case "parent-grades":
          return <ParentGradesPage />;
        case "parent-attendance":
          return <ParentAttendancePage />;
        case "parent-calendar":
          return <ParentCalendarPage />;
        case "parent-daily":
          return <ParentDailyViewPage />;
        case "homework":
        case "parent-homework":
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
        return isPureAdmin ? <AdminDashboard /> : <HomePage />;
      
      case "admin-dashboard":
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
      
      case "admissions":
        return isAdmin() ? <AdmissionsPortal /> : <UnauthorizedPage />;
      
      case "reports":
        return isAdmin() ? <AdminDashboard /> : <UnauthorizedPage />;
      
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

  // Dynamic styles based on school branding
  const brandGradient = `linear-gradient(to bottom right, ${primaryColor || '#10b981'}, ${primaryColor || '#10b981'}dd)`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* ========== HEADER ========== */}
      <header className="bg-white border-b-2 shadow-md" style={{ borderColor: primaryColor || '#10b981' }}>
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={schoolName} 
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: brandGradient }}
                  >
                    {schoolName?.charAt(0) || 'S'}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  {schoolName || 'School'} E-Diary
                </h1>
                <p className="text-xs font-medium" style={{ color: primaryColor || '#10b981' }}>
                  Powered by SchoolHub
                </p>
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
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md text-white"
                  style={{ background: brandGradient }}
                >
                  <User size={20} />
                </button>

                {/* Dropdown Menu */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                    <div className="p-3 border-b" style={{ background: `${primaryColor}10` }}>
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
        <aside className="w-64 bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-6 border" style={{ borderColor: `${primaryColor}30` }}>
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
              /* ========== SUPER ADMIN NAVIGATION ========== */
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
                <NavItem icon={UserPlus} label="Admissions" page="admissions" />
                <NavItem icon={Settings} label="Settings" page="settings" />
              </>
            ) : isPureAdmin ? (
              /* ========== PURE ADMIN NAVIGATION ========== */
              <>
                <NavItem icon={LayoutDashboard} label="Dashboard" page="home" />
                <NavItem icon={CalendarDays} label="School Calendar" page="admin-calendar" />
                <NavItem icon={Users} label="Management" page="management" />
                <NavItem icon={UserPlus} label="Admissions" page="admissions" />
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

export default SchoolApp;