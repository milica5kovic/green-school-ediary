import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, BookOpen, Award, Edit2, Trash2, Check, X, Plus,
  AlertCircle, CheckCircle, ChevronDown, ChevronUp, RefreshCw, Percent
} from 'lucide-react';
import { supabase } from '../../../../core/infrastructure/supabaseClient';
import { useTenant } from '../../../../core/context/TenantContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';

// ============================================================================
// CURRICULUM SETTINGS TAB
// Unified management for Classes, Subjects, and Grading System
// Multi-tenant aware - all data filtered by school_id
// ============================================================================

// ─── Default Grading Configs ─────────────────────────────────────────────────

const DEFAULT_PRIMARY_BANDS = {
  usePercentage: true,
  grades: [
    { id: '1',  label: 'A+', min: 95, max: 100, color: '#059669' },
    { id: '2',  label: 'A',  min: 90, max: 94,  color: '#10b981' },
    { id: '3',  label: 'A-', min: 85, max: 89,  color: '#34d399' },
    { id: '4',  label: 'B+', min: 80, max: 84,  color: '#22c55e' },
    { id: '5',  label: 'B',  min: 75, max: 79,  color: '#84cc16' },
    { id: '6',  label: 'B-', min: 70, max: 74,  color: '#a3e635' },
    { id: '7',  label: 'C+', min: 65, max: 69,  color: '#eab308' },
    { id: '8',  label: 'C',  min: 60, max: 64,  color: '#f59e0b' },
    { id: '9',  label: 'C-', min: 55, max: 59,  color: '#f97316' },
    { id: '10', label: 'D+', min: 50, max: 54,  color: '#fb923c' },
    { id: '11', label: 'D',  min: 45, max: 49,  color: '#ef4444' },
    { id: '12', label: 'D-', min: 40, max: 44,  color: '#dc2626' },
  ]
};

const DEFAULT_IGCSE_GRADES = {
  usePercentage: true,
  grades: [
    { id: '1', label: 'A*', description: 'Outstanding',  min: 90, max: 100, color: '#10b981' },
    { id: '2', label: 'A',  description: 'Excellent',    min: 80, max: 89,  color: '#22c55e' },
    { id: '3', label: 'B',  description: 'Very Good',    min: 70, max: 79,  color: '#84cc16' },
    { id: '4', label: 'C',  description: 'Good',         min: 60, max: 69,  color: '#eab308' },
    { id: '5', label: 'D',  description: 'Satisfactory', min: 50, max: 59,  color: '#f97316' },
    { id: '6', label: 'E',  description: 'Marginal',     min: 40, max: 49,  color: '#ef4444' },
    { id: '7', label: 'U',  description: 'Ungraded',     min: 0,  max: 39,  color: '#dc2626' },
  ]
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

// ─── Grading Tier Panel ──────────────────────────────────────────────────────

const GradingTierPanel = ({
  title, years, subtitle, badge,
  config, editing, saving, theme,
  onToggleEdit, onUpdate, onAdd, onDelete, onMove, onSave,
}) => (
  <div className="space-y-3">
    {/* Header row */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-800">{title}</h4>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge}`}>
              {years}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={onToggleEdit}
        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
        style={{ color: theme.color, backgroundColor: theme.withAlpha(0.1) }}
      >
        {editing ? <><X size={12} /> Cancel</> : <><Edit2 size={12} /> Edit</>}
      </button>
    </div>

    {/* Grades */}
    {editing ? (
      <div className="space-y-2">
        {config.grades.map((grade, idx) => (
          <CustomGradeEditor
            key={grade.id || idx}
            grade={grade}
            index={idx}
            usePercentage={config.usePercentage}
            onUpdate={(updated) => onUpdate(idx, updated)}
            onDelete={() => onDelete(idx)}
            onMoveUp={() => onMove(idx, -1)}
            onMoveDown={() => onMove(idx, 1)}
            isFirst={idx === 0}
            isLast={idx === config.grades.length - 1}
          />
        ))}

        <button
          onClick={onAdd}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={15} /> Add Grade
        </button>

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: theme.color }}
        >
          {saving
            ? <><RefreshCw size={15} className="animate-spin" /> Saving...</>
            : <><Check size={15} /> Save</>
          }
        </button>
      </div>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {config.grades.map((grade, idx) => (
          <div
            key={grade.id || idx}
            className="flex items-center gap-2 p-2 rounded-xl border bg-gray-50"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
              style={{ backgroundColor: grade.color }}
            >
              {grade.label}
            </div>
            <div className="min-w-0">
              {grade.description && (
                <p className="text-xs text-gray-600 truncate">{grade.description}</p>
              )}
              {grade.min !== undefined && config.usePercentage && (
                <p className="text-[10px] text-gray-400">{grade.min}–{grade.max}%</p>
              )}
            </div>
          </div>
        ))}
      </div>
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
  
  // Grading — two fixed tiers
  const [primaryConfig, setPrimaryConfig] = useState(DEFAULT_PRIMARY_BANDS);
  const [secondaryConfig, setSecondaryConfig] = useState(DEFAULT_IGCSE_GRADES);
  const [editingPrimary, setEditingPrimary] = useState(false);
  const [editingSecondary, setEditingSecondary] = useState(false);
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
      
      if (schoolData?.grading_config) {
        const cfg = schoolData.grading_config;
        // Support nested { primary, secondary } shape or legacy flat shape
        if (cfg.primary) setPrimaryConfig(cfg.primary);
        if (cfg.secondary) setSecondaryConfig(cfg.secondary);
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

  // ─── Grading Helpers (shared, tier = 'primary' | 'secondary') ─────────────

  const getConfig = (tier) => tier === 'primary' ? primaryConfig : secondaryConfig;
  const setConfig = (tier, val) => tier === 'primary' ? setPrimaryConfig(val) : setSecondaryConfig(val);

  const handleGradeUpdate = (tier, index, updatedGrade) => {
    const cfg = getConfig(tier);
    const newGrades = [...cfg.grades];
    newGrades[index] = updatedGrade;
    setConfig(tier, { ...cfg, grades: newGrades });
  };

  const handleAddGrade = (tier) => {
    const cfg = getConfig(tier);
    const newGrade = {
      id: Date.now().toString(),
      label: '',
      description: '',
      color: GRADE_COLORS[cfg.grades.length % GRADE_COLORS.length],
      min: 0,
      max: 100,
    };
    setConfig(tier, { ...cfg, grades: [...cfg.grades, newGrade] });
  };

  const handleDeleteGrade = (tier, index) => {
    const cfg = getConfig(tier);
    setConfig(tier, { ...cfg, grades: cfg.grades.filter((_, i) => i !== index) });
  };

  const handleMoveGrade = (tier, index, direction) => {
    const cfg = getConfig(tier);
    const newGrades = [...cfg.grades];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newGrades.length) return;
    [newGrades[index], newGrades[newIndex]] = [newGrades[newIndex], newGrades[index]];
    setConfig(tier, { ...cfg, grades: newGrades });
  };

  const handleSaveGrading = async (tier) => {
    if (!schoolId) return;

    const cfg = getConfig(tier);

    if (!cfg.grades.length) {
      showAlert('error', 'Please add at least one grade');
      return;
    }
    if (cfg.grades.some(g => !g.label?.trim())) {
      showAlert('error', 'All grades must have a label');
      return;
    }

    try {
      setSaving(true);

      // Merge both tiers into grading_config
      const merged = {
        primary: tier === 'primary' ? cfg : primaryConfig,
        secondary: tier === 'secondary' ? cfg : secondaryConfig,
      };

      const { error } = await supabase
        .from('schools')
        .update({ grading_system: 'dual', grading_config: merged })
        .eq('id', schoolId);

      if (error) throw error;

      if (tier === 'primary') setEditingPrimary(false);
      else setEditingSecondary(false);

      showAlert('success', `${tier === 'primary' ? 'Primary' : 'Secondary'} grading saved!`);
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
          count={primaryConfig.grades.length + secondaryConfig.grades.length}
          expanded={gradingExpanded}
          onToggle={() => setGradingExpanded(!gradingExpanded)}
          theme={theme}
        />

        {gradingExpanded && (
          <div className="p-4 pt-0 space-y-5">

            {/* ── PRIMARY (Y1–Y6) ── */}
            <GradingTierPanel
              title="Primary"
              years="Y1 – Y6"
              subtitle="Band System (1–6)"
              badge="bg-emerald-50 text-emerald-700 border-emerald-200"
              config={primaryConfig}
              editing={editingPrimary}
              saving={saving}
              theme={theme}
              onToggleEdit={() => setEditingPrimary(e => !e)}
              onUpdate={(idx, g) => handleGradeUpdate('primary', idx, g)}
              onAdd={() => handleAddGrade('primary')}
              onDelete={(idx) => handleDeleteGrade('primary', idx)}
              onMove={(idx, dir) => handleMoveGrade('primary', idx, dir)}
              onSave={() => handleSaveGrading('primary')}
            />

            <div className="border-t border-gray-100" />

            {/* ── LOWER SECONDARY (Y7–Y9) ── */}
            <GradingTierPanel
              title="Lower Secondary"
              years="Y7 – Y9"
              subtitle="IGCSE (A* – U)"
              badge="bg-blue-50 text-blue-700 border-blue-200"
              config={secondaryConfig}
              editing={editingSecondary}
              saving={saving}
              theme={theme}
              onToggleEdit={() => setEditingSecondary(e => !e)}
              onUpdate={(idx, g) => handleGradeUpdate('secondary', idx, g)}
              onAdd={() => handleAddGrade('secondary')}
              onDelete={(idx) => handleDeleteGrade('secondary', idx)}
              onMove={(idx, dir) => handleMoveGrade('secondary', idx, dir)}
              onSave={() => handleSaveGrading('secondary')}
            />

          </div>
        )}
      </div>
    </div>
  );
};

export default CurriculumSettingsTab;