import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, TrendingUp, AlertCircle, Download, Search, Snowflake, Flower2, Sun, BookOpen } from 'lucide-react';
import { useApp } from '../../../core/context/AppContext';
import { useAuth } from '../../../core/context/AuthContext';
import useActiveTerm from '../../../shared/hooks/useActiveTerm';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TERM_CONFIG = {
  1: { name: 'Winter', icon: Snowflake, bgActive: 'bg-blue-100 text-blue-700 border-blue-300', bgInactive: 'text-gray-500 hover:bg-gray-100' },
  2: { name: 'Spring', icon: Flower2, bgActive: 'bg-pink-100 text-pink-700 border-pink-300', bgInactive: 'text-gray-500 hover:bg-gray-100' },
  3: { name: 'Summer', icon: Sun, bgActive: 'bg-amber-100 text-amber-700 border-amber-300', bgInactive: 'text-gray-500 hover:bg-gray-100' }
};

const AttendanceLogPage = () => {
  const { supabase, studentsService } = useApp();
  const { teacher, canViewAllClasses } = useAuth();
  const { activeTerm, allTerms, loading: termsLoading } = useActiveTerm();

  const [availableClasses, setAvailableClasses] = useState([]);
  const [view, setView] = useState('overview');
  const [selectedTermNumber, setSelectedTermNumber] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Set initial term
  useEffect(() => {
    if (activeTerm && !selectedTermNumber) {
      setSelectedTermNumber(activeTerm.term_number);
    }
  }, [activeTerm, selectedTermNumber]);

  // Update date range when term changes
  useEffect(() => {
    const term = allTerms.find(t => t.term_number === selectedTermNumber);
    if (term) {
      setFromDate(term.start_date);
      setToDate(term.end_date);
    }
  }, [selectedTermNumber, allTerms]);

  // Load available classes
  useEffect(() => {
    const loadClasses = async () => {
      if (!supabase) return;
      try {
        if (!canViewAllClasses() && teacher?.id) {
          const { data } = await supabase.from('teacher_schedule').select('class_name').eq('teacher_id', teacher.id);
          setAvailableClasses([...new Set(data?.map(s => s.class_name) || [])].sort());
        } else {
          const { data } = await supabase.from('custom_classes').select('class_name').eq('is_active', true).order('class_name');
          setAvailableClasses((data || []).map(c => c.class_name));
        }
      } catch (err) { console.error('Error loading classes:', err); }
    };
    loadClasses();
  }, [teacher, canViewAllClasses, supabase]);

  // Load attendance data
  const loadData = useCallback(async () => {
    if (!supabase || !studentsService || !fromDate || !toDate) return;
    try {
      setLoading(true);
      let teacherClasses = null;
      if (!canViewAllClasses() && teacher?.id) {
        const { data } = await supabase.from('teacher_schedule').select('class_name').eq('teacher_id', teacher.id);
        teacherClasses = [...new Set(data?.map(s => s.class_name) || [])];
      }

      const allStudents = await studentsService.getAllStudents();
      let filteredStudents = allStudents;
      if (!canViewAllClasses() && teacherClasses) {
        filteredStudents = allStudents.filter(s => teacherClasses.includes(s.class_name));
      }
      if (selectedClass !== 'all') {
        filteredStudents = filteredStudents.filter(s => s.class_name === selectedClass);
      }

      const studentIds = filteredStudents.map(s => s.id);
      let attendanceRecords = [];
      if (studentIds.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < studentIds.length; i += batchSize) {
          const batch = studentIds.slice(i, i + batchSize);
          const { data, error } = await supabase
            .from('attendance').select('*')
            .gte('date_key', fromDate).lte('date_key', toDate)
            .in('student_id', batch);
          if (error) throw error;
          attendanceRecords = attendanceRecords.concat(data || []);
        }
      }

      setAttendanceData(attendanceRecords);
      setStudents(filteredStudents);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally { setLoading(false); }
  }, [supabase, studentsService, fromDate, toDate, selectedClass, teacher, canViewAllClasses]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── CALCULATIONS ───────────────────────────────────

  const calculateStudentStats = (studentId) => {
    const records = attendanceData.filter(r => r.student_id === studentId);
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const sentOut = records.filter(r => r.status === 'sent_out').length;
    const percentage = total > 0 ? ((present + late * 0.5) / total * 100) : 0;
    return { total, present, absent, late, sentOut, percentage: parseFloat(percentage.toFixed(1)) };
  };

  const getClassStats = () => {
    const stats = {};
    const classNames = selectedClass !== 'all' ? [selectedClass] : availableClasses;
    classNames.forEach(cn => {
      const classStudents = students.filter(s => s.class_name === cn);
      const classRecords = attendanceData.filter(r => classStudents.some(s => s.id === r.student_id));
      const total = classRecords.length;
      const present = classRecords.filter(r => r.status === 'present').length;
      stats[cn] = { total, present, percentage: total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0, studentCount: classStudents.length };
    });
    return stats;
  };

  const getTrendData = () => {
    const dateMap = {};
    attendanceData.forEach(record => {
      if (!dateMap[record.date_key]) dateMap[record.date_key] = { date: record.date_key, total: 0, present: 0 };
      dateMap[record.date_key].total++;
      if (record.status === 'present') dateMap[record.date_key].present++;
    });
    return Object.values(dateMap)
      .map(d => ({ date: new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }), percentage: d.total > 0 ? parseFloat(((d.present / d.total) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getAlerts = () => {
    const alerts = [];
    students.forEach(student => {
      const stats = calculateStudentStats(student.id);
      if (stats.percentage < 80 && stats.total >= 5) {
        alerts.push({ student: student.name, class: student.class_name, message: `Low attendance: ${stats.percentage}%`, severity: stats.percentage < 70 ? 'high' : 'medium' });
      }
      const studentRecords = attendanceData.filter(r => r.student_id === student.id).sort((a, b) => new Date(a.date_key) - new Date(b.date_key));
      let consecutiveAbsent = 0;
      for (let i = studentRecords.length - 1; i >= 0; i--) {
        if (studentRecords[i].status === 'absent') consecutiveAbsent++; else break;
      }
      if (consecutiveAbsent >= 3) {
        alerts.push({ student: student.name, class: student.class_name, message: `Absent for ${consecutiveAbsent} consecutive days`, severity: 'high' });
      }
    });
    return alerts.sort((a, b) => ({ high: 0, medium: 1, low: 2 })[a.severity] - ({ high: 0, medium: 1, low: 2 })[b.severity]);
  };

  const filteredStudents = students.filter(s => searchTerm === '' || s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const classStats = getClassStats();
  const trendData = getTrendData();
  const alerts = getAlerts();
  const selectedTermData = allTerms.find(t => t.term_number === selectedTermNumber);

  const overallStats = {
    totalRecords: attendanceData.length,
    present: attendanceData.filter(r => r.status === 'present').length,
    absent: attendanceData.filter(r => r.status === 'absent').length,
    late: attendanceData.filter(r => r.status === 'late').length,
    sentOut: attendanceData.filter(r => r.status === 'sent_out').length,
    percentage: attendanceData.length > 0 ? ((attendanceData.filter(r => r.status === 'present').length / attendanceData.length) * 100).toFixed(1) : 0
  };

  if (loading && attendanceData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar size={24} className="text-emerald-600" />
              Attendance Log
            </h2>
            <p className="text-sm text-gray-500 mt-1">Historical attendance records and analytics</p>
          </div>
          <button onClick={() => alert('PDF export coming soon!')}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:shadow-lg transition-all flex items-center gap-2">
            <Download size={18} /> Export PDF
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="all">All Classes</option>
              {availableClasses.map(cls => (<option key={cls} value={cls}>{cls}</option>))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Term Tabs + Content */}
      {allTerms.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
          {/* Term Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {allTerms.map(term => {
              const config = TERM_CONFIG[term.term_number];
              const Icon = config?.icon || BookOpen;
              const isSelected = selectedTermNumber === term.term_number;
              const isActive = activeTerm?.term_number === term.term_number;
              return (
                <button key={term.id} onClick={() => setSelectedTermNumber(term.term_number)}
                  className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                    isSelected ? `${config?.bgActive} border-current` : `${config?.bgInactive} border-transparent`
                  }`}>
                  <Icon size={16} />
                  <span className="hidden sm:inline">Term {term.term_number}:</span> {config?.name}
                  {isActive && <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">ACTIVE</span>}
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              {selectedTermData && (
                <>{new Date(selectedTermData.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(selectedTermData.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
              )}
            </span>
            <span>{attendanceData.length} records • {students.length} students</span>
          </div>

          <div className="p-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-4 shadow">
                <p className="text-2xl font-bold">{overallStats.percentage}%</p>
                <p className="text-xs opacity-90 mt-0.5">Overall Rate</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-green-200">
                <p className="text-2xl font-bold text-green-600">{overallStats.present}</p>
                <p className="text-xs text-gray-600 mt-0.5">Present</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-red-200">
                <p className="text-2xl font-bold text-red-600">{overallStats.absent}</p>
                <p className="text-xs text-gray-600 mt-0.5">Absent</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-orange-200">
                <p className="text-2xl font-bold text-orange-600">{overallStats.late}</p>
                <p className="text-xs text-gray-600 mt-0.5">Late</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-purple-200">
                <p className="text-2xl font-bold text-purple-600">{overallStats.sentOut}</p>
                <p className="text-xs text-gray-600 mt-0.5">Sent Out</p>
              </div>
            </div>

            {/* View Tabs */}
            <div className="flex gap-2 mb-5">
              {[
                { id: 'overview', label: 'Trend', icon: TrendingUp },
                { id: 'students', label: 'Students', icon: Users },
                { id: 'classes', label: 'Classes', icon: Calendar },
                { id: 'alerts', label: 'Alerts', icon: AlertCircle }
              ].map(tab => (
                <button key={tab.id} onClick={() => setView(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    view === tab.id ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  <tab.icon size={16} /> {tab.label}
                  {tab.id === 'alerts' && alerts.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${view === 'alerts' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>{alerts.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* OVERVIEW / TREND */}
            {view === 'overview' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Attendance Trend — {TERM_CONFIG[selectedTermNumber]?.name} Term</h3>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Attendance %" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <TrendingUp size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No attendance data for this term yet</p>
                  </div>
                )}
              </div>
            )}

            {/* STUDENTS */}
            {view === 'students' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Student Attendance — {TERM_CONFIG[selectedTermNumber]?.name} Term</h3>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Users size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No students found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left px-4 py-2.5 font-semibold text-gray-700 border-b border-gray-200">Student</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-gray-700 border-b border-gray-200">Class</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-green-700 border-b border-gray-200">Present</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-red-700 border-b border-gray-200">Absent</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-orange-700 border-b border-gray-200">Late</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-purple-700 border-b border-gray-200">Sent Out</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-gray-700 border-b border-gray-200">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student, idx) => {
                          const stats = calculateStudentStats(student.id);
                          const rateColor = stats.percentage >= 90 ? 'text-green-600' : stats.percentage >= 80 ? 'text-blue-600' : stats.percentage >= 70 ? 'text-orange-600' : 'text-red-600';
                          const initials = student.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                          return (
                            <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-emerald-700">{initials}</span>
                                  </div>
                                  <span className="font-medium text-gray-800">{student.name}</span>
                                </div>
                              </td>
                              <td className="text-center px-3 py-2.5">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">{student.class_name}</span>
                              </td>
                              <td className="text-center px-3 py-2.5 text-green-600 font-medium">{stats.present}</td>
                              <td className="text-center px-3 py-2.5 text-red-600 font-medium">{stats.absent}</td>
                              <td className="text-center px-3 py-2.5 text-orange-600 font-medium">{stats.late}</td>
                              <td className="text-center px-3 py-2.5 text-purple-600 font-medium">{stats.sentOut}</td>
                              <td className="text-center px-3 py-2.5"><span className={`font-bold ${rateColor}`}>{stats.percentage}%</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* CLASSES */}
            {view === 'classes' && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-gray-700">Class Comparison — {TERM_CONFIG[selectedTermNumber]?.name} Term</h3>
                {Object.keys(classStats).length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={Object.entries(classStats).map(([name, s]) => ({ class: name, percentage: s.percentage }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="class" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="percentage" fill="#10b981" radius={[6, 6, 0, 0]} name="Attendance %" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {Object.entries(classStats).map(([cn, s]) => {
                        const c = s.percentage >= 90 ? 'text-green-600' : s.percentage >= 80 ? 'text-blue-600' : 'text-orange-600';
                        return (
                          <div key={cn} className="bg-white rounded-xl p-3 border border-gray-200 text-center">
                            <p className="text-xs text-gray-500 font-medium">{cn}</p>
                            <p className={`text-xl font-bold mt-0.5 ${c}`}>{s.percentage}%</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{s.studentCount} students</p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No class data available</p>
                  </div>
                )}
              </div>
            )}

            {/* ALERTS */}
            {view === 'alerts' && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Attendance Alerts</h3>
                {alerts.length === 0 ? (
                  <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
                    <AlertCircle size={40} className="mx-auto text-green-400 mb-3" />
                    <p className="text-green-700 font-medium text-sm">No attendance alerts!</p>
                    <p className="text-xs text-green-600 mt-1">All students have good attendance</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((alert, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border-l-4 flex items-center justify-between ${
                        alert.severity === 'high' ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <AlertCircle size={16} className={alert.severity === 'high' ? 'text-red-600' : 'text-orange-600'} />
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{alert.student}</p>
                            <p className="text-xs text-gray-600">{alert.message}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-white rounded-full text-xs font-medium text-gray-700 shadow-sm">{alert.class}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!termsLoading && allTerms.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-amber-200 text-center">
          <AlertCircle size={40} className="mx-auto text-amber-400 mb-3" />
          <p className="text-gray-700 font-medium text-sm">Academic terms not configured</p>
          <p className="text-xs text-gray-500 mt-1">Go to Management → Academic Terms to set up your school year.</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceLogPage;