import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Trash2, Edit2, CheckCircle, Clock, XCircle, BookOpen, AlertCircle, Filter, X } from 'lucide-react';
import ConfirmModal from '../../../../shared/components/ConfirmModal';
import { useApp } from '../../../../core/context/AppContext';
import { useAuth } from '../../../../core/context/AuthContext';
import useActiveTerm from '../../../../shared/hooks/useActiveTerm';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useBranding } from '../../../../core/context/BrandingContext';
import { toast } from '../../../../core/components/Toast';

// ════════════════════════════════════════════════════════════════════════════
// HOMEWORK PAGE - Uses useTermTheme for dynamic colors
// ════════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG = {
  done: { label: 'Done', color: '#10b981', icon: CheckCircle },
  partially_done: { label: 'Partial', color: '#f59e0b', icon: Clock },
  not_done: { label: 'Not Done', color: '#ef4444', icon: XCircle }
};

const HomeworkPage = () => {
  const { supabase, schoolId } = useApp();
  const { teacher } = useAuth();
  const { activeTerm, allTerms, loading: termsLoading } = useActiveTerm();
  const branding = useBranding();
  const theme = useTermTheme();

  // Helper to get color/name for any term number (NOT a hook)
  const getTermInfo = (termNumber) => {
    const colorKey = `term${termNumber}Color`;
    const nameKey = `term${termNumber}Name`;
    const color = branding[colorKey] || ['#3b82f6', '#ec4899', '#f59e0b'][termNumber - 1];
    const name = branding[nameKey] || ['Winter', 'Spring', 'Summer'][termNumber - 1];
    return { color, name };
  };

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTermNumber, setSelectedTermNumber] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [homework, setHomework] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentHomework, setStudentHomework] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(null);
  const [editingHomework, setEditingHomework] = useState(null);
  const [pageError, setPageError] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const showError = (msg) => { setPageError(msg); setTimeout(() => setPageError(''), 5000); };

  const mySubjects = teacher?.subjects || [];

  useEffect(() => {
    if (activeTerm && !selectedTermNumber) setSelectedTermNumber(activeTerm.term_number);
  }, [activeTerm, selectedTermNumber]);

  useEffect(() => { loadClasses(); loadSubjects(); }, []);

  useEffect(() => {
    if (selectedClass) loadStudents();
    else { setStudents([]); setHomework([]); }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedTermNumber) loadHomework();
  }, [selectedClass, selectedTermNumber]);

  const loadClasses = async () => {
    try {
      const { data } = await supabase.from('custom_classes').select('*').eq('is_active', true).order('class_name');
      setClasses(data || []);
    } catch (err) { console.error('Error loading classes:', err.message); }
  };

  const loadSubjects = async () => {
    try {
      const { data } = await supabase.from('custom_subjects').select('*').eq('is_active', true).order('subject_name');
      setSubjects((data || []).filter(s => mySubjects.includes(s.subject_name)));
    } catch (err) { console.error('Error loading subjects:', err.message); }
  };

  const loadStudents = async () => {
    try {
      // 🔒 Only fetch fields needed for homework tracking UI
      const { data } = await supabase.from('students').select('id, name, student_no, class_name').eq('class_name', selectedClass).eq('status', 'active').order('student_no');
      setStudents(data || []);
    } catch (err) { console.error('Error loading students:', err.message); }
  };

  const loadHomework = async () => {
    if (!selectedClass || !selectedTermNumber) return;
    setLoading(true);
    try {
      const { data: termData, error: e1 } = await supabase
        .from('homework')
        .select('*')
        .eq('class_name', selectedClass)
        .eq('term_number', selectedTermNumber)
        .in('subject', mySubjects)
        .order('due_date', { ascending: false });

      if (e1) throw e1;

      const { data: legacyData, error: e2 } = await supabase
        .from('homework')
        .select('*')
        .eq('class_name', selectedClass)
        .is('term_number', null)
        .in('subject', mySubjects)
        .order('due_date', { ascending: false });

      if (e2) throw e2;

      const currentTermData = allTerms.find(t => t.term_number === selectedTermNumber);
      const legacyForThisTerm = (legacyData || []).filter(h => {
        if (!currentTermData) return selectedTermNumber === 1;
        return h.due_date >= currentTermData.start_date && h.due_date <= currentTermData.end_date;
      });

      // Await legacy migration so state stays in sync
      if (legacyForThisTerm.length > 0) {
        await Promise.all(legacyForThisTerm.map(h =>
          supabase.from('homework').update({ term_number: selectedTermNumber }).eq('id', h.id)
        ));
      }

      const hw = [...(termData || []), ...legacyForThisTerm];
      setHomework(hw);

      if (hw.length > 0) {
        const ids = hw.map(h => h.id);
        const { data: shData } = await supabase
          .from('student_homework')
          .select('*')
          .in('homework_id', ids);

        const map = {};
        (shData || []).forEach(sh => {
          if (!map[sh.homework_id]) map[sh.homework_id] = {};
          map[sh.homework_id][sh.student_id] = sh;
        });
        setStudentHomework(map);
      } else {
        setStudentHomework({});
      }
    } catch (err) { console.error('Error loading homework:', err.message); }
    finally { setLoading(false); }
  };

  const handleAddHomework = async (formData) => {
    if (!activeTerm) { showError('No active term set. Configure academic terms first.'); return; }
    try {
      const hwId = `HW-${selectedClass}-${Date.now()}`;

      const record = {
        ...formData,
        homework_id: editingHomework ? editingHomework.homework_id : hwId,
        class_name: selectedClass,
        term_number: activeTerm.term_number,
        teacher_id: teacher?.user_id || null,
        created_at: new Date().toISOString()
      };

      if (editingHomework) {
        const { error } = await supabase.from('homework').update(record).eq('id', editingHomework.id);
        if (error) throw error;
      } else {
        // Insert and get back the new row so we can pre-seed student_homework
        const { data: newHw, error } = await supabase
          .from('homework')
          .insert([record])
          .select()
          .single();
        if (error) throw error;

        // Pre-seed a student_homework row (not_done) for every student in the
        // class so that grading only ever needs UPDATE — avoids INSERT RLS issues
        if (newHw?.id && students.length > 0) {
          const rows = students.map(s => ({
            homework_id: newHw.id,
            student_id: s.id,
            school_id: schoolId,
            status: 'not_done',
          }));
          // Ignore errors here — worst case grading still falls back to INSERT
          await supabase.from('student_homework').insert(rows);
        }
      }

      setShowAddModal(false);
      setEditingHomework(null);
      await loadHomework();
    } catch (err) {
      showError('Failed to save: ' + err.message);
    }
  };

  const handleDeleteHomework = (id) => {
    setConfirmAction({
      message: 'Delete this homework assignment? Student records will also be removed.',
      onConfirm: async () => {
        try {
          await supabase.from('student_homework').delete().eq('homework_id', id);
          await supabase.from('homework').delete().eq('id', id);
          await loadHomework();
        } catch (err) { showError('Failed to delete: ' + err.message); }
      }
    });
  };

  const handleUpdateStudentStatus = async (homeworkId, studentId, status) => {
    const submittedAt = status === 'done' ? new Date().toISOString() : null;

    // Optimistic update — change UI immediately, no waiting for reload
    setStudentHomework(prev => ({
      ...prev,
      [homeworkId]: {
        ...prev[homeworkId],
        [studentId]: {
          ...(prev[homeworkId]?.[studentId] || {}),
          status,
          submitted_at: submittedAt,
        },
      },
    }));

    try {
      const { error } = await supabase.rpc('upsert_student_homework', {
        p_homework_id:  homeworkId,
        p_student_id:   studentId,
        p_school_id:    schoolId,
        p_status:       status,
        p_submitted_at: submittedAt,
      });
      if (error) throw error;
    } catch (err) {
      // Revert optimistic update on failure
      showError('Failed to save: ' + err.message);
      await loadHomework();
    }
  };

  const filteredHomework = selectedSubject === 'all' ? homework : homework.filter(h => h.subject === selectedSubject);
  const hwSubjects = [...new Set(homework.map(h => h.subject))];
  const selectedTermData = allTerms.find(t => t.term_number === selectedTermNumber);
  const isActiveTerm = selectedTermNumber === activeTerm?.term_number;
  const isFinalized = selectedTermData?.is_finalized;

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getCompletionStats = (hwId) => {
    const shMap = studentHomework[hwId] || {};
    const total = students.length;
    const done = Object.values(shMap).filter(s => s.status === 'done').length;
    const partial = Object.values(shMap).filter(s => s.status === 'partially_done').length;
    const notDone = total - done - partial;
    return { total, done, partial, notDone, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  };

  return (
    <div className="space-y-5">
      {/* Inline error banner */}
      {pageError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span className="flex-1">{pageError}</span>
          <button onClick={() => setPageError('')} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList size={22} style={theme.textStyle} />
            Homework
          </h2>
          {activeTerm && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: theme.withAlpha(0.15), color: theme.color }}>
              <theme.icon size={14} />
              Active: {theme.name} Term
            </div>
          )}
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Class</label>
            <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject('all'); }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:outline-none">
              <option value="">Choose a class...</option>
              {classes.map(c => <option key={c.id} value={c.class_name}>{c.class_name}</option>)}
            </select>
          </div>
          <button onClick={() => { setEditingHomework(null); setShowAddModal(true); }}
            disabled={!selectedClass || subjects.length === 0 || !activeTerm || isFinalized}
            className="text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
            style={theme.gradientStyle}>
            <Plus size={16} /> Assign
          </button>
        </div>

        {!termsLoading && !activeTerm && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <AlertCircle size={14} />
            No active term. Go to Management → Academic Terms.
          </div>
        )}
      </div>

      {/* Term Tabs + Content */}
      {selectedClass && allTerms.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Term Tabs - Dynamic Colors */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {allTerms.map(term => {
              const termInfo = getTermInfo(term.term_number);
              const isSelected = selectedTermNumber === term.term_number;
              const isActive = activeTerm?.term_number === term.term_number;
              
              return (
                <button key={term.id} onClick={() => setSelectedTermNumber(term.term_number)}
                  className="flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors border-b-2"
                  style={{
                    backgroundColor: isSelected ? `${termInfo.color}15` : 'transparent',
                    color: isSelected ? termInfo.color : '#6b7280',
                    borderBottomColor: isSelected ? termInfo.color : 'transparent'
                  }}>
                  <span className="hidden sm:inline">Term {term.term_number}:</span> {termInfo.name}
                  {isActive && (
                    <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold ml-1"
                      style={{ backgroundColor: theme.color }}>ACTIVE</span>
                  )}
                  {term.is_finalized && (
                    <span className="text-[10px] bg-gray-400 text-white px-1.5 py-0.5 rounded-full font-bold ml-1">LOCKED</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subject Filter */}
          {hwSubjects.length > 0 && (
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              <Filter size={13} className="text-gray-400" />
              <button onClick={() => setSelectedSubject('all')}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                style={{
                  backgroundColor: selectedSubject === 'all' ? `${theme.color}20` : '#f3f4f6',
                  color: selectedSubject === 'all' ? theme.color : '#6b7280'
                }}>
                All
              </button>
              {hwSubjects.map(s => (
                <button key={s} onClick={() => setSelectedSubject(s)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: selectedSubject === s ? `${theme.color}20` : '#f3f4f6',
                    color: selectedSubject === s ? theme.color : '#6b7280'
                  }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Term info */}
          <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span>
              {selectedTermData && (
                <>
                  {new Date(selectedTermData.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {' – '}
                  {new Date(selectedTermData.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </>
              )}
            </span>
            <span>{filteredHomework.length} assignment{filteredHomework.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Homework List */}
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-3 rounded-full animate-spin"
                  style={{ borderColor: theme.withAlpha(0.3), borderTopColor: 'transparent' }}></div>
              </div>
            ) : filteredHomework.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-xl">
                <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">No homework for {getTermInfo(selectedTermNumber).name} Term{selectedSubject !== 'all' ? ` (${selectedSubject})` : ''}</p>
                {isActiveTerm && <p className="text-xs text-gray-400 mt-1">Click "Assign" to create one</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHomework.map(hw => {
                  const stats = getCompletionStats(hw.id);
                  const isOverdue = new Date(hw.due_date) < new Date();
                  const pctColor = stats.pct >= 80 ? '#10b981' : stats.pct >= 50 ? '#f59e0b' : '#ef4444';

                  return (
                    <div key={hw.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[11px] font-semibold">{hw.subject}</span>
                            <span className="font-semibold text-gray-800 text-sm truncate">{hw.title}</span>
                            {isOverdue && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">OVERDUE</span>}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-gray-500">
                            <span>Assigned: {new Date(hw.assigned_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                            <span className={isOverdue ? 'text-red-600 font-semibold' : 'font-medium'}>Due: {new Date(hw.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          {hw.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{hw.description}</p>}
                        </div>

                        <div className="flex items-center gap-2 ml-3">
                          <div className="text-right">
                            <span className="text-xs font-bold text-gray-700">{stats.done}/{stats.total}</span>
                            <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-0.5">
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${stats.pct}%`, backgroundColor: pctColor }}></div>
                            </div>
                          </div>

                          {!isFinalized && (
                            <div className="flex gap-1">
                              <button onClick={() => setShowStatusModal(hw)}
                                className="p-1.5 rounded-lg transition-colors" 
                                style={{ color: theme.color }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = theme.withAlpha(0.1)}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                title="Track completion">
                                <CheckCircle size={15} />
                              </button>
                              <button onClick={() => { setEditingHomework(hw); setShowAddModal(true); }}
                                className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Edit">
                                <Edit2 size={15} />
                              </button>
                              <button onClick={() => handleDeleteHomework(hw.id)}
                                className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-colors" title="Delete">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick student status pills */}
                      <div className="px-4 py-2 flex flex-wrap gap-1">
                        {students.map(s => {
                          const sh = studentHomework[hw.id]?.[s.id];
                          const status = sh?.status || 'not_done';
                          const cfg = STATUS_CONFIG[status];
                          return (
                            <span key={s.id} 
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                              style={{ 
                                backgroundColor: `${cfg.color}15`, 
                                color: cfg.color,
                                borderColor: `${cfg.color}30`
                              }}
                              title={`${s.name}: ${cfg.label}`}>
                              {getInitials(s.name)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* No terms */}
      {selectedClass && allTerms.length === 0 && !termsLoading && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-amber-200 text-center py-8">
          <AlertCircle size={40} className="mx-auto text-amber-400 mb-3" />
          <p className="text-gray-700 font-medium">Academic terms not configured</p>
          <p className="text-sm text-gray-500 mt-1">Go to Management → Academic Terms</p>
        </div>
      )}

      {/* ─── ADD/EDIT MODAL ──────────────────────────────── */}
      {showAddModal && (
        <HomeworkFormModal
          homework={editingHomework}
          subjects={subjects}
          activeTerm={activeTerm}
          theme={theme}
          onSave={handleAddHomework}
          onClose={() => { setShowAddModal(false); setEditingHomework(null); }}
        />
      )}

      {/* ─── STUDENT STATUS MODAL ────────────────────────── */}
      {showStatusModal && (
        <StudentStatusModal
          hw={showStatusModal}
          students={students}
          studentHomework={studentHomework[showStatusModal.id] || {}}
          theme={theme}
          onUpdate={handleUpdateStudentStatus}
          onClose={() => setShowStatusModal(null)}
          isFinalized={isFinalized}
        />
      )}

      {/* Confirm delete modal */}
      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
};

// ─── HOMEWORK FORM MODAL ─────────────────────────────────

const HomeworkFormModal = ({ homework, subjects, activeTerm, theme, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    title: homework?.title || '',
    description: homework?.description || '',
    subject: homework?.subject || '',
    assigned_date: homework?.assigned_date || new Date().toISOString().split('T')[0],
    due_date: homework?.due_date || '',
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.subject || !formData.due_date) {
      toast.warning('Please fill in title, subject and due date.');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">{homework ? 'Edit Homework' : 'Assign Homework'}</h3>
          {activeTerm && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: theme.withAlpha(0.15), color: theme.color }}>
              {theme.name} Term
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input type="text" placeholder="e.g., Chapter 5 Exercises" value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
            <select value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:outline-none">
              <option value="">Select...</option>
              {subjects.map(s => <option key={s.id} value={s.subject_name}>{s.subject_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea rows={3} placeholder="Optional details..." value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assigned Date</label>
              <input type="date" value={formData.assigned_date} onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
              <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={handleSubmit}
            className="flex-1 text-white py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
            style={theme.gradientStyle}>
            {homework ? 'Update' : 'Assign'}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── STUDENT STATUS MODAL ────────────────────────────────

const StudentStatusModal = ({ hw, students, studentHomework, theme, onUpdate, onClose, isFinalized }) => {
  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const statuses = ['done', 'partially_done', 'not_done'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800">{hw.title}</h3>
          <p className="text-xs text-gray-500">{hw.subject} • Due: {new Date(hw.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5">
          {students.map(student => {
            const sh = studentHomework[student.id];
            const currentStatus = sh?.status || 'not_done';

            return (
              <div key={student.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={theme.gradientStyle}>
                  <span className="text-white font-bold text-[10px]">{getInitials(student.name)}</span>
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800">{student.name}</span>

                {isFinalized ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold border"
                    style={{ 
                      backgroundColor: `${STATUS_CONFIG[currentStatus].color}15`,
                      color: STATUS_CONFIG[currentStatus].color,
                      borderColor: `${STATUS_CONFIG[currentStatus].color}30`
                    }}>
                    {STATUS_CONFIG[currentStatus].label}
                  </span>
                ) : (
                  <div className="flex gap-1">
                    {statuses.map(status => {
                      const cfg = STATUS_CONFIG[status];
                      const isActive = currentStatus === status;
                      return (
                        <button key={status} onClick={() => onUpdate(hw.id, student.id, status)}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium border transition-all"
                          style={{
                            backgroundColor: isActive ? `${cfg.color}15` : 'white',
                            color: isActive ? cfg.color : '#9ca3af',
                            borderColor: isActive ? `${cfg.color}30` : '#e5e7eb'
                          }}>
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={onClose}
          className="mt-4 w-full bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all">
          Done
        </button>
      </div>
    </div>
  );
};

export default HomeworkPage;