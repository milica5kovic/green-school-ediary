import React, { useState, useEffect, useRef } from "react";
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
  Activity,
  CalendarRange,
  Menu,
  X,
} from "lucide-react";

import { AppProvider, useApp } from "../core/context/AppContext";
import { useAuth } from "../core/context/AuthContext";
import { useTenant } from "../core/context/TenantContext";
import { useBranding } from "../core/context/BrandingContext";
import { ToastProvider } from "../core/components/Toast";

import NavItem from "../shared/navigation/NavItem";
import LoadingSpinner from "../shared/components/LoadingSpinner";
import ErrorMessage from "../shared/components/ErrorMessage";
import UnauthorizedPage from "../shared/components/UnauthorizedPage";

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

import ParentDashboard from "./features/parents/components/ParentDashboard";
import ParentMyChildPage from "./features/parents/components/ParentMyChildPage";
import ParentGradesPage from "./features/parents/components/ParentGradesPage";
import ParentAttendancePage from "./features/parents/components/ParentAttendancePage";
import ParentCalendarPage from "./features/parents/components/ParentCalendarPage";
import ParentDailyViewPage from "./features/parents/components/ParentDailyView";
import ParentHomeworkPage from "./features/parents/components/ParentHomeworkPage";
import ActivityTrackerPage from "./features/activity/components/ActivityTrackerPage";
import TimetableMakerPage from "./features/timetable/components/TimetableMakerPage";

// ============================================================================
// SCHOOL APP
// ============================================================================

const SchoolApp = () => (
  <ToastProvider>
    <AppProvider>
      <SchoolAppContent />
    </AppProvider>
  </ToastProvider>
);

// ============================================================================
// SCHOOL APP CONTENT
// ============================================================================

const SchoolAppContent = () => {
  const { currentPage, setCurrentPage, loading, error, loadAllStudents } = useApp();
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

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Page transition ──────────────────────────────────────────────────────
  // Keeps a "displayed" page key that lags slightly behind currentPage so we
  // can fade out → swap → fade in instead of instantly flashing new content.
  const [displayedPage, setDisplayedPage] = useState(currentPage);
  const [pageVisible, setPageVisible] = useState(true);
  const prevPageRef = useRef(currentPage);

  useEffect(() => {
    if (currentPage === prevPageRef.current) return;
    prevPageRef.current = currentPage;

    // Fade out
    setPageVisible(false);

    const t = setTimeout(() => {
      // Swap content while invisible
      setDisplayedPage(currentPage);
      // Fade back in
      setPageVisible(true);
    }, 120);

    return () => clearTimeout(t);
  }, [currentPage]);

  if (authLoading || brandingLoading) {
    return <LoadingSpinner message="Loading..." fullPage />;
  }

  const isSuperAdmin = profile?.role === "admin" && teacher !== null;
  const isPureAdmin  = profile?.role === "admin" && teacher === null;

  /**
   * Returns true if a feature is enabled.
   * Defaults to true when the key is missing — prevents accidental lockouts
   * for schools that haven't been migrated yet.
   */
  const hasFeature = (key) => {
    if (!features) return true;
    if (features[key] === undefined) return true;
    return features[key] === true;
  };

  // ── Page renderer — uses displayedPage (lagged) to avoid flash ────────────

  const renderPage = () => {
    if (loading) return <LoadingSpinner message="Loading..." />;
    if (error)   return <ErrorMessage message={error} onRetry={loadAllStudents} />;

    // ── PARENT ROUTES ────────────────────────────────────────────────────────
    if (isParent()) {
      if (!hasFeature("parent_portal")) {
        return (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={40} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Parent Portal Unavailable</h2>
            <p className="text-gray-600">The parent portal is not enabled for this school.</p>
          </div>
        );
      }

      switch (displayedPage) {
        case "home":              return <ParentDashboard />;
        case "my-child":          return <ParentMyChildPage />;
        case "grading":
        case "parent-grades":     return hasFeature("parent_grades")     ? <ParentGradesPage />     : <FeatureDisabled feature="Grades" />;
        case "parent-attendance": return hasFeature("parent_attendance") ? <ParentAttendancePage /> : <FeatureDisabled feature="Attendance" />;
        case "parent-calendar":   return hasFeature("parent_calendar")   ? <ParentCalendarPage />   : <FeatureDisabled feature="Calendar" />;
        case "parent-daily":      return <ParentDailyViewPage />;
        case "homework":
        case "parent-homework":   return hasFeature("parent_homework")   ? <ParentHomeworkPage />   : <FeatureDisabled feature="Homework" />;
        case "settings":          return <SettingsPage />;
        default:                  return <ParentDashboard />;
      }
    }

    // ── TEACHER / ADMIN ROUTES ───────────────────────────────────────────────
    switch (displayedPage) {
      case "home":
        if (!hasFeature(isPureAdmin ? "admin_dashboard" : "home"))
          return <FeatureDisabled feature="Home" />;
        return isPureAdmin ? <AdminDashboard /> : <HomePage />;

      case "admin-dashboard":
        if (!isSuperAdmin) return <UnauthorizedPage />;
        if (!hasFeature("admin_dashboard")) return <FeatureDisabled feature="Admin Dashboard" />;
        return <AdminDashboard />;

      case "schedule":
        if (isPureAdmin) return <UnauthorizedPage />;
        return hasFeature("schedule") ? <SchedulePage /> : <FeatureDisabled feature="Schedule" />;

      case "teacher-calendar":
        if (isPureAdmin) return <UnauthorizedPage />;
        return hasFeature("calendar") ? <TeacherCalendarPage /> : <FeatureDisabled feature="Calendar" />;

      case "admin-calendar":
        if (!isAdmin()) return <UnauthorizedPage />;
        return hasFeature("admin_calendar") ? <AdminCalendarPage /> : <FeatureDisabled feature="School Calendar" />;

      case "tasks":
        if (isPureAdmin) return <UnauthorizedPage />;
        return hasFeature("tasks") ? <TodoPage /> : <FeatureDisabled feature="Tasks" />;

      case "homework":
        if (isPureAdmin) return <UnauthorizedPage />;
        return hasFeature("homework") ? <HomeworkPage /> : <FeatureDisabled feature="Homework" />;

      case "activity":
        return hasFeature("activity") ? <ActivityTrackerPage /> : <FeatureDisabled feature="Activity Tracker" />;

      case "grading":
        if (isPureAdmin) return <UnauthorizedPage />;
        return hasFeature("grading") ? <GradesPage /> : <FeatureDisabled feature="Grading" />;

      case "daily-overview":
        if (!teacher?.class_teacher_for) return <UnauthorizedPage />;
        return hasFeature("daily_overview") ? <DailyOverviewPage /> : <FeatureDisabled feature="Daily Overview" />;

      case "test-maker":
        if (isPureAdmin) return <UnauthorizedPage />;
        return hasFeature("test_maker") ? <TestMakerPage /> : <FeatureDisabled feature="Test Maker" />;

      case "management":
        if (!isAdmin()) return <UnauthorizedPage />;
        return hasFeature("management") ? <ManagementPage /> : <FeatureDisabled feature="Management" />;

      case "timetable":
        if (!isAdmin()) return <UnauthorizedPage />;
        return hasFeature("timetable") ? <TimetableMakerPage /> : <FeatureDisabled feature="Timetable" />;

      case "admissions":
        if (!isAdmin()) return <UnauthorizedPage />;
        return hasFeature("admissions") ? <AdmissionsPortal /> : <FeatureDisabled feature="Admissions" />;

      case "reports":
        if (!isAdmin()) return <UnauthorizedPage />;
        return hasFeature("reports") ? <ReportsComingSoon /> : <FeatureDisabled feature="Reports" />;

      case "settings":     return <SettingsPage />;
      case "unauthorized": return <UnauthorizedPage />;

      default:
        return isPureAdmin ? <AdminDashboard /> : <HomePage />;
    }
  };

  const handleSignOut = () => {
    signOut();
  };

  const getUserRole = () => {
    if (isSuperAdmin) return "Super Admin";
    if (isPureAdmin)  return "Administrator";
    if (teacher)      return teacher.subjects?.slice(0, 2).join(", ") || "Teacher";
    return profile?.role?.toUpperCase();
  };

  const getUserBadge = () => {
    if (isSuperAdmin) return (
      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex items-center gap-1">
        <Shield size={12} /> Super Admin
      </span>
    );
    if (isPureAdmin) return (
      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold flex items-center gap-1">
        <UserCog size={12} /> Admin
      </span>
    );
    if (teacher) return (
      <span
        className="px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
      >
        Teacher
      </span>
    );
    if (isParent()) return (
      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
        Parent
      </span>
    );
    return null;
  };

  const navContent = (
    <nav className="space-y-1" onClick={() => setSidebarOpen(false)}>
      {/* ════════ PARENT NAV ════════ */}
      {isParent() ? (
        <>
          {hasFeature("parent_portal") && (
            <>
              <NavItem icon={LayoutDashboard} label="Dashboard"  page="home" />
              <NavItem icon={UserCircle}      label="My Child"   page="my-child" />
              {hasFeature("parent_grades")     && <NavItem icon={Award}         label="Grades"     page="grading" />}
              {hasFeature("parent_attendance") && <NavItem icon={CalendarCheck} label="Attendance" page="parent-attendance" />}
              {hasFeature("parent_calendar")   && <NavItem icon={Calendar}      label="Calendar"   page="parent-calendar" />}
              <NavItem icon={CalendarDays} label="Daily View" page="parent-daily" />
              {hasFeature("parent_homework")   && <NavItem icon={ClipboardList} label="Homework"   page="homework" />}
            </>
          )}
          <NavItem icon={Settings} label="Settings" page="settings" />
        </>

      /* ════════ SUPER ADMIN NAV ════════ */
      ) : isSuperAdmin ? (
        <>
          {hasFeature("home")            && <NavItem icon={Home}           label="Teacher Home"     page="home" />}
          {hasFeature("admin_dashboard") && <NavItem icon={LayoutDashboard}label="Admin Dashboard"  page="admin-dashboard" />}

          <div className="border-t border-gray-200 my-3" />

          {hasFeature("schedule")        && <NavItem icon={Clock}          label="My Schedule"      page="schedule" />}
          {hasFeature("calendar")        && <NavItem icon={Calendar}       label="Calendar"         page="teacher-calendar" />}
          {hasFeature("admin_calendar")  && <NavItem icon={CalendarDays}   label="School Calendar"  page="admin-calendar" />}
          {hasFeature("tasks")           && <NavItem icon={CheckSquare}    label="My Tasks"         page="tasks" />}
          {hasFeature("homework")        && <NavItem icon={BookMarked}     label="Homework"         page="homework" />}
          {hasFeature("activity")        && <NavItem icon={Activity}       label="Activity Tracker" page="activity" />}
          {hasFeature("grading")         && <NavItem icon={GraduationCap}  label="Grading"          page="grading" />}
          {teacher?.class_teacher_for && hasFeature("daily_overview") &&
            <NavItem icon={ClipboardCheck} label="Daily Overview" page="daily-overview" />
          }
          {hasFeature("test_maker")      && <NavItem icon={FileText}       label="Test Maker"       page="test-maker" />}

          <div className="border-t border-gray-200 my-3" />

          {hasFeature("management")      && <NavItem icon={Users}          label="Management"       page="management" />}
          {hasFeature("admissions")      && <NavItem icon={UserPlus}       label="Admissions"       page="admissions" />}
          {hasFeature("timetable")       && <NavItem icon={CalendarRange}  label="Timetable"        page="timetable" />}
          {hasFeature("reports")         && <NavItem icon={BarChart3}      label="Reports"          page="reports" />}
          <NavItem icon={Settings} label="Settings" page="settings" />
        </>

      /* ════════ PURE ADMIN NAV ════════ */
      ) : isPureAdmin ? (
        <>
          {hasFeature("admin_dashboard") && <NavItem icon={LayoutDashboard}label="Dashboard"        page="home" />}
          {hasFeature("admin_calendar")  && <NavItem icon={CalendarDays}   label="School Calendar"  page="admin-calendar" />}
          {hasFeature("management")      && <NavItem icon={Users}          label="Management"       page="management" />}
          {hasFeature("admissions")      && <NavItem icon={UserPlus}       label="Admissions"       page="admissions" />}
          {hasFeature("timetable")       && <NavItem icon={CalendarRange}  label="Timetable"        page="timetable" />}
          {hasFeature("reports")         && <NavItem icon={BarChart3}      label="Reports"          page="reports" />}
          <NavItem icon={Settings} label="Settings" page="settings" />
        </>

      /* ════════ TEACHER NAV ════════ */
      ) : (
        <>
          {hasFeature("home")            && <NavItem icon={Home}           label="Home"             page="home" />}
          {hasFeature("schedule")        && <NavItem icon={Clock}          label="My Schedule"      page="schedule" />}
          {hasFeature("calendar")        && <NavItem icon={Calendar}       label="Calendar"         page="teacher-calendar" />}
          {hasFeature("tasks")           && <NavItem icon={CheckSquare}    label="My Tasks"         page="tasks" />}
          {hasFeature("homework")        && <NavItem icon={BookMarked}     label="Homework"         page="homework" />}
          {hasFeature("activity")        && <NavItem icon={Activity}       label="Activity Tracker" page="activity" />}
          {hasFeature("grading")         && <NavItem icon={GraduationCap}  label="Grading"          page="grading" />}
          {teacher?.class_teacher_for && hasFeature("daily_overview") &&
            <NavItem icon={ClipboardCheck} label="Daily Overview" page="daily-overview" />
          }
          {hasFeature("test_maker")      && <NavItem icon={FileText}       label="Test Maker"       page="test-maker" />}
          <NavItem icon={Settings} label="Settings" page="settings" />
        </>
      )}
    </nav>
  );

  return (
    <div
      className="min-h-screen"
      style={{ background: `linear-gradient(to bottom right, ${primaryColor}08, ${primaryColor}03)` }}
    >
      {/* ── HEADER ── */}
      <header className="bg-white border-b-2 shadow-md sticky top-0 z-30" style={{ borderColor: primaryColor }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3">
          <div className="flex justify-between items-center gap-2">

            {/* Left: hamburger (mobile) + logo + name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Hamburger — mobile only */}
              <button
                className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={22} className="text-gray-700" />
              </button>

              <div className="w-9 h-9 sm:w-12 sm:h-12 flex-shrink-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={schoolName}
                    className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl object-contain bg-white shadow-sm"
                  />
                ) : (
                  <div
                    className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {schoolName?.charAt(0) || "S"}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold text-gray-900 leading-tight truncate">
                  {schoolName || "School"} E-Diary
                </h1>
                <p className="text-xs font-medium hidden sm:block" style={{ color: primaryColor }}>
                  {tagline || "Digital Learning Management"}
                </p>
              </div>
            </div>

            {/* Right: user info + logout */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* User info — desktop only */}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">
                  {teacher?.full_name || profile?.full_name || "User"}
                </p>
                {getUserBadge()}
              </div>

              {/* Avatar */}
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-md text-white flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <User size={18} />
              </div>

              {/* Logout button — always visible */}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors font-medium text-sm"
                title="Logout"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MOBILE SIDEBAR DRAWER ── */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: `${primaryColor}20` }}
        >
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt={schoolName} className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: primaryColor }}
              >
                {schoolName?.charAt(0) || "S"}
              </div>
            )}
            <span className="font-bold text-gray-900 text-sm">{schoolName}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Drawer nav */}
        <div className="flex-1 overflow-y-auto p-4">
          {navContent}
        </div>

        {/* Drawer footer: user info */}
        <div
          className="p-4 border-t"
          style={{ borderColor: `${primaryColor}20` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <User size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {teacher?.full_name || profile?.full_name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            <LogOut size={15} />
            Logout
          </button>
          <p className="mt-3 text-center text-[10px] text-gray-300 select-none">
            Powered by Milica Petkovic
          </p>
        </div>
      </div>

      {/* ── LAYOUT ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 md:flex md:gap-6">

        {/* ── DESKTOP SIDEBAR ── */}
        <aside
          className="hidden md:block w-64 bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-24 border flex-shrink-0"
          style={{ borderColor: `${primaryColor}30` }}
        >
          {navContent}
          <p className="mt-6 text-center text-[10px] text-gray-300 select-none">
            Powered by Milica Petkovic
          </p>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main
          key={displayedPage}
          className="flex-1 min-w-0 overflow-hidden transition-opacity duration-150 ease-in-out"
          style={{ opacity: pageVisible ? 1 : 0 }}
        >
          {renderPage()}
        </main>
      </div>

    </div>
  );
};

// ============================================================================
// REPORTS COMING SOON
// ============================================================================

const ReportsComingSoon = () => {
  const { primaryColor } = useBranding();
  const items = [
    { icon: BarChart3,   label: 'Student Progress Reports',   desc: 'Term-by-term grade trends per student' },
    { icon: Users,       label: 'Class Performance Overview', desc: 'Compare averages across all classes' },
    { icon: CheckSquare, label: 'Attendance Analytics',       desc: 'Absence patterns and monthly summaries' },
    { icon: FileText,    label: 'PDF Report Cards',           desc: 'One-click printable reports per student' },
  ];
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border p-8" style={{ borderColor: `${primaryColor}20` }}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
            <BarChart3 size={28} style={{ color: primaryColor }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
            <p className="text-gray-500 text-sm">Detailed school-wide reporting</p>
          </div>
        </div>

        <div className="rounded-xl p-4 mb-6 flex items-center gap-3" style={{ backgroundColor: `${primaryColor}10`, border: `1px solid ${primaryColor}30` }}>
          <Clock size={18} style={{ color: primaryColor }} className="flex-shrink-0" />
          <p className="text-sm font-medium" style={{ color: primaryColor }}>
            Full reporting module coming soon. In the meantime, the <strong>Admin Dashboard</strong> shows live school stats.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}12` }}>
                <Icon size={18} style={{ color: primaryColor }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FEATURE DISABLED
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
        <h2 className="text-xl font-bold text-gray-900 mb-2">{feature} Not Available</h2>
        <p className="text-gray-600">
          This feature is not enabled for your school. Please contact your administrator if you need access.
        </p>
      </div>
    </div>
  );
};

export default SchoolApp;