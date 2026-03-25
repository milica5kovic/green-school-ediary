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
  ChevronRight,
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
import TimetableMakerPage from "./features/timetable/components/TimetableMakerPage";

// ============================================================================
// SchoolApp — wrapper with AppProvider
// ============================================================================
const SchoolApp = () => (
  <AppProvider>
    <SchoolAppContent />
  </AppProvider>
);

// ============================================================================
// SchoolAppContent — main shell
// ============================================================================
const SchoolAppContent = () => {
  const { currentPage, setCurrentPage, loading, error, loadAllStudents } = useApp();
  const { school } = useTenant();
  const { primaryColor, name: schoolName, logoUrl, tagline, features, isLoading: brandingLoading } = useBranding();
  const { user, profile, teacher, loading: authLoading, signOut, isAdmin, isParent } = useAuth();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen]         = useState(false);

  // Close sidebar on page change
  useEffect(() => { setSidebarOpen(false); }, [currentPage]);

  // Close sidebar on outside click (touch-friendly)
  const overlayRef = useRef(null);

  if (authLoading || brandingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: `linear-gradient(to bottom right, ${primaryColor}10, ${primaryColor}05)` }}>
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  const isSuperAdmin = profile?.role === "admin" && teacher !== null;
  const isPureAdmin  = profile?.role === "admin" && teacher === null;

  const hasFeature = (key) => {
    if (!features) return true;
    if (features[key] === undefined) return true;
    return features[key] === true;
  };

  // ── page renderer ────────────────────────────────────────────────────────
  const renderPage = () => {
    if (loading) return <LoadingSpinner message="Loading..." />;
    if (error)   return <ErrorMessage message={error} onRetry={loadAllStudents} />;

    if (isParent()) {
      if (!hasFeature("parent_portal")) {
        return (
          <div className="text-center py-20 px-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={40} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Parent Portal Unavailable</h2>
            <p className="text-gray-600">The parent portal is not enabled for this school.</p>
          </div>
        );
      }
      switch (currentPage) {
        case "home":            return <ParentDashboard />;
        case "my-child":        return <ParentMyChildPage />;
        case "grading":
        case "parent-grades":   return hasFeature("parent_grades")     ? <ParentGradesPage />     : <FeatureDisabled feature="Grades" />;
        case "parent-attendance": return hasFeature("parent_attendance") ? <ParentAttendancePage /> : <FeatureDisabled feature="Attendance" />;
        case "parent-calendar": return hasFeature("parent_calendar")   ? <ParentCalendarPage />   : <FeatureDisabled feature="Calendar" />;
        case "parent-daily":    return <ParentDailyViewPage />;
        case "homework":
        case "parent-homework": return hasFeature("parent_homework")   ? <ParentHomeworkPage />   : <FeatureDisabled feature="Homework" />;
        case "settings":        return <SettingsPage />;
        default:                return <ParentDashboard />;
      }
    }

    switch (currentPage) {
      case "home":             return isPureAdmin ? <AdminDashboard /> : <HomePage />;
      case "admin-dashboard":  return isSuperAdmin ? <AdminDashboard /> : <UnauthorizedPage />;
      case "schedule":         return isPureAdmin ? <UnauthorizedPage /> : hasFeature("schedule")        ? <SchedulePage />       : <FeatureDisabled feature="Schedule" />;
      case "teacher-calendar": return isPureAdmin ? <UnauthorizedPage /> : hasFeature("calendar")        ? <TeacherCalendarPage />: <FeatureDisabled feature="Calendar" />;
      case "admin-calendar":   return !isAdmin()  ? <UnauthorizedPage /> : hasFeature("admin_calendar")  ? <AdminCalendarPage />  : <FeatureDisabled feature="School Calendar" />;
      case "tasks":            return isPureAdmin ? <UnauthorizedPage /> : hasFeature("tasks")           ? <TodoPage />           : <FeatureDisabled feature="Tasks" />;
      case "homework":         return isPureAdmin ? <UnauthorizedPage /> : hasFeature("homework")        ? <HomeworkPage />       : <FeatureDisabled feature="Homework" />;
      case "activity":         return <ActivityTrackerPage />;
      case "grading":          return isPureAdmin ? <UnauthorizedPage /> : hasFeature("grading")         ? <GradesPage />         : <FeatureDisabled feature="Grading" />;
      case "daily-overview":   return !teacher?.class_teacher_for ? <UnauthorizedPage /> : hasFeature("daily_overview") ? <DailyOverviewPage /> : <FeatureDisabled feature="Daily Overview" />;
      case "test-maker":       return isPureAdmin ? <UnauthorizedPage /> : hasFeature("test_maker")      ? <TestMakerPage />      : <FeatureDisabled feature="Test Maker" />;
      case "management":       return !isAdmin()  ? <UnauthorizedPage /> : hasFeature("management")      ? <ManagementPage />     : <FeatureDisabled feature="Management" />;
      case "timetable":        return !isAdmin()  ? <UnauthorizedPage /> : <TimetableMakerPage />;
      case "admissions":       return !isAdmin()  ? <UnauthorizedPage /> : hasFeature("admissions")      ? <AdmissionsPortal />   : <FeatureDisabled feature="Admissions" />;
      case "reports":          return !isAdmin()  ? <UnauthorizedPage /> : hasFeature("reports")         ? <AdminDashboard />     : <FeatureDisabled feature="Reports" />;
      case "settings":         return <SettingsPage />;
      case "unauthorized":     return <UnauthorizedPage />;
      default:                 return isPureAdmin ? <AdminDashboard /> : <HomePage />;
    }
  };

  const handleSignOut = async () => { setProfileMenuOpen(false); await signOut(); };

  const getUserRole = () => {
    if (isSuperAdmin) return "Super Admin";
    if (isPureAdmin)  return "Administrator";
    if (teacher)      return teacher.subjects?.slice(0, 2).join(", ") || "Teacher";
    return profile?.role?.toUpperCase();
  };

  const getUserBadge = () => {
    if (isSuperAdmin) return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex items-center gap-1"><Shield size={12} />Super Admin</span>;
    if (isPureAdmin)  return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold flex items-center gap-1"><UserCog size={12} />Admin</span>;
    if (teacher)      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>Teacher</span>;
    if (isParent())   return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Parent</span>;
    return null;
  };

  // ── parent bottom-nav items (mobile) ─────────────────────────────────────
  const parentBottomNav = [
    { icon: LayoutDashboard, label: "Home",       page: "home"               },
    { icon: UserCircle,      label: "My Child",   page: "my-child"           },
    hasFeature("parent_grades")     && { icon: Award,          label: "Grades",     page: "grading"            },
    hasFeature("parent_homework")   && { icon: ClipboardList,  label: "Homework",   page: "homework"           },
    hasFeature("parent_attendance") && { icon: CalendarCheck,  label: "Attendance", page: "parent-attendance"  },
  ].filter(Boolean).slice(0, 5);

  // ── sidebar nav content ──────────────────────────────────────────────────
  const SidebarNav = () => (
    <nav className="space-y-1">
      {isParent() ? (
        <>
          <NavItem icon={LayoutDashboard} label="Dashboard"   page="home" />
          <NavItem icon={UserCircle}      label="My Child"    page="my-child" />
          {hasFeature("parent_grades")     && <NavItem icon={Award}         label="Grades"       page="grading" />}
          {hasFeature("parent_attendance") && <NavItem icon={CalendarCheck} label="Attendance"   page="parent-attendance" />}
          {hasFeature("parent_calendar")   && <NavItem icon={Calendar}      label="Calendar"     page="parent-calendar" />}
          <NavItem icon={CalendarDays}    label="Daily View"  page="parent-daily" />
          {hasFeature("parent_homework")   && <NavItem icon={ClipboardList} label="Homework"     page="homework" />}
          <NavItem icon={Settings}        label="Settings"    page="settings" />
        </>
      ) : isSuperAdmin ? (
        <>
          <NavItem icon={Home}            label="Teacher Home"      page="home" />
          <NavItem icon={LayoutDashboard} label="Admin Dashboard"   page="admin-dashboard" />
          <div className="border-t border-gray-200 my-3" />
          {hasFeature("schedule")        && <NavItem icon={Clock}          label="My Schedule"     page="schedule" />}
          {hasFeature("calendar")        && <NavItem icon={Calendar}       label="Calendar"         page="teacher-calendar" />}
          {hasFeature("admin_calendar")  && <NavItem icon={CalendarDays}   label="School Calendar"  page="admin-calendar" />}
          {hasFeature("tasks")           && <NavItem icon={CheckSquare}    label="My Tasks"         page="tasks" />}
          {hasFeature("homework")        && <NavItem icon={BookMarked}     label="Homework"         page="homework" />}
          <NavItem icon={Activity}        label="Activity Tracker"  page="activity" />
          {hasFeature("grading")         && <NavItem icon={GraduationCap} label="Grading"           page="grading" />}
          {teacher?.class_teacher_for && hasFeature("daily_overview") && <NavItem icon={ClipboardCheck} label="Daily Overview" page="daily-overview" />}
          {hasFeature("test_maker")      && <NavItem icon={FileText}      label="Test Maker"        page="test-maker" />}
          <div className="border-t border-gray-200 my-3" />
          {hasFeature("management")      && <NavItem icon={Users}         label="Management"        page="management" />}
          {hasFeature("admissions")      && <NavItem icon={UserPlus}      label="Admissions"        page="admissions" />}
          <NavItem icon={CalendarRange}   label="Timetable"         page="timetable" />
          <NavItem icon={Settings}        label="Settings"          page="settings" />
        </>
      ) : isPureAdmin ? (
        <>
          <NavItem icon={LayoutDashboard} label="Dashboard"      page="home" />
          {hasFeature("admin_calendar")  && <NavItem icon={CalendarDays}  label="School Calendar" page="admin-calendar" />}
          {hasFeature("management")      && <NavItem icon={Users}         label="Management"      page="management" />}
          {hasFeature("admissions")      && <NavItem icon={UserPlus}      label="Admissions"      page="admissions" />}
          {hasFeature("reports")         && <NavItem icon={BarChart3}     label="Reports"         page="reports" />}
          <NavItem icon={CalendarRange}   label="Timetable"       page="timetable" />
          <NavItem icon={Settings}        label="Settings"        page="settings" />
        </>
      ) : (
        <>
          <NavItem icon={Home}            label="Home"         page="home" />
          {hasFeature("schedule")        && <NavItem icon={Clock}          label="My Schedule"  page="schedule" />}
          {hasFeature("calendar")        && <NavItem icon={Calendar}       label="Calendar"     page="teacher-calendar" />}
          {hasFeature("tasks")           && <NavItem icon={CheckSquare}    label="My Tasks"     page="tasks" />}
          {hasFeature("homework")        && <NavItem icon={BookMarked}     label="Homework"     page="homework" />}
          {hasFeature("grading")         && <NavItem icon={GraduationCap} label="Grading"      page="grading" />}
          {teacher?.class_teacher_for && hasFeature("daily_overview") && <NavItem icon={ClipboardCheck} label="Daily Overview" page="daily-overview" />}
          {hasFeature("test_maker")      && <NavItem icon={FileText}      label="Test Maker"   page="test-maker" />}
          <NavItem icon={Settings}        label="Settings"     page="settings" />
        </>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(to bottom right, ${primaryColor}08, ${primaryColor}03)` }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b-2 shadow-md sticky top-0 z-50" style={{ borderColor: primaryColor }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 md:py-3">
          <div className="flex justify-between items-center">

            {/* Left: hamburger (mobile) + logo */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Hamburger — hidden on desktop */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Menu size={20} />
              </button>

              {/* Logo */}
              <div className="w-9 h-9 md:w-12 md:h-12 flex-shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={schoolName} className="w-full h-full rounded-xl object-contain bg-white shadow-sm" />
                ) : (
                  <div className="w-full h-full rounded-xl flex items-center justify-center text-white font-bold text-base md:text-lg shadow-lg" style={{ backgroundColor: primaryColor }}>
                    {schoolName?.charAt(0) || "S"}
                  </div>
                )}
              </div>

              {/* School name */}
              <div>
                <h1 className="text-sm md:text-lg font-bold text-gray-900 leading-tight">{schoolName || "School"}</h1>
                <p className="hidden sm:block text-xs font-medium" style={{ color: primaryColor }}>{tagline || "Digital Learning Management"}</p>
              </div>
            </div>

            {/* Right: user info + avatar */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="hidden sm:block text-right border-r border-gray-300 pr-3">
                <p className="text-sm font-semibold text-gray-900">{teacher?.full_name || profile?.full_name || "User"}</p>
                {getUserBadge()}
              </div>

              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all shadow-md text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <User size={18} />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[60]">
                    <div className="p-3 border-b" style={{ backgroundColor: `${primaryColor}10` }}>
                      <p className="text-xs text-gray-500 font-medium">{getUserRole()}</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{teacher?.full_name || profile?.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <button onClick={handleSignOut} className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors">
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

      {/* ── MOBILE SIDEBAR OVERLAY (all roles) ─────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          {/* drawer */}
          <div
            className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: `${primaryColor}25` }}>
              <div className="flex items-center gap-3">
                {logoUrl
                  ? <img src={logoUrl} alt={schoolName} className="w-9 h-9 rounded-xl object-contain" />
                  : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: primaryColor }}>{schoolName?.charAt(0) || "S"}</div>
                }
                <div>
                  <p className="font-bold text-gray-900 text-sm leading-tight">{schoolName}</p>
                  <p className="text-xs" style={{ color: primaryColor }}>{teacher?.full_name || profile?.full_name}</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            {/* nav items */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <SidebarNav />
            </div>

            {/* drawer footer */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-sm font-medium">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN LAYOUT ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6 md:flex md:gap-6">

        {/* Desktop sidebar (hidden on mobile) */}
        <aside
          className="hidden md:block w-64 flex-shrink-0 bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-24 border"
          style={{ borderColor: `${primaryColor}30` }}
        >
          <SidebarNav />
        </aside>

        {/* Main content */}
        <main className={`flex-1 min-w-0 overflow-hidden ${isParent() ? "pb-24 md:pb-0" : ""}`}>
          {renderPage()}
        </main>
      </div>

      {/* ── PARENT BOTTOM NAV (mobile only) ────────────────────────────────── */}
      {isParent() && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-2xl"
          style={{ borderColor: `${primaryColor}20` }}
        >
          <div className="flex items-stretch">
            {parentBottomNav.map(({ icon: Icon, label, page }) => {
              const active = currentPage === page || (page === "home" && currentPage === "home");
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 transition-colors"
                  style={{ color: active ? primaryColor : '#9ca3af' }}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium leading-tight">{label}</span>
                  {active && (
                    <span className="absolute top-0 left-0 right-0 h-0.5 rounded-b-full" style={{ backgroundColor: primaryColor }} />
                  )}
                </button>
              );
            })}
            {/* "More" button to open slide-in drawer for other pages */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 text-gray-400 transition-colors"
            >
              <Menu size={22} strokeWidth={1.8} />
              <span className="text-[10px] font-medium leading-tight">More</span>
            </button>
          </div>
        </nav>
      )}

      {/* Click-outside to close profile dropdown — z-[45] sits above page but below header z-50 */}
      {profileMenuOpen && (
        <div className="fixed inset-0 z-[45]" onClick={() => setProfileMenuOpen(false)} />
      )}
    </div>
  );
};

// ============================================================================
// FeatureDisabled
// ============================================================================
const FeatureDisabled = ({ feature }) => {
  const { primaryColor } = useBranding();
  return (
    <div className="flex items-center justify-center py-20 px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
          <Settings size={40} style={{ color: primaryColor }} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{feature} Not Available</h2>
        <p className="text-gray-600">This feature is not enabled for your school. Contact your administrator.</p>
      </div>
    </div>
  );
};

export default SchoolApp;
