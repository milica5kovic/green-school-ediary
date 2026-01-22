import React, { createContext, useContext, useState, useEffect } from 'react';
import AttendanceService from '../domain/services/attendanceService';
import HomeworkService from '../domain/services/homeworkService';
import StudentService from '../domain/services/studentService';
import GradingService from '../domain/services/gradingService';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Services (singleton pattern)
  const [attendanceService] = useState(() => new AttendanceService());
  const [homeworkService] = useState(() => new HomeworkService());
  const [gradingService] = useState(() => new GradingService());
  const [studentService] = useState(() => new StudentService());

  
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  
  const [studentsDb, setStudentsDb] = useState({});

  // Load students on 
  useEffect(() => {
    loadAllStudents();
  }, []);

  const loadAllStudents = async () => {
    try {
      setLoading(true);
      const classes = ['Y5A', 'Y5B', 'Y6A', 'Y7C'];
      const studentsData = {};

      for (const className of classes) {
        const students = await studentService.getStudentsByClass(className);
        studentsData[className] = students;
      }

      setStudentsDb(studentsData);
    } catch (err) {
      console.error('Error loading students:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getDayName = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
    loadAllStudents,

    // Services
    attendanceService,
    homeworkService,
    gradingService,
    studentService,

    // Helpers
    getDateKey,
    getDayName,
    formatDate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};