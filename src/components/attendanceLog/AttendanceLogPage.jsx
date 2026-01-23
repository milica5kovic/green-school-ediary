import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, TrendingUp, AlertCircle, Download, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CLASSES = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5A', 'Y5B', 'Y6', 'Y7', 'Y8', 'Y9'];

const AttendanceLogPage = () => {
  const { supabase, studentsService } = useApp();
  const [view, setView] = useState('overview'); // overview, students, classes, alerts
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Create service for attendance queries
  const service = React.useMemo(() => {
    if (!supabase) return null;
    
    class AttendanceLogService {
      constructor(supabaseClient) {
        this.supabase = supabaseClient;
      }
      
      async getAttendanceByDateRange(fromDate, toDate, className = null) {
        let query = this.supabase
          .from('attendance')
          .select('*')
          .gte('date_key', fromDate)
          .lte('date_key', toDate);
        
        if (className && className !== 'all') {
          const classStudents = await studentsService.getStudentsByClass(className);
          const studentIds = classStudents.map(s => s.id);
          query = query.in('student_id', studentIds);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      }
      
      async getStudentAttendance(studentId, fromDate, toDate) {
        const { data, error } = await this.supabase
          .from('attendance')
          .select('*')
          .eq('student_id', studentId)
          .gte('date_key', fromDate)
          .lte('date_key', toDate)
          .order('date_key', { ascending: true });
        
        if (error) throw error;
        return data || [];
      }
    }
    
    return new AttendanceLogService(supabase);
  }, [supabase, studentsService]);

  const loadData = useCallback(async () => {
    if (!service || !studentsService) return;
    
    try {
      setLoading(true);
      const [attendanceRecords, allStudents] = await Promise.all([
        service.getAttendanceByDateRange(fromDate, toDate, selectedClass),
        studentsService.getAllStudents()
      ]);
      
      setAttendanceData(attendanceRecords);
      setStudents(allStudents);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      alert('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [service, studentsService, fromDate, toDate, selectedClass]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateStudentStats = (studentId) => {
    const records = attendanceData.filter(r => r.student_id === studentId);
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const percentage = total > 0 ? ((present + late * 0.5) / total * 100).toFixed(1) : 0;
    
    return { total, present, absent, late, percentage: parseFloat(percentage) };
  };

  const getClassStats = () => {
    const stats = {};
    
    CLASSES.forEach(className => {
      const classStudents = students.filter(s => s.class_name === className);
      const classRecords = attendanceData.filter(r => 
        classStudents.some(s => s.id === r.student_id)
      );
      
      const total = classRecords.length;
      const present = classRecords.filter(r => r.status === 'present').length;
      const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
      
      stats[className] = {
        total,
        present,
        percentage: parseFloat(percentage),
        studentCount: classStudents.length
      };
    });
    
    return stats;
  };

  const getTrendData = () => {
    const dateMap = {};
    
    attendanceData.forEach(record => {
      if (!dateMap[record.date_key]) {
        dateMap[record.date_key] = { date: record.date_key, total: 0, present: 0 };
      }
      dateMap[record.date_key].total++;
      if (record.status === 'present') {
        dateMap[record.date_key].present++;
      }
    });
    
    return Object.values(dateMap)
      .map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        percentage: d.total > 0 ? ((d.present / d.total) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getAlerts = () => {
    const alerts = [];
    
    students.forEach(student => {
      const stats = calculateStudentStats(student.id);
      
      // Low attendance
      if (stats.percentage < 80 && stats.total >= 5) {
        alerts.push({
          type: 'warning',
          student: student.name,
          class: student.class_name,
          message: `Low attendance: ${stats.percentage}%`,
          severity: stats.percentage < 70 ? 'high' : 'medium'
        });
      }
      
      // Check consecutive absences
      const studentRecords = attendanceData
        .filter(r => r.student_id === student.id)
        .sort((a, b) => new Date(a.date_key) - new Date(b.date_key));
      
      let consecutiveAbsent = 0;
      for (let i = studentRecords.length - 1; i >= 0; i--) {
        if (studentRecords[i].status === 'absent') {
          consecutiveAbsent++;
        } else {
          break;
        }
      }
      
      if (consecutiveAbsent >= 3) {
        alerts.push({
          type: 'danger',
          student: student.name,
          class: student.class_name,
          message: `Absent for ${consecutiveAbsent} consecutive days`,
          severity: 'high'
        });
      }
    });
    
    return alerts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  };

  const exportToPDF = () => {
    alert('PDF export will be implemented next! Logo at /logo.png');
  };

  const filteredStudents = students.filter(s => {
    const matchesClass = selectedClass === 'all' || s.class_name === selectedClass;
    const matchesSearch = searchTerm === '' || s.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const classStats = getClassStats();
  const trendData = getTrendData();
  const alerts = getAlerts();

  const overallStats = {
    totalRecords: attendanceData.length,
    present: attendanceData.filter(r => r.status === 'present').length,
    absent: attendanceData.filter(r => r.status === 'absent').length,
    late: attendanceData.filter(r => r.status === 'late').length,
    percentage: attendanceData.length > 0 
      ? ((attendanceData.filter(r => r.status === 'present').length / attendanceData.length) * 100).toFixed(1)
      : 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Attendance Log</h2>
            <p className="text-gray-500 mt-1">Historical attendance records and analytics</p>
          </div>
          <button
            onClick={exportToPDF}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Download size={20} />
            Export PDF
          </button>
        </div>

        {/* Date Range & Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class Filter</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="all">All Classes</option>
              {CLASSES.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                className="w-full pl-10 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-6 shadow-lg">
          <p className="text-3xl font-bold">{overallStats.totalRecords}</p>
          <p className="text-sm opacity-90 mt-1">Total Records</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-200">
          <p className="text-3xl font-bold text-green-600">{overallStats.present}</p>
          <p className="text-sm text-gray-600 mt-1">Present</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-200">
          <p className="text-3xl font-bold text-red-600">{overallStats.absent}</p>
          <p className="text-sm text-gray-600 mt-1">Absent</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-orange-200">
          <p className="text-3xl font-bold text-orange-600">{overallStats.late}</p>
          <p className="text-sm text-gray-600 mt-1">Late</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex gap-3 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'students', label: 'Students', icon: Users },
            { id: 'classes', label: 'Classes', icon: Calendar },
            { id: 'alerts', label: 'Alerts', icon: AlertCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                view === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {view === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Attendance Trend Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="percentage" stroke="#10b981" strokeWidth={2} name="Attendance %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {view === 'students' && (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Student Attendance Records</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-emerald-50 border-b border-emerald-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-700">Student</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-700">Class</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-700">Total</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-700">Present</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-700">Absent</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-700">Late</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-emerald-700">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.map(student => {
                    const stats = calculateStudentStats(student.id);
                    const colorClass = stats.percentage >= 90 ? 'text-green-600 font-bold' :
                                      stats.percentage >= 80 ? 'text-blue-600 font-bold' :
                                      stats.percentage >= 70 ? 'text-orange-600 font-bold' : 'text-red-600 font-bold';
                    
                    return (
                      <tr key={student.id} className="hover:bg-emerald-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-800">{student.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                            {student.class_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">{stats.total}</td>
                        <td className="px-6 py-4 text-center text-green-600">{stats.present}</td>
                        <td className="px-6 py-4 text-center text-red-600">{stats.absent}</td>
                        <td className="px-6 py-4 text-center text-orange-600">{stats.late}</td>
                        <td className={`px-6 py-4 text-center ${colorClass}`}>{stats.percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Classes Tab */}
        {view === 'classes' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Class Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(classStats).map(([name, stats]) => ({ 
                  class: name, 
                  percentage: stats.percentage 
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="class" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="percentage" fill="#10b981" name="Attendance %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(classStats).map(([className, stats]) => (
                <div key={className} className="bg-white rounded-xl p-4 border border-emerald-200">
                  <p className="text-sm text-gray-500 mb-1">{className}</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.percentage}%</p>
                  <p className="text-xs text-gray-400 mt-1">{stats.studentCount} students</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {view === 'alerts' && (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Attendance Alerts</h3>
            {alerts.length === 0 ? (
              <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
                <AlertCircle size={48} className="mx-auto text-green-400 mb-4" />
                <p className="text-green-700 font-medium">No attendance alerts!</p>
                <p className="text-sm text-green-600 mt-2">All students have good attendance records</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'high'
                        ? 'bg-red-50 border-red-500'
                        : 'bg-orange-50 border-orange-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertCircle 
                          className={alert.severity === 'high' ? 'text-red-600' : 'text-orange-600'} 
                          size={20} 
                        />
                        <div>
                          <p className="font-semibold text-gray-800">{alert.student}</p>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700">
                        {alert.class}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceLogPage;