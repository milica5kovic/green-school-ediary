import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Download, Upload, Link as LinkIcon, Search, X, Phone, Mail, User, Calendar, Users, ChevronRight, Filter } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import DeleteStudentModal from './DeleteStudentModal';
import { toast } from '../../../../core/components/Toast';

const StudentsPage = () => {
  const { supabase, studentsService, loadAllStudents } = useApp();
  const { primaryColor } = useBranding();
  
  const [students, setStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkParentModal, setShowLinkParentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentCard, setShowStudentCard] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const allStudents = await studentsService.getAllStudents();

      // Batch-load all parent links in ONE query instead of N+1
      const { data: allParentLinks } = await supabase
        .from('student_parents')
        .select('student_id, parents(id, full_name, email, phone), relationship, is_primary')
        .in('student_id', allStudents.map(s => s.id));

      const parentMap = {};
      (allParentLinks || []).forEach(pl => {
        if (!parentMap[pl.student_id]) parentMap[pl.student_id] = [];
        parentMap[pl.student_id].push(pl);
      });

      const studentsWithParents = allStudents.map(s => ({ ...s, parents: parentMap[s.id] || [] }));

      setStudents(studentsWithParents);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  }, [studentsService, supabase]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  // ✅ Open delete modal instead of window.confirm
  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };

  const handleDeleteSuccess = async () => {
    await loadStudents();
    await loadAllStudents();
    setShowDeleteModal(false);
    setStudentToDelete(null);
  };

  const handleEdit = (student) => { setEditingStudent(student); setShowAddModal(true); };
  const handleLinkParent = (student) => { setSelectedStudent(student); setShowLinkParentModal(true); };

  const downloadCSVTemplate = () => {
    const csv = `Name,Class,Email,Date of Birth\nJohn Doe,Y7,john.doe@student.com,2013-05-15\nJane Smith,Y5A,jane.smith@student.com,2015-03-22`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'students_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Filtering
  const allClasses = [...new Set(students.map(s => s.class_name))].sort();
  const filteredStudents = students.filter(s => {
    const matchesSearch = searchTerm === '' || s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === 'all' || s.class_name === classFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const statsByClass = students.reduce((acc, s) => { acc[s.class_name] = (acc[s.class_name] || 0) + 1; return acc; }, {});

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Stats
  const activeCount = students.filter(s => s.status === 'active').length;
  const graduatedCount = students.filter(s => s.status === 'graduated').length;
  const withdrawnCount = students.filter(s => s.status === 'withdrawn' || s.status === 'transferred' || s.status === 'archived').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div 
          className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-5 border" style={{ borderColor: `${primaryColor}20` }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users size={22} style={{ color: primaryColor }} />
              Students
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Manage records, parents, and contact details</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setEditingStudent(null); setShowAddModal(true); }}
              className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center gap-1.5"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus size={16} /> Add Student
            </button>
            <button 
              onClick={downloadCSVTemplate}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all flex items-center gap-1.5"
            >
              <Download size={16} /> CSV Template
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl p-3 border" style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}30` }}>
            <p className="text-2xl font-bold" style={{ color: primaryColor }}>{activeCount}</p>
            <p className="text-[11px]" style={{ color: primaryColor }}>Active Students</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
            <p className="text-2xl font-bold text-orange-700">{graduatedCount}</p>
            <p className="text-[11px] text-orange-600">Graduated</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <p className="text-2xl font-bold text-gray-700">{withdrawnCount}</p>
            <p className="text-[11px] text-gray-600">Withdrawn / Transferred</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none transition-shadow"
              onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${primaryColor}30`}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <select 
            value={classFilter} 
            onChange={(e) => setClassFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="all">All Classes</option>
            {allClasses.map(c => <option key={c} value={c}>{c} ({statsByClass[c]})</option>)}
          </select>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="graduated">Graduated</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="transferred">Transferred</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* CSV Upload */}
      <CSVUploadSection onUploadComplete={loadStudents} primaryColor={primaryColor} />

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-lg border overflow-hidden" style={{ borderColor: `${primaryColor}20` }}>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">
            {filteredStudents.length} Student{filteredStudents.length !== 1 ? 's' : ''}
            {searchTerm && <span className="text-gray-400 font-normal ml-1">matching "{searchTerm}"</span>}
          </h3>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-16 bg-gray-50">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">{searchTerm ? 'No students found' : 'No students yet'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Student</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Class</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">DOB / Age</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Parents</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Status</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student, idx) => {
                  const age = calculateAge(student.date_of_birth);
                  return (
                    <tr 
                      key={student.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setShowStudentCard(student)}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-[11px]"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {getInitials(student.name)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{student.name}</p>
                            {student.email && <p className="text-[11px] text-gray-400">{student.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                        >
                          {student.class_name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {student.date_of_birth ? (
                          <div>
                            <p className="text-xs text-gray-700">
                              {new Date(student.date_of_birth + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-[11px] text-gray-400">{age} years old</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">Not set</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {student.parents?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {student.parents.slice(0, 2).map((link, i) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-medium">
                                {link.parents?.full_name?.split(' ')[0]}
                              </span>
                            ))}
                            {student.parents.length > 2 && (
                              <span className="text-[11px] text-gray-400">+{student.parents.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          student.status === 'active' ? 'bg-green-100 text-green-700' :
                          student.status === 'graduated' ? 'bg-blue-100 text-blue-700' :
                          student.status === 'withdrawn' ? 'bg-amber-100 text-amber-700' :
                          student.status === 'transferred' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {student.status || 'active'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-1">
                          <button 
                            onClick={() => handleLinkParent(student)} 
                            className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" 
                            title="Link Parent"
                          >
                            <LinkIcon size={14} />
                          </button>
                          <button 
                            onClick={() => handleEdit(student)} 
                            className="p-1.5 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors" 
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(student)} 
                            className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-colors" 
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ STUDENT DETAIL CARD ═══════════════════════════════════════════ */}
      {showStudentCard && (
        <StudentDetailCard 
          student={showStudentCard}
          primaryColor={primaryColor}
          calculateAge={calculateAge}
          getInitials={getInitials}
          onClose={() => setShowStudentCard(null)}
          onEdit={() => { setShowStudentCard(null); handleEdit(showStudentCard); }}
          onLinkParent={() => { setShowStudentCard(null); handleLinkParent(showStudentCard); }}
        />
      )}

      {/* ═══ MODALS ═══════════════════════════════════════════════════════ */}
      {showAddModal && (
        <AddStudentModal
          student={editingStudent}
          primaryColor={primaryColor}
          onClose={() => { setShowAddModal(false); setEditingStudent(null); }}
          onSave={async () => { 
  await loadStudents();  //  Samo lokalni fetch
  setShowAddModal(false); 
  setEditingStudent(null); 
}}
        />
      )}

      {showLinkParentModal && selectedStudent && (
        <LinkParentModal
          student={selectedStudent}
          primaryColor={primaryColor}
          onClose={() => { setShowLinkParentModal(false); setSelectedStudent(null); }}
          onSave={async () => { 
            await loadStudents(); 
            setShowLinkParentModal(false); 
            setSelectedStudent(null); 
          }}
        />
      )}

      {/* ✅ Delete Student Modal */}
      {showDeleteModal && studentToDelete && (
        <DeleteStudentModal
          student={studentToDelete}
          onClose={() => { setShowDeleteModal(false); setStudentToDelete(null); }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT DETAIL CARD
// ═══════════════════════════════════════════════════════════════════════════

const StudentDetailCard = ({ student, primaryColor, calculateAge, getInitials, onClose, onEdit, onLinkParent }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 text-white" style={{ backgroundColor: primaryColor }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold">{getInitials(student.name)}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{student.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">{student.class_name}</span>
                <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">#{student.student_no}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  student.status === 'active' ? 'bg-green-400/30' : 'bg-white/20'
                }`}>{student.status}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-gray-500 mb-0.5 flex items-center gap-1"><Calendar size={12} /> Date of Birth</p>
              {student.date_of_birth ? (
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {new Date(student.date_of_birth + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500">{calculateAge(student.date_of_birth)} years old</p>
                </div>
              ) : <p className="text-sm text-gray-400">Not set</p>}
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[11px] text-gray-500 mb-0.5 flex items-center gap-1"><Mail size={12} /> Email</p>
              <p className="text-sm font-semibold text-gray-800">{student.email || 'Not set'}</p>
            </div>
          </div>

          {/* Parents */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Users size={16} style={{ color: primaryColor }} />
              Parents & Contacts
            </h4>

            {student.parents?.length > 0 ? (
              <div className="space-y-2">
                {student.parents.map((link, idx) => (
                  <div key={idx} className="bg-blue-50 rounded-xl p-3.5 border border-blue-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-800">{link.parents?.full_name}</p>
                          <span className="px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded text-[10px] font-bold capitalize">{link.relationship}</span>
                        </div>
                        <div className="space-y-1">
                          {link.parents?.email && (
                            <a href={`mailto:${link.parents.email}`} className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline">
                              <Mail size={12} /> {link.parents.email}
                            </a>
                          )}
                          {link.parents?.phone && (
                            <a href={`tel:${link.parents.phone}`} className="flex items-center gap-1.5 text-xs text-blue-700 hover:underline font-semibold">
                              <Phone size={12} /> {link.parents.phone}
                            </a>
                          )}
                        </div>
                      </div>
                      {link.parents?.phone && (
                        <a 
                          href={`tel:${link.parents.phone}`}
                          className="w-10 h-10 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Phone size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <Users size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">No parents linked yet</p>
                <button onClick={onLinkParent} className="mt-2 text-xs font-medium hover:underline" style={{ color: primaryColor }}>
                  + Link a parent
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button 
              onClick={onEdit}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              <Edit2 size={14} /> Edit
            </button>
            <button 
              onClick={onLinkParent}
              className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-all flex items-center justify-center gap-1.5"
            >
              <LinkIcon size={14} /> Parents
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CSV UPLOAD SECTION
// ═══════════════════════════════════════════════════════════════════════════

const CSVUploadSection = ({ onUploadComplete, primaryColor }) => {
  const { studentsService } = useApp();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const dataLines = lines.slice(1);
      const nextStudentNo = await studentsService.getNextStudentNumber('');
      let currentNo = nextStudentNo;

      for (const line of dataLines) {
        const [name, className, email, dob] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        await studentsService.addStudent({
          name, class_name: className, email: email || null,
          date_of_birth: dob || null,
          student_no: currentNo, school_year: '2025-26', status: 'active'
        });
        currentNo++;
      }

      toast.success(`Successfully imported ${dataLines.length} students!`);
      onUploadComplete();
    } catch (error) { toast.error('Failed: ' + error.message); }
    finally { setUploading(false); e.target.value = ''; }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 border border-blue-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Upload size={20} className="text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-800">Bulk Import via CSV</h3>
          <p className="text-[11px] text-gray-500">Format: Name, Class, Email, Date of Birth (YYYY-MM-DD)</p>
        </div>
        <label className="block">
          <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          <span 
            className="inline-block text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:shadow-lg transition-all"
            style={{ backgroundColor: uploading ? '#9ca3af' : '#3b82f6' }}
          >
            {uploading ? 'Uploading...' : 'Choose CSV'}
          </span>
        </label>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ADD/EDIT STUDENT MODAL
// ═══════════════════════════════════════════════════════════════════════════

const AddStudentModal = ({ student, primaryColor, onClose, onSave }) => {
  const { studentsService } = useApp();
  const [formData, setFormData] = useState({
    name: student?.name || '',
    class_name: student?.class_name || 'Y1',
    email: student?.email || '',
    date_of_birth: student?.date_of_birth || '',
    school_year: student?.school_year || '2025-26',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.class_name) { toast.warning('Please fill in name and class'); return; }
    try {
      setSaving(true);
      if (student) {
        await studentsService.updateStudent(student.id, {
          name: formData.name, class_name: formData.class_name,
          email: formData.email || null, date_of_birth: formData.date_of_birth || null,
          student_no: student.student_no, school_year: formData.school_year,
          status: student.status || 'active'
        });
      } else {
        const nextStudentNo = await studentsService.getNextStudentNumber(formData.class_name);
        await studentsService.addStudent({
          name: formData.name, class_name: formData.class_name,
          email: formData.email || null, date_of_birth: formData.date_of_birth || null,
          student_no: nextStudentNo, school_year: formData.school_year, status: 'active'
        });
      }
      onSave();
    } catch (error) { toast.error('Failed: ' + error.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-5">{student ? 'Edit Student' : 'Add New Student'}</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
              onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${primaryColor}30`}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
              placeholder="John Doe" 
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Class *</label>
              <select 
                value={formData.class_name} 
                onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
              >
                {['Y1','Y2','Y3','Y4','Y5A','Y5B','Y6','Y7','Y8','Y9'].map(c => 
                  <option key={c} value={c}>{c}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
              <input 
                type="date" 
                value={formData.date_of_birth} 
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email (Optional)</label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
              placeholder="john@student.com" 
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button 
              type="submit" 
              disabled={saving}
              className="flex-1 text-white py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {saving ? 'Saving...' : student ? 'Update' : 'Add Student'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// LINK PARENT MODAL
// ═══════════════════════════════════════════════════════════════════════════

const LinkParentModal = ({ student, primaryColor, onClose, onSave }) => {
  const { supabase } = useApp();
  const [parents, setParents] = useState([]);
  const [linkedParents, setLinkedParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState('');
  const [relationship, setRelationship] = useState('mother');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: allParents } = await supabase.from('parents').select('*').order('full_name');
      setParents(allParents || []);
      const { data: links } = await supabase.from('student_parents').select('*, parents(full_name, email, phone)').eq('student_id', student.id);
      setLinkedParents(links || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleAddLink = async () => {
    if (!selectedParent) { toast.warning('Please select a parent'); return; }
    try {
      setSaving(true);
      const { error } = await supabase.from('student_parents').insert([{
        student_id: student.id, parent_id: selectedParent,
        relationship, is_primary: linkedParents.length === 0
      }]);
      if (error) throw error;
      await loadData(); 
      setSelectedParent('');
    } catch (error) { toast.error('Failed: ' + error.message); }
    finally { setSaving(false); }
  };

  const handleRemoveLink = async (linkId) => {
    if (!window.confirm('Remove this parent link?')) return;
    try {
      await supabase.from('student_parents').delete().eq('id', linkId);
      await loadData();
    } catch (error) { toast.error('Failed to remove'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Link Parents</h3>
        <p className="text-xs text-gray-500 mb-5">{student.name} • {student.class_name}</p>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: primaryColor, borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <>
            {/* Linked Parents */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Linked Parents</h4>
              {linkedParents.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">No parents linked</p>
              ) : (
                <div className="space-y-2">
                  {linkedParents.map(link => (
                    <div key={link.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-800">{link.parents?.full_name}</p>
                          <span className="px-1.5 py-0.5 bg-blue-200 text-blue-800 rounded text-[10px] font-bold capitalize">{link.relationship}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {link.parents?.email && <span className="text-[11px] text-gray-500 flex items-center gap-1"><Mail size={10} /> {link.parents.email}</span>}
                          {link.parents?.phone && <span className="text-[11px] text-blue-700 font-semibold flex items-center gap-1"><Phone size={10} /> {link.parents.phone}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveLink(link.id)} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Link */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Add Parent Link</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Parent</label>
                  <select 
                    value={selectedParent} 
                    onChange={(e) => setSelectedParent(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="">Choose...</option>
                    {parents.filter(p => !linkedParents.some(l => l.parent_id === p.id)).map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Relationship</label>
                  <select 
                    value={relationship} 
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="mother">Mother</option>
                    <option value="father">Father</option>
                    <option value="guardian">Guardian</option>
                  </select>
                </div>
              </div>
              <button 
                onClick={handleAddLink} 
                disabled={saving || !selectedParent}
                className="w-full text-white py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {saving ? 'Adding...' : 'Add Parent Link'}
              </button>
            </div>
          </>
        )}

        <div className="flex gap-3 mt-5 pt-4 border-t border-gray-200">
          <button 
            onClick={onSave} 
            className="flex-1 text-white py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            Done
          </button>
          <button 
            onClick={onClose} 
            className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentsPage;