import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Zap, Clock, MessageSquare, ChevronDown, Star, 
  AlertTriangle, Check, Loader2, Users, User, X, Activity,
  Minus, Plus, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useTenant } from '../../../../core/context/TenantContext';
import { supabase as rawSupabase } from '../../../../core/infrastructure/supabaseClient';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { toast } from '../../../../core/components/Toast';

// ============================================================================
// ACTIVITY TRACKER PAGE
// Matches HomePage style - compact term banner, clean layout
// ============================================================================

const THRESHOLD = 3;

const QUICK_ACTIONS = [
  { id: 'participation', label: 'Participation', type: 'plus',  icon: Zap },
  { id: 'homework',      label: 'HW Missing',    type: 'minus', icon: BookOpen },
  { id: 'late',          label: 'Late',          type: 'minus', icon: Clock },
  { id: 'helpful',       label: 'Helpful',       type: 'plus',  icon: Users },
];

const getScore = (logs = []) => logs.reduce((acc, l) => acc + (l.type === 'plus' ? 1 : -1), 0);
const getUnnotified = (logs = [], type) => logs.filter(l => l.type === type && !l.notified).length;
const initials = (name) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
const formatDateKey = (date) => new Date(date).toISOString().split('T')[0];
const isToday = (date) => formatDateKey(date) === formatDateKey(new Date());

// ─── Date Navigator (inline, compact) ────────────────────────────────────────

const DateNav = ({ date, onChange, theme }) => {
  const goBack = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    onChange(d);
  };
  const goForward = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) onChange(d);
  };

  const label = isToday(date) 
    ? 'Today' 
    : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={goBack} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
        <ChevronLeft size={16} />
      </button>
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white min-w-[120px] justify-center"
        style={{ borderColor: isToday(date) ? theme.color : '#e5e7eb' }}
      >
        <Calendar size={14} style={{ color: theme.color }} />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <button 
        onClick={goForward} 
        disabled={isToday(date)}
        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
      {!isToday(date) && (
        <button
          onClick={() => onChange(new Date())}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white"
          style={{ backgroundColor: theme.color }}
        >
          Today
        </button>
      )}
    </div>
  );
};

// ─── Notification Banner ─────────────────────────────────────────────────────

const NotificationBanner = ({ type, studentName, onDismiss, onAck }) => {
  const isPos = type === 'plus';
  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-xl border"
      style={{ backgroundColor: isPos ? '#f0fdf4' : '#fef2f2', borderColor: isPos ? '#86efac' : '#fca5a5' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: isPos ? '#dcfce7' : '#fee2e2' }}>
        {isPos ? <Star size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-red-500" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold" style={{ color: isPos ? '#15803d' : '#b91c1c' }}>
          {isPos ? '🌟 A* Candidate' : '⚠️ Needs Attention'} — {studentName}
        </p>
      </div>
      <button onClick={onAck} className="px-3 py-1.5 text-xs font-bold text-white rounded-lg" style={{ backgroundColor: isPos ? '#16a34a' : '#dc2626' }}>
        <Check size={12} className="inline mr-1" />Noted
      </button>
      <button onClick={onDismiss} className="w-7 h-7 rounded-lg bg-black/5 flex items-center justify-center text-gray-400">
        <X size={14} />
      </button>
    </div>
  );
};

// ─── Student Row ─────────────────────────────────────────────────────────────

const StudentRow = ({ student, logs = [], onLog, theme, isSaving }) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customType, setCustomType] = useState('plus');
  const [expanded, setExpanded] = useState(false);

  const score = getScore(logs);
  const plusCount = getUnnotified(logs, 'plus');
  const minusCount = getUnnotified(logs, 'minus');
  const atPlus = plusCount >= THRESHOLD;
  const atMinus = minusCount >= THRESHOLD;

  const submit = () => {
    if (!customText.trim()) return;
    onLog(student.id, student.class_name, customType, customText.trim());
    setCustomText('');
    setShowCustom(false);
  };

  return (
    <div 
      className="bg-white rounded-2xl border-2 overflow-hidden transition-all"
      style={{ 
        borderColor: atPlus ? '#86efac' : atMinus ? '#fca5a5' : '#f3f4f6',
        boxShadow: (atPlus || atMinus) ? `0 2px 12px ${atPlus ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}` : 'none'
      }}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: theme.color }}>
            {initials(student.name)}
          </div>
          {isSaving && (
            <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center">
              <Loader2 size={14} className="animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{student.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {plusCount > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+{plusCount}</span>}
            {minusCount > 0 && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">-{minusCount}</span>}
          </div>
        </div>

        {/* Score */}
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
          style={{ 
            backgroundColor: score > 0 ? '#dcfce7' : score < 0 ? '#fee2e2' : '#f3f4f6',
            color: score > 0 ? '#16a34a' : score < 0 ? '#dc2626' : '#6b7280'
          }}
        >
          {score > 0 ? `+${score}` : score}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {QUICK_ACTIONS.map(a => {
            const Icon = a.icon;
            const isPlus = a.type === 'plus';
            return (
              <button
                key={a.id}
                onClick={() => onLog(student.id, student.class_name, a.type, a.label)}
                disabled={isSaving}
                title={a.label}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                style={{ backgroundColor: isPlus ? '#f0fdf4' : '#fef2f2', color: isPlus ? '#16a34a' : '#dc2626' }}
              >
                <Icon size={14} />
              </button>
            );
          })}
          <button
            onClick={() => setShowCustom(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ backgroundColor: showCustom ? theme.withAlpha(0.15) : '#f9fafb', color: showCustom ? theme.color : '#9ca3af' }}
          >
            <MessageSquare size={14} />
          </button>
          {logs.length > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
            >
              <ChevronDown size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Custom Input */}
      {showCustom && (
        <div className="px-3 pb-3 flex items-center gap-2 border-t border-gray-50 pt-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-bold">
            <button onClick={() => setCustomType('plus')} className="px-2.5 py-1" style={customType === 'plus' ? { backgroundColor: '#16a34a', color: '#fff' } : { color: '#9ca3af' }}>+</button>
            <button onClick={() => setCustomType('minus')} className="px-2.5 py-1" style={customType === 'minus' ? { backgroundColor: '#dc2626', color: '#fff' } : { color: '#9ca3af' }}>−</button>
          </div>
          <input
            type="text"
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Reason..."
            autoFocus
            className="flex-1 px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
          />
          <button onClick={submit} className="px-3 py-1.5 text-xs font-bold text-white rounded-lg" style={{ backgroundColor: theme.color }}>Add</button>
          <button onClick={() => setShowCustom(false)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
            <X size={12} />
          </button>
        </div>
      )}

      {/* History */}
      {expanded && logs.length > 0 && (
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/50 space-y-1.5">
          {[...logs].reverse().slice(0, 5).map((log, i) => (
            <div key={log.id || i} className="flex items-center gap-2 text-xs">
              <div className="w-5 h-5 rounded flex items-center justify-center text-white" style={{ backgroundColor: log.type === 'plus' ? '#16a34a' : '#dc2626' }}>
                {log.type === 'plus' ? <Plus size={10} /> : <Minus size={10} />}
              </div>
              <span className="flex-1 text-gray-600 truncate">{log.reason}</span>
              <span className="text-gray-400">{new Date(log.log_date || log.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
          {logs.length > 5 && <p className="text-[10px] text-gray-400 text-center">+{logs.length - 5} more</p>}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const ActivityTrackerPage = () => {
  const { supabase } = useApp();
  const { schoolId } = useTenant();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('class');
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [logs, setLogs] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null);

  // Load classes
  useEffect(() => {
    if (!schoolId) return;
    supabase.from('custom_classes').select('id, class_name').eq('is_active', true).order('class_name')
      .then(({ data }) => { if (data) setClasses(data); });
  }, [schoolId, supabase]);

  // Load students + logs
  useEffect(() => {
    if (!selectedClass || !schoolId) return;
    setLoading(true);
    Promise.all([
      supabase.from('students').select('id, name, class_name').eq('class_name', selectedClass).eq('status', 'active').order('name'),
      rawSupabase.from('activity_logs').select('*').eq('school_id', schoolId).eq('class_name', selectedClass).order('created_at', { ascending: true }),
    ]).then(([{ data: s }, { data: l }]) => {
      if (s) setStudents(s);
      if (l) {
        const grouped = {};
        l.forEach(x => { if (!grouped[x.student_id]) grouped[x.student_id] = []; grouped[x.student_id].push(x); });
        setLogs(grouped);
      }
      setLoading(false);
    });
  }, [selectedClass, schoolId, supabase]);

  const handleLog = useCallback(async (studentId, className, type, reason) => {
    if (!schoolId) return;
    setSaving(studentId);
    const logDate = formatDateKey(selectedDate);

    try {
      const { data: { user } } = await rawSupabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await rawSupabase
        .from('activity_logs')
        .insert({ student_id: studentId, class_name: className, school_id: schoolId, type, reason, log_date: logDate, notified: false, created_by: user.id })
        .select().single();

      if (error) throw error;

      setLogs(prev => {
        const updated = { ...prev, [studentId]: [...(prev[studentId] || []), data] };
        const sLogs = updated[studentId];
        const unPlus = sLogs.filter(l => l.type === 'plus' && !l.notified).length;
        const unMinus = sLogs.filter(l => l.type === 'minus' && !l.notified).length;
        const student = students.find(s => s.id === studentId);
        
        if (unPlus === THRESHOLD) setNotifications(n => [...n, { id: `${studentId}-plus-${Date.now()}`, studentId, studentName: student?.name, type: 'plus' }]);
        if (unMinus === THRESHOLD) setNotifications(n => [...n, { id: `${studentId}-minus-${Date.now()}`, studentId, studentName: student?.name, type: 'minus' }]);
        return updated;
      });
    } catch (err) {
      console.error('Failed:', err);
      toast.error('Failed: ' + err.message);
    } finally {
      setSaving(null);
    }
  }, [schoolId, students, selectedDate]);

  const handleAck = async (notif) => {
    const toMark = (logs[notif.studentId] || []).filter(l => l.type === notif.type && !l.notified).map(l => l.id);
    if (toMark.length) {
      await rawSupabase.from('activity_logs').update({ notified: true }).in('id', toMark);
      setLogs(prev => ({ ...prev, [notif.studentId]: prev[notif.studentId].map(l => toMark.includes(l.id) ? { ...l, notified: true } : l) }));
    }
    setNotifications(n => n.filter(x => x.id !== notif.id));
  };

  const displayStudents = viewMode === 'individual' && selectedStudent ? students.filter(s => s.id === selectedStudent) : students;

  return (
    <div className="space-y-5">
      {/* ═══ TERM BANNER (same style as HomePage) ═══ */}
      {theme.hasActiveTerm && (
        <div 
          className="rounded-xl px-4 py-2.5 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}
        >
          <div className="flex items-center gap-2">
            <TermIcon size={16} style={theme.textStyle} />
            <span className="text-sm font-semibold" style={theme.textStyle}>{theme.name} Term</span>
            <span className="text-xs text-gray-500">
              {new Date(theme.activeTerm.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(theme.activeTerm.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <span className="text-xs font-medium" style={theme.textStyle}>{theme.daysRemaining} days left</span>
        </div>
      )}

      {/* ═══ CONTROLS ═══ */}
      <div className="flex flex-wrap items-center gap-3">
        <DateNav date={selectedDate} onChange={setSelectedDate} theme={theme} />

        <div className="relative">
          <select
            value={selectedClass}
            onChange={e => { setSelectedClass(e.target.value); setSelectedStudent(''); setStudents([]); setLogs({}); }}
            className="appearance-none bg-white border-2 rounded-xl pl-3 pr-8 py-2 text-sm font-medium text-gray-700 focus:outline-none"
            style={{ borderColor: selectedClass ? theme.color : '#e5e7eb' }}
          >
            <option value="">Select class...</option>
            {classes.map(c => <option key={c.id} value={c.class_name}>{c.class_name}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {[{ id: 'class', icon: Users }, { id: 'individual', icon: User }].map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={viewMode === id ? { backgroundColor: '#fff', color: theme.color, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' } : { color: '#9ca3af' }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        {viewMode === 'individual' && students.length > 0 && (
          <div className="relative">
            <select
              value={selectedStudent}
              onChange={e => setSelectedStudent(e.target.value)}
              className="appearance-none bg-white border-2 rounded-xl pl-3 pr-8 py-2 text-sm font-medium text-gray-700 focus:outline-none"
              style={{ borderColor: selectedStudent ? theme.color : '#e5e7eb' }}
            >
              <option value="">Select student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* ═══ DATE INDICATOR (when not today) ═══ */}
      {!isToday(selectedDate) && selectedClass && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: theme.withAlpha(0.1), color: theme.color }}>
          <Calendar size={14} />
          <span className="font-medium">Logging for {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>
      )}

      {/* ═══ NOTIFICATIONS ═══ */}
      {notifications.map(n => (
        <NotificationBanner key={n.id} type={n.type} studentName={n.studentName} onDismiss={() => setNotifications(p => p.filter(x => x.id !== n.id))} onAck={() => handleAck(n)} />
      ))}

      {/* ═══ CONTENT ═══ */}
      {!selectedClass ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border" style={{ borderColor: theme.withAlpha(0.2) }}>
          <Activity size={48} className="mx-auto mb-4" style={{ color: theme.withAlpha(0.4) }} />
          <p className="text-gray-500">Select a class to start tracking activity</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 flex items-center justify-center gap-3 border" style={{ borderColor: theme.withAlpha(0.2) }}>
          <Loader2 size={20} className="animate-spin" style={{ color: theme.color }} />
          <span className="text-gray-500">Loading students...</span>
        </div>
      ) : displayStudents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border" style={{ borderColor: theme.withAlpha(0.2) }}>
          <User size={48} className="mx-auto mb-4" style={{ color: theme.withAlpha(0.4) }} />
          <p className="text-gray-500">{viewMode === 'individual' ? 'Select a student' : 'No students in this class'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayStudents.map(student => (
            <StudentRow key={student.id} student={student} logs={logs[student.id] || []} onLog={handleLog} theme={theme} isSaving={saving === student.id} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityTrackerPage;