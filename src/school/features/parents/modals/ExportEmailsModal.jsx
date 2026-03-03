import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, X, Mail, Users, Filter, ChevronDown } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useBranding } from '../../../../core/context/BrandingContext';

const ExportEmailsModal = ({ onClose }) => {
  // ✅ Use tenant-aware supabase
  const { supabase } = useApp();
  const { primaryColor } = useBranding();
  
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    status: 'active',
    yearFilter: 'all',
    classFilter: 'all',
    hasChildren: 'all'
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // ✅ Tenant-aware query - only loads parents for current school
      const { data: parentsData, error: parentsError } = await supabase
        .from('parents')
        .select('*')
        .order('full_name');

      if (parentsError) throw parentsError;

      // ✅ Tenant-aware query
      const { data: linksData, error: linksError } = await supabase
        .from('student_parents')
        .select(`
          parent_id,
          student:students(id, name, class_name)
        `);

      if (linksError) throw linksError;

      const parentsWithStudents = (parentsData || []).map(parent => ({
        ...parent,
        linkedStudents: (linksData || [])
          .filter(link => link.parent_id === parent.id)
          .map(link => link.student)
          .filter(Boolean)
      }));

      const allStudents = linksData?.map(link => link.student).filter(Boolean) || [];
      
      setParents(parentsWithStudents);
      setStudents(allStudents);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredParents = () => {
    return parents.filter(parent => {
      if (filters.status !== 'all' && parent.status !== filters.status) return false;
      if (filters.hasChildren === 'yes' && parent.linkedStudents.length === 0) return false;
      if (filters.hasChildren === 'no' && parent.linkedStudents.length > 0) return false;

      if (filters.yearFilter !== 'all') {
        const hasStudentInYear = parent.linkedStudents.some(student => 
          student.class_name?.startsWith(filters.yearFilter)
        );
        if (!hasStudentInYear) return false;
      }

      if (filters.classFilter !== 'all') {
        const hasStudentInClass = parent.linkedStudents.some(student =>
          student.class_name === filters.classFilter
        );
        if (!hasStudentInClass) return false;
      }

      return true;
    });
  };

  const filteredParents = getFilteredParents();
  const emailList = filteredParents.map(p => p.email).join(', ');

  const uniqueYears = [...new Set(students.map(s => s.class_name?.match(/^Y\d+/)?.[0]).filter(Boolean))].sort();
  const uniqueClasses = [...new Set(students.map(s => s.class_name).filter(Boolean))].sort();

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(emailList);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert('Failed to copy to clipboard');
    }
  };

  const handleDownloadCSV = () => {
    const csv = [
      'Name,Email,Phone,Status,Linked Students',
      ...filteredParents.map(parent => 
        `"${parent.full_name || ''}","${parent.email}","${parent.phone || ''}","${parent.status || 'active'}","${parent.linkedStudents.map(s => s.name).join('; ')}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parents_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Select styles with dynamic focus color
  const selectClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 transition-shadow";

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ═══ HEADER ═══════════════════════════════════════════ */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Mail size={20} style={{ color: primaryColor }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Export Emails</h3>
              <p className="text-gray-500 text-sm">Filter and export parent contacts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <div 
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
            />
          </div>
        ) : (
          <>
            {/* ═══ CONTENT ═════════════════════════════════════════ */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* ─── FILTERS ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className={selectClass}
                    style={{ '--tw-ring-color': `${primaryColor}40` }}
                    onFocus={(e) => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Has Children</label>
                  <select
                    value={filters.hasChildren}
                    onChange={(e) => setFilters({ ...filters, hasChildren: e.target.value })}
                    className={selectClass}
                    onFocus={(e) => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Year</label>
                  <select
                    value={filters.yearFilter}
                    onChange={(e) => setFilters({ ...filters, yearFilter: e.target.value })}
                    className={selectClass}
                    onFocus={(e) => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                  >
                    <option value="all">All Years</option>
                    {uniqueYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-gray-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Class</label>
                  <select
                    value={filters.classFilter}
                    onChange={(e) => setFilters({ ...filters, classFilter: e.target.value })}
                    className={selectClass}
                    onFocus={(e) => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
                    onBlur={(e) => e.target.style.boxShadow = 'none'}
                  >
                    <option value="all">All Classes</option>
                    {uniqueClasses.map(className => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 bottom-2.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* ─── RESULTS SUMMARY ─────────────────────────────── */}
              <div 
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ backgroundColor: `${primaryColor}08`, border: `1px solid ${primaryColor}20` }}
              >
                <Users size={18} style={{ color: primaryColor }} />
                <span className="font-medium" style={{ color: primaryColor }}>
                  {filteredParents.length} parent{filteredParents.length !== 1 ? 's' : ''} selected
                </span>
              </div>

              {/* ─── EMAIL PREVIEW ───────────────────────────────── */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email List</label>
                <textarea
                  value={emailList || 'No emails match your filters'}
                  readOnly
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 font-mono h-24 resize-none focus:outline-none"
                  style={{ fontSize: '12px' }}
                />
              </div>

              {/* ─── PARENT TABLE ────────────────────────────────── */}
              {filteredParents.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Preview</label>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Email</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 hidden sm:table-cell">Children</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredParents.slice(0, 50).map(parent => (
                            <tr key={parent.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                                    style={{ backgroundColor: primaryColor }}
                                  >
                                    {parent.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                                  </div>
                                  <span className="font-medium text-gray-800 truncate">{parent.full_name || 'N/A'}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-gray-600 truncate max-w-[200px]">{parent.email}</td>
                              <td className="px-3 py-2 text-gray-500 text-xs hidden sm:table-cell">
                                {parent.linkedStudents.length > 0
                                  ? parent.linkedStudents.map(s => s.name.split(' ')[0]).join(', ')
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {filteredParents.length > 50 && (
                      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
                        Showing 50 of {filteredParents.length} parents
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ═══ FOOTER ══════════════════════════════════════════ */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                onClick={handleCopyToClipboard}
                disabled={filteredParents.length === 0}
                className="flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white"
                style={{ backgroundColor: copied ? '#10b981' : primaryColor }}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy Emails
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadCSV}
                disabled={filteredParents.length === 0}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download size={16} />
                Download CSV
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExportEmailsModal;