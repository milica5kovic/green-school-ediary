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
  UserCog,
  Activity
} from "lucide-react";

// Core contexts
import { AppProvider, useApp } from "../core/context/AppContext";
import { useAuth } from "../core/context/AuthContext";
import { useTenant } from "../core/context/TenantContext";
import { useBranding } from "../core/context/BrandingContext";

// Shared components
import NavItem from "../shared/navigation/NavItem";
import LoadingSpinner from "../shared/components/LoadingSpinner";
import ErrorMessage from "../shared/components/ErrorMessage";
import UnauthorizedPage from "../shared/components/UnauthorizedPage";

// Teacher/Admin Pages
import HomePage from "./features/dashboard/components/HomePage";
import AdminDashboard from "./features/admin/components/AdminDashboard";
import SchedulePage from "./features/schedule/components/SchedulePage";
import TeacherCalendarPage from "./features/calendar/components/TeacherCalendarPage";
import AdminCalendarPage from "./features/calendar/components/AdminCalendarPage";
import TodoPage from "./features/tasks/components/TodoPage";
import HomeworkPage from "./features/homework/components/HomeworkPage";
import GradesPage from "./features/grading/components/GradesPage";
import DailyOverviewPage from "./features/attendance/components/DailyOverviewPage";
import TestMakerPage from "./features/tests/components/TestMakerPage";
import ManagementPage from "./features/management/components/ManagementPage";
import SettingsPage from "./features/settings/components/SettingsPage";
import AdmissionsPortal from "./features/admissions/components/AdmissionsPortal";

// Parent Pages
import ParentDashboard from "./features/parents/components/ParentDashboard";
import ParentMyChildPage from "./features/parents/components/ParentMyChildPage";
import ParentGradesPage from "./features/parents/components/ParentGradesPage";
import ParentAttendancePage from "./features/parents/components/ParentAttendancePage";
import ParentCalendarPage from "./features/parents/components/ParentCalendarPage";
import ParentDailyViewPage from "./features/parents/components/ParentDailyView";
import ParentHomeworkPage from "./features/parents/components/ParentHomeworkPage";
import ActivityTrackerPage from "./features/activity/components/ActivityTrackerPage";
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
  const { currentPage, setCurrentPage, loading, error, loadAllStudents } =
    useApp();
  const { school } = useTenant();
  const {
    primaryColor,
    name: schoolName,
    logoUrl,
    tagline,
    features,
    isLoading: brandingLoading,
  } = useBranding();

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

  // Loading states
  if (authLoading || brandingLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: `linear-gradient(to bottom right, ${primaryColor}10, ${primaryColor}05)`,
        }}
      >
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  // Role detection
  const isSuperAdmin = profile?.role === "admin" && teacher !== null;
  const isPureAdmin = profile?.role === "admin" && teacher === null;

  // ========== FEATURE CHECK HELPER ==========
  // Returns true if feature is enabled (or not explicitly disabled)
  const hasFeature = (featureKey) => {
    // If features object doesn't exist, default to enabled
    if (!features) return true;
    // If feature key doesn't exist, default to enabled
    if (features[featureKey] === undefined) return true;
    // Otherwise return the actual value
    return features[featureKey] === true;
  };

  // ========== PAGE RENDERER ==========
  const renderPage = () => {
    if (loading) return <LoadingSpinner message="Loading..." />;
    if (error)
      return <ErrorMessage message={error} onRetry={loadAllStudents} />;

    // ========== PARENT ROUTES ==========
    if (isParent()) {
      // Check if parent portal is enabled at all
      if (!hasFeature("parent_portal")) {
        return (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={40} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Parent Portal Unavailable
            </h2>
            <p className="text-gray-600">
              The parent portal is not enabled for this school.
            </p>
          </div>
        );
      }

      switch (currentPage) {
        case "home":
          return <ParentDashboard />;
        case "my-child":
          return <ParentMyChildPage />;
        case "grading":
        case "parent-grades":
          return hasFeature("parent_grades") ? (
            <ParentGradesPage />
          ) : (
            <FeatureDisabled feature="Grades" />
          );
        case "parent-attendance":
          return hasFeature("parent_attendance") ? (
            <ParentAttendancePage />
          ) : (
            <FeatureDisabled feature="Attendance" />
          );
        case "parent-calendar":
          return hasFeature("parent_calendar") ? (
            <ParentCalendarPage />
          ) : (
            <FeatureDisabled feature="Calendar" />
          );
        case "parent-daily":
          return <ParentDailyViewPage />;
        case "homework":
        case "parent-homework":
          return hasFeature("parent_homework") ? (
            <ParentHomeworkPage />
          ) : (
            <FeatureDisabled feature="Homework" />
          );
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
        if (isPureAdmin) return <UnauthorizedPage />;
        if (!hasFeature("schedule"))
          return <FeatureDisabled feature="Schedule" />;
        return <SchedulePage />;

      case "teacher-calendar":
        if (isPureAdmin) return <UnauthorizedPage />;
        if (!hasFeature("calendar"))
          return <FeatureDisabled feature="Calendar" />;
        return <TeacherCalendarPage />;

      case "admin-calendar":
        if (!isAdmin()) return <UnauthorizedPage />;
        if (!hasFeature("admin_calendar"))
          return <FeatureDisabled feature="School Calendar" />;
        return <AdminCalendarPage />;

      case "tasks":
        if (isPureAdmin) return <UnauthorizedPage />;
        if (!hasFeature("tasks")) return <FeatureDisabled feature="Tasks" />;
        return <TodoPage />;

      case "homework":
        if (isPureAdmin) return <UnauthorizedPage />;
        if (!hasFeature("homework"))
          return <FeatureDisabled feature="Homework" />;
        return <HomeworkPage />;

      case "activity":
        return <ActivityTrackerPage />;

      case "grading":
        if (isPureAdmin) return <UnauthorizedPage />;
        if (!hasFeature("grading"))
          return <FeatureDisabled feature="Grading" />;
        return <GradesPage />;

      case "daily-overview":
        if (!teacher?.class_teacher_for) return <UnauthorizedPage />;
        if (!hasFeature("daily_overview"))
          return <FeatureDisabled feature="Daily Overview" />;
        return <DailyOverviewPage />;

      case "test-maker":
        if (isPureAdmin) return <UnauthorizedPage />;
        if (!hasFeature("test_maker"))
          return <FeatureDisabled feature="Test Maker" />;
        return <TestMakerPage />;

      case "management":
        if (!isAdmin()) return <UnauthorizedPage />;
        if (!hasFeature("management"))
          return <FeatureDisabled feature="Management" />;
        return <ManagementPage />;

      case "admissions":
        if (!isAdmin()) return <UnauthorizedPage />;
        if (!hasFeature("admissions"))
          return <FeatureDisabled feature="Admissions" />;
        return <AdmissionsPortal />;

      case "reports":
        if (!isAdmin()) return <UnauthorizedPage />;
        if (!hasFeature("reports"))
          return <FeatureDisabled feature="Reports" />;
        return <AdminDashboard />;

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
    if (isSuperAdmin) return "Super Admin";
    if (isPureAdmin) return "Administrator";
    if (teacher) return teacher.subjects?.slice(0, 2).join(", ") || "Teacher";
    return profile?.role?.toUpperCase();
  };

  const getUserBadge = () => {
    if (isSuperAdmin)
      return (
        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex items-center gap-1">
          <Shield size={12} />
          Super Admin
        </span>
      );
    if (isPureAdmin)
      return (
        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold flex items-center gap-1">
          <UserCog size={12} />
          Admin
        </span>
      );
    if (teacher)
      return (
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
        >
          Teacher
        </span>
      );
    if (isParent())
      return (
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
          Parent
        </span>
      );
    return null;
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(to bottom right, ${primaryColor}08, ${primaryColor}03)`,
      }}
    >
      {/* ========== HEADER ========== */}
      <header
        className="bg-white border-b-2 shadow-md"
        style={{ borderColor: primaryColor }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex justify-between items-center">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={schoolName}
                    className="w-12 h-12 rounded-xl object-contain bg-white shadow-sm"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {schoolName?.charAt(0) || "S"}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  {schoolName || "School"} E-Diary
                </h1>
                <p
                  className="text-xs font-medium"
                  style={{ color: primaryColor }}
                >
                  {tagline || "Digital Learning Management"}
                </p>
              </div>
            </div>

            {/* Right: User Profile */}
            <div className="flex items-center gap-3">
              <div className="text-right border-r border-gray-300 pr-3">
                <p className="text-sm font-semibold text-gray-900">
                  {teacher?.full_name || profile?.full_name || "User"}
                </p>
                {getUserBadge()}
              </div>

              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <User size={20} />
                </button>

                {/* Dropdown Menu */}
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                    <div
                      className="p-3 border-b"
                      style={{ backgroundColor: `${primaryColor}10` }}
                    >
                      <p className="text-xs text-gray-600 font-medium">
                        {getUserRole()}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user?.email}
                      </p>
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
        <aside
          className="w-64 bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-6 border"
          style={{ borderColor: `${primaryColor}30` }}
        >
          <nav className="space-y-1">
            {isParent() ? (
              /* ========== PARENT NAVIGATION ========== */
              <>
                <NavItem icon={LayoutDashboard} label="Dashboard" page="home" />
                <NavItem icon={UserCircle} label="My Child" page="my-child" />
                {hasFeature("parent_grades") && (
                  <NavItem icon={Award} label="Grades" page="grading" />
                )}
                {hasFeature("parent_attendance") && (
                  <NavItem
                    icon={CalendarCheck}
                    label="Attendance"
                    page="parent-attendance"
                  />
                )}
                {hasFeature("parent_calendar") && (
                  <NavItem
                    icon={Calendar}
                    label="Calendar"
                    page="parent-calendar"
                  />
                )}
                <NavItem
                  icon={CalendarDays}
                  label="Daily View"
                  page="parent-daily"
                />
                {hasFeature("parent_homework") && (
                  <NavItem
                    icon={ClipboardList}
                    label="Homework"
                    page="homework"
                  />
                )}
                <NavItem icon={Settings} label="Settings" page="settings" />
              </>
            ) : isSuperAdmin ? (
              /* ========== SUPER ADMIN NAVIGATION ========== */
              <>
                <NavItem icon={Home} label="Teacher Home" page="home" />
                <NavItem
                  icon={LayoutDashboard}
                  label="Admin Dashboard"
                  page="admin-dashboard"
                />

                <div className="border-t border-gray-200 my-3" />

                {hasFeature("schedule") && (
                  <NavItem icon={Clock} label="My Schedule" page="schedule" />
                )}
                {hasFeature("calendar") && (
                  <NavItem
                    icon={Calendar}
                    label="Calendar"
                    page="teacher-calendar"
                  />
                )}
                {hasFeature("admin_calendar") && (
                  <NavItem
                    icon={CalendarDays}
                    label="School Calendar"
                    page="admin-calendar"
                  />
                )}
                {hasFeature("tasks") && (
                  <NavItem icon={CheckSquare} label="My Tasks" page="tasks" />
                )}
                {hasFeature("homework") && (
                  <NavItem icon={BookMarked} label="Homework" page="homework" />
                )}

                <NavItem icon={Activity} label="Activity Tracker" page="activity" />
                {hasFeature("grading") && (
                  <NavItem
                    icon={GraduationCap}
                    label="Grading"
                    page="grading"
                  />
                )}
                {teacher?.class_teacher_for && hasFeature("daily_overview") && (
                  <NavItem
                    icon={ClipboardCheck}
                    label="Daily Overview"
                    page="daily-overview"
                  />
                )}
                {hasFeature("test_maker") && (
                  <NavItem
                    icon={FileText}
                    label="Test Maker"
                    page="test-maker"
                  />
                )}

                <div className="border-t border-gray-200 my-3" />

                {hasFeature("management") && (
                  <NavItem icon={Users} label="Management" page="management" />
                )}
                {hasFeature("admissions") && (
                  <NavItem
                    icon={UserPlus}
                    label="Admissions"
                    page="admissions"
                  />
                )}
                <NavItem icon={Settings} label="Settings" page="settings" />
              </>
            ) : isPureAdmin ? (
              /* ========== PURE ADMIN NAVIGATION ========== */
              <>
                <NavItem icon={LayoutDashboard} label="Dashboard" page="home" />
                {hasFeature("admin_calendar") && (
                  <NavItem
                    icon={CalendarDays}
                    label="School Calendar"
                    page="admin-calendar"
                  />
                )}
                {hasFeature("management") && (
                  <NavItem icon={Users} label="Management" page="management" />
                )}
                {hasFeature("admissions") && (
                  <NavItem
                    icon={UserPlus}
                    label="Admissions"
                    page="admissions"
                  />
                )}
                {hasFeature("reports") && (
                  <NavItem icon={BarChart3} label="Reports" page="reports" />
                )}
                <NavItem icon={Settings} label="Settings" page="settings" />
              </>
            ) : (
              /* ========== TEACHER NAVIGATION ========== */
              <>
                <NavItem icon={Home} label="Home" page="home" />
                {hasFeature("schedule") && (
                  <NavItem icon={Clock} label="My Schedule" page="schedule" />
                )}
                {hasFeature("calendar") && (
                  <NavItem
                    icon={Calendar}
                    label="Calendar"
                    page="teacher-calendar"
                  />
                )}
                {hasFeature("tasks") && (
                  <NavItem icon={CheckSquare} label="My Tasks" page="tasks" />
                )}
                {hasFeature("homework") && (
                  <NavItem icon={BookMarked} label="Homework" page="homework" />
                )}
                {hasFeature("grading") && (
                  <NavItem
                    icon={GraduationCap}
                    label="Grading"
                    page="grading"
                  />
                )}
                {teacher?.class_teacher_for && hasFeature("daily_overview") && (
                  <NavItem
                    icon={ClipboardCheck}
                    label="Daily Overview"
                    page="daily-overview"
                  />
                )}
                {hasFeature("test_maker") && (
                  <NavItem
                    icon={FileText}
                    label="Test Maker"
                    page="test-maker"
                  />
                )}
                <NavItem icon={Settings} label="Settings" page="settings" />
              </>
            )}
          </nav>

          {/* Footer - Powered by Akio */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <a
              href="https://akio.rs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 text-center block hover:text-gray-600 transition-colors"
            >
              Powered by <span className="font-semibold">Akio</span>
            </a>
          </div>
        </aside>

        {/* ========== MAIN CONTENT ========== */}
        <main className="flex-1 min-w-0 overflow-hidden">{renderPage()}</main>
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

// ============================================================================
// FEATURE DISABLED COMPONENT
// ============================================================================
const FeatureDisabled = ({ feature }) => {
  const { primaryColor } = useBranding();

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-md">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <Settings size={40} style={{ color: primaryColor }} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {feature} Not Available
        </h2>
        <p className="text-gray-600">
          This feature is not enabled for your school. Please contact your
          administrator if you need access.
        </p>
      </div>
    </div>
  );
};

export default SchoolApp;
