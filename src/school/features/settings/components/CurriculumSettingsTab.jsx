import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, BookOpen, Award, Edit2, Trash2, Check, X, Plus, 
  AlertCircle, CheckCircle, Settings, ChevronDown, ChevronUp,
  GraduationCap, Percent, RefreshCw
} from 'lucide-react';
import { supabase } from '../../../../core/infrastructure/supabaseClient';
import { useTenant } from '../../../../core/context/TenantContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';

// ============================================================================
// CURRICULUM SETTINGS TAB
// Unified management for Classes, Subjects, and Grading System
// Multi-tenant aware - all data filtered by school_id
// ============================================================================

// ─── Grading System Presets ──────────────────────────────────────────────────

const GRADING_PRESETS = {
  cambridge: {
    name: 'Cambridge (IGCSE)',
    description: 'A* to U grades',
    usePercentage: true,
    grades: [
      { id: '1', label: 'A*', min: 90, max: 100, color: '#10b981' },
      { id: '2', label: 'A', min: 80, max: 89, color: '#22c55e' },
      { id: '3', label: 'B', min: 70, max: 79, color: '#84cc16' },
      { id: '4', label: 'C', min: 60, max: 69, color: '#eab308' },
      { id: '5', label: 'D', min: 50, max: 59, color: '#f97316' },
      { id: '6', label: 'E', min: 40, max: 49, color: '#ef4444' },
      { id: '7', label: 'U', min: 0, max: 39, color: '#dc2626' },
    ]
  },
  serbian: {
    name: 'Serbian (1-5)',
    description: 'Odličan to Nedovoljan',
    usePercentage: true,
    grades: [
      { id: '1', label: '5', description: 'Odličan', min: 90, max: 100, color: '#10b981' },
      { id: '2', label: '4', description: 'Vrlo dobar', min: 75, max: 89, color: '#22c55e' },
      { id: '3', label: '3', description: 'Dobar', min: 60, max: 74, color: '#eab308' },
      { id: '4', label: '2', description: 'Dovoljan', min: 50, max: 59, color: '#f97316' },
      { id: '5', label: '1', description: 'Nedovoljan', min: 0, max: 49, color: '#ef4444' },
    ]
  },
  us_letter: {
    name: 'US Letter (A-F)',
    description: 'American system',
    usePercentage: true,
    grades: [
      { id: '1', label: 'A', min: 90, max: 100, color: '#10b981' },
      { id: '2', label: 'B', min: 80, max: 89, color: '#22c55e' },
      { id: '3', label: 'C', min: 70, max: 79, color: '#eab308' },
      { id: '4', label: 'D', min: 60, max: 69, color: '#f97316' },
      { id: '5', label: 'F', min: 0, max: 59, color: '#ef4444' },
    ]
  },
  descriptive: {
    name: 'Descriptive Only',
    description: 'Text-based, no percentages',
    usePercentage: false,
    grades: [
      { id: '1', label: 'Excellent', description: 'Outstanding work', color: '#10b981' },
      { id: '2', label: 'Very Good', description: 'Above expectations', color: '#22c55e' },
      { id: '3', label: 'Good', description: 'Meets expectations', color: '#eab308' },
      { id: '4', label: 'Satisfactory', description: 'Needs improvement', color: '#f97316' },
      { id: '5', label: 'Unsatisfactory', description: 'Below expectations', color: '#ef4444' },
    ]
  },
  custom: {
    name: 'Custom',
    description: 'Build your own',
    usePercentage: true,
    grades: []
  }
};

const GRADE_COLORS = [
  '#10b981', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#dc2626',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'
];

// ─── Alert Component ─────────────────────────────────────────────────────────

const Alert = ({ type, message, onDismiss }) => {
  if (!message) return null;
  
  const styles = {
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: CheckCircle },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertCircle },
  };
  
  const style = styles[type] || styles.error;
  const Icon = style.icon;
  
  return (
    <div className={`${style.bg} ${style.border} border rounded-xl p-3 flex items-center gap-2 mt-3`}>
      <Icon size={16} className={style.text} />
      <p className={`text-sm flex-1 ${style.text}`}>{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className={`${style.text} hover:opacity-70`}>
          <X size={14} />
        </button>
      )}
    </div>
  );
};

// ─── Section Header ──────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, count, expanded, onToggle, theme }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-t-xl"
  >
    <div className="flex items-center gap-3">
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: theme.withAlpha(0.15) }}
      >
        <Icon size={20} style={{ color: theme.color }} />
      </div>
      <div className="text-left">
        <h3 className="font-bold text-gray-800">{title}</h3>
        <p className="text-xs text-gray-500">{count} items</p>
      </div>
    </div>
    {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
  </button>
);

// ─── Editable Item Row ───────────────────────────────────────────────────────

const EditableItem = ({ item, nameKey, isEditing, editValue, onEditChange, onSave, onCancel, onEdit, onDelete, theme }) => {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl border" style={{ backgroundColor: theme.withAlpha(0.05), borderColor: theme.withAlpha(0.2) }}>
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSave()}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': theme.withAlpha(0.3) }}
          autoFocus
        />
        <button onClick={onSave} className="p-2 rounded-lg text-white" style={{ backgroundColor: theme.color }}>
          <Check size={16} />
        </button>
        <button onClick={onCancel} className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-sm"
      style={{ backgroundColor: theme.withAlpha(0.05), borderColor: theme.withAlpha(0.15) }}
    >
      <span className="font-medium text-gray-800">{item[nameKey]}</span>
      <div className="flex gap-1">
        <button onClick={onEdit} className="p-2 rounded-lg text-gray-400 hover:bg-white hover:text-blue-600 transition-colors">
          <Edit2 size={14} />
        </button>
        <button onClick={onDelete} className="p-2 rounded-lg text-gray-400 hover:bg-white hover:text-red-500 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── Custom Grade Editor ─────────────────────────────────────────────────────

const CustomGradeEditor = ({ grade, index, usePercentage, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
      {/* Color picker */}
      <input
        type="color"
        value={grade.color}
        onChange={(e) => onUpdate({ ...grade, color: e.target.value })}
        className="w-8 h-8 rounded-lg cursor-pointer border-0"
      />
      
      {/* Label (grade name) */}
      <input
        type="text"
        value={grade.label}
        onChange={(e) => onUpdate({ ...grade, label: e.target.value })}
        placeholder="Grade"
        className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-center"
      />
      
      {/* Description */}
      <input
        type="text"
        value={grade.description || ''}
        onChange={(e) => onUpdate({ ...grade, description: e.target.value })}
        placeholder="Description (optional)"
        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
      />
      
      {/* Percentage range (if enabled) */}
      {usePercentage && (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={grade.min ?? ''}
            onChange={(e) => onUpdate({ ...grade, min: parseInt(e.target.value) || 0 })}
            placeholder="0"
            className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center"
            min="0"
            max="100"
          />
          <span className="text-gray-400 text-sm">-</span>
          <input
            type="number"
            value={grade.max ?? ''}
            onChange={(e) => onUpdate({ ...grade, max: parseInt(e.target.value) || 100 })}
            placeholder="100"
            className="w-14 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center"
            min="0"
            max="100"
          />
          <Percent size={14} className="text-gray-400" />
        </div>
      )}
      
      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
        >
          <ChevronDown size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ─── Grade Display Row (read-only) ───────────────────────────────────────────

const GradeDisplayRow = ({ grade, usePercentage }) => (
  <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
    <div 
      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
      style={{ backgroundColor: grade.color }}
    >
      {grade.label}
    </div>
    <div className="flex-1">
      {grade.description && <p className="text-sm text-gray-600">{grade.description}</p>}
    </div>
    {usePercentage && grade.min !== undefined && (
      <span className="text-sm text-gray-500 font-medium">
        {grade.min}% - {grade.max}%
      </span>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const CurriculumSettingsTab = () => {
  const { schoolId } = useTenant();
  const theme = useTermTheme();

  // ─── State ─────────────────────────────────────────────────────────────────
  
  // Classes
  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [editingClassId, setEditingClassId] = useState(null);
  const [editClassName, setEditClassName] = useState('');
  const [classesExpanded, setClassesExpanded] = useState(true);
  
  // Subjects
  const [subjects, setSubjects] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [subjectsExpanded, setSubjectsExpanded] = useState(true);
  
  // Grading
  const [gradingSystem, setGradingSystem] = useState('cambridge');
  const [gradingConfig, setGradingConfig] = useState({
    usePercentage: true,
    grades: []
  });
  const [editingGrades, setEditingGrades] = useState(false);
  const [gradingExpanded, setGradingExpanded] = useState(true);
  
  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  // ─── Load Data ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!schoolId) return;
    
    try {
      setLoading(true);
      
      // Load classes
      const { data: classesData } = await supabase
        .from('custom_classes')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('class_name');
      
      // Load subjects
      const { data: subjectsData } = await supabase
        .from('custom_subjects')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_active', true)
        .order('subject_name');
      
      // Load school grading settings
      const { data: schoolData } = await supabase
        .from('schools')
        .select('grading_system, grading_config')
        .eq('id', schoolId)
        .single();
      
      setClasses(classesData || []);
      setSubjects(subjectsData || []);
      
      if (schoolData) {
        setGradingSystem(schoolData.grading_system || 'cambridge');
        if (schoolData.grading_config) {
          setGradingConfig(schoolData.grading_config);
        } else {
          // Default to cambridge preset
          setGradingConfig({
            usePercentage: GRADING_PRESETS.cambridge.usePercentage,
            grades: GRADING_PRESETS.cambridge.grades
          });
        }
      }
      
    } catch (error) {
      console.error('Error loading curriculum data:', error);
      showAlert('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert({ type: '', message: '' }), 4000);
  };

  // ─── Classes CRUD ──────────────────────────────────────────────────────────

  const handleAddClass = async () => {
    if (!newClassName.trim() || !schoolId) return;
    
    try {
      const { data, error } = await supabase
        .from('custom_classes')
        .insert([{ class_name: newClassName.trim(), school_id: schoolId }])
        .select();
      
      if (error) {
        if (error.code === '23505') throw new Error('This class already exists');
        throw error;
      }
      
      setClasses([...classes, data[0]]);
      setNewClassName('');
      showAlert('success', 'Class added!');
    } catch (err) {
      showAlert('error', err.message);
    }
  };

  const handleUpdateClass = async (classId) => {
    if (!editClassName.trim()) return;
    
    const oldClass = classes.find(c => c.id === classId);
    const oldName = oldClass?.class_name;
    const newName = editClassName.trim();
    
    try {
      setSaving(true);
      
      // Update class name
      const { error: classError } = await supabase
        .from('custom_classes')
        .update({ class_name: newName })
        .eq('id', classId)
        .eq('school_id', schoolId);
      
      if (classError) throw classError;
      
      // CASCADE: Update all students with old class name
      if (oldName && oldName !== newName) {
        const { error: studentsError } = await supabase
          .from('students')
          .update({ class_name: newName })
          .eq('class_name', oldName)
          .eq('school_id', schoolId);
        
        if (studentsError) {
          console.error('Error updating students:', studentsError);
        }
      }
      
      setClasses(classes.map(c => c.id === classId ? { ...c, class_name: newName } : c));
      setEditingClassId(null);
      setEditClassName('');
      showAlert('success', 'Class updated! Students reassigned.');
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    const cls = classes.find(c => c.id === classId);
    if (!window.confirm(`Deactivate "${cls?.class_name}"? Students in this class will NOT be affected.`)) return;
    
    try {
      const { error } = await supabase
        .from('custom_classes')
        .update({ is_active: false })
        .eq('id', classId)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      setClasses(classes.filter(c => c.id !== classId));
      showAlert('success', 'Class deactivated');
    } catch (err) {
      showAlert('error', err.message);
    }
  };

  // ─── Subjects CRUD ─────────────────────────────────────────────────────────

  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !schoolId) return;
    
    try {
      const { data, error } = await supabase
        .from('custom_subjects')
        .insert([{ subject_name: newSubjectName.trim(), school_id: schoolId }])
        .select();
      
      if (error) {
        if (error.code === '23505') throw new Error('This subject already exists');
        throw error;
      }
      
      setSubjects([...subjects, data[0]]);
      setNewSubjectName('');
      showAlert('success', 'Subject added!');
    } catch (err) {
      showAlert('error', err.message);
    }
  };

  const handleUpdateSubject = async (subjectId) => {
    if (!editSubjectName.trim()) return;
    
    try {
      const { error } = await supabase
        .from('custom_subjects')
        .update({ subject_name: editSubjectName.trim() })
        .eq('id', subjectId)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      setSubjects(subjects.map(s => s.id === subjectId ? { ...s, subject_name: editSubjectName.trim() } : s));
      setEditingSubjectId(null);
      setEditSubjectName('');
      showAlert('success', 'Subject updated!');
    } catch (err) {
      showAlert('error', err.message);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    const subj = subjects.find(s => s.id === subjectId);
    if (!window.confirm(`Deactivate "${subj?.subject_name}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('custom_subjects')
        .update({ is_active: false })
        .eq('id', subjectId)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      setSubjects(subjects.filter(s => s.id !== subjectId));
      showAlert('success', 'Subject deactivated');
    } catch (err) {
      showAlert('error', err.message);
    }
  };

  // ─── Grading System ────────────────────────────────────────────────────────

  const handleGradingSystemChange = (system) => {
    setGradingSystem(system);
    const preset = GRADING_PRESETS[system];
    if (preset && system !== 'custom') {
      setGradingConfig({
        usePercentage: preset.usePercentage,
        grades: preset.grades.map(g => ({ ...g })) // Clone grades
      });
    }
    // For custom, keep existing config or start fresh
    if (system === 'custom' && (!gradingConfig?.grades || gradingConfig.grades.length === 0)) {
      setGradingConfig({
        usePercentage: true,
        grades: []
      });
      setEditingGrades(true);
    }
  };

  const handleTogglePercentage = () => {
    setGradingConfig(prev => ({
      ...prev,
      usePercentage: !prev.usePercentage
    }));
  };

  const handleGradeUpdate = (index, updatedGrade) => {
    const newGrades = [...(gradingConfig?.grades || [])];
    newGrades[index] = updatedGrade;
    setGradingConfig({ ...gradingConfig, grades: newGrades });
  };

  const handleAddGrade = () => {
    const newGrade = {
      id: Date.now().toString(),
      label: '',
      description: '',
      color: GRADE_COLORS[gradingConfig.grades.length % GRADE_COLORS.length],
      min: 0,
      max: 100
    };
    setGradingConfig(prev => ({
      ...prev,
      grades: [...(prev.grades || []), newGrade]
    }));
  };

  const handleDeleteGrade = (index) => {
    setGradingConfig(prev => ({
      ...prev,
      grades: prev.grades.filter((_, i) => i !== index)
    }));
  };

  const handleMoveGrade = (index, direction) => {
    const newGrades = [...gradingConfig.grades];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newGrades.length) return;
    [newGrades[index], newGrades[newIndex]] = [newGrades[newIndex], newGrades[index]];
    setGradingConfig(prev => ({ ...prev, grades: newGrades }));
  };

  const handleSaveGrading = async () => {
    if (!schoolId) return;
    
    // Validate
    if (gradingConfig.grades.length === 0) {
      showAlert('error', 'Please add at least one grade');
      return;
    }
    
    const hasEmptyLabels = gradingConfig.grades.some(g => !g.label?.trim());
    if (hasEmptyLabels) {
      showAlert('error', 'All grades must have a label');
      return;
    }
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('schools')
        .update({
          grading_system: gradingSystem,
          grading_config: gradingConfig
        })
        .eq('id', schoolId);
      
      if (error) throw error;
      
      setEditingGrades(false);
      showAlert('success', 'Grading system saved!');
    } catch (err) {
      showAlert('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={24} className="animate-spin" style={{ color: theme.color }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert */}
      <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ type: '', message: '' })} />

      {/* ═══ CLASSES SECTION ═══ */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: theme.withAlpha(0.2) }}>
        <SectionHeader
          icon={Users}
          title="Classes"
          count={classes.length}
          expanded={classesExpanded}
          onToggle={() => setClassesExpanded(!classesExpanded)}
          theme={theme}
        />
        
        {classesExpanded && (
          <div className="p-4 pt-0 space-y-3">
            {/* Add new */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddClass()}
                placeholder="e.g., Y5A, Y6B..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': theme.withAlpha(0.3) }}
              />
              <button
                onClick={handleAddClass}
                disabled={!newClassName.trim()}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-all"
                style={{ backgroundColor: theme.color }}
              >
                <Plus size={18} />
              </button>
            </div>
            
            {/* List */}
            {classes.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-4 text-center">No classes yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {classes.map(cls => (
                  <EditableItem
                    key={cls.id}
                    item={cls}
                    nameKey="class_name"
                    isEditing={editingClassId === cls.id}
                    editValue={editClassName}
                    onEditChange={setEditClassName}
                    onSave={() => handleUpdateClass(cls.id)}
                    onCancel={() => { setEditingClassId(null); setEditClassName(''); }}
                    onEdit={() => { setEditingClassId(cls.id); setEditClassName(cls.class_name); }}
                    onDelete={() => handleDeleteClass(cls.id)}
                    theme={theme}
                  />
                ))}
              </div>
            )}
            
            <p className="text-xs text-gray-400">
              💡 Renaming a class will update all students in that class automatically.
            </p>
          </div>
        )}
      </div>

      {/* ═══ SUBJECTS SECTION ═══ */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: theme.withAlpha(0.2) }}>
        <SectionHeader
          icon={BookOpen}
          title="Subjects"
          count={subjects.length}
          expanded={subjectsExpanded}
          onToggle={() => setSubjectsExpanded(!subjectsExpanded)}
          theme={theme}
        />
        
        {subjectsExpanded && (
          <div className="p-4 pt-0 space-y-3">
            {/* Add new */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
                placeholder="e.g., Mathematics, Science..."
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
              />
              <button
                onClick={handleAddSubject}
                disabled={!newSubjectName.trim()}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50 transition-all"
                style={{ backgroundColor: theme.color }}
              >
                <Plus size={18} />
              </button>
            </div>
            
            {/* List */}
            {subjects.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-4 text-center">No subjects yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {subjects.map(subj => (
                  <EditableItem
                    key={subj.id}
                    item={subj}
                    nameKey="subject_name"
                    isEditing={editingSubjectId === subj.id}
                    editValue={editSubjectName}
                    onEditChange={setEditSubjectName}
                    onSave={() => handleUpdateSubject(subj.id)}
                    onCancel={() => { setEditingSubjectId(null); setEditSubjectName(''); }}
                    onEdit={() => { setEditingSubjectId(subj.id); setEditSubjectName(subj.subject_name); }}
                    onDelete={() => handleDeleteSubject(subj.id)}
                    theme={theme}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ GRADING SYSTEM SECTION ═══ */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: theme.withAlpha(0.2) }}>
        <SectionHeader
          icon={Award}
          title="Grading System"
          count={gradingConfig?.grades?.length || 0}
          expanded={gradingExpanded}
          onToggle={() => setGradingExpanded(!gradingExpanded)}
          theme={theme}
        />
        
        {gradingExpanded && (
          <div className="p-4 pt-0 space-y-4">
            {/* System selector */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(GRADING_PRESETS).map(([key, system]) => (
                <button
                  key={key}
                  onClick={() => handleGradingSystemChange(key)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    gradingSystem === key 
                      ? 'border-current shadow-sm' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={gradingSystem === key ? { borderColor: theme.color, backgroundColor: theme.withAlpha(0.05) } : {}}
                >
                  <p className="font-semibold text-sm text-gray-800">{system.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{system.description}</p>
                </button>
              ))}
            </div>
            
            {/* Options */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Percent size={16} className="text-gray-500" />
                <span className="text-sm text-gray-700">Use percentage ranges</span>
              </div>
              <button
                onClick={handleTogglePercentage}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  gradingConfig?.usePercentage ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span 
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    gradingConfig?.usePercentage ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
            
            {/* Edit/View toggle */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">
                {editingGrades ? 'Edit Grades' : 'Grade Scale'}
              </h4>
              <button
                onClick={() => setEditingGrades(!editingGrades)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                style={{ color: theme.color, backgroundColor: theme.withAlpha(0.1) }}
              >
                {editingGrades ? <><X size={12} /> Cancel</> : <><Edit2 size={12} /> Edit</>}
              </button>
            </div>
            
            {/* Grades list */}
            {editingGrades ? (
              <div className="space-y-2">
                {gradingConfig?.grades?.map((grade, idx) => (
                  <CustomGradeEditor
                    key={grade.id || idx}
                    grade={grade}
                    index={idx}
                    usePercentage={gradingConfig.usePercentage}
                    onUpdate={(updated) => handleGradeUpdate(idx, updated)}
                    onDelete={() => handleDeleteGrade(idx)}
                    onMoveUp={() => handleMoveGrade(idx, -1)}
                    onMoveDown={() => handleMoveGrade(idx, 1)}
                    isFirst={idx === 0}
                    isLast={idx === gradingConfig.grades.length - 1}
                  />
                ))}
                
                {/* Add new grade button */}
                <button
                  onClick={handleAddGrade}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Add Grade
                </button>
                
                {/* Save button */}
                <button
                  onClick={handleSaveGrading}
                  disabled={saving}
                  className="w-full py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: theme.color }}
                >
                  {saving ? (
                    <><RefreshCw size={16} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Check size={16} /> Save Grading System</>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {gradingConfig?.grades?.length > 0 ? (
                  gradingConfig.grades.map((grade, idx) => (
                    <GradeDisplayRow 
                      key={grade.id || idx} 
                      grade={grade} 
                      usePercentage={gradingConfig.usePercentage}
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic py-4 text-center">
                    No grades defined. Click Edit to add grades.
                  </p>
                )}
              </div>
            )}
            
            {/* Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-800">
                <strong>💡 Tip:</strong> {gradingConfig?.usePercentage 
                  ? 'Percentages determine which grade a score receives. Make sure ranges don\'t overlap.'
                  : 'Without percentages, teachers will select grades directly from this list.'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurriculumSettingsTab;