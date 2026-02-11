import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  User,
  TrendingUp,
  Award,
  BookOpen,
  MessageSquare,
  X,
  ChevronDown,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlusCircle,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

const DailyOverviewPage = () => {
  const { supabase, studentsService } = useApp();
  const { getClassTeacherFor } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [students, setStudents] = useState([]);
  const [dailyClasses, setDailyClasses] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentFullData, setStudentFullData] = useState(null);
  const [loadingStudentData, setLoadingStudentData] = useState(false);
  const [activeTab, setActiveTab] = useState("grades"); // grades, attendance, analytics
  const [subjectFilter, setSubjectFilter] = useState("all");

  const className = getClassTeacherFor();

  // Cambridge grading system based on year level
  const getCambridgeGrade = (percentage, className) => {
    // Determine if primary (Y1-Y6) or secondary (Y7-Y9)
    const yearMatch = className?.match(/Y(\d+)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 1;
    const isPrimary = year <= 6;

    if (isPrimary) {
      // Cambridge Primary Bands
      if (percentage >= 90)
        return { letter: "A*", band: 6, description: "Outstanding" };
      if (percentage >= 70)
        return { letter: "A", band: 5, description: "High Achievement" };
      if (percentage >= 55)
        return { letter: "B", band: 4, description: "Expected Level" };
      if (percentage >= 40)
        return { letter: "C", band: 3, description: "Developing" };
      if (percentage >= 25)
        return { letter: "D", band: 2, description: "Below Expected" };
      return { letter: "E", band: 1, description: "Beginning" };
    } else {
      // IGCSE Grades (Y7-Y9)
      if (percentage >= 95) return { letter: "A*", description: "Outstanding" };
      if (percentage >= 85) return { letter: "A", description: "Excellent" };
      if (percentage >= 75) return { letter: "B", description: "Very Good" };
      if (percentage >= 65) return { letter: "C", description: "Good" };
      if (percentage >= 55) return { letter: "D", description: "Satisfactory" };
      if (percentage >= 45) return { letter: "E", description: "Pass" };
      if (percentage >= 35) return { letter: "F", description: "Below Pass" };
      if (percentage >= 25) return { letter: "G", description: "Poor" };
      return { letter: "U", description: "Unclassified" };
    }
  };

  const getGradeColor = (gradeInfo) => {
    const letter = gradeInfo.letter;

    if (gradeInfo.band !== undefined) {
      // Primary colors by band
      switch (gradeInfo.band) {
        case 6:
          return "bg-emerald-100 text-emerald-700 border-emerald-300";
        case 5:
          return "bg-blue-100 text-blue-700 border-blue-300";
        case 4:
          return "bg-purple-100 text-purple-700 border-purple-300";
        case 3:
          return "bg-orange-100 text-orange-700 border-orange-300";
        case 2:
          return "bg-red-100 text-red-700 border-red-300";
        case 1:
          return "bg-gray-100 text-gray-700 border-gray-300";
        default:
          return "bg-gray-100 text-gray-600 border-gray-300";
      }
    } else {
      // Secondary colors by letter
      switch (letter) {
        case "A*":
          return "bg-emerald-100 text-emerald-700 border-emerald-300";
        case "A":
          return "bg-green-100 text-green-700 border-green-300";
        case "B":
          return "bg-blue-100 text-blue-700 border-blue-300";
        case "C":
          return "bg-cyan-100 text-cyan-700 border-cyan-300";
        case "D":
          return "bg-yellow-100 text-yellow-700 border-yellow-300";
        case "E":
          return "bg-orange-100 text-orange-700 border-orange-300";
        case "F":
          return "bg-red-100 text-red-700 border-red-300";
        case "G":
          return "bg-gray-100 text-gray-700 border-gray-300";
        case "U":
          return "bg-gray-100 text-gray-600 border-gray-300";
        default:
          return "bg-gray-100 text-gray-600 border-gray-300";
      }
    }
  };

  const getProgressBarColor = (gradeInfo) => {
    if (gradeInfo.band !== undefined) {
      switch (gradeInfo.band) {
        case 6:
          return "bg-emerald-500";
        case 5:
          return "bg-blue-500";
        case 4:
          return "bg-purple-500";
        case 3:
          return "bg-orange-500";
        case 2:
          return "bg-red-500";
        default:
          return "bg-gray-500";
      }
    } else {
      switch (gradeInfo.letter) {
        case "A*":
          return "bg-emerald-500";
        case "A":
          return "bg-green-500";
        case "B":
          return "bg-blue-500";
        case "C":
          return "bg-cyan-500";
        case "D":
          return "bg-yellow-500";
        case "E":
          return "bg-orange-500";
        default:
          return "bg-red-500";
      }
    }
  };

  const loadData = useCallback(async () => {
    if (!className || !supabase || !studentsService) return;

    try {
      setLoading(true);
      const dateKey = selectedDate.toISOString().split("T")[0];

      const classStudents = await studentsService.getStudentsByClass(className);
      setStudents(classStudents);

      const { data: classes } = await supabase
        .from("classes")
        .select("*")
        .eq("date_key", dateKey)
        .eq("class_name", className)
        .order("time");

      setDailyClasses(classes || []);

      const studentIds = classStudents.map((s) => s.id);

      if (studentIds.length > 0) {
        const { data: attendance } = await supabase
          .from("attendance")
          .select("*")
          .eq("date_key", dateKey)
          .in("student_id", studentIds);

        const attendanceMap = {};
        attendance?.forEach((att) => {
          const key = `${att.student_id}-${att.class_id}`;
          attendanceMap[key] = att;
        });

        setAttendanceData(attendanceMap);
      } else {
        setAttendanceData({});
      }
    } catch (error) {
      console.error("Error loading daily overview:", error);
    } finally {
      setLoading(false);
    }
  }, [className, selectedDate, supabase, studentsService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

const loadStudentFullData = async (student) => {
  setSelectedStudent(student);
  setLoadingStudentData(true);
  setActiveTab('grades');
  setSubjectFilter('all');
  
  try {
    const { data: grades } = await supabase
      .from('grades')
      .select('*')
      .eq('student_id', student.id)
      .order('date', { ascending: false });
    
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', student.id)
      .order('date_key', { ascending: false });
    
    // ✅ FIX: Try loading comments without join first
    console.log('Loading comments for student:', student.id);
    
    const { data: comments, error: commentsError } = await supabase
      .from('teacher_comments')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    
    if (commentsError) {
      console.error('❌ Error loading comments:', commentsError);
    }
    
    console.log('📝 Comments found:', comments?.length || 0, comments);
    
    // ✅ Load teacher names separately if comments exist
    let commentsWithTeachers = comments || [];
    if (comments && comments.length > 0) {
      const teacherIds = [...new Set(comments.map(c => c.teacher_id).filter(Boolean))];
      
      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase
          .from('teachers')
          .select('id, full_name')
          .in('id', teacherIds);
        
        // Map teacher names to comments
        commentsWithTeachers = comments.map(comment => {
          const teacher = teachers?.find(t => t.id === comment.teacher_id);
          return {
            ...comment,
            teacher_name: teacher?.full_name || 'Teacher'
          };
        });
      }
    }
    
    const gradeAverage = grades?.length > 0
      ? (grades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0) / grades.length).toFixed(1)
      : 0;
    
    const attendanceStats = {
      total: attendance?.length || 0,
      present: attendance?.filter(a => a.status === 'present').length || 0,
      late: attendance?.filter(a => a.status === 'late').length || 0,
      absent: attendance?.filter(a => a.status === 'absent').length || 0,
      sentOut: attendance?.filter(a => a.status === 'sent_out').length || 0
    };
    
    attendanceStats.rate = attendanceStats.total > 0
      ? ((attendanceStats.present / attendanceStats.total) * 100).toFixed(1)
      : 0;
    
    const gradesBySubject = {};
    grades?.forEach(grade => {
      if (!gradesBySubject[grade.subject]) {
        gradesBySubject[grade.subject] = [];
      }
      gradesBySubject[grade.subject].push(grade);
    });
    
    const subjectAverages = Object.keys(gradesBySubject).map(subject => {
      const subjectGrades = gradesBySubject[subject];
      const avg = subjectGrades.reduce((sum, g) => sum + (g.grade / g.max_grade * 100), 0) / subjectGrades.length;
      return { subject, average: avg.toFixed(1), count: subjectGrades.length };
    }).sort((a, b) => b.average - a.average);
    
    const subjects = Object.keys(gradesBySubject).sort();
    
    setStudentFullData({
      grades: grades || [],
      attendance: attendance || [],
      comments: commentsWithTeachers, // ✅ Use mapped comments
      gradeAverage,
      attendanceStats,
      subjectAverages,
      gradesBySubject,
      subjects
    });
    
  } catch (error) {
    console.error('❌ Error loading student data:', error);
  } finally {
    setLoadingStudentData(false);
  }
};

  const getAttendanceStatus = (studentId, classId) => {
    const key = `${studentId}-${classId}`;
    return attendanceData[key]?.status || null;
  };

  const getAttendanceComment = (studentId, classId) => {
    const key = `${studentId}-${classId}`;
    return attendanceData[key]?.comment || "";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "present":
        return (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            P
          </span>
        );
      case "late":
        return (
          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
            L
          </span>
        );
      case "absent":
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            A
          </span>
        );
      case "sent_out":
        return (
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            SO
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            -
          </span>
        );
    }
  };

  const prevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const calculateDailyStats = () => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let sentOut = 0;

    dailyClasses.forEach((cls) => {
      students.forEach((student) => {
        const status = getAttendanceStatus(student.id, cls.class_id);

        if (status === "present") present++;
        else if (status === "absent") absent++;
        else if (status === "late") late++;
        else if (status === "sent_out") sentOut++;
      });
    });

    return { present, absent, late, sentOut };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const dateString = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const stats = calculateDailyStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">
              Daily Overview - Class {className}
            </h2>
            <p className="text-emerald-100 mt-1">
              View attendance for all classes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevDay}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextDay}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-white/90">
          <Calendar size={18} />
          <span className="font-medium">{dateString}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-2xl font-bold text-purple-600">
            {dailyClasses.length}
          </p>
          <p className="text-sm text-gray-600">Classes</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-4">
          <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
          <p className="text-sm text-gray-600">Present</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-4">
          <p className="text-2xl font-bold text-orange-600">{stats.late}</p>
          <p className="text-sm text-gray-600">Late</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4">
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
          <p className="text-sm text-gray-600">Absent</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-4">
          <p className="text-2xl font-bold text-purple-600">{stats.sentOut}</p>
          <p className="text-sm text-gray-600">Sent Out</p>
        </div>
      </div>

      {/* Classes */}
      {dailyClasses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No classes scheduled for this date</p>
          <p className="text-sm text-gray-400 mt-2">
            Classes are only shown for weekdays when they are scheduled
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {dailyClasses.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <Clock size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {cls.time} - {cls.subject}
                    </h3>
                    {cls.title && (
                      <p className="text-sm text-gray-600">{cls.title}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="grid gap-2">
                  {students.map((student) => {
                    const status = getAttendanceStatus(
                      student.id,
                      cls.class_id,
                    );
                    const comment = getAttendanceComment(
                      student.id,
                      cls.class_id,
                    );

                    return (
                      <div
                        key={student.id}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <span className="text-emerald-700 font-semibold text-sm">
                              {student.student_no}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {student.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {getStatusBadge(status)}
                        </div>

                        {comment && (
                          <div className="flex-1 max-w-md">
                            <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-xs text-blue-900">{comment}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <User size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Class Students</h3>
            <p className="text-sm text-gray-600">
              Click on any student to view detailed analytics
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => loadStudentFullData(student)}
              className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white font-bold text-sm">
                    {student.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {student.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    No. {student.student_no}
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  className="text-indigo-400 rotate-[-90deg]"
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Student Analytics Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <User size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedStudent.name}
                  </h3>
                  <p className="text-indigo-100 text-sm">
                    Student No. {selectedStudent.student_no} • Class {className}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div className="bg-gray-50 border-b border-gray-200 px-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("grades")}
                  className={
                    "px-6 py-3 font-semibold text-sm transition-all relative " +
                    (activeTab === "grades"
                      ? "text-indigo-600"
                      : "text-gray-600 hover:text-gray-900")
                  }
                >
                  <Award size={16} className="inline mr-2" />
                  Grades
                  {activeTab === "grades" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("attendance")}
                  className={
                    "px-6 py-3 font-semibold text-sm transition-all relative " +
                    (activeTab === "attendance"
                      ? "text-indigo-600"
                      : "text-gray-600 hover:text-gray-900")
                  }
                >
                  <Calendar size={16} className="inline mr-2" />
                  Attendance
                  {activeTab === "attendance" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("analytics")}
                  className={
                    "px-6 py-3 font-semibold text-sm transition-all relative " +
                    (activeTab === "analytics"
                      ? "text-indigo-600"
                      : "text-gray-600 hover:text-gray-900")
                  }
                >
                  <BarChart3 size={16} className="inline mr-2" />
                  Analytics
                  {activeTab === "analytics" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Content */}
            {loadingStudentData ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              studentFullData && (
                <div className="flex-1 overflow-y-auto p-6">
                  {/* GRADES TAB */}
                  {activeTab === "grades" && (
                    <div className="space-y-4">
                      {/* Stats Row */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                          <p className="text-xs font-medium text-green-700 mb-1">
                            Average
                          </p>
                          <p className="text-2xl font-bold text-green-700">
                            {studentFullData.gradeAverage}%
                          </p>
                          {(() => {
                            const gradeInfo = getCambridgeGrade(
                              studentFullData.gradeAverage,
                              selectedStudent.class_name,
                            );
                            return (
                              <div className="mt-1">
                                <span
                                  className={
                                    "px-2 py-0.5 rounded-lg text-xs font-bold inline-block border-2 " +
                                    getGradeColor(gradeInfo)
                                  }
                                >
                                  {gradeInfo.letter}
                                  {gradeInfo.band && (
                                    <span className="ml-1">
                                      • Band {gradeInfo.band}
                                    </span>
                                  )}
                                </span>
                                <p className="text-xs text-gray-600 mt-1">
                                  {gradeInfo.description}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                          <p className="text-xs font-medium text-purple-700 mb-1">
                            Total Grades
                          </p>
                          <p className="text-2xl font-bold text-purple-700">
                            {studentFullData.grades.length}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
                          <p className="text-xs font-medium text-blue-700 mb-1">
                            Subjects
                          </p>
                          <p className="text-2xl font-bold text-blue-700">
                            {studentFullData.subjectAverages.length}
                          </p>
                        </div>
                      </div>

                      {/* Subject Performance */}
                      <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                          <BookOpen size={18} className="text-purple-600" />
                          Subject Performance
                        </h4>
                        <div className="space-y-2">
                          {studentFullData.subjectAverages.map(
                            (subject, idx) => {
                              const gradeInfo = getCambridgeGrade(
                                subject.average,
                                selectedStudent.class_name,
                              );
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-gray-700">
                                        {subject.subject}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={
                                            "px-2 py-0.5 rounded text-xs font-bold border " +
                                            getGradeColor(gradeInfo)
                                          }
                                        >
                                          {gradeInfo.letter}
                                          {gradeInfo.band &&
                                            ` • ${gradeInfo.band}`}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {subject.count} grades
                                        </span>
                                      </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                      <div
                                        className={
                                          "h-1.5 rounded-full transition-all " +
                                          getProgressBarColor(gradeInfo)
                                        }
                                        style={{ width: `${subject.average}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>

                      {/* Subject Filter */}
                      <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                            <TrendingUp size={18} className="text-green-600" />
                            All Grades (
                            {subjectFilter === "all"
                              ? studentFullData.grades.length
                              : studentFullData.gradesBySubject[subjectFilter]
                                  ?.length || 0}
                            )
                          </h4>

                          {/* Subject Filter Dropdown */}
                          {studentFullData.subjects.length > 1 && (
                            <select
                              value={subjectFilter}
                              onChange={(e) => setSubjectFilter(e.target.value)}
                              className="px-3 py-1.5 border-2 border-indigo-200 rounded-lg text-sm font-medium text-gray-700 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                              <option value="all">All Subjects</option>
                              {studentFullData.subjects.map((subject) => (
                                <option key={subject} value={subject}>
                                  {subject}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {(subjectFilter === "all"
                            ? studentFullData.grades
                            : studentFullData.gradesBySubject[subjectFilter] ||
                              []
                          ).map((grade, idx) => {
                            const percentage = (
                              (grade.grade / grade.max_grade) *
                              100
                            ).toFixed(0);
                            const gradeInfo = getCambridgeGrade(
                              percentage,
                              selectedStudent.class_name,
                            );

                            return (
                              <div
                                key={idx}
                                className="p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                                        {grade.subject}
                                      </span>
                                      <span className="text-xs font-medium text-gray-900 truncate">
                                        {grade.assessment_title}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      {new Date(grade.date).toLocaleDateString(
                                        "en-GB",
                                        {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        },
                                      )}{" "}
                                      • {grade.assessment_type}
                                    </p>
                                    {grade.notes && (
                                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                        {grade.notes}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-right">
                                      <p className="text-lg font-bold text-gray-900 leading-tight">
                                        {grade.grade}
                                        <span className="text-xs text-gray-400">
                                          /{grade.max_grade}
                                        </span>
                                      </p>
                                    </div>
                                    <div
                                      className={
                                        "px-2 py-1 rounded-lg font-bold text-sm border-2 min-w-[50px] text-center " +
                                        getGradeColor(gradeInfo)
                                      }
                                    >
                                      {gradeInfo.letter}
                                      {gradeInfo.band && (
                                        <div className="text-xs font-normal">
                                          {gradeInfo.band}
                                        </div>
                                      )}
                                    </div>
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
                      {/* Attendance Stats */}
                      <div className="grid grid-cols-5 gap-3">
                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 border-2 border-blue-200">
                          <p className="text-xs font-medium text-blue-700 mb-1">
                            Rate
                          </p>
                          <p className="text-2xl font-bold text-blue-700">
                            {studentFullData.attendanceStats.rate}%
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-3 border-2 border-green-200">
                          <p className="text-xs font-medium text-green-700 mb-1">
                            Present
                          </p>
                          <p className="text-xl font-bold text-green-700">
                            {studentFullData.attendanceStats.present}
                          </p>
                        </div>
                        <div className="bg-orange-50 rounded-xl p-3 border-2 border-orange-200">
                          <p className="text-xs font-medium text-orange-700 mb-1">
                            Late
                          </p>
                          <p className="text-xl font-bold text-orange-700">
                            {studentFullData.attendanceStats.late}
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-3 border-2 border-red-200">
                          <p className="text-xs font-medium text-red-700 mb-1">
                            Absent
                          </p>
                          <p className="text-xl font-bold text-red-700">
                            {studentFullData.attendanceStats.absent}
                          </p>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-3 border-2 border-purple-200">
                          <p className="text-xs font-medium text-purple-700 mb-1">
                            Sent Out
                          </p>
                          <p className="text-xl font-bold text-purple-700">
                            {studentFullData.attendanceStats.sentOut}
                          </p>
                        </div>
                      </div>

                      {/* Attendance History */}
                      <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                          <Clock size={18} className="text-cyan-600" />
                          Attendance History (
                          {studentFullData.attendance.length} records)
                        </h4>
                        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                          {studentFullData.attendance.map((att, idx) => {
                            const statusConfig = {
                              present: {
                                bg: "bg-green-50",
                                border: "border-green-200",
                                text: "text-green-700",
                                label: "Present",
                                icon: CheckCircle,
                              },
                              late: {
                                bg: "bg-orange-50",
                                border: "border-orange-200",
                                text: "text-orange-700",
                                label: "Late",
                                icon: Clock,
                              },
                              absent: {
                                bg: "bg-red-50",
                                border: "border-red-200",
                                text: "text-red-700",
                                label: "Absent",
                                icon: XCircle,
                              },
                              sent_out: {
                                bg: "bg-purple-50",
                                border: "border-purple-200",
                                text: "text-purple-700",
                                label: "Sent Out",
                                icon: AlertCircle,
                              },
                            };

                            const config =
                              statusConfig[att.status] || statusConfig.present;
                            const StatusIcon = config.icon;

                            return (
                              <div
                                key={idx}
                                className={`p-2 rounded-lg border ${config.bg} ${config.border}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <StatusIcon
                                      size={14}
                                      className={config.text}
                                    />
                                    <span className="text-xs font-medium text-gray-900">
                                      {new Date(
                                        att.date_key,
                                      ).toLocaleDateString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-xs font-semibold ${config.text}`}
                                  >
                                    {config.label}
                                  </span>
                                </div>
                                {att.comment && (
                                  <p className="text-xs text-gray-600 mt-1 pl-5">
                                    {att.comment}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ANALYTICS TAB */}
                  {activeTab === "analytics" && (
                    <div className="space-y-4">
                      {/* Overview Stats */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-green-700">
                              Average
                            </p>
                            <Award size={16} className="text-green-600" />
                          </div>
                          <p className="text-2xl font-bold text-green-700">
                            {studentFullData.gradeAverage}%
                          </p>
                          {(() => {
                            const gradeInfo = getCambridgeGrade(
                              studentFullData.gradeAverage,
                              selectedStudent.class_name,
                            );
                            return (
                              <div className="mt-1">
                                <span
                                  className={
                                    "px-2 py-0.5 rounded-lg text-xs font-bold inline-block border-2 " +
                                    getGradeColor(gradeInfo)
                                  }
                                >
                                  {gradeInfo.letter}
                                  {gradeInfo.band && ` • ${gradeInfo.band}`}
                                </span>
                                <p className="text-xs text-gray-600 mt-1">
                                  {gradeInfo.description}
                                </p>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-blue-700">
                              Attendance
                            </p>
                            <CheckCircle size={16} className="text-blue-600" />
                          </div>
                          <p className="text-2xl font-bold text-blue-700">
                            {studentFullData.attendanceStats.rate}%
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-purple-700">
                              Grades
                            </p>
                            <BarChart3 size={16} className="text-purple-600" />
                          </div>
                          <p className="text-2xl font-bold text-purple-700">
                            {studentFullData.grades.length}
                          </p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 border-2 border-orange-200">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-orange-700">
                              Comments
                            </p>
                            <MessageSquare
                              size={16}
                              className="text-orange-600"
                            />
                          </div>
                          <p className="text-2xl font-bold text-orange-700">
                            {studentFullData.comments.length}
                          </p>
                        </div>
                      </div>

                   
                      {/* Teacher Comments */}
{studentFullData.comments.length > 0 ? (
  <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
      <MessageSquare size={18} className="text-orange-600" />
      Teacher Comments ({studentFullData.comments.length})
    </h4>
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {studentFullData.comments.map((comment, idx) => (
        <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-xs font-semibold text-blue-900">
                {comment.teacher_name || comment.teachers?.full_name || 'Teacher'}
              </p>
              <p className="text-xs text-blue-700">
                {new Date(comment.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
            {comment.comment_type && (
              <span className={'px-2 py-0.5 rounded text-xs font-semibold ' +
                (comment.comment_type === 'positive' ? 'bg-green-100 text-green-700' :
                 comment.comment_type === 'negative' ? 'bg-red-100 text-red-700' :
                 'bg-gray-100 text-gray-700')}>
                {comment.comment_type}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700">{comment.comment}</p>
        </div>
      ))}
    </div>
  </div>
) : (
  <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center">
    <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
    <p className="text-gray-500 font-medium">No teacher comments yet</p>
    <p className="text-sm text-gray-400 mt-1">Comments from teachers will appear here</p>
  </div>
)}

                      {/* Performance Indicators */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                          <h4 className="font-bold text-gray-900 mb-3 text-sm">
                            Top Subject
                          </h4>
                          {studentFullData.subjectAverages.length > 0 ? (
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                              <p className="font-semibold text-green-900">
                                {studentFullData.subjectAverages[0].subject}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {(() => {
                                  const gradeInfo = getCambridgeGrade(
                                    studentFullData.subjectAverages[0].average,
                                    selectedStudent.class_name,
                                  );
                                  return (
                                    <>
                                      <span
                                        className={
                                          "px-2 py-0.5 rounded text-xs font-bold border " +
                                          getGradeColor(gradeInfo)
                                        }
                                      >
                                        {gradeInfo.letter}
                                        {gradeInfo.band &&
                                          ` • ${gradeInfo.band}`}
                                      </span>
                                      <span className="text-sm text-green-700">
                                        {
                                          studentFullData.subjectAverages[0]
                                            .average
                                        }
                                        %
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              No grades yet
                            </p>
                          )}
                        </div>

                        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                          <h4 className="font-bold text-gray-900 mb-3 text-sm">
                            Needs Focus
                          </h4>
                          {studentFullData.subjectAverages.length > 0 ? (
                            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <p className="font-semibold text-orange-900">
                                {
                                  studentFullData.subjectAverages[
                                    studentFullData.subjectAverages.length - 1
                                  ].subject
                                }
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {(() => {
                                  const gradeInfo = getCambridgeGrade(
                                    studentFullData.subjectAverages[
                                      studentFullData.subjectAverages.length - 1
                                    ].average,
                                    selectedStudent.class_name,
                                  );
                                  return (
                                    <>
                                      <span
                                        className={
                                          "px-2 py-0.5 rounded text-xs font-bold border " +
                                          getGradeColor(gradeInfo)
                                        }
                                      >
                                        {gradeInfo.letter}
                                        {gradeInfo.band &&
                                          ` • ${gradeInfo.band}`}
                                      </span>
                                      <span className="text-sm text-orange-700">
                                        {
                                          studentFullData.subjectAverages[
                                            studentFullData.subjectAverages
                                              .length - 1
                                          ].average
                                        }
                                        %
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              No grades yet
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Modal Footer */}
            <div className="border-t px-6 py-3 bg-gray-50">
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl hover:shadow-lg transition-all font-semibold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> This is a read-only view. Attendance is marked
          by subject teachers during their classes. Click on any student below
          to view their complete academic profile and analytics.
        </p>
      </div>
    </div>
  );
};

export default DailyOverviewPage;
