import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tenantSupabase, getCurrentSchoolId } from '../infrastructure/supabaseClient';

// Servisi
import { AttendanceService } from '../../school/features/attendance/services/attendanceService';
import { ClassService } from '../../school/features/dashboard/services/classService';
import { StudentsService } from '../../school/features/students/services/studentService';
import GradingService from '../../school/features/grading/services/gradingService';
import { ScheduleService } from '../../school/features/schedule/services/scheduleService';
import { TodoService } from '../../school/features/tasks/services/todoService';
import { ParentService } from '../../school/features/parents/services/parentService';

const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  // ============================================================================
  // STATE
  // ============================================================================
  const [currentPage, setCurrentPage] = useState('home');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Date state za HomePage i druge komponente
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ============================================================================
  // DATE HELPERS
  // ============================================================================
  
  /**
   * Convert Date to string key format: YYYY-MM-DD
   */
  const getDateKey = useCallback((date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  /**
   * Get day name from date
   */
  const getDayName = useCallback((date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
    }).format(new Date(date));
  }, []);

  /**
   * Navigate to previous day
   */
  const goToPreviousDay = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }, []);

  /**
   * Navigate to next day
   */
  const goToNextDay = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  }, []);

  /**
   * Go to today
   */
  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // ============================================================================
  // SERVICES - Using tenantSupabase for automatic school_id filtering
  // ============================================================================
  
  const [services] = useState(() => {
    console.log('✅ Initializing services with tenant-aware client...');
    const schoolId = getCurrentSchoolId();
    if (schoolId) {
      console.log('🏫 Services will filter by school_id:', schoolId);
    } else {
      console.log('⚠️ No school_id set yet - services will filter when tenant is set');
    }
    
    // CRITICAL: Pass tenantSupabase to all services
    // This ensures all queries automatically include school_id filter
    return {
      attendance: new AttendanceService(tenantSupabase),
      classes: new ClassService(tenantSupabase),
      students: new StudentsService(tenantSupabase),
      grading: new GradingService(tenantSupabase),
      schedule: new ScheduleService(tenantSupabase),
      todos: new TodoService(tenantSupabase),
      parents: new ParentService(tenantSupabase),
    };
  });

  console.log('✅ App services initialized (tenant-aware)');

  // ============================================================================
  // STUDENT OPERATIONS
  // ============================================================================

  const loadAllStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const schoolId = getCurrentSchoolId();
      console.log('📚 Loading students for school:', schoolId || 'NO SCHOOL SET');
      
      if (!schoolId) {
        console.log('⚠️ No school_id, skipping student load');
        setStudents([]);
        setLoading(false);
        return;
      }
      
      const data = await services.students.getAllStudents();
      console.log(`✅ Loaded ${data?.length || 0} students`);
      setStudents(data || []);
    } catch (err) {
      console.error('❌ Error loading students:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [services]);

  // Load students when component mounts
  useEffect(() => {
    const timer = setTimeout(() => loadAllStudents(), 100);
    return () => clearTimeout(timer);
  }, [loadAllStudents]);

  const getStudentsByClass = useCallback(() => {
    return students.reduce((acc, student) => {
      const className = student.class_name || 'Unassigned';
      if (!acc[className]) acc[className] = [];
      acc[className].push(student);
      return acc;
    }, {});
  }, [students]);

  const getAllClasses = useCallback(() => {
    return [...new Set(students.map(s => s.class_name).filter(Boolean))].sort();
  }, [students]);

  const refreshStudent = useCallback(async (studentId) => {
    try {
      const updated = await services.students.getStudentById(studentId);
      if (updated) setStudents(prev => prev.map(s => s.id === studentId ? updated : s));
    } catch (err) {
      console.error('Error refreshing student:', err);
    }
  }, [services]);

  const addStudent = useCallback(async (studentData) => {
    const newStudent = await services.students.addStudent(studentData);
    setStudents(prev => [...prev, newStudent]);
    return newStudent;
  }, [services]);

  const updateStudent = useCallback(async (studentId, studentData) => {
    const updated = await services.students.updateStudent(studentId, studentData);
    setStudents(prev => prev.map(s => s.id === studentId ? updated : s));
    return updated;
  }, [services]);

  const deleteStudent = useCallback(async (studentId) => {
    await services.students.deleteStudent(studentId);
    setStudents(prev => prev.filter(s => s.id !== studentId));
  }, [services]);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value = {
    // ⭐ SUPABASE CLIENT - tenant-aware, for components that need direct access
    supabase: tenantSupabase,
    
    // Page navigation
    currentPage, 
    setCurrentPage,
    
    // Date management
    selectedDate,
    setSelectedDate,
    getDateKey,
    getDayName,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    
    // Students
    students, 
    setStudents, 
    loadAllStudents, 
    refreshStudent, 
    addStudent, 
    updateStudent, 
    deleteStudent,
    getStudentsByClass, 
    getAllClasses,
    
    // Services (all tenant-aware)
    services,
    attendanceService: services.attendance,
    classService: services.classes,
    studentsService: services.students,
    gradingService: services.grading,
    scheduleService: services.schedule,
    todoService: services.todos,
    parentService: services.parents,
    
    // Loading state
    loading, 
    error,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;