import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { tenantSupabase, getCurrentSchoolId } from '../infrastructure/supabaseClient';
import { useTenant } from './TenantContext';

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
  // GET TENANT INFO - This ensures we wait for school to load
  // ============================================================================
  const { school, schoolId, loading: tenantLoading, isSchool } = useTenant();
  
  // ============================================================================
  // STATE
  // ============================================================================
  const [currentPage, setCurrentPage] = useState('home');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Date state za HomePage i druge komponente
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ============================================================================
  // DATE HELPERS
  // ============================================================================
  
  const getDateKey = useCallback((date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const getDayName = useCallback((date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
    }).format(new Date(date));
  }, []);

  const goToPreviousDay = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // ============================================================================
  // SERVICES - Recreate when schoolId changes
  // ============================================================================
  
  const services = useMemo(() => {
    console.log('🔧 Creating services with schoolId:', schoolId || 'none');
    
    // Pass tenantSupabase to all services
    // tenantSupabase will automatically filter by currentSchoolId
    return {
      attendance: new AttendanceService(tenantSupabase),
      classes: new ClassService(tenantSupabase),
      students: new StudentsService(tenantSupabase),
      grading: new GradingService(tenantSupabase),
      schedule: new ScheduleService(tenantSupabase),
      todos: new TodoService(tenantSupabase),
      parents: new ParentService(tenantSupabase),
    };
  }, [schoolId]); // Recreate services when schoolId changes

  // ============================================================================
  // STUDENT OPERATIONS
  // ============================================================================

  const loadAllStudents = useCallback(async () => {
    // Don't load if tenant is still loading or no school
    if (tenantLoading) {
      console.log('⏳ Waiting for tenant to load...');
      return;
    }
    
    if (!schoolId && isSchool) {
      console.log('⚠️ No schoolId yet, waiting...');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('📚 Loading students for school:', schoolId);
      
      const data = await services.students.getAllStudents();
      console.log(`✅ Loaded ${data?.length || 0} students`);
      setStudents(data || []);
      setDataLoaded(true);
    } catch (err) {
      console.error('❌ Error loading students:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [services, schoolId, tenantLoading, isSchool]);

  // Load students when schoolId becomes available
  useEffect(() => {
    // Only load when:
    // 1. Tenant is done loading
    // 2. We have a schoolId (for school tenants)
    // 3. Data hasn't been loaded yet
    if (!tenantLoading && schoolId && !dataLoaded) {
      console.log('🚀 SchoolId ready, loading students...');
      loadAllStudents();
    }
    
    // For non-school contexts (owner dashboard, marketing), just set loading to false
    if (!tenantLoading && !isSchool) {
      setLoading(false);
    }
  }, [tenantLoading, schoolId, dataLoaded, loadAllStudents, isSchool]);

  // Reset dataLoaded when schoolId changes (e.g., switching schools)
  useEffect(() => {
    setDataLoaded(false);
  }, [schoolId]);

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
    // ⭐ SUPABASE CLIENT - tenant-aware
    supabase: tenantSupabase,
    
    // School info (from TenantContext)
    school,
    schoolId,
    
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
    loading: loading || tenantLoading, 
    error,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;