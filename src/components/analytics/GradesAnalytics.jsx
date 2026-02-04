import React, { useState, useEffect, useCallback } from 'react';
import { Download, TrendingUp, Award, AlertTriangle, User, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const GradesAnalytics = () => {
  const { supabase, studentsService } = useApp();
  const { teacher, isAdmin } = useAuth();

  // Filters
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3); // Last 3 months
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  // Data
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load grades when filters change
  useEffect(() => {
    loadGrades();
  }, [selectedClass, selectedSubject, selectedStudent, fromDate, toDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load students
      const allStudents = await studentsService.getAllStudents();
      setStudents(allStudents);

      // Load classes
      const { data: classesData } = await supabase
        .from('custom_classes')
        .select('*')
        .eq('is_active', true)
        .order('class_name');
      setClasses(classesData || []);

      // Load subjects
      const { data: subjectsData } = await supabase
        .from('custom_subjects')
        .select('*')
        .eq('is_active', true)
        .order('subject_name');
      setSubjects(subjectsData || []);

      // Load teachers
      const { data: teachersData } = await supabase
        .from('teachers')
        .select('*')
        .order('full_name');
      setTeachers(teachersData || []);

    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGrades = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('grades')
        .select('*')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date', { ascending: true });

      // Filter by class
      if (selectedClass !== 'all') {
        query = query.eq('class_name', selectedClass);
      }

      // Filter by subject
      if (selectedSubject !== 'all') {
        query = query.eq('subject', selectedSubject);
      }

      // Filter by student
      if (selectedStudent !== 'all') {
        query = query.eq('student_id', selectedStudent);
      }

      const { data, error } = await query;
      if (error) throw error;

      setGrades(data || []);
    } catch (error) {
      console.error('Error loading grades:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    if (grades.length === 0) {
      return {
        average: 0,
        highest: 0,
        lowest: 0,
        total: 0
      };
    }

    const percentages = grades.map(g => (parseFloat(g.grade) / parseFloat(g.max_grade)) * 100);
    const average = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);

    return {
      average: average.toFixed(1),
      highest: highest.toFixed(1),
      lowest: lowest.toFixed(1),
      total: grades.length
    };
  };

  // Grade distribution data
  const getGradeDistribution = () => {
    const ranges = [
      { name: '90-100%', min: 90, max: 100, count: 0, color: '#10b981' },
      { name: '80-89%', min: 80, max: 89, count: 0, color: '#3b82f6' },
      { name: '70-79%', min: 70, max: 79, count: 0, color: '#f59e0b' },
      { name: '60-69%', min: 60, max: 69, count: 0, color: '#ef4444' },
      { name: '0-59%', min: 0, max: 59, count: 0, color: '#991b1b' }
    ];

    grades.forEach(g => {
      const percentage = (parseFloat(g.grade) / parseFloat(g.max_grade)) * 100;
      const range = ranges.find(r => percentage >= r.min && percentage <= r.max);
      if (range) range.count++;
    });

    return ranges;
  };

  // Trend over time
  const getTrendData = () => {
    const dateMap = {};

    grades.forEach(g => {
      const date = new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const percentage = (parseFloat(g.grade) / parseFloat(g.max_grade)) * 100;

      if (!dateMap[date]) {
        dateMap[date] = { date, grades: [] };
      }
      dateMap[date].grades.push(percentage);
    });

    return Object.values(dateMap)
      .map(d => ({
        date: d.date,
        average: (d.grades.reduce((sum, g) => sum + g, 0) / d.grades.length).toFixed(1)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Subject comparison
  const getSubjectComparison = () => {
    const subjectMap = {};

    grades.forEach(g => {
      const percentage = (parseFloat(g.grade) / parseFloat(g.max_grade)) * 100;

      if (!subjectMap[g.subject]) {
        subjectMap[g.subject] = { subject: g.subject, grades: [] };
      }
      subjectMap[g.subject].grades.push(percentage);
    });

    return Object.values(subjectMap)
      .map(s => ({
        subject: s.subject,
        average: (s.grades.reduce((sum, g) => sum + g, 0) / s.grades.length).toFixed(1)
      }))
      .sort((a, b) => b.average - a.average);
  };

  // Teacher comparison (by class_teacher_for)
  const getTeacherComparison = () => {
    const teacherMap = {};

    // Map class teachers
    teachers.forEach(t => {
      if (t.class_teacher_for) {
        teacherMap[t.class_teacher_for] = {
          teacher: t.full_name,
          class: t.class_teacher_for,
          grades: []
        };
      }
    });

    // Aggregate grades by class
    grades.forEach(g => {
      if (teacherMap[g.class_name]) {
        const percentage = (parseFloat(g.grade) / parseFloat(g.max_grade)) * 100;
        teacherMap[g.class_name].grades.push(percentage);
      }
    });

    return Object.values(teacherMap)
      .filter(t => t.grades.length > 0)
      .map(t => ({
        teacher: t.teacher,
        class: t.class,
        average: (t.grades.reduce((sum, g) => sum + g, 0) / t.grades.length).toFixed(1),
        count: t.grades.length
      }))
      .sort((a, b) => b.average - a.average);
  };

  // Top performers
  const getTopPerformers = () => {
    const studentMap = {};

    grades.forEach(g => {
      const percentage = (parseFloat(g.grade) / parseFloat(g.max_grade)) * 100;

      if (!studentMap[g.student_id]) {
        const student = students.find(s => s.id === g.student_id);
        studentMap[g.student_id] = {
          id: g.student_id,
          name: student?.name || 'Unknown',
          class: student?.class_name || 'N/A',
          grades: []
        };
      }
      studentMap[g.student_id].grades.push(percentage);
    });

    return Object.values(studentMap)
      .map(s => ({
        ...s,
        average: (s.grades.reduce((sum, g) => sum + g, 0) / s.grades.length).toFixed(1)
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 10);
  };

  // Students needing support
  const getStudentsNeedingSupport = () => {
    const studentMap = {};

    grades.forEach(g => {
      const percentage = (parseFloat(g.grade) / parseFloat(g.max_grade)) * 100;

      if (!studentMap[g.student_id]) {
        const student = students.find(s => s.id === g.student_id);
        studentMap[g.student_id] = {
          id: g.student_id,
          name: student?.name || 'Unknown',
          class: student?.class_name || 'N/A',
          grades: []
        };
      }
      studentMap[g.student_id].grades.push(percentage);
    });

    return Object.values(studentMap)
      .map(s => ({
        ...s,
        average: (s.grades.reduce((sum, g) => sum + g, 0) / s.grades.length).toFixed(1)
      }))
      .filter(s => s.average < 60)
      .sort((a, b) => a.average - b.average);
  };

  // Individual student deep dive
  const getStudentDeepDive = () => {
    if (selectedStudent === 'all') return null;

    const student = students.find(s => s.id === selectedStudent);
    if (!student) return null;

    const studentGrades = grades.filter(g => g.student_id === selectedStudent);

    // By subject breakdown
    const bySubject = {};
    studentGrades.forEach(g => {
      const percentage = (parseFloat(g.grade) / parseFloat(g.max_grade)) * 100;
      if (!bySubject[g.subject]) {
        bySubject[g.subject] = { subject: g.subject, grades: [] };
      }
      bySubject[g.subject].grades.push(percentage);
    });

    const subjectBreakdown = Object.values(bySubject).map(s => ({
      subject: s.subject,
      average: (s.grades.reduce((sum, g) => sum + g, 0) / s.grades.length).toFixed(1),
      count: s.grades.length
    }));

    // Trend over time
    const trendData = studentGrades
      .map(g => ({
        date: new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        grade: ((parseFloat(g.grade) / parseFloat(g.max_grade)) * 100).toFixed(1),
        subject: g.subject,
        title: g.assessment_title
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const overall = studentGrades.length > 0
      ? (studentGrades.reduce((sum, g) => sum + (parseFloat(g.grade) / parseFloat(g.max_grade)) * 100, 0) / studentGrades.length).toFixed(1)
      : 0;

    return {
      student,
      overall,
      subjectBreakdown,
      trendData,
      allGrades: studentGrades
    };
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const stats = calculateStats();
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Grades Analytics Report', 20, 20);
    
    // Filters
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date Range: ${fromDate} to ${toDate}`, 20, 30);
    doc.text(`Class: ${selectedClass === 'all' ? 'All Classes' : selectedClass}`, 20, 35);
    doc.text(`Subject: ${selectedSubject === 'all' ? 'All Subjects' : selectedSubject}`, 20, 40);
    
    // Stats
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Statistics', 20, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Average: ${stats.average}%`, 20, 57);
    doc.text(`Highest: ${stats.highest}%`, 20, 62);
    doc.text(`Lowest: ${stats.lowest}%`, 20, 67);
    doc.text(`Total Grades: ${stats.total}`, 20, 72);
    
    // Top Performers Table
    const topPerformers = getTopPerformers();
    if (topPerformers.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 10 Performers', 20, 82);
      
      doc.autoTable({
        startY: 87,
        head: [['Rank', 'Student', 'Class', 'Average']],
        body: topPerformers.map((s, idx) => [
          idx + 1,
          s.name,
          s.class,
          s.average + '%'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }
      });
    }
    
    // Students Needing Support
    const needSupport = getStudentsNeedingSupport();
    if (needSupport.length > 0) {
      doc.addPage();
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Students Needing Support (<60%)', 20, 20);
      
      doc.autoTable({
        startY: 25,
        head: [['Student', 'Class', 'Average']],
        body: needSupport.map(s => [
          s.name,
          s.class,
          s.average + '%'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] }
      });
    }
    
    // Subject Comparison
    const subjectComp = getSubjectComparison();
    if (subjectComp.length > 0) {
      if (needSupport.length === 0) doc.addPage();
      const startY = needSupport.length > 0 ? doc.lastAutoTable.finalY + 20 : 20;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Subject Comparison', 20, startY);
      
      doc.autoTable({
        startY: startY + 5,
        head: [['Subject', 'Average']],
        body: subjectComp.map(s => [s.subject, s.average + '%']),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Green School - Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    doc.save(`Grades_Analytics_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const stats = calculateStats();
  const distribution = getGradeDistribution();
  const trendData = getTrendData();
  const subjectComparison = getSubjectComparison();
  const teacherComparison = getTeacherComparison();
  const topPerformers = getTopPerformers();
  const needSupport = getStudentsNeedingSupport();
  const studentDeepDive = getStudentDeepDive();

  if (loading && grades.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading grades data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Filters</h3>
          <button
            onClick={exportToPDF}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Download size={18} />
            Export PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.class_name}>{c.class_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.subject_name}>{s.subject_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Students</option>
              {students
                .filter(s => selectedClass === 'all' || s.class_name === selectedClass)
                .map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.class_name})</option>
                ))
              }
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-6 shadow-lg">
          <p className="text-3xl font-bold">{stats.average}%</p>
          <p className="text-sm opacity-90 mt-1">Class Average</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-200">
          <p className="text-3xl font-bold text-green-600">{stats.highest}%</p>
          <p className="text-sm text-gray-600 mt-1">Highest Score</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-200">
          <p className="text-3xl font-bold text-red-600">{stats.lowest}%</p>
          <p className="text-sm text-gray-600 mt-1">Lowest Score</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-200">
          <p className="text-3xl font-bold text-purple-600">{stats.total}</p>
          <p className="text-sm text-gray-600 mt-1">Total Grades</p>
        </div>
      </div>

      {/* Student Deep Dive (if student selected) */}
      {studentDeepDive && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-6">
            <User size={24} className="text-purple-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">{studentDeepDive.student.name}</h3>
              <p className="text-sm text-gray-600">
                {studentDeepDive.student.class_name} • Overall Average: {studentDeepDive.overall}%
              </p>
            </div>
          </div>

          {/* Student Trend */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Grade Trend</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={studentDeepDive.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="grade" stroke="#8b5cf6" strokeWidth={2} name="Grade %" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Subject Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {studentDeepDive.subjectBreakdown.map(s => (
              <div key={s.subject} className="bg-white rounded-lg p-3 border border-purple-200">
                <p className="text-xs text-gray-500">{s.subject}</p>
                <p className="text-lg font-bold text-purple-600">{s.average}%</p>
                <p className="text-xs text-gray-400">{s.count} grades</p>
              </div>
            ))}
          </div>

          {/* All Grades Table */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">All Grades</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-100 border-b border-purple-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-purple-700">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-purple-700">Subject</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-purple-700">Assessment</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-purple-700">Grade</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-purple-700">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentDeepDive.allGrades.map(g => {
                    const percentage = ((parseFloat(g.grade) / parseFloat(g.max_grade)) * 100).toFixed(1);
                    return (
                      <tr key={g.id} className="hover:bg-purple-50">
                        <td className="px-4 py-2 text-sm">{new Date(g.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm">{g.subject}</td>
                        <td className="px-4 py-2 text-sm">{g.assessment_title}</td>
                        <td className="px-4 py-2 text-center text-sm">{g.grade}/{g.max_grade}</td>
                        <td className="px-4 py-2 text-center text-sm font-semibold">{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      {selectedStudent === 'all' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Grade Distribution */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Grade Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Number of Grades" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Trend Over Time */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Average Trend Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="average" stroke="#3b82f6" strokeWidth={2} name="Average %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subject Comparison */}
          {subjectComparison.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Subject Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average" fill="#10b981" name="Average %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Teacher Comparison */}
          {teacherComparison.length > 0 && isAdmin() && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                <Award className="inline mr-2" size={20} />
                Teacher Class Comparison
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={teacherComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="teacher" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average" fill="#8b5cf6" name="Class Average %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Performers */}
          {topPerformers.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Award size={20} className="text-green-600" />
                Top 10 Performers
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-green-50 border-b border-green-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-700">Rank</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-700">Student</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-700">Class</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-green-700">Grades</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-green-700">Average</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topPerformers.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-green-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-green-600">#{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{student.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                            {student.class}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{student.grades.length}</td>
                        <td className="px-4 py-3 text-center font-bold text-green-600">{student.average}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Students Needing Support */}
          {needSupport.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-600" />
                Students Needing Support ({`<60%`})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-red-50 border-b border-red-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-red-700">Student</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-red-700">Class</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-red-700">Grades</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-red-700">Average</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {needSupport.map(student => (
                      <tr key={student.id} className="hover:bg-red-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-800">{student.name}</td>
                        <td className="px-4 py-3">
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                            {student.class}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{student.grades.length}</td>
                        <td className="px-4 py-3 text-center font-bold text-red-600">{student.average}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* No Data Message */}
      {grades.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No grades found for the selected filters</p>
          <p className="text-sm text-gray-400 mt-2">Try adjusting your date range or filters</p>
        </div>
      )}
    </div>
  );
};

export default GradesAnalytics;