import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";

import { supabase } from "../infrastructure/supabaseClient";

import { AttendanceService } from '../../features/attendance/services/attendanceService';
import { ClassService } from '../../features/dashboard/services/classService';
import { StudentsService } from '../../features/students/services/studentService';
import GradingService from '../../features/grading/services/gradingService';

import { ScheduleService } from "../../features/schedule/services/scheduleService";
import { TodoService } from '../../features/tasks/services/todoService';
import { ParentService } from '../../features/parents/services/parentService';

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

  // ✅ USE REF instead of state to prevent re-renders
  const servicesRef = useRef(null);
  const studentsFetchInProgress = useRef(false);
  const hasInitialized = useRef(false);

  // ✅ Initialize services ONCE using useRef
  if (!servicesRef.current) {
    try {
      servicesRef.current = {
        attendance: new AttendanceService(supabase),
        class: new ClassService(supabase),
        students: new StudentsService(supabase),
        grading: new GradingService(),
        schedule: new ScheduleService(supabase),
        todo: new TodoService(supabase),
        parent: new ParentService(supabase), // ✅ NEW SERVICE
      };
      console.log("✅ App services initialized (including ParentService)");
    } catch (err) {
      console.error("❌ Service initialization failed:", err);
    }
  }

  const loadAllStudents = async () => {
    if (studentsFetchInProgress.current || !servicesRef.current?.students) {
      console.log("⏭️ Student fetch skipped");
      return;
    }

    studentsFetchInProgress.current = true;

    try {
      console.log("📚 Loading all students...");
      const allStudents = await servicesRef.current.students.getAllStudents();

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
      setError(null);
      console.log("✅ Students loaded:", Object.keys(grouped).length, "classes");
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

  // ✅ Load students ONLY ONCE on mount
  useEffect(() => {
    if (!hasInitialized.current && servicesRef.current) {
      loadAllStudents();
      hasInitialized.current = true;
    }
  }, []);

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

  // ✅ Don't render loading screen - services are initialized synchronously
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
    supabase,

    // ✅ Access services from ref
    attendanceService: servicesRef.current?.attendance,
    classService: servicesRef.current?.class,
    studentsService: servicesRef.current?.students,
    gradingService: servicesRef.current?.grading,
    scheduleService: servicesRef.current?.schedule,
    todoService: servicesRef.current?.todo,
    parentService: servicesRef.current?.parent, // ✅ NEW SERVICE

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