import React, { useState, useEffect, useCallback } from 'react';
import { User, Mail, Phone, Calendar, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ParentMyChildPage = () => {
  const { supabase } = useApp();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [teacherComments, setTeacherComments] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
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
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedChild) {
      loadChildDetails();
    }
  }, [selectedChild]);

  const loadChildDetails = async () => {
    if (!selectedChild) return;
    
    try {
      const { data: comments } = await supabase
        .from('teacher_comments')
        .select(`
          *,
          teachers(full_name, subjects)
        `)
        .eq('student_id', selectedChild.id)
        .eq('is_visible_to_parent', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setTeacherComments(comments || []);
      
      const { data: grades } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', selectedChild.id)
        .order('date', { ascending: false })
        .limit(20);
      
      const highGrades = grades?.filter(g => (g.grade / g.max_grade) >= 0.9) || [];
      setAchievements(highGrades.slice(0, 5));
    } catch (error) {
      console.error('Error loading child details:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No student data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Student Profile</h1>
            <p className="text-sm text-gray-600 mt-1">Detailed information</p>
          </div>
          
          {children.length > 1 && (
            <div className="relative">
              <select
                value={selectedChild?.id || ''}
                onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
              >
                {children.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.name} - Class {child.class_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          )}
        </div>
      </div>

      {/* Profile Card */}
      {selectedChild && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-xl font-semibold text-emerald-700">
                {selectedChild.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedChild.name}</h2>
              <p className="text-sm text-gray-600">Class {selectedChild.class_name}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {selectedChild.email && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{selectedChild.email}</p>
                </div>
              </div>
            )}
            {selectedChild.date_of_birth && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Date of Birth</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(selectedChild.date_of_birth).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            {selectedChild.parent_contact && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Contact</p>
                  <p className="text-sm font-medium text-gray-900">{selectedChild.parent_contact}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-medium text-emerald-600">{selectedChild.status || 'Active'}</p>
              </div>
            </div>
          </div>

          {selectedChild.notes && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-medium text-blue-900 mb-1">Notes</p>
              <p className="text-sm text-blue-800">{selectedChild.notes}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Achievements */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Achievements</h3>
          
          {achievements.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No recent achievements</p>
          ) : (
            <div className="space-y-3">
              {achievements.map(achievement => (
                <div key={achievement.id} className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <p className="font-semibold text-gray-900 text-sm">{achievement.subject}</p>
                  <p className="text-xs text-gray-600 mt-1">{achievement.assessment_title}</p>
                  <p className="text-sm font-bold text-emerald-600 mt-2">
                    {achievement.grade}/{achievement.max_grade} ({((achievement.grade/achievement.max_grade)*100).toFixed(0)}%)
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Teacher Comments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Teacher Comments</h3>
          
          {teacherComments.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No teacher comments yet</p>
          ) : (
            <div className="space-y-3">
              {teacherComments.map(comment => (
                <div key={comment.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-gray-900 text-sm">{comment.teachers?.full_name || 'Teacher'}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{comment.teachers?.subjects?.join(', ') || ''}</p>
                  <p className="text-sm text-gray-700">{comment.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentMyChildPage;