import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { createClient } from "@supabase/supabase-js";

import { AttendanceService } from "../domain/services/attendanceService";
import { ClassService } from "../domain/services/classService";
import { StudentsService } from "../domain/services/studentService";

import GradingService from "../domain/services/gradeService";
import { ScheduleService } from "../domain/services/scheduleService";

// import { GradingService } from '../services/GradingService';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [currentPage, setCurrentPage] = useState("home");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [studentsDb, setStudentsDb] = useState({});
  const [supabase, setSupabase] = useState(null);
  const [services, setServices] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const studentsFetchInProgress = useRef(false);

  // Initialize Supabase client
  useEffect(() => {
    const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
    const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error(
        "Supabase credentials missing. Please check your .env file",
      );
      setError("Database configuration missing");
      return;
    }

    try {
      const client = createClient(SUPABASE_URL, SUPABASE_KEY);
      setSupabase(client);
      console.log("Supabase client initialized successfully");

      // Initialize services
      const servicesInstance = {
        attendance: new AttendanceService(client),
        class: new ClassService(client),
        students: new StudentsService(client),
        grading: new GradingService(client),
        schedule: new ScheduleService(client),
      };

      setServices(servicesInstance);
      console.log("All services initialized successfully");
    } catch (err) {
      console.error("Error initializing Supabase:", err);
      setError("Failed to connect to database");
    }
  }, []);

  // Load all students when services are ready
  useEffect(() => {
    if (!services?.students) return;
    loadAllStudents();
  }, [services]);

  const loadAllStudents = async () => {
    if (studentsFetchInProgress.current) {
      console.log("⏭️ Student fetch already in progress, skipping");
      return;
    }

    studentsFetchInProgress.current = true;

    try {
      console.log("Loading all students...");
      const allStudents = await services.students.getAllStudents();

      const grouped = allStudents.reduce((acc, student) => {
        if (!acc[student.class_name]) {
          acc[student.class_name] = [];
        }
        acc[student.class_name].push({
          id: student.id,
          name: student.name,
          student_no: student.student_no,
          class: student.class_name,
        });
        return acc;
      }, {});

      setStudentsDb(grouped);
      console.log(
        "Students loaded successfully:",
        Object.keys(grouped).length,
        "classes",
      );
    } catch (err) {
      // 👇 THIS IS IMPORTANT
      if (err?.name === "AbortError") {
        console.warn("⚠️ Supabase aborted request (safe to ignore)");
        return;
      }

      console.error("Error loading students:", err);
      setError("Failed to load students. Please check your connection.");
    } finally {
      studentsFetchInProgress.current = false;
    }
  };

  // Date utilities
  const getDateKey = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDayName = (date) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[new Date(date).getDay()];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Don't render children until Supabase is initialized
  if (!supabase || !services) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  const value = {
    // State
    currentPage,
    setCurrentPage,
    selectedDate,
    setSelectedDate,
    loading,
    setLoading,
    error,
    setError,
    studentsDb,
    setStudentsDb,

    // Supabase & Services
    supabase,
    attendanceService: services.attendance,
    classService: services.class,
    studentsService: services.students,
    gradingService: services.grading,
    scheduleService: services.schedule,

    // Utilities
    getDateKey,
    getDayName,
    formatDate,
    loadAllStudents,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
