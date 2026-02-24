import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar, Clock, ChevronLeft, ChevronRight, User, TrendingUp, Award,
  BookOpen, MessageSquare, X, ChevronDown, BarChart3, CheckCircle,
  XCircle, AlertCircle, ClipboardList
} from "lucide-react";
import { useApp } from "../../../../core/context/AppContext";
import { useAuth } from "../../../../core/context/AuthContext";
import useActiveTerm from "../../../../shared/hooks/useActiveTerm";
// import { getCambridgeGrade, getPercentageColor } from "../../../../shared/utils/cambridgeGrading";
import { getCambridgeGrade, getPercentageColor } from "../../../../core/utils/cambridgeGrading";
const TERM_ICONS = { 1: '❄️', 2: '🌸', 3: '☀️' };
const TERM_NAMES = { 1: 'Winter', 2: 'Spring', 3: 'Summer' };

const DailyOverviewPage = () => {
  const { supabase, studentsService } = useApp();
  const { getClassTeacherFor } = useAuth();
  const { activeTerm } = useActiveTerm();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [students, setStudents] = useState([]);
  const [dailyClasses, setDailyClasses] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentFullData, setStudentFullData] = useState(null);
  const [loadingStudentData, setLoadingStudentData] = useState(false);
  const [activeTab, setActiveTab] = useState("grades");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [homeworkSubjectFilter, setHomeworkSubjectFilter] = useState("all");

  const className = getClassTeacherFor();
  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getProgressBarColor = (pct) => {
    if (pct >= 90) return "bg-emerald-500";
    if (pct >= 70) return "bg-blue-500";
    if (pct >= 55) return "bg-purple-500";
    if (pct >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  const loadData = useCallback(async () => {
    if (!className || !supabase || !studentsService) return;
    try {
      setLoading(true);
      const dateKey = selectedDate.toISOString().split("T")[0];
      const classStudents = await studentsService.getStudentsByClass(className);
      setStudents(classStudents);

      const { data: classes } = await supabase.from("classes").select("*").eq("date_key", dateKey).eq("class_name", className).order("time");
      setDailyClasses(classes || []);

      const studentIds = classStudents.map(s => s.id);
      if (studentIds.length > 0) {
        const { data: attendance } = await supabase.from("attendance").select("*").eq("date_key", dateKey).in("student_id", studentIds);
        const map = {};
        attendance?.forEach(att => { map[`${att.student_id}-${att.class_id}`] = att; });
        setAttendanceData(map);
      } else { setAttendanceData({}); }
    } catch (error) { console.error("Error loading daily overview:", error); }
    finally { setLoading(false); }
  }, [className, selectedDate, supabase, studentsService]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadStudentFullData = async (student) => {
    setSelectedStudent(student);
    setLoadingStudentData(true);
    setActiveTab("grades");
    setSubjectFilter("all");

    try {
      const { data: grades } = await supabase.from("grades").select("*").eq("student_id", student.id).order("date", { ascending: false });
      const { data: attendance } = await supabase.from("attendance").select("*").eq("student_id", student.id).order("date_key", { ascending: false });
      const { data: teacherComments } = await supabase.from("teacher_comments").select("*").eq("student_id", student.id).order("created_at", { ascending: false });

      const attendanceComments = (attendance || []).filter(a => a.comment?.trim()).map(a => ({
        id: "att_" + a.id, student_id: a.student_id, comment: a.comment,
        created_at: a.date_key + "T09:00:00", comment_type: "neutral", source: "attendance"
      }));

      let commentsWithTeachers = [];
      if (teacherComments?.length > 0) {
        const teacherIds = [...new Set(teacherComments.map(c => c.teacher_id).filter(Boolean))];
        if (teacherIds.length > 0) {
          const { data: teachers } = await supabase.from("teachers").select("id, full_name").in("id", teacherIds);
          commentsWithTeachers = teacherComments.map(c => ({ ...c, teacher_name: teachers?.find(t => t.id === c.teacher_id)?.full_name || "Teacher", source: "teacher_comments" }));
        }
      }
      const allComments = [...commentsWithTeachers, ...attendanceComments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const { data: homeworkData } = await supabase.from("homework").select("*").eq("class_name", student.class_name).order("due_date", { ascending: false });
      const homeworkIds = homeworkData?.map(h => h.id) || [];
      let shMap = {};
      if (homeworkIds.length > 0) {
        const { data: sh } = await supabase.from("student_homework").select("*").eq("student_id", student.id).in("homework_id", homeworkIds);
        sh?.forEach(s => { shMap[s.homework_id] = s; });
      }
      const homework = (homeworkData || []).map(hw => ({
        ...hw, student_status: shMap[hw.id]?.status || "not_done",
        submitted_at: shMap[hw.id]?.submitted_at || null, teacher_notes: shMap[hw.id]?.teacher_notes || null,
      }));

      const gradeAverage = grades?.length > 0 ? (grades.reduce((sum, g) => sum + (g.grade / g.max_grade) * 100, 0) / grades.length).toFixed(1) : 0;
      const attendanceStats = {
        total: attendance?.length || 0,
        present: attendance?.filter(a => a.status === "present").length || 0,
        late: attendance?.filter(a => a.status === "late").length || 0,
        absent: attendance?.filter(a => a.status === "absent").length || 0,
        sentOut: attendance?.filter(a => a.status === "sent_out").length || 0,
      };
      attendanceStats.rate = attendanceStats.total > 0 ? ((attendanceStats.present / attendanceStats.total) * 100).toFixed(1) : 0;

      const gradesBySubject = {};
      grades?.forEach(g => { if (!gradesBySubject[g.subject]) gradesBySubject[g.subject] = []; gradesBySubject[g.subject].push(g); });
      const subjectAverages = Object.keys(gradesBySubject).map(subject => {
        const sg = gradesBySubject[subject];
        return { subject, average: (sg.reduce((sum, g) => sum + (g.grade / g.max_grade) * 100, 0) / sg.length).toFixed(1), count: sg.length };
      }).sort((a, b) => b.average - a.average);

      setStudentFullData({
        grades: grades || [], attendance: attendance || [], comments: allComments, homework,
        gradeAverage, attendanceStats, subjectAverages, gradesBySubject, subjects: Object.keys(gradesBySubject).sort()
      });
    } catch (error) { console.error("Error loading student data:", error); }
    finally { setLoadingStudentData(false); }
  };

  const getAttendanceStatus = (sid, cid) => attendanceData[`${sid}-${cid}`]?.status || null;
  const getAttendanceComment = (sid, cid) => attendanceData[`${sid}-${cid}`]?.comment || "";

  const getStatusBadge = (status) => {
    const cfg = { present: 'bg-emerald-100 text-emerald-700', late: 'bg-orange-100 text-orange-700', absent: 'bg-red-100 text-red-700', sent_out: 'bg-purple-100 text-purple-700' };
    const lbl = { present: 'P', late: 'L', absent: 'A', sent_out: 'SO' };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cfg[status] || 'bg-gray-100 text-gray-500'}`}>{lbl[status] || '—'}</span>;
  };

  const prevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
  const nextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };

  const calculateDailyStats = () => {
    let present = 0, absent = 0, late = 0, sentOut = 0;
    dailyClasses.forEach(cls => { students.forEach(s => { const st = getAttendanceStatus(s.id, cls.class_id); if (st === "present") present++; else if (st === "absent") absent++; else if (st === "late") late++; else if (st === "sent_out") sentOut++; }); });
    return { present, absent, late, sentOut };
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

  const dateString = selectedDate.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const stats = calculateDailyStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg p-5">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-xl font-bold">Daily Overview — {className}</h2>
            {activeTerm && <p className="text-emerald-100 text-sm mt-1">{TERM_ICONS[activeTerm.term_number]} {TERM_NAMES[activeTerm.term_number]} Term</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevDay} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg"><ChevronLeft size={18} /></button>
            <button onClick={() => setSelectedDate(new Date())} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium">Today</button>
            <button onClick={nextDay} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/80 text-sm"><Calendar size={15} /> {dateString}</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Classes', value: dailyClasses.length, color: 'purple' },
          { label: 'Present', value: stats.present, color: 'emerald' },
          { label: 'Late', value: stats.late, color: 'orange' },
          { label: 'Absent', value: stats.absent, color: 'red' },
          { label: 'Sent Out', value: stats.sentOut, color: 'purple' },
        ].map((s, i) => (
          <div key={i} className={`bg-white rounded-xl shadow-sm border border-${s.color}-200 p-3`}>
            <p className={`text-xl font-bold text-${s.color}-600`}>{s.value}</p>
            <p className="text-xs text-gray-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Daily Classes */}
      {dailyClasses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center border border-gray-200">
          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No classes scheduled for this date</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dailyClasses.map(cls => (
            <div key={cls.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3 border-b border-gray-200 flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center"><Clock size={18} className="text-white" /></div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{cls.time} — {cls.subject}</h3>
                  {cls.title && <p className="text-xs text-gray-600">{cls.title}</p>}
                </div>
              </div>
              <div className="p-3 grid gap-1.5">
                {students.map(student => {
                  const status = getAttendanceStatus(student.id, cls.class_id);
                  const comment = getAttendanceComment(student.id, cls.class_id);
                  return (
                    <div key={student.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2.5 flex-1">
                        <div className="w-9 h-9 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-emerald-700">{getInitials(student.name)}</span>
                        </div>
                        <span className="font-medium text-gray-800 text-sm">{student.name}</span>
                      </div>
                      {getStatusBadge(status)}
                      {comment && <div className="flex-1 max-w-xs"><div className="p-1.5 bg-blue-50 rounded border border-blue-200"><p className="text-[11px] text-blue-900">{comment}</p></div></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student Cards */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center"><User size={18} className="text-indigo-600" /></div>
          <div>
            <h3 className="font-bold text-gray-900">Class Students</h3>
            <p className="text-xs text-gray-500">Click to view detailed analytics</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map(student => (
            <button key={student.id} onClick={() => loadStudentFullData(student)}
              className="group relative overflow-hidden bg-white rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:shadow-xl transition-all duration-300 text-left">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-3.5 flex items-center gap-3">
                <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow group-hover:scale-105 transition-transform duration-300">
                  <span className="text-white font-bold text-sm">{getInitials(student.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate text-sm group-hover:text-indigo-700 transition-colors">{student.name}</p>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">{className}</span>
                </div>
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <ChevronDown size={16} className="text-indigo-600 rotate-[-90deg]" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── STUDENT MODAL ──────────────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">{getInitials(selectedStudent.name)}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedStudent.name}</h3>
                  <p className="text-indigo-200 text-xs">Class {className}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg text-white"><X size={20} /></button>
            </div>

            <div className="bg-gray-50 border-b border-gray-200 px-6 flex gap-1">
              {[{ id: 'grades', label: 'Grades', icon: Award }, { id: 'attendance', label: 'Attendance', icon: Calendar }, { id: 'homework', label: 'Homework', icon: ClipboardList }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-medium text-sm relative flex items-center gap-1.5 ${activeTab === tab.id ? "text-indigo-600" : "text-gray-500 hover:text-gray-800"}`}>
                  <tab.icon size={14} /> {tab.label}
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>}
                </button>
              ))}
            </div>

            {loadingStudentData ? (
              <div className="flex-1 flex items-center justify-center p-12"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
            ) : studentFullData && (
              <div className="flex-1 overflow-y-auto p-5">

                {/* GRADES TAB */}
                {activeTab === "grades" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-green-50 rounded-xl p-3.5 border border-green-200">
                        <p className="text-xs font-medium text-green-700 mb-0.5">Average</p>
                        <p className="text-2xl font-bold text-green-700">{studentFullData.gradeAverage}%</p>
                        {(() => { const g = getCambridgeGrade(studentFullData.gradeAverage, selectedStudent.class_name); return <span className="text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block" style={{ color: g.color, backgroundColor: g.color + '15' }}>{g.display}</span>; })()}
                      </div>
                      <div className="bg-purple-50 rounded-xl p-3.5 border border-purple-200">
                        <p className="text-xs font-medium text-purple-700 mb-0.5">Grades</p>
                        <p className="text-2xl font-bold text-purple-700">{studentFullData.grades.length}</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-200">
                        <p className="text-xs font-medium text-blue-700 mb-0.5">Subjects</p>
                        <p className="text-2xl font-bold text-blue-700">{studentFullData.subjectAverages.length}</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h4 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2"><BookOpen size={16} className="text-purple-600" /> Subject Performance</h4>
                      <div className="space-y-2.5">
                        {studentFullData.subjectAverages.map((subject, idx) => {
                          const g = getCambridgeGrade(subject.average, selectedStudent.class_name);
                          return (
                            <div key={idx}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-700">{subject.subject}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: g.color, backgroundColor: g.color + '15' }}>{g.display}</span>
                                  <span className="text-xs text-gray-400">{subject.count} grades</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${getProgressBarColor(subject.average)}`} style={{ width: `${subject.average}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2"><TrendingUp size={16} className="text-green-600" /> All Grades</h4>
                        {studentFullData.subjects.length > 1 && (
                          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="all">All Subjects</option>
                            {studentFullData.subjects.map(s => (<option key={s} value={s}>{s}</option>))}
                          </select>
                        )}
                      </div>
                      <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                        {(subjectFilter === "all" ? studentFullData.grades : studentFullData.gradesBySubject[subjectFilter] || []).map((grade, idx) => {
                          const pct = (grade.grade / grade.max_grade * 100);
                          const g = getCambridgeGrade(pct, selectedStudent.class_name);
                          return (
                            <div key={idx} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-semibold">{grade.subject}</span>
                                    <span className="text-xs font-medium text-gray-900 truncate">{grade.assessment_title}</span>
                                  </div>
                                  <p className="text-[11px] text-gray-500">{new Date(grade.date + 'T00:00:00').toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} • {grade.assessment_type}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-gray-800">{grade.grade}<span className="text-xs text-gray-400">/{grade.max_grade}</span></span>
                                  <span className="text-xs font-bold px-2 py-0.5 rounded min-w-[48px] text-center" style={{ color: g.color, backgroundColor: g.color + '15' }}>{g.display}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ATTENDANCE TAB */}
                {activeTab === "attendance" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { label: 'Rate', value: studentFullData.attendanceStats.rate + '%', color: 'blue' },
                        { label: 'Present', value: studentFullData.attendanceStats.present, color: 'green' },
                        { label: 'Late', value: studentFullData.attendanceStats.late, color: 'orange' },
                        { label: 'Absent', value: studentFullData.attendanceStats.absent, color: 'red' },
                        { label: 'Sent Out', value: studentFullData.attendanceStats.sentOut, color: 'purple' },
                      ].map((s, i) => (
                        <div key={i} className={`bg-${s.color}-50 rounded-xl p-3 border border-${s.color}-200`}>
                          <p className={`text-xs font-medium text-${s.color}-700 mb-0.5`}>{s.label}</p>
                          <p className={`text-xl font-bold text-${s.color}-700`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <h4 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2"><Clock size={16} className="text-cyan-600" /> History ({studentFullData.attendance.length})</h4>
                      <div className="space-y-1.5 max-h-[450px] overflow-y-auto">
                        {studentFullData.attendance.map((att, idx) => {
                          const cfgs = { present: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", label: "Present", icon: CheckCircle }, late: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", label: "Late", icon: Clock }, absent: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "Absent", icon: XCircle }, sent_out: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", label: "Sent Out", icon: AlertCircle } };
                          const c = cfgs[att.status] || cfgs.present; const I = c.icon;
                          return (
                            <div key={idx} className={`p-2 rounded-lg border ${c.bg} ${c.border}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><I size={13} className={c.text} /><span className="text-xs font-medium text-gray-900">{new Date(att.date_key + 'T00:00:00').toLocaleDateString("en-GB", { weekday: "short", month: "short", day: "numeric" })}</span></div>
                                <span className={`text-xs font-semibold ${c.text}`}>{c.label}</span>
                              </div>
                              {att.comment && <p className="text-[11px] text-gray-600 mt-1 pl-5">{att.comment}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* HOMEWORK TAB */}
                {activeTab === "homework" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Total', value: studentFullData.homework.length, color: 'purple' },
                        { label: 'Done', value: studentFullData.homework.filter(h => h.student_status === "done").length, color: 'green' },
                        { label: 'Partial', value: studentFullData.homework.filter(h => h.student_status === "partially_done").length, color: 'orange' },
                        { label: 'Not Done', value: studentFullData.homework.filter(h => h.student_status === "not_done").length, color: 'red' },
                      ].map((s, i) => (
                        <div key={i} className={`bg-${s.color}-50 rounded-xl p-3 border border-${s.color}-200`}>
                          <p className={`text-xs font-medium text-${s.color}-700 mb-0.5`}>{s.label}</p>
                          <p className={`text-xl font-bold text-${s.color}-700`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-900 text-sm">All Homework</h4>
                        {(() => { const subs = [...new Set(studentFullData.homework.map(h => h.subject))].sort(); return subs.length > 1 && (
                          <select value={homeworkSubjectFilter} onChange={(e) => setHomeworkSubjectFilter(e.target.value)} className="px-3 py-1 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="all">All Subjects</option>{subs.map(s => (<option key={s} value={s}>{s}</option>))}
                          </select>); })()}
                      </div>
                      <div className="space-y-2 max-h-[450px] overflow-y-auto">
                        {(() => {
                          const filtered = homeworkSubjectFilter === "all" ? studentFullData.homework : studentFullData.homework.filter(h => h.subject === homeworkSubjectFilter);
                          if (filtered.length === 0) return <div className="text-center py-8"><ClipboardList size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500 text-sm">No homework found</p></div>;
                          return filtered.map((hw, idx) => {
                            const isOverdue = new Date(hw.due_date) < new Date() && hw.student_status === "not_done";
                            const sc = { done: { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", label: "Done" }, partially_done: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", label: "Partial" }, not_done: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", label: "Not Done" } };
                            const c = sc[hw.student_status] || sc.not_done;
                            return (
                              <div key={idx} className={`p-3 rounded-lg border ${isOverdue ? "bg-red-100 border-red-400" : c.bg + " " + c.border}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-semibold">{hw.subject}</span>
                                      <span className="text-sm font-bold text-gray-900">{hw.title}</span>
                                      {isOverdue && <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded text-[10px] font-bold">OVERDUE</span>}
                                    </div>
                                    {hw.description && <p className="text-xs text-gray-700 mb-1.5">{hw.description}</p>}
                                    <div className="flex items-center gap-3 text-[11px]">
                                      <span className="text-gray-500">Assigned: {new Date(hw.assigned_date + 'T00:00:00').toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                                      <span className={`font-semibold ${isOverdue ? "text-red-700" : "text-purple-700"}`}>Due: {new Date(hw.due_date + 'T00:00:00').toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                                    </div>
                                    {hw.teacher_notes && <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200"><p className="text-[11px] text-blue-900"><strong>Note:</strong> {hw.teacher_notes}</p></div>}
                                  </div>
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text} border ${c.border}`}>{c.label}</span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* ANALYTICS TAB */}
                {activeTab === "analytics" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-3">
                      <div className="bg-green-50 rounded-xl p-3.5 border border-green-200">
                        <p className="text-xs font-medium text-green-700 mb-0.5">Average</p>
                        <p className="text-xl font-bold text-green-700">{studentFullData.gradeAverage}%</p>
                        {(() => { const g = getCambridgeGrade(studentFullData.gradeAverage, selectedStudent.class_name); return <span className="text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block" style={{ color: g.color, backgroundColor: g.color + '15' }}>{g.display}</span>; })()}
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-200"><p className="text-xs font-medium text-blue-700 mb-0.5">Attendance</p><p className="text-xl font-bold text-blue-700">{studentFullData.attendanceStats.rate}%</p></div>
                      <div className="bg-purple-50 rounded-xl p-3.5 border border-purple-200"><p className="text-xs font-medium text-purple-700 mb-0.5">Grades</p><p className="text-xl font-bold text-purple-700">{studentFullData.grades.length}</p></div>
                      <div className="bg-orange-50 rounded-xl p-3.5 border border-orange-200"><p className="text-xs font-medium text-orange-700 mb-0.5">Comments</p><p className="text-xl font-bold text-orange-700">{studentFullData.comments.length}</p></div>
                    </div>

                    {studentFullData.comments.length > 0 ? (
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h4 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2"><MessageSquare size={16} className="text-orange-600" /> Comments ({studentFullData.comments.length})</h4>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto">
                          {studentFullData.comments.map((comment, idx) => (
                            <div key={idx} className={`p-2.5 rounded-lg border ${comment.source === "attendance" ? "bg-yellow-50 border-yellow-200" : "bg-blue-50 border-blue-200"}`}>
                              <div className="flex items-start justify-between mb-0.5">
                                <div>
                                  <p className="text-xs font-semibold text-gray-900">{comment.teacher_name || "Teacher"}{comment.source === "attendance" && <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-200 text-yellow-800 rounded text-[10px]">Attendance</span>}</p>
                                  <p className="text-[11px] text-gray-500">{new Date(comment.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                                </div>
                                {comment.comment_type && comment.comment_type !== "neutral" && <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${comment.comment_type === "positive" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{comment.comment_type}</span>}
                              </div>
                              <p className="text-sm text-gray-700">{comment.comment}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center"><MessageSquare size={40} className="mx-auto text-gray-300 mb-3" /><p className="text-gray-500 text-sm">No comments yet</p></div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Top Subject', idx: 0, bgCard: 'green' },
                        { label: 'Needs Focus', idx: studentFullData.subjectAverages.length - 1, bgCard: 'orange' }
                      ].map((item, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                          <h4 className="font-bold text-gray-900 mb-2 text-sm">{item.label}</h4>
                          {studentFullData.subjectAverages.length > 0 ? (() => {
                            const sa = studentFullData.subjectAverages[item.idx];
                            const g = getCambridgeGrade(sa.average, selectedStudent.class_name);
                            return (
                              <div className={`p-2.5 bg-${item.bgCard}-50 rounded-lg border border-${item.bgCard}-200`}>
                                <p className={`font-semibold text-${item.bgCard}-900 text-sm`}>{sa.subject}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: g.color, backgroundColor: g.color + '15' }}>{g.display}</span>
                                  <span className={`text-sm text-${item.bgCard}-700`}>{sa.average}%</span>
                                </div>
                              </div>
                            );
                          })() : <p className="text-xs text-gray-500">No grades yet</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t px-6 py-3 bg-gray-50">
              <button onClick={() => setSelectedStudent(null)} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl hover:shadow-lg transition-all font-semibold text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyOverviewPage;