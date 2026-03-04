import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Trash2, Filter, AlertCircle } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useAuth } from '../../../../core/context/AuthContext';
import useActiveTerm from '../../../../shared/hooks/useActiveTerm';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useBranding } from '../../../../core/context/BrandingContext';
import { getGrade, getPercentageColor } from '../../../../core/utils/gradingSystem';

// ════════════════════════════════════════════════════════════════════════════
// GRADES PAGE - Uses useTermTheme for dynamic colors
// ════════════════════════════════════════════════════════════════════════════

const GradesPage = () => {
  const { supabase } = useApp();                                   // ✂ removed unused studentsDb
  const { teacher } = useAuth();
  const { activeTerm, allTerms, loading: termsLoading } = useActiveTerm();
  const { gradingSystem } = useBranding();

  // ═══ TERM THEMES FOR TABS ═══
  const theme = useTermTheme();

  // ✅ FIX: call useBranding at component level, not inside getTermTheme
  const branding = useBranding();
  const getTermTheme = useCallback((termNumber) => {
    const colorKey = `term${termNumber}Color`;
    const nameKey  = `term${termNumber}Name`;
    const color = branding[colorKey] || ['#3b82f6', '#ec4899', '#f59e0b'][termNumber - 1];
    const name  = branding[nameKey]  || ['Winter', 'Spring', 'Summer'][termNumber - 1];
    return { color, name };
  }, [branding]);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedTermNumber, setSelectedTermNumber] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    assessmentTitle: '',
    subject: '',
    assessmentType: 'Test',
    maxGrade: 100,
    date: new Date().toISOString().split('T')[0]
  });
  const [studentScores, setStudentScores] = useState({});

  const mySubjects = teacher?.subjects || [];

  // Set selected term to active term on load
  useEffect(() => {
    if (activeTerm && !selectedTermNumber) {
      setSelectedTermNumber(activeTerm.term_number);
    }
  }, [activeTerm, selectedTermNumber]);

  // ✅ FIX: wrap loaders in useCallback so they can be stable deps
  const loadClasses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('custom_classes').select('*').eq('is_active', true).order('class_name');
      if (error) throw error;
      setClasses(data || []);
    } catch (err) { console.error('Error loading classes:', err); }
  }, [supabase]);

  const loadSubjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('custom_subjects').select('*').eq('is_active', true).order('subject_name');
      if (error) throw error;
      setSubjects((data || []).filter(s => mySubjects.includes(s.subject_name)));
    } catch (err) { console.error('Error loading subjects:', err); }
  }, [supabase, mySubjects]);

  const loadStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('students').select('*')
        .eq('class_name', selectedClass).eq('status', 'active').order('student_no');
      if (error) throw error;
      setStudents(data || []);
    } catch (err) { console.error('Error loading students:', err); }
  }, [supabase, selectedClass]);

  const loadGrades = useCallback(async () => {
    if (!selectedClass || !selectedTermNumber) return;
    try {
      const { data: termData, error: e1 } = await supabase
        .from('grades')
        .select('*')
        .eq('class_name', selectedClass)
        .eq('term_number', selectedTermNumber)
        .in('subject', mySubjects)
        .order('date', { ascending: true });
      if (e1) throw e1;

      const { data: legacyData, error: e2 } = await supabase
        .from('grades')
        .select('*')
        .eq('class_name', selectedClass)
        .is('term_number', null)
        .in('subject', mySubjects)
        .order('date', { ascending: true });
      if (e2) throw e2;

      const currentTermData = allTerms.find(t => t.term_number === selectedTermNumber);
      const legacyForThisTerm = (legacyData || []).filter(g => {
        if (!currentTermData) return selectedTermNumber === 1;
        return g.date >= currentTermData.start_date && g.date <= currentTermData.end_date;
      });

      legacyForThisTerm.forEach(g => {
        supabase.from('grades').update({ term_number: selectedTermNumber }).eq('id', g.id).then(() => {});
      });

      setGrades([...(termData || []), ...legacyForThisTerm]);
    } catch (err) { console.error('Error loading grades:', err); }
  }, [supabase, selectedClass, selectedTermNumber, mySubjects, allTerms]);

  // ✅ FIX: proper deps arrays
  useEffect(() => { loadClasses(); loadSubjects(); }, [loadClasses, loadSubjects]);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
    } else {
      setStudents([]);
      setGrades([]);
    }
  }, [selectedClass, loadStudents]);

  useEffect(() => {
    if (selectedClass && selectedTermNumber) {
      loadGrades();
    }
  }, [selectedClass, selectedTermNumber, loadGrades]);

  const handleAddGrades = async () => {
    if (!activeTerm) { alert('No active term. Configure academic terms first.'); return; }

    try {
      const gradeRecords = [];
      for (const [studentId, score] of Object.entries(studentScores)) {
        if (score === '' || score === undefined || score === null) continue;
        gradeRecords.push({
          student_id: studentId,
          class_name: selectedClass,
          subject: formData.subject,
          assessment_type: formData.assessmentType,
          assessment_title: formData.assessmentTitle,
          grade: parseFloat(score),
          max_grade: parseFloat(formData.maxGrade),
          date: formData.date,
          term_number: activeTerm.term_number,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      if (gradeRecords.length === 0) { alert('Please enter at least one grade.'); return; }

      const { error } = await supabase.from('grades').insert(gradeRecords);
      if (error) throw error;

      setShowAddModal(false);
      setStudentScores({});
      setFormData({ assessmentTitle: '', subject: '', assessmentType: 'Test', maxGrade: 100, date: new Date().toISOString().split('T')[0] });
      setSelectedTermNumber(activeTerm.term_number);
      setSelectedSubject('all');
      await loadGrades();
    } catch (err) {
      console.error('Error adding grades:', err);
      alert('Failed to add grades: ' + err.message);
    }
  };

  const handleDeleteGrade = async (gradeId) => {
    if (!window.confirm('Delete this grade?')) return;
    try {
      const { error } = await supabase.from('grades').delete().eq('id', gradeId);
      if (error) throw error;
      await loadGrades();
    } catch (err) { alert('Failed to delete grade'); }
  };

  // ─── DERIVED DATA ──────────────────────────────────────
  const filteredGrades = selectedSubject === 'all'
    ? grades
    : grades.filter(g => g.subject === selectedSubject);

  const gradeSubjects = [...new Set(grades.map(g => g.subject))];

  const assessments = [];
  const seen = new Set();
  for (const g of filteredGrades) {
    const key = `${g.assessment_title}__${g.subject}__${g.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      assessments.push({
        key,
        title: g.assessment_title,
        subject: g.subject,
        type: g.assessment_type,
        date: g.date,
        maxGrade: g.max_grade
      });
    }
  }

  const gradebook = {};
  for (const student of students) {
    gradebook[student.id] = {};
  }
  for (const g of filteredGrades) {
    const key = `${g.assessment_title}__${g.subject}__${g.date}`;
    if (gradebook[g.student_id]) {
      gradebook[g.student_id][key] = g;
    }
  }

  const getStudentAverage = (studentId) => {
    const studentGrades = filteredGrades.filter(g => g.student_id === studentId);
    if (studentGrades.length === 0) return null;
    const avg = studentGrades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0) / studentGrades.length;
    return avg;
  };

  const selectedTermData = allTerms.find(t => t.term_number === selectedTermNumber);
  const isActiveTerm = selectedTermNumber === activeTerm?.term_number;
  const isFinalized = selectedTermData?.is_finalized;

  // ─── RENDER ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen size={24} style={theme.textStyle} />
            Gradebook
          </h2>
          {activeTerm && (
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: theme.withAlpha(0.15), color: theme.color }}
            >
              <theme.icon size={14} />
              Active: {theme.name} Term
            </div>
          )}
        </div>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class</label>
            <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject('all'); }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-sm"
              style={{ '--tw-ring-color': theme.color }}>
              <option value="">Choose a class...</option>
              {classes.map(cls => (<option key={cls.id} value={cls.class_name}>{cls.class_name}</option>))}
            </select>
          </div>

          <button onClick={() => setShowAddModal(true)}
            disabled={!selectedClass || subjects.length === 0 || !activeTerm || isFinalized}
            className="text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
            style={theme.gradientStyle}>
            <Plus size={18} /> Add Grades
          </button>
        </div>

        {!termsLoading && !activeTerm && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle size={16} />
            <span>No active term. Go to <strong>Management → Academic Terms</strong> to set one up.</span>
          </div>
        )}
      </div>

      {/* Term Tabs + Content */}
      {selectedClass && allTerms.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Term Tabs - Dynamic Colors */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {allTerms.map(term => {
              const termTheme = getTermTheme(term.term_number);
              const isSelected = selectedTermNumber === term.term_number;
              const isActive = activeTerm?.term_number === term.term_number;
              
              return (
                <button key={term.id} onClick={() => setSelectedTermNumber(term.term_number)}
                  className="flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors border-b-2"
                  style={{
                    backgroundColor: isSelected ? `${termTheme.color}15` : 'transparent',
                    color: isSelected ? termTheme.color : '#6b7280',
                    borderBottomColor: isSelected ? termTheme.color : 'transparent'
                  }}>
                  <span className="hidden sm:inline">Term {term.term_number}:</span> {termTheme.name}
                  {isActive && (
                    <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold"
                      style={{ backgroundColor: theme.color }}>ACTIVE</span>
                  )}
                  {term.is_finalized && (
                    <span className="text-[10px] bg-gray-400 text-white px-1.5 py-0.5 rounded-full font-bold">LOCKED</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subject Filter */}
          {gradeSubjects.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              <Filter size={14} className="text-gray-400" />
              <button onClick={() => setSelectedSubject('all')}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={{
                  backgroundColor: selectedSubject === 'all' ? `${theme.color}20` : '#f3f4f6',
                  color: selectedSubject === 'all' ? theme.color : '#6b7280'
                }}>
                All Subjects
              </button>
              {gradeSubjects.map(subj => (
                <button key={subj} onClick={() => setSelectedSubject(subj)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: selectedSubject === subj ? `${theme.color}20` : '#f3f4f6',
                    color: selectedSubject === subj ? theme.color : '#6b7280'
                  }}>
                  {subj}
                </button>
              ))}
            </div>
          )}

          {/* Term Info */}
          <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              {selectedTermData && (
                <>
                  {new Date(selectedTermData.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {' – '}
                  {new Date(selectedTermData.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </>
              )}
            </span>
            <span>{filteredGrades.length} grade{filteredGrades.length !== 1 ? 's' : ''} • {assessments.length} assessment{assessments.length !== 1 ? 's' : ''}</span>
          </div>

          {isFinalized && (
            <div className="mx-4 mt-3 flex items-center gap-2 text-xs text-gray-600 bg-gray-100 rounded-lg p-2.5">
              <AlertCircle size={14} />
              This term is finalized. Grades are locked.
            </div>
          )}

          {/* Gradebook Table */}
          <div className="p-4">
            {assessments.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No grades for {getTermTheme(selectedTermNumber).name} Term{selectedSubject !== 'all' ? ` (${selectedSubject})` : ''}</p>
                {isActiveTerm && <p className="text-sm text-gray-400 mt-2">Click "Add Grades" to get started</p>}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2.5 font-semibold text-gray-700 border-b border-r border-gray-200 sticky left-0 bg-gray-50 min-w-[160px]">
                        Student
                      </th>
                      {assessments.map(a => (
                        <th key={a.key} className="px-2 py-2 border-b border-gray-200 min-w-[110px] text-center">
                          <div className="font-semibold text-gray-700 text-xs">{a.title}</div>
                          <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                            {a.subject} • {new Date(a.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 border-b border-l border-gray-200 text-center min-w-[90px]"
                        style={{ backgroundColor: `${theme.color}10` }}>
                        <div className="font-semibold text-xs" style={{ color: theme.color }}>Average</div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {students.map((student, rowIdx) => {
                      const avg = getStudentAverage(student.id);
                      const avgGrade = avg !== null ? getGrade(avg, gradingSystem, selectedClass) : null;

                      return (
                        <tr key={student.id} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className={`px-3 py-2 border-r border-gray-200 sticky left-0 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                style={{ backgroundColor: `${theme.color}20`, color: theme.color }}>
                                {student.student_no}
                              </span>
                              <span className="font-medium text-gray-800 truncate">{student.name}</span>
                            </div>
                          </td>

                          {assessments.map(a => {
                            const grade = gradebook[student.id]?.[a.key];
                            if (!grade) {
                              return <td key={a.key} className="px-2 py-2 text-center text-gray-300 text-xs">—</td>;
                            }

                            const pct = (grade.grade / grade.max_grade) * 100;
                            const gradeInfo = getGrade(pct, gradingSystem, selectedClass);

                            return (
                              <td key={a.key} className="px-2 py-2 text-center group relative">
                                <div className="flex flex-col items-center">
                                  <span className="font-semibold text-gray-800 text-xs">
                                    {grade.grade}/{grade.max_grade}
                                  </span>
                                  <span className="text-[11px] font-bold mt-0.5 px-1.5 py-0.5 rounded" 
                                    style={{ color: gradeInfo.color, backgroundColor: gradeInfo.color + '15' }}>
                                    {gradeInfo.label}
                                  </span>
                                </div>

                                {!isFinalized && (
                                  <button onClick={() => handleDeleteGrade(grade.id)}
                                    className="absolute top-0.5 right-0.5 p-0.5 rounded bg-red-100 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete">
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </td>
                            );
                          })}

                          <td className="px-3 py-2 text-center border-l border-gray-200"
                            style={{ backgroundColor: `${theme.color}05` }}>
                            {avg !== null ? (
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-sm" style={{ color: getPercentageColor(avg) }}>
                                  {avg.toFixed(0)}%
                                </span>
                                <span className="text-[10px] font-bold mt-0.5" style={{ color: avgGrade.color }}>
                                  {avgGrade.label}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No terms configured */}
      {selectedClass && allTerms.length === 0 && !termsLoading && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-amber-200 text-center py-8">
          <AlertCircle size={48} className="mx-auto text-amber-400 mb-4" />
          <p className="text-gray-700 font-medium">Academic terms not configured</p>
          <p className="text-sm text-gray-500 mt-2">Go to Management → Academic Terms to set up your school year.</p>
        </div>
      )}

      {/* ─── ADD GRADES MODAL ────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold">Add Grades — {selectedClass}</h3>
              {activeTerm && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: theme.withAlpha(0.15), color: theme.color }}>
                  <theme.icon size={12} />
                  {theme.name} Term
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Title *</label>
                <input type="text" placeholder="e.g., Unit 1 Test, Midterm Exam" value={formData.assessmentTitle}
                  onChange={(e) => setFormData({...formData, assessmentTitle: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <select value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-sm">
                  <option value="">Select subject...</option>
                  {subjects.map(s => (<option key={s.id} value={s.subject_name}>{s.subject_name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={formData.assessmentType} onChange={(e) => setFormData({...formData, assessmentType: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-sm">
                  <option value="Test">Test</option>
                  <option value="Exam">Exam</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Homework">Homework</option>
                  <option value="Project">Project</option>
                  <option value="Classwork">Classwork</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Grade</label>
                <input type="number" value={formData.maxGrade} onChange={(e) => setFormData({...formData, maxGrade: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-sm" />
              </div>
            </div>

            {/* Student Score Entry */}
            <div className="border-t border-gray-200 pt-4 mb-4">
              <h4 className="font-semibold text-gray-800 mb-3 text-sm">Student Grades</h4>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {students.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="font-medium">No students found in {selectedClass}</p>
                  </div>
                ) : (
                  students.map(student => {
                    const score = studentScores[student.id];
                    const pct = score && formData.maxGrade ? (parseFloat(score) / parseFloat(formData.maxGrade)) * 100 : null;
                    const gradeInfo = pct !== null ? getGrade(pct, gradingSystem, selectedClass) : null;

                    return (
                      <div key={student.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: `${theme.color}20`, color: theme.color }}>
                          {student.student_no}
                        </span>
                        <span className="flex-1 font-medium text-gray-800 text-sm">{student.name}</span>
                        <div className="flex items-center gap-2">
                          <input type="number" placeholder="0" value={score || ''}
                            onChange={(e) => setStudentScores({...studentScores, [student.id]: e.target.value})}
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-center font-semibold text-sm"
                            max={formData.maxGrade} step="0.5" />
                          <span className="text-gray-400 text-sm">/ {formData.maxGrade}</span>
                          {gradeInfo && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded min-w-[50px] text-center"
                              style={{ color: gradeInfo.color, backgroundColor: gradeInfo.color + '15' }}>
                              {gradeInfo.label}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {students.length > 0 && (
              <div className="p-2.5 rounded-lg border text-xs mb-4"
                style={{ backgroundColor: `${theme.color}10`, borderColor: `${theme.color}30`, color: theme.color }}>
                <strong>{students.length}</strong> students • <strong>{Object.keys(studentScores).filter(id => studentScores[id]).length}</strong> grades entered • Saving to <strong>{theme.name} Term</strong>
              </div>
            )}

            <div className="flex gap-3 border-t border-gray-200 pt-4">
              <button onClick={handleAddGrades}
                disabled={!formData.assessmentTitle || !formData.subject || students.length === 0}
                className="flex-1 text-white py-2.5 rounded-lg font-medium text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={theme.gradientStyle}>
                Save Grades
              </button>
              <button onClick={() => { setShowAddModal(false); setStudentScores({}); }}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-300 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradesPage;