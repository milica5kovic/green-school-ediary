import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, ChevronLeft, ChevronRight, ChevronDown, AlertCircle,
  BookOpen, CheckCircle, XCircle, FileText, MessageSquare, Award, Home, Users
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';

// ════════════════════════════════════════════════════════════════════════════
// PARENT DAILY VIEW PAGE - Uses useTermTheme for dynamic colors
// ════════════════════════════════════════════════════════════════════════════

const ParentDailyViewPage = () => {
  const { supabase } = useApp();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyClasses, setDailyClasses] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [homeworkDueToday, setHomeworkDueToday] = useState([]);
  const [studentHomeworkStatus, setStudentHomeworkStatus] = useState({});
  const [loading, setLoading] = useState(true);

  const loadChildren = useCallback(async () => {
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!parent) return;
      
      const { data: studentParents } = await supabase
        .from('student_parents')
        .select('students(*)')
        .eq('parent_id', parent.id);
      
      const childrenList = studentParents?.map(sp => sp.students).filter(Boolean) || [];
      setChildren(childrenList);
      
      if (childrenList.length > 0) {
        setSelectedChild(childrenList[0]);
      }
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const loadDailyData = useCallback(async () => {
    if (!selectedChild) return;
    
    try {
      const dateKey = selectedDate.toISOString().split('T')[0];
      
      // Load classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('date_key', dateKey)
        .eq('class_name', selectedChild.class_name)
        .order('time');
      
      setDailyClasses(classesData || []);
      
      // Load attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('date_key', dateKey)
        .eq('student_id', selectedChild.id);
      
      const attendanceMap = {};
      attendanceData?.forEach(att => {
        attendanceMap[att.class_id] = att;
      });
      setAttendanceRecords(attendanceMap);
      
      // Load homework due today
      const { data: homeworkData } = await supabase
        .from('homework')
        .select('*')
        .eq('class_name', selectedChild.class_name)
        .eq('due_date', dateKey)
        .order('subject');
      
      setHomeworkDueToday(homeworkData || []);
      
      // Load student homework status
      if (homeworkData && homeworkData.length > 0) {
        const homeworkIds = homeworkData.map(hw => hw.id);
        
        const { data: studentHomework } = await supabase
          .from('student_homework')
          .select('*')
          .eq('student_id', selectedChild.id)
          .in('homework_id', homeworkIds);
        
        const statusMap = {};
        studentHomework?.forEach(sh => {
          statusMap[sh.homework_id] = sh;
        });
        setStudentHomeworkStatus(statusMap);
      }
    } catch (error) {
      console.error('Error loading daily data:', error);
    }
  }, [selectedChild, selectedDate, supabase]);

  useEffect(() => {
    if (selectedChild) {
      loadDailyData();
    }
  }, [selectedChild, selectedDate, loadDailyData]);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'present':
        return {
          icon: CheckCircle,
          bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
          border: 'border-green-300',
          badge: 'bg-green-100 text-green-700',
          text: 'Present',
          iconColor: 'text-green-600'
        };
      case 'late':
        return {
          icon: Clock,
          bg: 'bg-gradient-to-r from-orange-50 to-yellow-50',
          border: 'border-orange-300',
          badge: 'bg-orange-100 text-orange-700',
          text: 'Late',
          iconColor: 'text-orange-600'
        };
      case 'absent':
        return {
          icon: XCircle,
          bg: 'bg-gradient-to-r from-red-50 to-pink-50',
          border: 'border-red-300',
          badge: 'bg-red-100 text-red-700',
          text: 'Absent',
          iconColor: 'text-red-600'
        };
      case 'sent_out':
        return {
          icon: AlertCircle,
          bg: 'bg-gradient-to-r from-purple-50 to-pink-50',
          border: 'border-purple-300',
          badge: 'bg-purple-100 text-purple-700',
          text: 'Sent Out',
          iconColor: 'text-purple-600'
        };
      default:
        return {
          icon: Clock,
          bg: 'bg-gradient-to-r from-gray-50 to-slate-50',
          border: 'border-gray-300',
          badge: 'bg-gray-100 text-gray-600',
          text: 'Not Marked',
          iconColor: 'text-gray-400'
        };
    }
  };

  const getHomeworkStatusBadge = (homeworkId) => {
    const status = studentHomeworkStatus[homeworkId];
    if (!status) return { text: 'Not Started', color: 'bg-gray-100 text-gray-700' };
    
    switch (status.status) {
      case 'done': return { text: '✓ Done', color: 'bg-green-100 text-green-700' };
      case 'partially_done': return { text: '◐ Partial', color: 'bg-orange-100 text-orange-700' };
      case 'not_done': return { text: '○ Not Done', color: 'bg-red-100 text-red-700' };
      default: return { text: 'Not Started', color: 'bg-gray-100 text-gray-700' };
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

  const goToToday = () => setSelectedDate(new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 rounded-full animate-spin"
          style={{ borderColor: theme.withAlpha(0.3), borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
        <Users size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600 text-lg font-medium">No children linked to your account</p>
        <p className="text-gray-400 text-sm mt-2">Please contact the school administrator</p>
      </div>
    );
  }

  const dateString = selectedDate.toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Stats
  const attendanceList = Object.values(attendanceRecords);
  const stats = {
    totalClasses: dailyClasses.length,
    present: attendanceList.filter(a => a.status === 'present').length,
    late: attendanceList.filter(a => a.status === 'late').length,
    absent: attendanceList.filter(a => a.status === 'absent').length,
    sentOut: attendanceList.filter(a => a.status === 'sent_out').length,
    notMarked: dailyClasses.length - attendanceList.length
  };

  const overallStatus = stats.absent > 0 ? 'absent' : 
                        stats.sentOut > 0 ? 'sent_out' :
                        stats.late > 0 ? 'late' : 
                        stats.present === stats.totalClasses && stats.totalClasses > 0 ? 'present' : 'partial';

  return (
    <div className="space-y-6">
      {/* ═══ HEADER - Dynamic Gradient ═══════════════════════ */}
      <div className="rounded-2xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden"
        style={theme.gradientStyle}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
                <Calendar size={24} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Daily View</h1>
                <p className="text-white/70 text-sm">{dateString}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {theme.hasActiveTerm && (
                <div className="hidden sm:flex bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg items-center gap-1.5">
                  <TermIcon size={14} />
                  <span className="text-xs font-medium">{theme.name} Term</span>
                </div>
              )}
              {children.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedChild?.id || ''}
                    onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                    className="appearance-none bg-white/20 backdrop-blur border border-white/30 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-white focus:outline-none cursor-pointer"
                  >
                    {children.map(child => (
                      <option key={child.id} value={child.id} className="text-gray-900">
                        {child.name} - {child.class_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" size={16} />
                </div>
              )}
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between bg-white/15 backdrop-blur rounded-2xl p-4 border border-white/20">
            <button onClick={prevDay} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            
            <button
              onClick={goToToday}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${isToday ? 'bg-white text-gray-800' : 'bg-white/20 hover:bg-white/30'}`}
              style={isToday ? { color: theme.color } : {}}
            >
              {isToday ? "Today's Schedule" : 'Go to Today'}
            </button>
            
            <button onClick={nextDay} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-6">
            {[
              { label: 'Classes', value: stats.totalClasses },
              { label: 'Present', value: stats.present },
              { label: 'Late', value: stats.late },
              { label: 'Absent', value: stats.absent },
              { label: 'Sent Out', value: stats.sentOut },
              { label: 'Due Today', value: homeworkDueToday.length },
            ].map((s, i) => (
              <div key={i} className="bg-white/15 backdrop-blur rounded-xl p-3 border border-white/20 text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-white/70 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ HOMEWORK DUE TODAY ═══════════════════════════════ */}
      {homeworkDueToday.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-lg border-2 border-amber-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <FileText size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Homework Due Today</h3>
              <p className="text-sm text-gray-600">{homeworkDueToday.length} assignment{homeworkDueToday.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-3">
            {homeworkDueToday.map((hw) => {
              const statusBadge = getHomeworkStatusBadge(hw.id);
              return (
                <div key={hw.id} className="bg-white rounded-xl p-4 border-2 border-amber-300">
                  <div className="flex items-start justify-between mb-2">
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">
                      {hw.subject}
                    </span>
                    <span className={'text-xs font-semibold px-2 py-1 rounded-lg ' + statusBadge.color}>
                      {statusBadge.text}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 mb-1">{hw.title}</p>
                  {hw.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{hw.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ CLASSES & ATTENDANCE ═════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: theme.withAlpha(0.15) }}>
            <BookOpen size={20} style={theme.textStyle} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Today's Classes</h3>
            <p className="text-sm text-gray-600">Class-by-class attendance record</p>
          </div>
        </div>

        {dailyClasses.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">No classes scheduled</p>
            <p className="text-sm text-gray-400 mt-2">Check another date or contact the school</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dailyClasses.map((classItem) => {
              const attendance = attendanceRecords[classItem.class_id];
              const config = getStatusConfig(attendance?.status);
              const StatusIcon = config.icon;
              
              return (
                <div 
                  key={classItem.id}
                  className={`rounded-2xl border-2 p-5 transition-all hover:shadow-lg ${config.bg} ${config.border}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${config.border} ${config.badge}`}>
                        <StatusIcon size={24} className={config.iconColor} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-gray-900 text-lg">{classItem.subject}</h4>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                            {classItem.time}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium mb-1">{classItem.title}</p>
                        {classItem.parent_visible_note && (
                          <p className="text-sm mt-2" style={theme.textStyle}>
                            📘 {classItem.parent_visible_note}
                          </p>
                        )}
                        {classItem.homework_assigned && (
                          <p className="text-sm text-orange-600 mt-2">
                            📝 Homework: {classItem.homework_assigned}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className={`px-4 py-2 rounded-xl text-sm font-bold ${config.badge}`}>
                      {config.text}
                    </div>
                  </div>

                  {attendance?.comment && (
                    <div className="mt-3 p-4 bg-white rounded-xl border-2"
                      style={{ borderColor: theme.withAlpha(0.3) }}>
                      <div className="flex items-start gap-2">
                        <MessageSquare size={16} style={theme.textStyle} className="mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold mb-1" style={theme.textStyle}>Teacher's Note:</p>
                          <p className="text-sm text-gray-700">{attendance.comment}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ DAY SUMMARY ══════════════════════════════════════ */}
      {dailyClasses.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Award size={20} className="text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900">Day Summary</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Attendance Overview</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200">
                  <span className="text-sm font-medium text-gray-700">Present</span>
                  <span className="text-lg font-bold text-green-700">{stats.present}/{stats.totalClasses}</span>
                </div>
                {stats.late > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200">
                    <span className="text-sm font-medium text-gray-700">Late Arrivals</span>
                    <span className="text-lg font-bold text-orange-700">{stats.late}</span>
                  </div>
                )}
                {stats.absent > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                    <span className="text-sm font-medium text-gray-700">Absences</span>
                    <span className="text-lg font-bold text-red-700">{stats.absent}</span>
                  </div>
                )}
                {stats.notMarked > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Not Yet Marked</span>
                    <span className="text-lg font-bold text-gray-700">{stats.notMarked}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Overall Status</h4>
              <div className={`p-6 rounded-2xl border-2 text-center ${getStatusConfig(overallStatus).bg} ${getStatusConfig(overallStatus).border}`}>
                <p className="text-sm text-gray-600 mb-2">Today's Performance</p>
                <p className={`text-2xl font-bold ${getStatusConfig(overallStatus).iconColor}`}>
                  {overallStatus === 'present' ? '✓ Perfect Attendance' :
                   overallStatus === 'late' ? '⏰ Partial Attendance' :
                   overallStatus === 'absent' ? '✗ Absent' :
                   overallStatus === 'sent_out' ? '⚠ Sent Out' :
                   '○ Incomplete'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TERM FOOTER ═════════════════════════════════════ */}
      {theme.hasActiveTerm && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} style={theme.textStyle} />
            <span className="text-xs font-semibold" style={theme.textStyle}>{theme.name} Term {theme.activeTerm.academic_year}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 rounded-full h-1.5 hidden sm:block" style={{ backgroundColor: theme.withAlpha(0.2) }}>
              <div className="h-1.5 rounded-full" style={{ width: `${theme.progress}%`, backgroundColor: theme.color }} />
            </div>
            <span className="text-[10px] font-medium" style={theme.textStyle}>
              {theme.daysRemaining}d left
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDailyViewPage;