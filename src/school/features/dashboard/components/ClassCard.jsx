import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from '../../../../core/components/Toast';
import { useApp } from "../../../../core/context/AppContext";
import { useBranding } from "../../../../core/context/BrandingContext";

// ============================================================================
// CLASS CARD — expandable card with attendance tracking + behavior notes
// ============================================================================

const ClassCard = ({ cls, onRemove, periodNumber = null }) => {
  const { attendanceService, getDateKey, selectedDate, supabase } = useApp();
  const branding      = useBranding();
  const primaryColor  = branding?.primaryColor || '#10b981';

  const [isExpanded,        setIsExpanded]        = useState(false);
  const [students,          setStudents]           = useState([]);
  const [stats,             setStats]              = useState({ total: 0, present: 0, absent: 0, late: 0, sentOut: 0 });
  const [showBehaviorModal, setShowBehaviorModal]  = useState(false);
  const [selectedStudent,   setSelectedStudent]    = useState(null);
  const [behaviorComment,   setBehaviorComment]    = useState('');
  const [commentType,       setCommentType]        = useState(null);
  const [localAttendance,   setLocalAttendance]    = useState({});

  const BEHAVIOR_TYPES = [
    { key: 'positive',        label: 'Positive',   color: '#10b981', activeBg: '#dcfce7' },
    { key: 'neutral',         label: 'Neutral',    color: '#3b82f6', activeBg: '#dbeafe' },
    { key: 'needs_attention', label: 'Needs Work', color: '#f59e0b', activeBg: '#fef3c7' },
  ];

  const dateKey = getDateKey(selectedDate);

  // ── load students + attendance ────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const { data: classStudents, error } = await supabase
        .from('students')
        .select('id, name, student_no, class_name, status')
        .eq('class_name', cls.class)
        .eq('status', 'active')
        .order('student_no', { ascending: true });

      if (error) { console.error('❌ Students:', error.message); setStudents([]); return; }

      setStudents(classStudents || []);
      await attendanceService.loadClassAttendance(dateKey, cls.id);

      const attendance = {};
      (classStudents || []).forEach((s) => {
        attendance[s.id] = attendanceService.getAttendance(dateKey, cls.id, s.id);
      });
      setLocalAttendance(attendance);
      updateStats(classStudents || [], attendance);
    } catch (err) {
      console.error('❌ Load attendance:', err);
      setStudents([]);
    }
  }, [cls.id, cls.class, dateKey, attendanceService]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── stats ─────────────────────────────────────────────────────────────────
  const updateStats = (list, attendance) => {
    const s = { total: list.length, present: 0, absent: 0, late: 0, sentOut: 0 };
    list.forEach((st) => {
      const r = attendance[st.id];
      if (r?.isPresent())           s.present++;
      if (r?.status === 'sent_out') s.sentOut++;
      else if (r?.isAbsent())       s.absent++;
      else if (r?.isLate())         s.late++;
    });
    setStats(s);
  };

  // ── attendance ────────────────────────────────────────────────────────────
  const handleMarkAttendance = async (studentId, status) => {
    try {
      const updated = await attendanceService.markAttendance(dateKey, cls.id, studentId, status);
      const newAtt  = { ...localAttendance, [studentId]: updated };
      setLocalAttendance(newAtt);
      updateStats(students, newAtt);
    } catch (err) {
      console.error('❌ Mark attendance:', err);
      toast.error('Failed to mark attendance. Please try again.');
      const record = attendanceService.getAttendance(dateKey, cls.id, studentId);
      setLocalAttendance((prev) => ({ ...prev, [studentId]: record }));
    }
  };

  // ── behavior modal ────────────────────────────────────────────────────────
  const openBehaviorModal = (studentId) => {
    const record = localAttendance[studentId];
    setSelectedStudent(studentId);
    setBehaviorComment(record?.comment || '');
    setCommentType(null);
    setShowBehaviorModal(true);
  };

  const saveBehaviorComment = async () => {
    try {
      await attendanceService.updateComment(dateKey, cls.id, selectedStudent, behaviorComment);

      if (commentType) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: teacher } = await supabase
            .from('teachers').select('id').eq('user_id', user.id).maybeSingle();
          const defaults = {
            positive:        'Positive behavior observed today.',
            neutral:         'Neutral behavior observed today.',
            needs_attention: 'Behavior needs improvement.',
          };
          await supabase.from('teacher_comments').insert({
            student_id:           selectedStudent,
            teacher_id:           teacher?.id || null,
            comment:              behaviorComment.trim() || defaults[commentType],
            comment_type:         commentType,
            is_visible_to_parent: true,
            created_at:           new Date().toISOString(),
          });
        }
      }

      const updated = attendanceService.getAttendance(dateKey, cls.id, selectedStudent);
      setLocalAttendance((prev) => ({ ...prev, [selectedStudent]: updated }));
      setShowBehaviorModal(false);
      setBehaviorComment('');
      setCommentType(null);
      setSelectedStudent(null);
    } catch (err) {
      console.error('❌ Save comment:', err);
      toast.error('Failed to save comment. Please try again.');
    }
  };

  // ── derived ───────────────────────────────────────────────────────────────
  const presentPct  = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
  const markedCount = stats.present + stats.absent + stats.late + stats.sentOut;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="bg-white rounded-2xl border overflow-hidden transition-shadow duration-200"
        style={{
          borderColor: isExpanded ? `${primaryColor}30` : `${primaryColor}18`,
          boxShadow: isExpanded
            ? `0 6px 20px ${primaryColor}14, 0 2px 6px rgba(0,0,0,0.05)`
            : '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* ── Colour accent bar (expanded only) ── */}
        {isExpanded && (
          <div
            className="h-0.5 w-full"
            style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}40)` }}
          />
        )}

        {/* ── Collapsed header ── */}
        <button
          className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors focus:outline-none"
          onClick={() => setIsExpanded((p) => !p)}
        >
          {/* Period bubble + class info */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center"
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <p className="text-base font-black leading-none" style={{ color: primaryColor }}>
                {periodNumber ?? '·'}
              </p>
              <p className="text-[8px] font-semibold leading-none mt-0.5 uppercase tracking-wide"
                 style={{ color: `${primaryColor}70` }}>
                per
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-gray-800">{cls.class}</span>
                <span className="text-gray-300">·</span>
                <span className="text-sm font-semibold" style={{ color: primaryColor }}>{cls.subject}</span>
              </div>
              {cls.title && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{cls.title}</p>
              )}

              {/* Progress bar (only when some attendance marked) */}
              {stats.total > 0 && markedCount > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${presentPct}%`,
                        background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}bb)`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums"
                        style={{ color: presentPct >= 80 ? '#16a34a' : presentPct >= 60 ? '#d97706' : '#dc2626' }}>
                    {presentPct}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: mini badges + remove + chevron */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {stats.total > 0 && (
              <div className="hidden sm:flex items-center gap-1">
                <span className="text-[11px] font-bold text-green-600 bg-green-50 rounded-lg px-1.5 py-0.5">
                  {stats.present}✓
                </span>
                <span className="text-[11px] font-bold text-red-400 bg-red-50 rounded-lg px-1.5 py-0.5">
                  {stats.absent}✗
                </span>
                {stats.late > 0 && (
                  <span className="text-[11px] font-bold text-orange-400 bg-orange-50 rounded-lg px-1.5 py-0.5">
                    {stats.late}⏱
                  </span>
                )}
                {stats.sentOut > 0 && (
                  <span className="text-[11px] font-bold text-purple-400 bg-purple-50 rounded-lg px-1.5 py-0.5">
                    {stats.sentOut}↗
                  </span>
                )}
              </div>
            )}

            <button
              onClick={(e) => { e.stopPropagation(); onRemove(cls.id); }}
              className="p-1.5 hover:bg-red-50 text-gray-200 hover:text-red-400 rounded-lg transition-colors"
              title="Remove class"
            >
              <X size={14} />
            </button>

            <span style={{ color: isExpanded ? primaryColor : '#d1d5db' }}>
              {isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </span>
          </div>
        </button>

        {/* ── Expanded body ── */}
        <div
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{ maxHeight: isExpanded ? '3000px' : '0px', opacity: isExpanded ? 1 : 0 }}
        >
          <div className="px-4 pb-5 pt-1 space-y-4">

            {/* ── Compact stat chips ── */}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Present',  value: stats.present,  bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
                { label: 'Absent',   value: stats.absent,   bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
                { label: 'Late',     value: stats.late,     bg: '#fff7ed', color: '#d97706', border: '#fed7aa' },
                { label: 'Sent out', value: stats.sentOut,  bg: '#faf5ff', color: '#9333ea', border: '#e9d5ff' },
              ].map(({ label, value, bg, color, border }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold"
                  style={{ backgroundColor: bg, borderColor: border, color }}
                >
                  <span className="text-base font-black">{value}</span>
                  <span className="opacity-70">{label}</span>
                </div>
              ))}
              {stats.total > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-gray-50 border-gray-200 text-gray-500 ml-auto">
                  <span className="text-base font-black text-gray-700">{stats.total}</span>
                  <span>students</span>
                </div>
              )}
            </div>

            {/* ── Student list ── */}
            {students.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <p className="text-gray-400 text-sm">No students found in {cls.class}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {students.map((student) => {
                  const att = localAttendance[student.id];
                  const s   = att?.status;

                  const btn = (status, label, activeColor, activeBg, hoverBg) => (
                    <button
                      onClick={() => handleMarkAttendance(student.id, status)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        s === status
                          ? 'text-white shadow-sm'
                          : `text-gray-400 hover:text-gray-600`
                      }`}
                      style={s === status
                        ? { backgroundColor: activeColor }
                        : { backgroundColor: '#f3f4f6' }
                      }
                    >
                      {label}
                    </button>
                  );

                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/60 transition-colors"
                    >
                      {/* Student info */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                          style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
                        >
                          {student.student_no}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{student.name}</p>
                          {att?.comment && (
                            <p className="text-[10px] text-gray-400 truncate">💬 {att.comment}</p>
                          )}
                        </div>
                      </div>

                      {/* Attendance buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {btn('present',  '✓ P', '#16a34a')}
                        {btn('late',     '⏱ L', '#d97706')}
                        {btn('absent',   '✗ A', '#dc2626')}
                        {btn('sent_out', '↗ S', '#9333ea')}
                        <button
                          onClick={() => openBehaviorModal(student.id)}
                          className="p-1.5 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors ml-0.5"
                          title="Behavior note"
                        >
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Behavior modal ── */}
      {showBehaviorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             onClick={() => setShowBehaviorModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
               onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                   style={{ backgroundColor: `${primaryColor}14` }}>
                <MessageSquare size={16} style={{ color: primaryColor }} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Behavior Note</h3>
                <p className="text-xs text-gray-400">
                  {students.find((s) => s.id === selectedStudent)?.name || 'Student'}
                </p>
              </div>
              <button
                onClick={() => setShowBehaviorModal(false)}
                className="ml-auto p-1.5 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Behavior type chips */}
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Behavior type</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {BEHAVIOR_TYPES.map(({ key, label, color, activeBg }) => {
                const isActive = commentType === key;
                return (
                  <button
                    key={key}
                    onClick={() => setCommentType(isActive ? null : key)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold transition-all"
                    style={{
                      borderColor:     isActive ? color : '#e5e7eb',
                      backgroundColor: isActive ? activeBg : '#f9fafb',
                      color:           isActive ? color : '#9ca3af',
                    }}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center"
                         style={{ backgroundColor: isActive ? `${color}25` : '#e5e7eb' }}>
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    </div>
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Note */}
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Note <span className="normal-case font-normal">(optional)</span>
            </p>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:outline-none resize-none transition-colors"
              style={{ '--tw-ring-color': primaryColor }}
              rows={3}
              placeholder="Add details about today's behavior..."
              value={behaviorComment}
              onChange={(e) => setBehaviorComment(e.target.value)}
            />

            {commentType && (
              <p className="mt-2 text-[10px] text-blue-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                This note will be visible to the parent
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={saveBehaviorComment}
                className="flex-1 text-white py-2.5 rounded-xl text-sm font-bold hover:shadow-md transition-all"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
              >
                Save
              </button>
              <button
                onClick={() => { setShowBehaviorModal(false); setBehaviorComment(''); setCommentType(null); setSelectedStudent(null); }}
                className="flex-1 bg-gray-100 text-gray-500 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClassCard;
