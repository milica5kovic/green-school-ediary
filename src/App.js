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
import NavItem from "./components/shared/NavItem";
import LoadingSpinner from "./components/shared/LoadingSpinner";
import ErrorMessage from "./components/shared/ErrorMessage";
import HomePage from "./components/home/HomePage";
import HomeworkPage from "./components/homework/HomeworkPage";
import SchedulePage from "./components/schedule/SchedulePage";
import StudentsPage from "./components/students/StudentsPage";
import AttendanceLogPage from "./components/attendanceLog/AttendanceLogPage";

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

  const renderPage = () => {
    if (loading) {
      return <LoadingSpinner message="Loading..." />;
    }

    if (error) {
      return <ErrorMessage message={error} onRetry={loadAllStudents} />;
    }

    switch (currentPage) {
      case "home":
        return <HomePage />;
      case "schedule":
        return <SchedulePage />;
      case "homework":
        return <HomeworkPage />;
      case "students":
        return <StudentsPage />;
      case "grading":
        return <ComingSoonPage title="Grading" icon={BarChart3} />;
      case "attendance":
        return <AttendanceLogPage />;
      case "settings":
        return <ComingSoonPage title="Settings" icon={Settings} />;
      default:
        return <HomePage />;
    }
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
                Milica Petković
              </p>
              <p className="text-xs text-emerald-600">ICT & Mathematics</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
              MP
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-6 border border-emerald-100">
          <nav className="space-y-2">
            <NavItem icon={BookOpen} label="Home" page="home" />
            <NavItem icon={Calendar} label="My Schedule" page="schedule" />
            <NavItem icon={FileText} label="Homework" page="homework" />
            <NavItem icon={Users} label="Students" page="students" />
            <NavItem icon={BarChart3} label="Grading" page="grading" />
            <NavItem
              icon={ClipboardList}
              label="Attendance Log"
              page="attendance"
            />
            <NavItem icon={Settings} label="Settings" page="settings" />
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
