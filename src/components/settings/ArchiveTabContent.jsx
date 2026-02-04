import React, { useState } from 'react';
import { Archive, Download, Calendar, FileSpreadsheet, Trash2 } from 'lucide-react';
import { supabase } from '../../infrastructure/supabaseClient';

const ArchiveTabContent = () => {
  const [isArchiving, setIsArchiving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');

  const handleArchiveYear = async () => {
    const currentYear = '2025-26';
    const nextYear = '2026-27';
    const previousYear = '2024-25';

    const { data: currentStudents, error: checkError } = await supabase
      .from('students')
      .select('id')
      .eq('school_year', currentYear)
      .eq('status', 'active');

    if (checkError) {
      setExportError('Failed to check students: ' + checkError.message);
      return;
    }

    if (!currentStudents || currentStudents.length === 0) {
      setExportError(`No active ${currentYear} students found. Archive already completed?`);
      return;
    }

    if (!window.confirm(
      `This will:\n` +
      `• Archive ${previousYear} students\n` +
      `• Promote ${currentStudents.length} students: ${currentYear} → ${nextYear}\n` +
      `• Graduate Y9 students\n\n` +
      'This can only be run ONCE per year. Continue?'
    )) {
      return;
    }

    setIsArchiving(true);
    setExportError('');
    setExportSuccess('');

    try {
      await supabase
        .from('students')
        .update({ status: 'archived' })
        .eq('school_year', previousYear);

      const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('school_year', currentYear)
        .eq('status', 'active');

      const updates = [];
      const graduations = [];

      students.forEach(student => {
        const className = student.class_name;
        const yearMatch = className.match(/Y(\d+)/);
        if (!yearMatch) return;
        
        const currentYearNum = parseInt(yearMatch[1]);
        
        if (currentYearNum === 9) {
          graduations.push(student.id);
        } else {
          const nextYearNum = currentYearNum + 1;
          const sectionLetter = className.match(/[A-Z]$/)?.[0] || '';
          const newClassName = `Y${nextYearNum}${sectionLetter}`;
          
          updates.push({
            id: student.id,
            class_name: newClassName,
            school_year: nextYear
          });
        }
      });

      if (graduations.length > 0) {
        await supabase
          .from('students')
          .update({ 
            status: 'graduated',
            school_year: currentYear
          })
          .in('id', graduations);
      }

      for (const update of updates) {
        await supabase
          .from('students')
          .update({ 
            class_name: update.class_name,
            school_year: update.school_year,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
      }

      setExportSuccess(
        `Archive completed:\n` +
        `• Archived ${previousYear} students\n` +
        `• Graduated ${graduations.length} Y9 students\n` +
        `• Promoted ${updates.length} students to ${nextYear}`
      );
      
      setTimeout(() => setExportSuccess(''), 10000);
    } catch (err) {
      console.error('Error archiving:', err);
      setExportError(err.message || 'Failed to archive');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setExportError('');
    setExportSuccess('');

    try {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('school_year', { ascending: false })
        .order('class_name', { ascending: true })
        .order('student_no', { ascending: true });

      if (studentsError) throw studentsError;

      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .order('date', { ascending: false });

      if (gradesError) throw gradesError;

      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .order('date_key', { ascending: false });

      if (attendanceError) throw attendanceError;

      const studentHeaders = [
        'Student No', 'Name', 'Class', 'Email', 'Parent Contact', 
        'Date of Birth', 'School Year', 'Status', 'Notes', 'Created At'
      ];
      const studentCsv = [
        studentHeaders.join(','),
        ...students.map(s => [
          s.student_no,
          `"${s.name}"`,
          s.class_name,
          s.email || '',
          s.parent_contact || '',
          s.date_of_birth || '',
          s.school_year || '',
          s.status || 'active',
          s.notes ? `"${s.notes.replace(/"/g, '""')}"` : '',
          new Date(s.created_at).toISOString()
        ].join(','))
      ].join('\n');

      const gradeHeaders = [
        'Student ID', 'Student Name', 'Class', 'Subject', 
        'Assessment Type', 'Assessment Title', 'Grade', 'Max Grade', 
        'Date', 'Notes', 'Created At'
      ];
      const gradeRows = grades.map(g => {
        const student = students.find(s => s.id === g.student_id);
        return [
          g.student_id,
          student ? `"${student.name}"` : '',
          g.class_name,
          g.subject,
          g.assessment_type,
          `"${g.assessment_title}"`,
          g.grade,
          g.max_grade,
          g.date,
          g.notes ? `"${g.notes.replace(/"/g, '""')}"` : '',
          new Date(g.created_at).toISOString()
        ].join(',');
      });
      const gradeCsv = [gradeHeaders.join(','), ...gradeRows].join('\n');

      const attendanceHeaders = [
        'Date', 'Class ID', 'Student ID', 'Student Name', 
        'Status', 'Comment', 'Created At'
      ];
      const attendanceRows = attendance.map(a => {
        const student = students.find(s => s.id === a.student_id);
        return [
          a.date_key,
          a.class_id,
          a.student_id,
          student ? `"${student.name}"` : '',
          a.status,
          a.comment ? `"${a.comment.replace(/"/g, '""')}"` : '',
          new Date(a.created_at).toISOString()
        ].join(',');
      });
      const attendanceCsv = [attendanceHeaders.join(','), ...attendanceRows].join('\n');

      const timestamp = new Date().toISOString().split('T')[0];
      
      downloadCsv(studentCsv, `students_${timestamp}.csv`);
      setTimeout(() => downloadCsv(gradeCsv, `grades_${timestamp}.csv`), 500);
      setTimeout(() => downloadCsv(attendanceCsv, `attendance_${timestamp}.csv`), 1000);

      setExportSuccess(
        `Exported successfully!\n` +
        `• ${students.length} students\n` +
        `• ${grades.length} grades\n` +
        `• ${attendance.length} attendance records`
      );
      setTimeout(() => setExportSuccess(''), 5000);
    } catch (err) {
      console.error('Error exporting data:', err);
      setExportError(err.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllStudents = async () => {
    const confirmText = prompt(
      'WARNING: This will permanently delete ALL students and related data!\n\n' +
      'Type "DELETE ALL STUDENTS" to confirm:'
    );

    if (confirmText !== 'DELETE ALL STUDENTS') {
      return;
    }

    setIsExporting(true);
    setExportError('');
    setExportSuccess('');

    try {
      const { error: attendanceError } = await supabase
        .from('attendance')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (attendanceError) throw attendanceError;

      const { error: gradesError } = await supabase
        .from('grades')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (gradesError) throw gradesError;

      const { error: studentsError } = await supabase
        .from('students')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (studentsError) throw studentsError;

      setExportSuccess('All students and related data deleted successfully!');
      setTimeout(() => setExportSuccess(''), 5000);
    } catch (err) {
      console.error('Error deleting students:', err);
      setExportError(err.message || 'Failed to delete students');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCsv = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Archive Year */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Archive size={20} className="text-emerald-600" />
          Archive Previous School Year
        </h3>

        <p className="text-gray-600 mb-4">
          End the current school year (2025-26). This will:
          <br/>• Graduate Year 9 students
          <br/>• Promote all other students to next year (2026-27)
          <br/>• Archive any remaining 2024-25 students
          <br/><strong>⚠️ This should only be run ONCE at the end of the school year!</strong>
        </p>

        <button
          onClick={handleArchiveYear}
          disabled={isArchiving}
          className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Calendar size={18} />
          {isArchiving ? 'Archiving...' : 'Promote 2025-26 → 2026-27 (End Year)'}
        </button>

        {exportError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-red-700 flex-1 whitespace-pre-line">{exportError}</p>
          </div>
        )}

        {exportSuccess && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <p className="text-sm text-emerald-700 flex-1 whitespace-pre-line">{exportSuccess}</p>
          </div>
        )}
      </div>

      {/* Export Data */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Download size={20} className="text-emerald-600" />
          Export All Data
        </h3>

        <p className="text-gray-600 mb-4">
          Export all student data to CSV files for backup or external processing.
        </p>

        <button
          onClick={handleExportData}
          disabled={isExporting}
          className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <FileSpreadsheet size={18} />
          {isExporting ? 'Exporting...' : 'Export to CSV'}
        </button>
      </div>

      {/* Delete All Students - DANGER ZONE */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-300">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Trash2 size={20} className="text-red-600" />
          Danger Zone
        </h3>

        <p className="text-gray-600 mb-4">
          Permanently delete ALL students and their data (grades, attendance). 
          This action cannot be undone!
        </p>

        <button
          onClick={handleDeleteAllStudents}
          disabled={isExporting}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Trash2 size={18} />
          {isExporting ? 'Deleting...' : 'Delete All Students'}
        </button>
      </div>

      {/* Warning */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-sm text-orange-800">
          <strong>⚠️ Warning:</strong> Archiving is permanent and cannot be undone. 
          Make sure to export your data before archiving if you need a backup.
        </p>
      </div>
    </div>
  );
};

export default ArchiveTabContent;