import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Lock, 
  Mail, 
  User, 
  Shield, 
  Key, 
  Eye, 
  EyeOff,
  UserPlus,
  Upload,
  Download,
  Archive,
  BookOpen,
  GraduationCap,
  Users,
  FileSpreadsheet,
  Calendar,
  Trash2,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../infrastructure/supabaseClient';

const SettingsPage = () => {
  const { teacher, user, profile, updatePassword, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  
  // Password Change State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Add Student State
  const [newStudent, setNewStudent] = useState({
    full_name: '',
    class_name: '',
    parent_email: '',
    date_of_birth: '',
  });
  const [addStudentError, setAddStudentError] = useState('');
  const [addStudentSuccess, setAddStudentSuccess] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // CSV Import State
  const [csvFile, setCsvFile] = useState(null);
  const [csvError, setCsvError] = useState('');
  const [csvSuccess, setCsvSuccess] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Classes State
  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState(null);
  const [editClassName, setEditClassName] = useState('');
  const [classError, setClassError] = useState('');
  const [classSuccess, setClassSuccess] = useState('');
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  // Subjects State
  const [subjects, setSubjects] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubject, setEditingSubject] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [subjectSuccess, setSubjectSuccess] = useState('');
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  // Archive/Export State
  const [archiveYear, setArchiveYear] = useState(new Date().getFullYear());
  const [isArchiving, setIsArchiving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [archiveSuccess, setArchiveSuccess] = useState('');

  // Load classes and subjects on mount
  useEffect(() => {
    if (isAdmin()) {
      loadClasses();
      loadSubjects();
    }
  }, []);

  const loadClasses = async () => {
    setIsLoadingClasses(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setClasses(data || []);
    } catch (err) {
      console.error('Error loading classes:', err);
      setClassError('Failed to load classes');
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const loadSubjects = async () => {
    setIsLoadingSubjects(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setSubjects(data || []);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setSubjectError('Failed to load subjects');
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsUpdating(true);

    try {
      const result = await updatePassword(newPassword);
      
      if (result.success) {
        setPasswordSuccess('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
        
        setTimeout(() => setPasswordSuccess(''), 3000);
      } else {
        setPasswordError(result.error || 'Failed to update password');
      }
    } catch (err) {
      setPasswordError('An error occurred. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setAddStudentError('');
    setAddStudentSuccess('');

    if (!newStudent.full_name || !newStudent.class_name) {
      setAddStudentError('Name and class are required');
      return;
    }

    setIsAddingStudent(true);

    try {
      const { data, error } = await supabase
        .from('students')
        .insert([{
          full_name: newStudent.full_name,
          class: newStudent.class_name,
          parent_email: newStudent.parent_email || null,
          date_of_birth: newStudent.date_of_birth || null,
          school_year: new Date().getFullYear(),
          status: 'active'
        }])
        .select();

      if (error) throw error;

      setAddStudentSuccess('Student added successfully!');
      setNewStudent({ full_name: '', class_name: '', parent_email: '', date_of_birth: '' });
      
      setTimeout(() => setAddStudentSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding student:', err);
      setAddStudentError(err.message || 'Failed to add student');
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleCSVImport = async (e) => {
    e.preventDefault();
    setCsvError('');
    setCsvSuccess('');

    if (!csvFile) {
      setCsvError('Please select a CSV file');
      return;
    }

    setIsImporting(true);

    try {
      const text = await csvFile.text();
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
      
      // Skip header row
      const dataRows = rows.slice(1).filter(row => row.length >= 2 && row[0]);
      
      if (dataRows.length === 0) {
        throw new Error('No valid data found in CSV');
      }

      const students = dataRows.map(row => ({
        full_name: row[0],
        class: row[1],
        parent_email: row[2] || null,
        date_of_birth: row[3] || null,
        school_year: new Date().getFullYear(),
        status: 'active'
      }));

      const { data, error } = await supabase
        .from('students')
        .insert(students)
        .select();

      if (error) throw error;

      setCsvSuccess(`Successfully imported ${data.length} students!`);
      setCsvFile(null);
      
      setTimeout(() => setCsvSuccess(''), 3000);
    } catch (err) {
      console.error('Error importing CSV:', err);
      setCsvError(err.message || 'Failed to import CSV');
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;

    setClassError('');
    setClassSuccess('');

    try {
      const { data, error } = await supabase
        .from('classes')
        .insert([{ name: newClassName.trim() }])
        .select();

      if (error) throw error;

      setClasses([...classes, data[0]]);
      setNewClassName('');
      setClassSuccess('Class added successfully!');
      setTimeout(() => setClassSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding class:', err);
      setClassError(err.message || 'Failed to add class');
    }
  };

  const handleUpdateClass = async (classId) => {
    if (!editClassName.trim()) return;

    setClassError('');
    setClassSuccess('');

    try {
      const { error } = await supabase
        .from('classes')
        .update({ name: editClassName.trim() })
        .eq('id', classId);

      if (error) throw error;

      setClasses(classes.map(c => c.id === classId ? { ...c, name: editClassName.trim() } : c));
      setEditingClass(null);
      setEditClassName('');
      setClassSuccess('Class updated successfully!');
      setTimeout(() => setClassSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating class:', err);
      setClassError(err.message || 'Failed to update class');
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    setClassError('');
    setClassSuccess('');

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);

      if (error) throw error;

      setClasses(classes.filter(c => c.id !== classId));
      setClassSuccess('Class deleted successfully!');
      setTimeout(() => setClassSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting class:', err);
      setClassError(err.message || 'Failed to delete class');
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;

    setSubjectError('');
    setSubjectSuccess('');

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert([{ name: newSubjectName.trim() }])
        .select();

      if (error) throw error;

      setSubjects([...subjects, data[0]]);
      setNewSubjectName('');
      setSubjectSuccess('Subject added successfully!');
      setTimeout(() => setSubjectSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding subject:', err);
      setSubjectError(err.message || 'Failed to add subject');
    }
  };

  const handleUpdateSubject = async (subjectId) => {
    if (!editSubjectName.trim()) return;

    setSubjectError('');
    setSubjectSuccess('');

    try {
      const { error } = await supabase
        .from('subjects')
        .update({ name: editSubjectName.trim() })
        .eq('id', subjectId);

      if (error) throw error;

      setSubjects(subjects.map(s => s.id === subjectId ? { ...s, name: editSubjectName.trim() } : s));
      setEditingSubject(null);
      setEditSubjectName('');
      setSubjectSuccess('Subject updated successfully!');
      setTimeout(() => setSubjectSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating subject:', err);
      setSubjectError(err.message || 'Failed to update subject');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      return;
    }

    setSubjectError('');
    setSubjectSuccess('');

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);

      if (error) throw error;

      setSubjects(subjects.filter(s => s.id !== subjectId));
      setSubjectSuccess('Subject deleted successfully!');
      setTimeout(() => setSubjectSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting subject:', err);
      setSubjectError(err.message || 'Failed to delete subject');
    }
  };

  const handleArchiveYear = async () => {
    if (!window.confirm(`Are you sure you want to archive all data for year ${archiveYear}? This will mark all students, grades, and attendance as archived.`)) {
      return;
    }

    setIsArchiving(true);
    setArchiveError('');
    setArchiveSuccess('');

    try {
      // Archive students
      const { error: studentsError } = await supabase
        .from('students')
        .update({ status: 'archived' })
        .eq('school_year', archiveYear);

      if (studentsError) throw studentsError;

      setArchiveSuccess(`Successfully archived year ${archiveYear}!`);
      setTimeout(() => setArchiveSuccess(''), 5000);
    } catch (err) {
      console.error('Error archiving year:', err);
      setArchiveError(err.message || 'Failed to archive year');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setArchiveError('');
    setArchiveSuccess('');

    try {
      // Fetch all students
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .order('class', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;

      // Convert to CSV
      const headers = ['ID', 'Full Name', 'Class', 'Parent Email', 'Date of Birth', 'School Year', 'Status'];
      const csvContent = [
        headers.join(','),
        ...students.map(s => [
          s.id,
          `"${s.full_name}"`,
          s.class,
          s.parent_email || '',
          s.date_of_birth || '',
          s.school_year,
          s.status
        ].join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setArchiveSuccess('Data exported successfully!');
      setTimeout(() => setArchiveSuccess(''), 3000);
    } catch (err) {
      console.error('Error exporting data:', err);
      setArchiveError(err.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const renderAccountTab = () => (
    <div className="space-y-6">
      {/* Account Information */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User size={20} className="text-emerald-600" />
          Account Information
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <Mail size={20} className="text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Email</p>
              <p className="text-gray-900">{user?.email || 'Not available'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <User size={20} className="text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Full Name</p>
              <p className="text-gray-900">{teacher?.full_name || 'Not available'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <Shield size={20} className="text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Role</p>
              <p className="text-gray-900 capitalize">{profile?.role || 'Teacher'}</p>
            </div>
          </div>

          {teacher?.subjects && teacher.subjects.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <BookOpen size={20} className="text-emerald-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Subjects</p>
                <p className="text-gray-900">{teacher.subjects.join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Lock size={20} className="text-emerald-600" />
          Security
        </h3>

        {!showPasswordSection ? (
          <button
            onClick={() => setShowPasswordSection(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Key size={18} />
            Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="Enter new password"
                  disabled={isUpdating}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isUpdating}
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="Confirm new password"
                  disabled={isUpdating}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isUpdating}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-red-700 flex-1">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <p className="text-sm text-emerald-700 flex-1">{passwordSuccess}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordSection(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                disabled={isUpdating}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  const renderStudentsTab = () => (
    <div className="space-y-6">
      {/* Add Single Student */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <UserPlus size={20} className="text-emerald-600" />
          Add Single Student
        </h3>

        <form onSubmit={handleAddStudent} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={newStudent.full_name}
                onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="Enter student name"
                disabled={isAddingStudent}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <input
                type="text"
                value={newStudent.class_name}
                onChange={(e) => setNewStudent({ ...newStudent, class_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="e.g., 5A"
                disabled={isAddingStudent}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Email
              </label>
              <input
                type="email"
                value={newStudent.parent_email}
                onChange={(e) => setNewStudent({ ...newStudent, parent_email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                placeholder="parent@email.com"
                disabled={isAddingStudent}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                value={newStudent.date_of_birth}
                onChange={(e) => setNewStudent({ ...newStudent, date_of_birth: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                disabled={isAddingStudent}
              />
            </div>
          </div>

          {addStudentError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-sm text-red-700 flex-1">{addStudentError}</p>
            </div>
          )}

          {addStudentSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              <p className="text-sm text-emerald-700 flex-1">{addStudentSuccess}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isAddingStudent}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingStudent ? 'Adding...' : 'Add Student'}
          </button>
        </form>
      </div>

      {/* CSV Import */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Upload size={20} className="text-emerald-600" />
          Import Students from CSV
        </h3>

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 mb-2">
            <strong>CSV Format:</strong>
          </p>
          <code className="text-xs bg-blue-100 px-2 py-1 rounded">
            Full Name, Class, Parent Email, Date of Birth
          </code>
          <p className="text-xs text-blue-700 mt-2">
            Example: "John Doe","5A","parent@email.com","2015-05-15"
          </p>
        </div>

        <form onSubmit={handleCSVImport} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              disabled={isImporting}
            />
          </div>

          {csvError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <p className="text-sm text-red-700 flex-1">{csvError}</p>
            </div>
          )}

          {csvSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              <p className="text-sm text-emerald-700 flex-1">{csvSuccess}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isImporting || !csvFile}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FileSpreadsheet size={18} />
            {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderClassesTab = () => (
    <div className="space-y-6">
      {/* Add New Class */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users size={20} className="text-emerald-600" />
          Add New Class
        </h3>

        <div className="flex gap-3">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddClass()}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            placeholder="e.g., 5A, 6B, 7C"
          />
          <button
            onClick={handleAddClass}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Add Class
          </button>
        </div>

        {classError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-red-700 flex-1">{classError}</p>
          </div>
        )}

        {classSuccess && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <p className="text-sm text-emerald-700 flex-1">{classSuccess}</p>
          </div>
        )}
      </div>

      {/* Classes List */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Existing Classes</h3>

        {isLoadingClasses ? (
          <p className="text-gray-500">Loading classes...</p>
        ) : classes.length === 0 ? (
          <p className="text-gray-500">No classes added yet.</p>
        ) : (
          <div className="space-y-2">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-100"
              >
                {editingClass === cls.id ? (
                  <>
                    <input
                      type="text"
                      value={editClassName}
                      onChange={(e) => setEditClassName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => handleUpdateClass(cls.id)}
                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingClass(null);
                          setEditClassName('');
                        }}
                        className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-gray-800">{cls.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingClass(cls.id);
                          setEditClassName(cls.name);
                        }}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSubjectsTab = () => (
    <div className="space-y-6">
      {/* Add New Subject */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BookOpen size={20} className="text-emerald-600" />
          Add New Subject
        </h3>

        <div className="flex gap-3">
          <input
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            placeholder="e.g., Mathematics, Science, History"
          />
          <button
            onClick={handleAddSubject}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Add Subject
          </button>
        </div>

        {subjectError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-red-700 flex-1">{subjectError}</p>
          </div>
        )}

        {subjectSuccess && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <p className="text-sm text-emerald-700 flex-1">{subjectSuccess}</p>
          </div>
        )}
      </div>

      {/* Subjects List */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Existing Subjects</h3>

        {isLoadingSubjects ? (
          <p className="text-gray-500">Loading subjects...</p>
        ) : subjects.length === 0 ? (
          <p className="text-gray-500">No subjects added yet.</p>
        ) : (
          <div className="space-y-2">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-100"
              >
                {editingSubject === subject.id ? (
                  <>
                    <input
                      type="text"
                      value={editSubjectName}
                      onChange={(e) => setEditSubjectName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => handleUpdateSubject(subject.id)}
                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSubject(null);
                          setEditSubjectName('');
                        }}
                        className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-gray-800">{subject.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingSubject(subject.id);
                          setEditSubjectName(subject.name);
                        }}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderArchiveTab = () => (
    <div className="space-y-6">
      {/* Archive Year */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Archive size={20} className="text-emerald-600" />
          Archive School Year
        </h3>

        <p className="text-gray-600 mb-4">
          Archive all students, grades, and attendance records for a specific year. 
          This will mark all records as archived but won't delete them.
        </p>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Year
            </label>
            <input
              type="number"
              value={archiveYear}
              onChange={(e) => setArchiveYear(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              min="2000"
              max="2100"
            />
          </div>
          <button
            onClick={handleArchiveYear}
            disabled={isArchiving}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Calendar size={18} />
            {isArchiving ? 'Archiving...' : 'Archive Year'}
          </button>
        </div>

        {archiveError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-red-700 flex-1">{archiveError}</p>
          </div>
        )}

        {archiveSuccess && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <p className="text-sm text-emerald-700 flex-1">{archiveSuccess}</p>
          </div>
        )}
      </div>

      {/* Export Data */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Download size={20} className="text-emerald-600" />
          Export All Data
        </h3>

        <p className="text-gray-600 mb-4">
          Export all student data to a CSV file for backup or external processing.
        </p>

        <button
          onClick={handleExportData}
          disabled={isExporting}
          className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <FileSpreadsheet size={18} />
          {isExporting ? 'Exporting...' : 'Export to CSV'}
        </button>
      </div>

      {/* Warning */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <p className="text-sm text-orange-800">
          <strong>⚠️ Warning:</strong> Archiving is permanent and cannot be undone. 
          Make sure to export your data before archiving if you need a backup.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
            <Settings size={24} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
        </div>
        <p className="text-gray-600 ml-13">Manage your account and system preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('account')}
            className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'account'
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <User size={18} />
              Account
            </div>
          </button>

          {isAdmin() && (
            <>
              <button
                onClick={() => setActiveTab('students')}
                className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'students'
                    ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GraduationCap size={18} />
                  Students
                </div>
              </button>

              <button
                onClick={() => setActiveTab('classes')}
                className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'classes'
                    ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users size={18} />
                  Classes
                </div>
              </button>

              <button
                onClick={() => setActiveTab('subjects')}
                className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'subjects'
                    ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={18} />
                  Subjects
                </div>
              </button>

              <button
                onClick={() => setActiveTab('archive')}
                className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'archive'
                    ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Archive size={18} />
                  Archive & Export
                </div>
              </button>
            </>
          )}
        </div>

        <div className="p-6">
          {activeTab === 'account' && renderAccountTab()}
          {activeTab === 'students' && isAdmin() && renderStudentsTab()}
          {activeTab === 'classes' && isAdmin() && renderClassesTab()}
          {activeTab === 'subjects' && isAdmin() && renderSubjectsTab()}
          {activeTab === 'archive' && isAdmin() && renderArchiveTab()}
        </div>
      </div>

      {/* Info Note */}
      {!isAdmin() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Additional settings and system management features are available for administrators.
            Contact your administrator for assistance.
          </p>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;