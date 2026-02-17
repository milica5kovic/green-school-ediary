import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Users, CheckCircle, XCircle, Clock,
  AlertCircle, Mail, Phone, TrendingUp, Filter, Download, X
} from 'lucide-react';
import { supabase } from '../../../core/infrastructure/supabaseClient';

const EnrollmentTabContent = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [capacityOverview, setCapacityOverview] = useState([]);
  
  const [formData, setFormData] = useState({
    student_name: '',
    date_of_birth: '',
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    parent_address: '',
    current_class: '',
    requested_class: '',
    notes: '',
    previous_school: '',
    medical_info: '',
    is_returning_student: false
  });

  const ENROLLMENT_YEAR = '2026-2027';
  const MAX_PER_CLASS = 15;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: enrollData, error: enrollError } = await supabase
        .from('enrollment_applications')
        .select('*')
        .order('application_date', { ascending: false });

      if (enrollError) throw enrollError;
      setEnrollments(enrollData || []);

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'active')
        .order('class_name');

      if (studentError) throw studentError;
      setStudents(studentData || []);

      calculateCapacity(enrollData || []);

    } catch (error) {
      console.error('Error loading enrollment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCapacity = (enrollData) => {
    const classCounts = {};
    
    enrollData
      .filter(e => e.status === 'confirmed')
      .forEach(enrollment => {
        const className = enrollment.requested_class;
        classCounts[className] = (classCounts[className] || 0) + 1;
      });

    const overview = ['Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9'].map(year => {
      const confirmed = classCounts[year] || 0;
      const needsSplit = confirmed > MAX_PER_CLASS;
      return {
        year,
        confirmed,
        available: Math.max(0, MAX_PER_CLASS - confirmed),
        needsSplit,
        sections: needsSplit ? Math.ceil(confirmed / MAX_PER_CLASS) : 1
      };
    });

    setCapacityOverview(overview);
  };

  const handleAutoEnrollReturning = async () => {
    if (!window.confirm(
      'This will auto-enroll all current active students for next year.\n\n' +
      'Y1 → Y2, Y2 → Y3, ... Y8 → Y9\n' +
      'Y9 students will be marked as graduating.\n\n' +
      'Continue?'
    )) return;

    try {
      // Get all existing enrollments at once (avoid N+1 queries)
      const { data: existingEnrollments } = await supabase
        .from('enrollment_applications')
        .select('student_name, current_student_id')
        .eq('is_returning_student', true)
        .eq('enrollment_year', ENROLLMENT_YEAR);

      const existingNames = new Set(
        existingEnrollments?.map(e => e.student_name) || []
      );

      const enrollmentsToAdd = [];

      for (const student of students) {
        // Skip if already enrolled
        if (existingNames.has(student.name)) continue;

        const yearMatch = student.class_name?.match(/Y(\d+)/);
        if (!yearMatch) continue;

        const currentYear = parseInt(yearMatch[1]);
        if (currentYear === 9) continue; // Graduating

        const nextYearClass = `Y${currentYear + 1}`;

        enrollmentsToAdd.push({
          student_name: student.name,
          date_of_birth: student.date_of_birth || null,
          current_student_id: student.id,
          parent_name: student.parent_contact || 'Unknown',
          parent_email: student.email || '',
          parent_phone: student.parent_contact || '',
          current_class: student.class_name,
          requested_class: nextYearClass,
          status: 'confirmed',
          is_returning_student: true,
          priority: 1,
          notes: 'Auto-enrolled returning student',
          enrollment_year: ENROLLMENT_YEAR
        });
      }

      if (enrollmentsToAdd.length === 0) {
        alert('No new students to enroll (all already enrolled)');
        return;
      }

      const { error } = await supabase
        .from('enrollment_applications')
        .insert(enrollmentsToAdd);

      if (error) throw error;

      alert(`Successfully enrolled ${enrollmentsToAdd.length} returning students!`);
      await loadData();

    } catch (error) {
      console.error('Error auto-enrolling:', error);
      alert('Failed to auto-enroll students: ' + error.message);
    }
  };

  const handleAddEnrollment = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('enrollment_applications')
        .insert([{
          ...formData,
          status: 'pending',
          priority: formData.is_returning_student ? 1 : 2,
          enrollment_year: ENROLLMENT_YEAR
        }]);

      if (error) throw error;

      setShowAddModal(false);
      setFormData({
        student_name: '', date_of_birth: '', parent_name: '',
        parent_email: '', parent_phone: '', parent_address: '',
        current_class: '', requested_class: '', notes: '',
        previous_school: '', medical_info: '', is_returning_student: false
      });

      await loadData();
      alert('Application added successfully!');
    } catch (error) {
      console.error('Error adding enrollment:', error);
      alert('Failed to add application: ' + error.message);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('enrollment_applications')
        .update({ status: newStatus, reviewed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this enrollment application?')) return;
    try {
      const { error } = await supabase
        .from('enrollment_applications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete: ' + error.message);
    }
  };

  const exportEnrollments = () => {
    const csv = [
      ['Student Name', 'DOB', 'Parent Name', 'Email', 'Phone', 
       'Current Class', 'Requested Class', 'Status', 'Returning', 'Notes'].join(','),
      ...enrollments.map(e => [
        `"${e.student_name}"`,
        e.date_of_birth || '',
        `"${e.parent_name}"`,
        e.parent_email || '',
        e.parent_phone || '',
        e.current_class || '',
        e.requested_class,
        e.status,
        e.is_returning_student ? 'Yes' : 'No',
        e.notes ? `"${e.notes.replace(/"/g, '""')}"` : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enrollment_${ENROLLMENT_YEAR}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredEnrollments = filterStatus === 'all' 
    ? enrollments 
    : enrollments.filter(e => e.status === filterStatus);

  const stats = {
    total: enrollments.length,
    confirmed: enrollments.filter(e => e.status === 'confirmed').length,
    pending: enrollments.filter(e => e.status === 'pending').length,
    waitlist: enrollments.filter(e => e.status === 'waitlist').length,
    rejected: enrollments.filter(e => e.status === 'rejected').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Enrollment {ENROLLMENT_YEAR}</h2>
            <p className="text-emerald-100 text-sm">Manage student applications for next school year</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAutoEnrollReturning}
              className="bg-white text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-2 font-semibold justify-center"
            >
              <TrendingUp size={18} />
              Auto-Enroll Returning
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-white text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-2 font-semibold justify-center"
            >
              <UserPlus size={18} />
              New Application
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard title="Total" value={stats.total} icon={Users} color="purple" />
        <StatCard title="Confirmed" value={stats.confirmed} icon={CheckCircle} color="green" />
        <StatCard title="Pending" value={stats.pending} icon={Clock} color="orange" />
        <StatCard title="Waitlist" value={stats.waitlist} icon={AlertCircle} color="blue" />
        <StatCard title="Rejected" value={stats.rejected} icon={XCircle} color="red" />
      </div>

      {/* Current vs Next Year Comparison */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Current Year */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            Current Year 2025-2026
          </h3>
          <div className="space-y-2">
            {['Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9'].map(year => {
              const count = students.filter(s => 
                s.class_name?.startsWith(year) && 
                !s.class_name?.slice(year.length).match(/^\d/)
              ).length;

              return (
                <div key={year} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                      {year}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{count} students</p>
                      <p className="text-xs text-gray-500">
                        {count > MAX_PER_CLASS ? `${Math.ceil(count / MAX_PER_CLASS)} sections` : '1 section'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">next year</p>
                    <p className="font-bold text-emerald-600 text-sm">
                      {year === 'Y9' ? 'Graduate' : `Y${parseInt(year.slice(1)) + 1}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <p className="text-sm font-semibold text-gray-700">Total: {students.length} active students</p>
          </div>
        </div>

        {/* Next Year Projection */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-600" />
            Next Year 2026-2027 Projection
          </h3>
          <div className="space-y-2">
            {['Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9'].map(year => {
              const confirmed = enrollments.filter(e => 
                e.requested_class === year && e.status === 'confirmed'
              ).length;
              const returning = enrollments.filter(e => 
                e.requested_class === year && e.status === 'confirmed' && e.is_returning_student
              ).length;
              const newStudents = confirmed - returning;
              const needsSplit = confirmed > MAX_PER_CLASS;

              return (
                <div key={year} className={`flex items-center justify-between p-3 rounded-lg border ${
                  needsSplit ? 'bg-red-50 border-red-300' :
                  confirmed > 12 ? 'bg-orange-50 border-orange-300' :
                  'bg-green-50 border-green-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 text-white rounded-lg flex items-center justify-center font-bold text-sm ${
                      needsSplit ? 'bg-red-600' : confirmed > 12 ? 'bg-orange-600' : 'bg-green-600'
                    }`}>
                      {year}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{confirmed} enrolled</p>
                      <p className="text-xs text-gray-500">{returning} returning + {newStudents} new</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {needsSplit ? (
                      <>
                        <p className="text-sm font-semibold text-red-600">⚠️ Split</p>
                        <p className="text-xs text-red-700">{Math.ceil(confirmed / MAX_PER_CLASS)} sections</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">{MAX_PER_CLASS - confirmed} spots left</p>
                        <p className="text-xs text-gray-500">1 section</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 bg-emerald-100 rounded-lg">
            <p className="text-sm font-semibold text-emerald-700">Total Enrolled: {stats.confirmed} students</p>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Filter size={20} className="text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="waitlist">Waitlist</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <button
            onClick={exportEnrollments}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 justify-center"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Parent</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 hidden lg:table-cell">Contact</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Class</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEnrollments.map(enrollment => (
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{enrollment.student_name}</p>
                    <p className="text-xs text-gray-500">{enrollment.date_of_birth || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{enrollment.parent_name}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="space-y-1">
                      {enrollment.parent_email && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Mail size={12} />
                          <span className="truncate max-w-[160px]">{enrollment.parent_email}</span>
                        </div>
                      )}
                      {enrollment.parent_phone && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Phone size={12} />
                          {enrollment.parent_phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 whitespace-nowrap">
                      {enrollment.current_class ? `${enrollment.current_class} → ` : ''}
                      <strong>{enrollment.requested_class}</strong>
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                      enrollment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      enrollment.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                      enrollment.status === 'waitlist' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {enrollment.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs font-semibold ${
                      enrollment.is_returning_student ? 'text-emerald-600' : 'text-purple-600'
                    }`}>
                      {enrollment.is_returning_student ? 'Returning' : 'New'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {enrollment.status === 'pending' && (
                        <>
                          <button onClick={() => handleUpdateStatus(enrollment.id, 'confirmed')}
                            className="p-1 text-green-600 hover:bg-green-50 rounded" title="Approve">
                            <CheckCircle size={18} />
                          </button>
                          <button onClick={() => handleUpdateStatus(enrollment.id, 'waitlist')}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Waitlist">
                            <Clock size={18} />
                          </button>
                          <button onClick={() => handleUpdateStatus(enrollment.id, 'rejected')}
                            className="p-1 text-red-600 hover:bg-red-50 rounded" title="Reject">
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDelete(enrollment.id)}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Delete">
                        <X size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEnrollments.length === 0 && (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No enrollments found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">New Enrollment Application</h3>
              <button onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddEnrollment} className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student Name *</label>
                  <input type="text" required
                    value={formData.student_name}
                    onChange={(e) => setFormData({...formData, student_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parent Name *</label>
                  <input type="text" required
                    value={formData.parent_name}
                    onChange={(e) => setFormData({...formData, parent_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parent Email</label>
                  <input type="email"
                    value={formData.parent_email}
                    onChange={(e) => setFormData({...formData, parent_email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parent Phone</label>
                  <input type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({...formData, parent_phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Class</label>
                  <input type="text" placeholder="e.g. Y5A"
                    value={formData.current_class}
                    onChange={(e) => setFormData({...formData, current_class: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Requested Class *</label>
                  <select required
                    value={formData.requested_class}
                    onChange={(e) => setFormData({...formData, requested_class: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Select Class</option>
                    {['Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Previous School</label>
                  <input type="text"
                    value={formData.previous_school}
                    onChange={(e) => setFormData({...formData, previous_school: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="For new students only"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medical Info</label>
                <textarea rows="2"
                  value={formData.medical_info}
                  onChange={(e) => setFormData({...formData, medical_info: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  placeholder="Allergies, conditions, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="returning"
                  checked={formData.is_returning_student}
                  onChange={(e) => setFormData({...formData, is_returning_student: e.target.checked})}
                  className="w-4 h-4 text-emerald-600"
                />
                <label htmlFor="returning" className="text-sm text-gray-700">Returning Student</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit"
                  className="flex-1 bg-emerald-500 text-white py-3 rounded-lg hover:bg-emerald-600 transition-colors font-semibold">
                  Add Application
                </button>
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    purple: 'from-purple-500 to-indigo-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-amber-600',
    blue: 'from-blue-500 to-cyan-600',
    red: 'from-red-500 to-pink-600'
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 border border-gray-200">
      <div className={`w-10 h-10 bg-gradient-to-br ${colors[color]} rounded-lg flex items-center justify-center mb-3`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

export default EnrollmentTabContent;