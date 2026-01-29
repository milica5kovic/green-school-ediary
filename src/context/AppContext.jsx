import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";

import { supabase } from "../infrastructure/supabaseClient";

import { AttendanceService } from "../domain/services/attendanceService";
import { ClassService } from "../domain/services/classService";
import { StudentsService } from "../domain/services/studentService";
import GradingService from "../domain/services/gradeService";
import { ScheduleService } from "../domain/services/scheduleService";

const AppContext = createContext(null);

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
  const [services, setServices] = useState(null);

  const studentsFetchInProgress = useRef(false);

  // Initialize domain services ONCE
  useEffect(() => {
    try {
      const servicesInstance = {
        attendance: new AttendanceService(supabase),
        class: new ClassService(supabase),
        students: new StudentsService(supabase),
        grading: new GradingService(supabase),
        schedule: new ScheduleService(supabase),
      };

      setServices(servicesInstance);
      console.log("✅ App services initialized");
    } catch (err) {
      console.error("❌ Service initialization failed:", err);
      setError("Failed to initialize application services");
    }
  }, []);

  // Load all students once services are ready
  useEffect(() => {
    if (!services?.students) return;
    loadAllStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);

  const loadAllStudents = async () => {
    if (studentsFetchInProgress.current) {
      console.log("⏭️ Student fetch already in progress");
      return;
    }

    studentsFetchInProgress.current = true;

    try {
      console.log("📚 Loading all students...");
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
        "✅ Students loaded:",
        Object.keys(grouped).length,
        "classes"
      );
    } catch (err) {
      if (err?.name === "AbortError") {
        console.warn("⚠️ Request aborted (safe to ignore)");
        return;
      }

      console.error("❌ Error loading students:", err);
      setError("Failed to load students");
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

  if (!services) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Initializing application…</p>
      </div>
    );
  }

  const value = {
    currentPage,
    setCurrentPage,
    selectedDate,
    setSelectedDate,
    loading,
    setLoading,
    error,
    setError,
    studentsDb,

    attendanceService: services.attendance,
    classService: services.class,
    studentsService: services.students,
    gradingService: services.grading,
    scheduleService: services.schedule,

    loadAllStudents,
    getDateKey,
    getDayName,
    formatDate,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
