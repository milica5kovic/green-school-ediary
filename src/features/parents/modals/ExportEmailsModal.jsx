import React, { useState, useEffect } from 'react';
import { Download, Copy, Check } from 'lucide-react';

import { supabase } from '../../../core/infrastructure/supabaseClient';

const ExportEmailsModal = ({ onClose }) => {
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

      // Load parents with student links
      const { data: parentsData, error: parentsError } = await supabase
        .from('parents')
        .select('*')
        .order('full_name');

      if (parentsError) throw parentsError;

      // Load student-parent links
      const { data: linksData, error: linksError } = await supabase
        .from('student_parents')
        .select(`
          parent_id,
          student:students(id, name, class_name)
        `);

      if (linksError) throw linksError;

      // Attach linked students to parents
      const parentsWithStudents = (parentsData || []).map(parent => ({
        ...parent,
        linkedStudents: (linksData || [])
          .filter(link => link.parent_id === parent.id)
          .map(link => link.student)
      }));

      // Get unique students for filter dropdowns
      const allStudents = linksData?.map(link => link.student).filter(Boolean) || [];
      
      setParents(parentsWithStudents);
      setStudents(allStudents);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Get filtered parents
  const getFilteredParents = () => {
    return parents.filter(parent => {
      // Status filter
      if (filters.status !== 'all' && parent.status !== filters.status) {
        return false;
      }

      // Has children filter
      if (filters.hasChildren === 'yes' && parent.linkedStudents.length === 0) {
        return false;
      }
      if (filters.hasChildren === 'no' && parent.linkedStudents.length > 0) {
        return false;
      }

      // Year filter
      if (filters.yearFilter !== 'all') {
        const hasStudentInYear = parent.linkedStudents.some(student => 
          student.class_name.startsWith(filters.yearFilter)
        );
        if (!hasStudentInYear) return false;
      }

      // Class filter
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

  // Get unique years and classes
  const uniqueYears = [...new Set(students.map(s => s.class_name.match(/^Y\d+/)?.[0]).filter(Boolean))].sort();
  const uniqueClasses = [...new Set(students.map(s => s.class_name))].sort();

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
        `"${parent.full_name}","${parent.email}","${parent.phone || ''}","${parent.status}","${parent.linkedStudents.map(s => s.name).join('; ')}"`
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Export Parent Emails</h3>
          <p className="text-sm text-gray-600 mt-1">
            Filter and export parent contact information
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-2 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">All</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>

                {/* Has Children Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Linked Students</label>
                  <select
                    value={filters.hasChildren}
                    onChange={(e) => setFilters({ ...filters, hasChildren: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">All</option>
                    <option value="yes">Has Children</option>
                    <option value="no">No Children</option>
                  </select>
                </div>

                {/* Year Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Year</label>
                  <select
                    value={filters.yearFilter}
                    onChange={(e) => setFilters({ ...filters, yearFilter: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">All Years</option>
                    {uniqueYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Class Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Class</label>
                  <select
                    value={filters.classFilter}
                    onChange={(e) => setFilters({ ...filters, classFilter: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">All Classes</option>
                    {uniqueClasses.map(className => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Results Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-800">
                  📊 {filteredParents.length} parent(s) match your filters
                </p>
              </div>

              {/* Email List Preview */}
              <div>
                <label className="block text-sm font-medium mb-2">Email List Preview:</label>
                <textarea
                  value={emailList}
                  readOnly
                  className="w-full px-4 py-3 border rounded-lg bg-gray-50 font-mono text-sm h-32 resize-none"
                  placeholder="No emails to show"
                />
              </div>

              {/* Parent List */}
              {filteredParents.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Parents:</p>
                  <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Children</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredParents.map(parent => (
                          <tr key={parent.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium">{parent.full_name}</td>
                            <td className="px-3 py-2 text-gray-600">{parent.email}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {parent.linkedStudents.length > 0
                                ? parent.linkedStudents.map(s => s.name).join(', ')
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <button
                onClick={handleCopyToClipboard}
                disabled={filteredParents.length === 0}
                className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check size={20} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    Copy to Clipboard
                  </>
                )}
              </button>
              <button
                onClick={handleDownloadCSV}
                disabled={filteredParents.length === 0}
                className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Download CSV
              </button>
              <button
                onClick={onClose}
                className="px-6 bg-gray-200 py-3 rounded-lg hover:bg-gray-300 font-medium"
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