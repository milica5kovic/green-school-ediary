import React, { useState, useEffect, useCallback } from 'react';
import { Archive, AlertTriangle, Download, CheckCircle, ChevronRight, ChevronLeft, Trash2, Users, BookOpen, Calendar, ClipboardList, Shield, RotateCcw, GraduationCap, ArrowUpCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../../../core/context/AppContext';
import { useAuth } from '../../../core/context/AuthContext';

const CURRENT_YEAR = '2025-26';
const NEXT_YEAR = '2026-27';

const ArchiveTabContent = () => {
  const { supabase } = useApp();
  const { teacher } = useAuth();

  const [step, setStep] = useState(0); // 0=overview, 1=review, 2=promote, 3=cleanup, 4=confirm, 5=executing, 6=done
  const [stats, setStats] = useState(null);
  const [archiveHistory, setArchiveHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promotionPlan, setPromotionPlan] = useState([]);
  const [cleanupOptions, setCleanupOptions] = useState({
    deleteGrades: true,
    deleteAttendance: true,
    deleteHomework: true,
    deleteComments: true,
    deleteScheduledTests: true,
    resetTerms: true,
  });
  const [confirmText, setConfirmText] = useState('');
  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
  const [result, setResult] = useState(null);
  const [exportData, setExportData] = useState(null);

  // ─── LOAD STATS ────────────────────────────────────────

  const loadStats = useCallback(async () => {
    if (!supabase) return;
    try {
      setLoading(true);

      const [
        { count: studentsCount },
        { count: activeStudents },
        { count: gradesCount },
        { count: attendanceCount },
        { count: homeworkCount },
        { count: studentHomeworkCount },
        { count: commentsCount },
        { count: scheduledTestsCount },
        { count: termsCount },
        { data: history },
        { data: studentsByClass },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('grades').select('*', { count: 'exact', head: true }),
        supabase.from('attendance').select('*', { count: 'exact', head: true }),
        supabase.from('homework').select('*', { count: 'exact', head: true }),
        supabase.from('student_homework').select('*', { count: 'exact', head: true }),
        supabase.from('teacher_comments').select('*', { count: 'exact', head: true }),
        supabase.from('scheduled_tests').select('*', { count: 'exact', head: true }),
        supabase.from('academic_terms').select('*', { count: 'exact', head: true }),
        supabase.from('archive_history').select('*').order('archived_at', { ascending: false }),
        supabase.from('students').select('class_name, id').eq('status', 'active'),
      ]);

      // Count by class
      const classCounts = {};
      (studentsByClass || []).forEach(s => {
        classCounts[s.class_name] = (classCounts[s.class_name] || 0) + 1;
      });

      setStats({
        studentsCount: studentsCount || 0,
        activeStudents: activeStudents || 0,
        gradesCount: gradesCount || 0,
        attendanceCount: attendanceCount || 0,
        homeworkCount: homeworkCount || 0,
        studentHomeworkCount: studentHomeworkCount || 0,
        commentsCount: commentsCount || 0,
        scheduledTestsCount: scheduledTestsCount || 0,
        termsCount: termsCount || 0,
        classCounts,
      });

      setArchiveHistory(history || []);

      // Build promotion plan
      const classOrder = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5A', 'Y5B', 'Y6', 'Y7', 'Y8', 'Y9'];
      const promotionMap = {
        'Y1': 'Y2', 'Y2': 'Y3', 'Y3': 'Y4', 'Y4': 'Y5A',
        'Y5A': 'Y6', 'Y5B': 'Y6', 'Y6': 'Y7', 'Y7': 'Y8', 'Y8': 'Y9',
        'Y9': 'GRADUATE'
      };

      const plan = classOrder
        .filter(c => classCounts[c] > 0)
        .map(c => ({
          from: c,
          to: promotionMap[c] || 'GRADUATE',
          count: classCounts[c] || 0,
          action: promotionMap[c] === 'GRADUATE' ? 'graduate' : 'promote',
          enabled: true,
        }));

      setPromotionPlan(plan);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ─── EXPORT ────────────────────────────────────────────

  const handleExport = async () => {
    try {
      setProgress({ current: 0, total: 6, label: 'Exporting students...' });

      const { data: students } = await supabase.from('students').select('*').eq('status', 'active');
      setProgress({ current: 1, total: 6, label: 'Exporting grades...' });

      const { data: grades } = await supabase.from('grades').select('*');
      setProgress({ current: 2, total: 6, label: 'Exporting attendance...' });

      const { data: attendance } = await supabase.from('attendance').select('*');
      setProgress({ current: 3, total: 6, label: 'Exporting homework...' });

      const { data: homework } = await supabase.from('homework').select('*');
      const { data: studentHomework } = await supabase.from('student_homework').select('*');
      setProgress({ current: 4, total: 6, label: 'Exporting comments...' });

      const { data: comments } = await supabase.from('teacher_comments').select('*');
      const { data: subjectComments } = await supabase.from('subject_term_comments').select('*');
      const { data: classTeacherComments } = await supabase.from('class_teacher_comments').select('*');
      setProgress({ current: 5, total: 6, label: 'Exporting terms...' });

      const { data: terms } = await supabase.from('academic_terms').select('*');
      const { data: termReports } = await supabase.from('term_reports').select('*');

      const exportPayload = {
        exported_at: new Date().toISOString(),
        school_year: CURRENT_YEAR,
        students, grades, attendance, homework, studentHomework,
        comments, subjectComments, classTeacherComments,
        terms, termReports,
      };

      setProgress({ current: 6, total: 6, label: 'Creating file...' });

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `green-school-archive-${CURRENT_YEAR}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setExportData({
        students: students?.length || 0,
        grades: grades?.length || 0,
        attendance: attendance?.length || 0,
        homework: homework?.length || 0,
      });

      setProgress({ current: 0, total: 0, label: '' });
      alert('Export downloaded successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: ' + error.message);
      setProgress({ current: 0, total: 0, label: '' });
    }
  };

  // ─── EXCEL EXPORT ──────────────────────────────────────

  const handleExcelExport = async () => {
    try {
      setProgress({ current: 0, total: 7, label: 'Loading students...' });

      const { data: students } = await supabase.from('students').select('*').order('class_name, student_no');
      setProgress({ current: 1, total: 7, label: 'Loading grades...' });

      const { data: grades } = await supabase.from('grades').select('*').order('date');
      setProgress({ current: 2, total: 7, label: 'Loading attendance...' });

      const { data: attendance } = await supabase.from('attendance').select('*').order('date_key');
      setProgress({ current: 3, total: 7, label: 'Loading homework...' });

      const { data: homework } = await supabase.from('homework').select('*').order('due_date');
      const { data: studentHomework } = await supabase.from('student_homework').select('*');
      setProgress({ current: 4, total: 7, label: 'Loading parents...' });

      const { data: parents } = await supabase.from('parents').select('*');
      const { data: studentParents } = await supabase.from('student_parents').select('*, parents(full_name, email, phone)');
      setProgress({ current: 5, total: 7, label: 'Loading comments & terms...' });

      const { data: comments } = await supabase.from('teacher_comments').select('*');
      const { data: subjectComments } = await supabase.from('subject_term_comments').select('*');
      const { data: terms } = await supabase.from('academic_terms').select('*');
      const { data: termReports } = await supabase.from('term_reports').select('*');

      setProgress({ current: 6, total: 7, label: 'Building Excel file...' });

      const wb = XLSX.utils.book_new();

      // Helper: flatten objects for sheets, handle dates nicely
      const toSheet = (data, columns) => {
        if (!data || data.length === 0) return XLSX.utils.aoa_to_sheet([columns || ['No data']]);
        if (columns) {
          const rows = data.map(row => columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return '';
            if (typeof val === 'object') return JSON.stringify(val);
            return val;
          }));
          return XLSX.utils.aoa_to_sheet([columns, ...rows]);
        }
        return XLSX.utils.json_to_sheet(data);
      };

      // Students sheet
      const studentCols = ['student_no', 'name', 'class_name', 'email', 'date_of_birth', 'status', 'school_year', 'previous_class', 'enrollment_status'];
      XLSX.utils.book_append_sheet(wb, toSheet(students, studentCols), 'Students');

      // Students + Parents combined sheet (for secretary)
      const studentParentRows = (students || []).map(s => {
        const links = (studentParents || []).filter(sp => sp.student_id === s.id);
        const parent1 = links[0];
        const parent2 = links[1];
        return {
          'Student No': s.student_no,
          'Student Name': s.name,
          'Class': s.class_name,
          'DOB': s.date_of_birth || '',
          'Student Email': s.email || '',
          'Status': s.status,
          'Parent 1 Name': parent1?.parents?.full_name || '',
          'Parent 1 Relationship': parent1?.relationship || '',
          'Parent 1 Email': parent1?.parents?.email || '',
          'Parent 1 Phone': parent1?.parents?.phone || '',
          'Parent 2 Name': parent2?.parents?.full_name || '',
          'Parent 2 Relationship': parent2?.relationship || '',
          'Parent 2 Email': parent2?.parents?.email || '',
          'Parent 2 Phone': parent2?.parents?.phone || '',
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentParentRows), 'Students & Parents');

      // Grades sheet
      const gradeCols = ['student_id', 'class_name', 'subject', 'assessment_type', 'assessment_title', 'grade', 'max_grade', 'date', 'term_number', 'notes'];
      // Enrich grades with student names
      const studentMap = {};
      (students || []).forEach(s => { studentMap[s.id] = s.name; });
      const gradesEnriched = (grades || []).map(g => ({ ...g, student_name: studentMap[g.student_id] || g.student_id }));
      const gradeColsFull = ['student_name', ...gradeCols];
      XLSX.utils.book_append_sheet(wb, toSheet(gradesEnriched, gradeColsFull), 'Grades');

      // Attendance sheet
      const attEnriched = (attendance || []).map(a => ({ ...a, student_name: studentMap[a.student_id] || a.student_id }));
      const attCols = ['student_name', 'date_key', 'class_id', 'status', 'comment', 'term_number'];
      XLSX.utils.book_append_sheet(wb, toSheet(attEnriched, attCols), 'Attendance');

      // Homework sheet
      const hwCols = ['homework_id', 'class_name', 'subject', 'title', 'description', 'assigned_date', 'due_date', 'term_number', 'status'];
      XLSX.utils.book_append_sheet(wb, toSheet(homework, hwCols), 'Homework');

      // Student Homework sheet
      const shEnriched = (studentHomework || []).map(sh => ({ ...sh, student_name: studentMap[sh.student_id] || sh.student_id }));
      const shCols = ['student_name', 'homework_id', 'status', 'submitted_at', 'teacher_notes', 'effort_grade'];
      XLSX.utils.book_append_sheet(wb, toSheet(shEnriched, shCols), 'Student Homework');

      // Comments sheet
      if (comments && comments.length > 0) {
        const commEnriched = comments.map(c => ({ ...c, student_name: studentMap[c.student_id] || c.student_id }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(commEnriched), 'Comments');
      }

      // Subject Comments sheet
      if (subjectComments && subjectComments.length > 0) {
        const scEnriched = subjectComments.map(c => ({ ...c, student_name: studentMap[c.student_id] || c.student_id }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scEnriched), 'Subject Comments');
      }

      // Terms sheet
      if (terms && terms.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(terms), 'Terms');
      }

      // Term Reports sheet
      if (termReports && termReports.length > 0) {
        const trEnriched = termReports.map(r => ({ ...r, student_name: studentMap[r.student_id] || r.student_id }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trEnriched), 'Term Reports');
      }

      // Parents sheet
      if (parents && parents.length > 0) {
        const parentCols = ['full_name', 'email', 'phone', 'status'];
        XLSX.utils.book_append_sheet(wb, toSheet(parents, parentCols), 'Parents');
      }

      // Auto-size columns for each sheet
      wb.SheetNames.forEach(name => {
        const ws = wb.Sheets[name];
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        const colWidths = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          let maxW = 10;
          for (let r = range.s.r; r <= Math.min(range.e.r, 50); r++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            if (cell && cell.v) maxW = Math.max(maxW, String(cell.v).length + 2);
          }
          colWidths.push({ wch: Math.min(maxW, 40) });
        }
        ws['!cols'] = colWidths;
      });

      setProgress({ current: 7, total: 7, label: 'Downloading...' });

      XLSX.writeFile(wb, `green-school-archive-${CURRENT_YEAR}-${new Date().toISOString().split('T')[0]}.xlsx`);

      setExportData(prev => ({
        ...(prev || {}),
        excelExported: true,
        students: students?.length || 0,
        grades: grades?.length || 0,
        attendance: attendance?.length || 0,
        homework: homework?.length || 0,
      }));

      setProgress({ current: 0, total: 0, label: '' });
      alert('Excel export downloaded successfully!');
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Excel export failed: ' + error.message);
      setProgress({ current: 0, total: 0, label: '' });
    }
  };

  // ─── EXECUTE ARCHIVE ───────────────────────────────────

  const executeArchive = async () => {
    if (confirmText !== 'ARCHIVE 2025-26') return;

    setExecuting(true);
    setStep(5);

    let gradesDeleted = 0, attendanceDeleted = 0, homeworkDeleted = 0, filesDeleted = 0;
    const totalSteps = Object.values(cleanupOptions).filter(Boolean).length + promotionPlan.filter(p => p.enabled).length + 1;
    let currentStep = 0;

    try {
      // Step 1: Promote/Graduate students
      for (const plan of promotionPlan.filter(p => p.enabled)) {
        currentStep++;
        setProgress({ current: currentStep, total: totalSteps, label: `${plan.action === 'graduate' ? 'Graduating' : 'Promoting'} ${plan.from} students...` });

        if (plan.action === 'graduate') {
          const { error } = await supabase
            .from('students')
            .update({ status: 'graduated', previous_class: plan.from, school_year: CURRENT_YEAR })
            .eq('class_name', plan.from)
            .eq('status', 'active');
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('students')
            .update({ class_name: plan.to, previous_class: plan.from, school_year: NEXT_YEAR })
            .eq('class_name', plan.from)
            .eq('status', 'active');
          if (error) throw error;
        }
      }

      // Step 2: Delete grades
      if (cleanupOptions.deleteGrades) {
        currentStep++;
        setProgress({ current: currentStep, total: totalSteps, label: 'Deleting grades...' });
        const { error } = await supabase.from('grades').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        gradesDeleted = stats.gradesCount;
      }

      // Step 3: Delete attendance
      if (cleanupOptions.deleteAttendance) {
        currentStep++;
        setProgress({ current: currentStep, total: totalSteps, label: 'Deleting attendance records...' });
        const { error } = await supabase.from('attendance').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        attendanceDeleted = stats.attendanceCount;
      }

      // Step 4: Delete homework
      if (cleanupOptions.deleteHomework) {
        currentStep++;
        setProgress({ current: currentStep, total: totalSteps, label: 'Deleting homework...' });
        // Delete student_homework first (FK)
        await supabase.from('student_homework').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        const { error } = await supabase.from('homework').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
        homeworkDeleted = stats.homeworkCount;
      }

      // Step 5: Delete comments
      if (cleanupOptions.deleteComments) {
        currentStep++;
        setProgress({ current: currentStep, total: totalSteps, label: 'Deleting comments...' });
        await supabase.from('teacher_comments').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('subject_term_comments').delete().gte('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('class_teacher_comments').delete().gte('id', '00000000-0000-0000-0000-000000000000');
      }

      // Step 6: Delete scheduled tests
      if (cleanupOptions.deleteScheduledTests) {
        currentStep++;
        setProgress({ current: currentStep, total: totalSteps, label: 'Deleting scheduled tests...' });
        await supabase.from('scheduled_tests').delete().gte('id', '00000000-0000-0000-0000-000000000000');
      }

      // Step 7: Reset academic terms
      if (cleanupOptions.resetTerms) {
        currentStep++;
        setProgress({ current: currentStep, total: totalSteps, label: 'Resetting academic terms...' });
        await supabase.from('academic_terms').delete().gte('id', '00000000-0000-0000-0000-000000000000');
      }

      // Step 8: Delete term reports
      currentStep++;
      setProgress({ current: currentStep, total: totalSteps, label: 'Cleaning up reports...' });
      await supabase.from('term_reports').delete().gte('id', '00000000-0000-0000-0000-000000000000');

      // Step 9: Delete classes (daily schedule)
      await supabase.from('classes').delete().gte('id', '00000000-0000-0000-0000-000000000000');

      // Record archive history
      const { error: historyError } = await supabase.from('archive_history').insert([{
        school_year: CURRENT_YEAR,
        archived_by: teacher?.user_id || null,
        students_count: stats.activeStudents,
        grades_deleted: gradesDeleted,
        attendance_deleted: attendanceDeleted,
        homework_deleted: homeworkDeleted,
        files_deleted: filesDeleted,
        notes: `Year-end archive. Promoted students to ${NEXT_YEAR}. Options: ${Object.entries(cleanupOptions).filter(([,v]) => v).map(([k]) => k).join(', ')}`,
      }]);

      if (historyError) console.error('History record error:', historyError);

      setResult({
        success: true,
        gradesDeleted, attendanceDeleted, homeworkDeleted,
        studentsPromoted: promotionPlan.filter(p => p.enabled && p.action === 'promote').reduce((sum, p) => sum + p.count, 0),
        studentsGraduated: promotionPlan.filter(p => p.enabled && p.action === 'graduate').reduce((sum, p) => sum + p.count, 0),
      });

      setStep(6);
    } catch (error) {
      console.error('Archive error:', error);
      alert('Archive failed at: ' + progress.label + '\nError: ' + error.message + '\n\nSome data may have been partially deleted. Check your database.');
      setStep(4);
    } finally {
      setExecuting(false);
    }
  };

  // ─── RENDER ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step indicator */}
      {step > 0 && step < 6 && (
        <div className="flex items-center gap-1.5">
          {['Review', 'Promote', 'Cleanup', 'Confirm'].map((label, i) => (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                step === i + 1 ? 'bg-emerald-100 text-emerald-700' : step > i + 1 ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {step > i + 1 ? <CheckCircle size={12} /> : <span>{i + 1}</span>}
                {label}
              </div>
              {i < 3 && <ChevronRight size={14} className="text-gray-300" />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ─── STEP 0: OVERVIEW ──────────────────────────── */}
      {step === 0 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-1">
              <Archive size={20} className="text-emerald-600" />
              Year-End Archive & Reset
            </h3>
            <p className="text-xs text-gray-500 mb-5">End-of-year process: export data, promote students, and reset for {NEXT_YEAR}</p>

            {/* Current stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5 mb-5">
              {[
                { label: 'Active Students', value: stats.activeStudents, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                { label: 'Grades', value: stats.gradesCount, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                { label: 'Attendance', value: stats.attendanceCount, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
                { label: 'Homework', value: stats.homeworkCount, icon: ClipboardList, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                { label: 'Comments', value: stats.commentsCount, icon: BookOpen, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
                { label: 'Terms', value: stats.termsCount, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} rounded-xl p-3 border ${s.border}`}>
                  <s.icon size={16} className={`${s.color} mb-1`} />
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-3">
              <button onClick={handleExport}
                className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl p-4 text-left transition-all group">
                <Download size={20} className="text-blue-600 mb-2" />
                <p className="font-semibold text-gray-800 text-sm">Export JSON</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Full backup (for restore)</p>
                {exportData && (
                  <p className="text-[10px] text-green-600 font-semibold mt-1.5">
                    ✓ {exportData.students} students, {exportData.grades} grades
                  </p>
                )}
              </button>

              <button onClick={handleExcelExport}
                className="bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 rounded-xl p-4 text-left transition-all group">
                <FileSpreadsheet size={20} className="text-emerald-600 mb-2" />
                <p className="font-semibold text-gray-800 text-sm">Export Excel</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Readable spreadsheet with all data</p>
                {exportData?.excelExported && (
                  <p className="text-[10px] text-green-600 font-semibold mt-1.5">✓ Excel downloaded</p>
                )}
              </button>

              <button onClick={() => setStep(1)}
                className="bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-xl p-4 text-left transition-all group">
                <Archive size={20} className="text-red-600 mb-2" />
                <p className="font-semibold text-gray-800 text-sm">Start Archive</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Promote students, clear data for {NEXT_YEAR}</p>
              </button>
            </div>

            {progress.total > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{progress.label}</span>
                  <span>{progress.current}/{progress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                </div>
              </div>
            )}
          </div>

          {/* Archive History */}
          {archiveHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <RotateCcw size={16} className="text-gray-500" /> Previous Archives
              </h4>
              <div className="space-y-2">
                {archiveHistory.map(h => (
                  <div key={h.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">School Year {h.school_year}</p>
                        <p className="text-[11px] text-gray-500">
                          {new Date(h.archived_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {' • '}{h.students_count} students • {h.grades_deleted} grades deleted
                        </p>
                      </div>
                    </div>
                    {h.notes && <p className="text-[11px] text-gray-400 mt-1">{h.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 1: REVIEW ───────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Step 1: Review Current Data</h3>
            <p className="text-xs text-gray-500 mt-0.5">This is what will be affected by the archive process</p>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Have you exported your data?</p>
              <p className="text-xs text-amber-700 mt-0.5">
                We strongly recommend exporting all data before proceeding. The archive process will permanently delete records.
                {exportData && <span className="text-green-700 font-semibold"> ✓ Export was downloaded.</span>}
              </p>
              {!exportData && (
                <button onClick={() => { setStep(0); setTimeout(() => handleExport(), 100); }}
                  className="mt-2 text-xs bg-amber-200 text-amber-900 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-300 transition-colors">
                  ← Go back and export first
                </button>
              )}
            </div>
          </div>

          {/* Data summary */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Students by Class</p>
              <div className="space-y-1">
                {Object.entries(stats.classCounts).sort().map(([cls, count]) => (
                  <div key={cls} className="flex justify-between text-sm">
                    <span className="text-gray-700">{cls}</span>
                    <span className="font-semibold text-gray-800">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Records to Process</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-700">Grades</span><span className="font-semibold text-blue-700">{stats.gradesCount}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Attendance</span><span className="font-semibold text-purple-700">{stats.attendanceCount}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Homework</span><span className="font-semibold text-orange-700">{stats.homeworkCount}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Comments</span><span className="font-semibold text-pink-700">{stats.commentsCount}</span></div>
                <div className="flex justify-between"><span className="text-gray-700">Scheduled Tests</span><span className="font-semibold text-indigo-700">{stats.scheduledTestsCount}</span></div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(0)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all flex items-center justify-center gap-1.5">
              <ChevronLeft size={16} /> Back
            </button>
            <button onClick={() => setStep(2)} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center justify-center gap-1.5">
              Next: Student Promotion <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: PROMOTE STUDENTS ─────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Step 2: Student Promotion</h3>
            <p className="text-xs text-gray-500 mt-0.5">Choose how to move students to next year classes</p>
          </div>

          <div className="space-y-2">
            {promotionPlan.map((plan, idx) => (
              <div key={idx} className={`rounded-xl p-3.5 border-2 transition-all ${
                plan.enabled
                  ? plan.action === 'graduate' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={plan.enabled}
                        onChange={() => {
                          const updated = [...promotionPlan];
                          updated[idx].enabled = !updated[idx].enabled;
                          setPromotionPlan(updated);
                        }}
                        className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-300 peer-checked:bg-emerald-500 rounded-full peer-focus:ring-2 peer-focus:ring-emerald-300 transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                    <div>
                      <div className="flex items-center gap-2">
                        {plan.action === 'graduate' ? (
                          <GraduationCap size={16} className="text-amber-600" />
                        ) : (
                          <ArrowUpCircle size={16} className="text-emerald-600" />
                        )}
                        <span className="font-semibold text-gray-800 text-sm">
                          {plan.from} → {plan.action === 'graduate' ? 'Graduate' : plan.to}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {plan.count} student{plan.count !== 1 ? 's' : ''}
                        {plan.action === 'graduate' ? ' will be marked as graduated' : ` will move to ${plan.to}`}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    plan.action === 'graduate' ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'
                  }`}>
                    {plan.count}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-xs text-blue-700">
            <strong>Note:</strong> Students with status "active" in each class will be promoted. Archived/transferred students are not affected. 
            The <code>previous_class</code> field will be set for each promoted student.
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(1)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all flex items-center justify-center gap-1.5">
              <ChevronLeft size={16} /> Back
            </button>
            <button onClick={() => setStep(3)} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center justify-center gap-1.5">
              Next: Data Cleanup <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: CLEANUP OPTIONS ──────────────────── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Step 3: Data Cleanup</h3>
            <p className="text-xs text-gray-500 mt-0.5">Choose what to delete for the new school year</p>
          </div>

          <div className="space-y-2">
            {[
              { key: 'deleteGrades', label: 'Delete all grades', desc: `${stats.gradesCount} grade records`, icon: BookOpen, color: 'text-blue-600' },
              { key: 'deleteAttendance', label: 'Delete all attendance', desc: `${stats.attendanceCount} attendance records`, icon: Calendar, color: 'text-purple-600' },
              { key: 'deleteHomework', label: 'Delete all homework', desc: `${stats.homeworkCount} homework + ${stats.studentHomeworkCount} student records`, icon: ClipboardList, color: 'text-orange-600' },
              { key: 'deleteComments', label: 'Delete all comments', desc: `Teacher comments, subject comments, class teacher comments`, icon: BookOpen, color: 'text-pink-600' },
              { key: 'deleteScheduledTests', label: 'Delete scheduled tests', desc: `${stats.scheduledTestsCount} test records`, icon: Calendar, color: 'text-indigo-600' },
              { key: 'resetTerms', label: 'Reset academic terms', desc: 'Remove all terms so you can set up new ones for ' + NEXT_YEAR, icon: Calendar, color: 'text-teal-600' },
            ].map(opt => (
              <div key={opt.key} className={`rounded-xl p-3.5 border-2 transition-all ${
                cleanupOptions[opt.key] ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={cleanupOptions[opt.key]}
                        onChange={() => setCleanupOptions({ ...cleanupOptions, [opt.key]: !cleanupOptions[opt.key] })}
                        className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-300 peer-checked:bg-red-500 rounded-full peer-focus:ring-2 peer-focus:ring-red-300 transition-colors after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <opt.icon size={14} className={opt.color} />
                        <span className="font-semibold text-gray-800 text-sm">{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-gray-500">{opt.desc}</p>
                    </div>
                  </div>
                  {cleanupOptions[opt.key] && <Trash2 size={16} className="text-red-500" />}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(2)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all flex items-center justify-center gap-1.5">
              <ChevronLeft size={16} /> Back
            </button>
            <button onClick={() => setStep(4)} className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center justify-center gap-1.5">
              Next: Final Confirmation <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: CONFIRM ──────────────────────────── */}
      {step === 4 && (
        <div className="bg-white rounded-2xl border-2 border-red-200 p-5 space-y-4">
          <div className="bg-red-50 rounded-xl p-4 border border-red-200 flex items-start gap-3">
            <Shield size={24} className="text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-red-900">⚠️ Final Confirmation</h3>
              <p className="text-xs text-red-700 mt-0.5">
                This action is <strong>PERMANENT</strong> and <strong>IRREVERSIBLE</strong>. Please review carefully.
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-2 text-sm">
            <p className="font-semibold text-gray-800">What will happen:</p>

            {promotionPlan.filter(p => p.enabled).map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-700">
                {p.action === 'graduate' ? <GraduationCap size={14} className="text-amber-600" /> : <ArrowUpCircle size={14} className="text-emerald-600" />}
                <span>{p.count} students: {p.from} → {p.action === 'graduate' ? 'Graduated' : p.to}</span>
              </div>
            ))}

            {cleanupOptions.deleteGrades && (
              <div className="flex items-center gap-2 text-red-700"><Trash2 size={14} /> Delete {stats.gradesCount} grades</div>
            )}
            {cleanupOptions.deleteAttendance && (
              <div className="flex items-center gap-2 text-red-700"><Trash2 size={14} /> Delete {stats.attendanceCount} attendance records</div>
            )}
            {cleanupOptions.deleteHomework && (
              <div className="flex items-center gap-2 text-red-700"><Trash2 size={14} /> Delete {stats.homeworkCount} homework records</div>
            )}
            {cleanupOptions.deleteComments && (
              <div className="flex items-center gap-2 text-red-700"><Trash2 size={14} /> Delete all comments</div>
            )}
            {cleanupOptions.deleteScheduledTests && (
              <div className="flex items-center gap-2 text-red-700"><Trash2 size={14} /> Delete {stats.scheduledTestsCount} scheduled tests</div>
            )}
            {cleanupOptions.resetTerms && (
              <div className="flex items-center gap-2 text-red-700"><Trash2 size={14} /> Reset all academic terms</div>
            )}
          </div>

          {/* Type to confirm */}
          <div>
            <label className="block text-xs font-semibold text-red-700 mb-1.5">
              Type <code className="bg-red-100 px-1.5 py-0.5 rounded font-mono">ARCHIVE 2025-26</code> to confirm:
            </label>
            <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ARCHIVE 2025-26"
              className="w-full px-4 py-3 border-2 border-red-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => { setStep(3); setConfirmText(''); }}
              className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all flex items-center justify-center gap-1.5">
              <ChevronLeft size={16} /> Back
            </button>
            <button onClick={executeArchive}
              disabled={confirmText !== 'ARCHIVE 2025-26'}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-2.5 rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
              <Archive size={16} /> Execute Archive
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 5: EXECUTING ────────────────────────── */}
      {step === 5 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Archiving in Progress...</h3>
          <p className="text-sm text-gray-500 mb-4">{progress.label}</p>
          <div className="max-w-xs mx-auto">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress</span>
              <span>{progress.current}/{progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}></div>
            </div>
          </div>
          <p className="text-xs text-red-500 mt-4">Do not close this page!</p>
        </div>
      )}

      {/* ─── STEP 6: DONE ─────────────────────────────── */}
      {step === 6 && result && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto flex items-center justify-center">
            <CheckCircle size={36} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Archive Complete!</h3>
            <p className="text-sm text-gray-500 mt-1">School year {CURRENT_YEAR} has been archived. Ready for {NEXT_YEAR}.</p>
          </div>

          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-left text-sm space-y-1.5">
            <p className="font-semibold text-emerald-800 mb-2">Summary:</p>
            <p className="text-emerald-700">✓ {result.studentsPromoted} students promoted</p>
            <p className="text-emerald-700">✓ {result.studentsGraduated} students graduated</p>
            <p className="text-emerald-700">✓ {result.gradesDeleted} grades deleted</p>
            <p className="text-emerald-700">✓ {result.attendanceDeleted} attendance records deleted</p>
            <p className="text-emerald-700">✓ {result.homeworkDeleted} homework records deleted</p>
          </div>

          <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-200 text-xs text-blue-700">
            <strong>Next steps:</strong> Go to Academic Terms tab to set up Winter/Spring/Summer terms for {NEXT_YEAR}. 
            New students can be enrolled via the Enrollment tab or Students page.
          </div>

          <button onClick={() => { setStep(0); loadStats(); setConfirmText(''); setExportData(null); setResult(null); }}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all">
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default ArchiveTabContent;