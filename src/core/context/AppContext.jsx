import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { tenantSupabase } from '../infrastructure/supabaseClient';
import { useTenant } from './TenantContext';

import { AttendanceService } from '../../school/features/attendance/services/attendanceService';
import { ClassService } from '../../school/features/dashboard/services/classService';
import { StudentsService } from '../../school/features/students/services/studentService';
import GradingService from '../../school/features/grading/services/gradingService';
import { ScheduleService } from '../../school/features/schedule/services/scheduleService';
import { TodoService } from '../../school/features/tasks/services/todoService';
import { ParentService } from '../../school/features/parents/services/parentService';
import { ReportsService } from '../../school/features/reports/services/reportsService';

const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export const AppProvider = ({ children }) => {
  const { school, schoolId, loading: tenantLoading, isSchool } = useTenant();
  
  const [currentPage, setCurrentPage] = useState('home');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(date));
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

  const services = useMemo(() => ({
    attendance: new AttendanceService(tenantSupabase, schoolId),
    classes: new ClassService(tenantSupabase, schoolId),
    students: new StudentsService(tenantSupabase, schoolId),
    grading: new GradingService(tenantSupabase, schoolId),
    schedule: new ScheduleService(tenantSupabase, schoolId),
    todos: new TodoService(tenantSupabase, schoolId),
    parents: new ParentService(tenantSupabase, schoolId),
    reports: new ReportsService(tenantSupabase),
  }), [schoolId]);

  // Clear caches when school changes
  useEffect(() => {
    if (schoolId) {
      services.grading?.clearCache?.();
      setStudents([]);
      setDataLoaded(false);
      setError(null);
    }
  }, [schoolId]);

  const loadAllStudents = useCallback(async () => {
    if (tenantLoading) return;
    if (!schoolId && isSchool) return;

    try {
      setLoading(true);
      setError(null);
      const data = await services.students.getAllStudents();
      setStudents(data || []);
      setDataLoaded(true);
    } catch (err) {
      console.error('[AppContext] Error loading students:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [services, schoolId, tenantLoading, isSchool]);

  useEffect(() => {
    if (!tenantLoading && schoolId && !dataLoaded) {
      loadAllStudents();
    }
    if (!tenantLoading && !isSchool) {
      setLoading(false);
    }
  }, [tenantLoading, schoolId, dataLoaded, loadAllStudents, isSchool]);

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

  const value = {
    supabase: tenantSupabase,
    school,
    schoolId,
    currentPage, 
    setCurrentPage,
    selectedDate,
    setSelectedDate,
    getDateKey,
    getDayName,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    students, 
    setStudents, 
    loadAllStudents, 
    refreshStudent, 
    addStudent, 
    updateStudent, 
    deleteStudent,
    getStudentsByClass, 
    getAllClasses,
    services,
    attendanceService: services.attendance,
    classService: services.classes,
    studentsService: services.students,
    gradingService: services.grading,
    scheduleService: services.schedule,
    todoService: services.todos,
    parentService: services.parents,
    loading: loading || tenantLoading, 
    error,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;