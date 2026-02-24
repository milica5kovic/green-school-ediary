import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentSchoolId } from '../infrastructure/supabaseClient';

// Servisi
import { AttendanceService } from '../../school/features/attendance/services/attendanceService';
import { ClassService } from '../../school/features/dashboard/services/classService';
import { StudentsService } from '../../school/features/students/services/studentService';
import GradingService from '../../school/features/grading/services/gradingService'; // DEFAULT IMPORT
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
  const [currentPage, setCurrentPage] = useState('home');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [services] = useState(() => {
    console.log('✅ Initializing services...');
    const schoolId = getCurrentSchoolId();
    if (schoolId) console.log('🏫 Services filtering by school_id:', schoolId);
    
    return {
      attendance: new AttendanceService(supabase),
      classes: new ClassService(supabase),
      students: new StudentsService(supabase),
      grading: new GradingService(),
      schedule: new ScheduleService(supabase),
      todos: new TodoService(supabase),
      parents: new ParentService(supabase),
    };
  });

  console.log('✅ App services initialized (including ParentService)');

  const loadAllStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📚 Loading all students...');
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

  const value = {
    currentPage, setCurrentPage,
    students, setStudents, loadAllStudents, refreshStudent, addStudent, updateStudent, deleteStudent,
    getStudentsByClass, getAllClasses,
    services,
    attendanceService: services.attendance,
    classService: services.classes,
    studentsService: services.students,
    gradingService: services.grading,
    scheduleService: services.schedule,
    todoService: services.todos,
    parentService: services.parents,
    loading, error,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;