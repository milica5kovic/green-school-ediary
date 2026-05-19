import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare, X, ChevronDown, ChevronUp, Users } from "lucide-react";
import { useApp } from "../../../../core/context/AppContext";
import { supabase } from "../../../../core/infrastructure/supabaseClient";
import { useBranding } from "../../../../core/context/BrandingContext";

const ClassCard = ({ cls, onRemove, periodNumber = null, stackIndex = 0, total = 1 }) => {
  const { attendanceService, getDateKey, selectedDate } = useApp();
  const branding = useBranding();
  const primaryColor = branding?.primaryColor || '#10b981';

  const [isExpanded, setIsExpanded] = useState(false);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
  });
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [behaviorComment, setBehaviorComment] = useState("");
  const [shareWithParent, setShareWithParent] = useState(true);
  const [localAttendance, setLocalAttendance] = useState({}); // Local state for instant updates

  const dateKey = getDateKey(selectedDate);

  // ✅ FIX: Load students with proper dependencies and NO school_year filter
  const loadData = useCallback(async () => {
    try {

      // ✅ FIX: Don't filter by school_year - it might be null!
      const { data: classStudents, error } = await supabase
        .from("students")
        .select("*")
        .eq("class_name", cls.class)
        .eq("status", "active") // Only active students
        .order("student_no", { ascending: true });

      if (error) {
        console.error("❌ Error loading students:", error);
        setStudents([]);
        return;
      }

      if (classStudents && classStudents.length > 0) {
        classStudents.forEach((s) => {
        });
      }

      setStudents(classStudents || []);

      // Load attendance from Supabase
      await attendanceService.loadClassAttendance(dateKey, cls.id);

      // Initialize local attendance state
      const attendance = {};
      (classStudents || []).forEach((student) => {
        attendance[student.id] = attendanceService.getAttendance(
          dateKey,
          cls.id,
          student.id,
        );
      });
      setLocalAttendance(attendance);

      // Calculate stats
      updateStats(classStudents || [], attendance);
    } catch (error) {
      console.error("❌ Error loading attendance:", error);
      setStudents([]);
    }
  }, [cls.id, cls.class, dateKey, attendanceService]); // ✅ All dependencies

  // ✅ FIX: Re-run when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]); // ✅ Include callback

  const updateStats = (studentList, attendanceData) => {
    const newStats = {
      total: studentList.length,
      present: 0,
      absent: 0,
      late: 0,
      sentOut: 0,
    };

    studentList.forEach((student) => {
      const record = attendanceData[student.id];
      if (record?.isPresent()) newStats.present++;
      if (record?.status === "sent_out") newStats.sentOut++;
      else if (record?.isAbsent()) newStats.absent++;
      else if (record?.isLate()) newStats.late++;
    });

    setStats(newStats);
  };

  const handleMarkAttendance = async (studentId, status) => {
    try {

      // Optimistic update - update UI immediately
      const updatedRecord = await attendanceService.markAttendance(
        dateKey,
        cls.id,
        studentId,
        status,
      );

      // Update local state
      setLocalAttendance((prev) => ({
        ...prev,
        [studentId]: updatedRecord,
      }));

      // Recalculate stats with new attendance
      const newAttendance = {
        ...localAttendance,
        [studentId]: updatedRecord,
      };
      updateStats(students, newAttendance);
    } catch (error) {
      console.error("❌ Error marking attendance:", error);
      alert("Failed to mark attendance. Please try again.");

      // Reload from database on error
      const record = attendanceService.getAttendance(
        dateKey,
        cls.id,
        studentId,
      );
      setLocalAttendance((prev) => ({
        ...prev,
        [studentId]: record,
      }));
    }
  };

  const openBehaviorModal = (studentId) => {
    const record = localAttendance[studentId];
    setSelectedStudent(studentId);
    setBehaviorComment(record?.comment || "");
    setShareWithParent(true);
    setShowBehaviorModal(true);
  };

  const saveBehaviorComment = async () => {
    try {
      // Always save to attendance record
      await attendanceService.updateComment(
        dateKey,
        cls.id,
        selectedStudent,
        behaviorComment,
      );

      // If "Share with parent" is on, also write to teacher_comments
      if (shareWithParent && behaviorComment.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          await supabase.from('teacher_comments').insert({
            student_id: selectedStudent,
            teacher_id: teacher?.id || null,
            comment: behaviorComment,
            comment_type: 'neutral',
            is_visible_to_parent: true,
            created_at: new Date().toISOString(),
          });
        }
      }

      // Update local state
      const updatedRecord = attendanceService.getAttendance(
        dateKey,
        cls.id,
        selectedStudent,
      );
      setLocalAttendance((prev) => ({
        ...prev,
        [selectedStudent]: updatedRecord,
      }));

      setShowBehaviorModal(false);
      setBehaviorComment("");
      setSelectedStudent(null);
    } catch (error) {
      console.error("❌ Error saving comment:", error);
      alert("Failed to save comment. Please try again.");
    }
  };

  return (
    <>
      <div
        className="bg-white rounded-2xl border overflow-hidden transition-shadow duration-200"
        style={{
          borderColor: `${primaryColor}20`,
          boxShadow: isExpanded
            ? `0 8px 24px ${primaryColor}18, 0 2px 6px rgba(0,0,0,0.06)`
            : `0 2px 8px rgba(0,0,0,0.05)`,
        }}
      >
        {/* ── Accent bar on left when expanded ── */}
        {isExpanded && (
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}60)` }} />
        )}

        {/* ── Clickable Header ── */}
        <button
          className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors focus:outline-none"
          onClick={() => setIsExpanded(prev => !prev)}
        >
          {/* Left: time badge + class info */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Period number bubble */}
            <div
              className="flex-shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center"
              style={{ backgroundColor: `${primaryColor}12` }}
            >
              <p className="text-lg font-black leading-none" style={{ color: primaryColor }}>
                {periodNumber ?? '·'}
              </p>
              <p className="text-[9px] font-medium leading-none mt-0.5" style={{ color: `${primaryColor}80` }}>
                period
              </p>
            </div>

            {/* Class + subject */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-800">{cls.class}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-sm font-semibold" style={{ color: primaryColor }}>{cls.subject}</span>
              </div>
              {cls.title && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{cls.title}</p>
              )}
            </div>
          </div>

          {/* Right: mini stats + remove + chevron */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mini stat dots */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs font-semibold text-green-600 bg-green-50 rounded-lg px-2 py-1">
                {stats.present}✓
              </span>
              <span className="text-xs font-semibold text-red-400 bg-red-50 rounded-lg px-2 py-1">
                {stats.absent}✗
              </span>
              {stats.late > 0 && (
                <span className="text-xs font-semibold text-orange-400 bg-orange-50 rounded-lg px-2 py-1">
                  {stats.late}⏱
                </span>
              )}
              {stats.sentOut > 0 && (
                <span className="text-xs font-semibold text-purple-400 bg-purple-50 rounded-lg px-2 py-1">
                  {stats.sentOut}↗
                </span>
              )}
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); onRemove(cls.id); }}
              className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-400 rounded-lg transition-colors"
              title="Remove class"
            >
              <X size={15} />
            </button>

            <div className="text-gray-300" style={isExpanded ? { color: primaryColor } : {}}>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </button>

        {/* ── Expandable Body ── */}
        <div
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{ maxHeight: isExpanded ? '2000px' : '0px', opacity: isExpanded ? 1 : 0 }}
        >
          <div className="px-5 pb-5 pt-1">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                <p className="text-xs text-green-600">Present</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                <p className="text-xs text-red-600">Absent</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
                <p className="text-2xl font-bold text-orange-600">{stats.late}</p>
                <p className="text-xs text-orange-600">Late</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                <p className="text-2xl font-bold text-purple-600">{stats.sentOut}</p>
                <p className="text-xs text-purple-600">Sent out</p>
              </div>
            </div>

            {/* Student List */}
            {students.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No students found in {cls.class}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((student) => {
                  const attendanceData = localAttendance[student.id];

                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${primaryColor}18` }}
                        >
                          <span className="text-sm font-semibold" style={{ color: primaryColor }}>
                            {student.student_no}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{student.name}</p>
                          {attendanceData?.comment && (
                            <p className="text-xs text-gray-500 italic">💬 {attendanceData.comment}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkAttendance(student.id, "present")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            attendanceData?.status === "present"
                              ? "bg-green-500 text-white shadow-md"
                              : "bg-gray-100 text-gray-600 hover:bg-green-100"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(student.id, "late")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            attendanceData?.status === "late"
                              ? "bg-orange-500 text-white shadow-md"
                              : "bg-gray-100 text-gray-600 hover:bg-orange-100"
                          }`}
                        >
                          Late
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(student.id, "absent")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            attendanceData?.status === "absent"
                              ? "bg-red-500 text-white shadow-md"
                              : "bg-gray-100 text-gray-600 hover:bg-red-100"
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(student.id, "sent_out")}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            attendanceData?.status === "sent_out"
                              ? "bg-purple-500 text-white shadow-md"
                              : "bg-gray-100 text-gray-600 hover:bg-purple-100"
                          }`}
                        >
                          Sent out
                        </button>
                        <button
                          onClick={() => openBehaviorModal(student.id)}
                          className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                          title="Add behavior comment"
                        >
                          <MessageSquare size={16} />
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

      {/* Behavior Comment Modal */}
      {showBehaviorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}18` }}>
                <MessageSquare size={18} style={{ color: primaryColor }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Behavior Comment</h3>
                <p className="text-xs text-gray-400">
                  {students.find(s => s.id === selectedStudent)?.name || 'Student'}
                </p>
              </div>
            </div>

            <textarea
              className="w-full border border-gray-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:outline-none resize-none"
              style={{ '--tw-ring-color': primaryColor }}
              rows={4}
              placeholder="Write a note about this student's behavior today..."
              value={behaviorComment}
              onChange={(e) => setBehaviorComment(e.target.value)}
              autoFocus
            />

            {/* Share with parent toggle */}
            <button
              type="button"
              onClick={() => setShareWithParent(prev => !prev)}
              className="mt-3 w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all"
              style={shareWithParent
                ? { borderColor: primaryColor, backgroundColor: `${primaryColor}0d` }
                : { borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }
              }>
              <div className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all`}
                  style={shareWithParent
                    ? { borderColor: primaryColor, backgroundColor: primaryColor }
                    : { borderColor: '#d1d5db', backgroundColor: 'white' }
                  }>
                  {shareWithParent && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">Share with parent</p>
                  <p className="text-[11px] text-gray-400">Parent will see this in their child's profile</p>
                </div>
              </div>
            </button>

            <div className="flex gap-3 mt-4">
              <button
                onClick={saveBehaviorComment}
                className="flex-1 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all text-sm"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowBehaviorModal(false);
                  setBehaviorComment("");
                  setSelectedStudent(null);
                }}
                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all text-sm"
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
