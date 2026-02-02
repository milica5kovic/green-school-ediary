import React, { useState, useEffect, useCallback } from 'react';
import { User, Mail, Phone, Calendar, Award, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ParentMyChildPage = () => {
  const { supabase } = useApp();
  const [child, setChild] = useState(null);
  const [teacherComments, setTeacherComments] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get parent record
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!parent) return;
      
      // Get child with full details
      const { data: studentParents } = await supabase
        .from('student_parents')
        .select('students(*)')
        .eq('parent_id', parent.id)
        .limit(1);
      
      const childData = studentParents?.[0]?.students;
      if (!childData) return;
      
      setChild(childData);
      
      // Load teacher comments
      const { data: comments } = await supabase
        .from('teacher_comments')
        .select(`
          *,
          teachers(full_name, subjects)
        `)
        .eq('student_id', childData.id)
        .eq('is_visible_to_parent', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setTeacherComments(comments || []);
      
      // Load recent high grades as "achievements"
      const { data: grades } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', childData.id)
        .order('date', { ascending: false })
        .limit(20);
      
      const highGrades = grades?.filter(g => (g.grade / g.max_grade) >= 0.9) || [];
      setAchievements(highGrades.slice(0, 5));
      
    } catch (error) {
      console.error('Error loading child data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <p className="text-gray-500">No student data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Student Profile</h2>
        <p className="text-gray-500">Detailed information about your child</p>
      </div>

      {/* Profile Card */}

<div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl shadow-lg p-8">
  <div className="flex items-center gap-6">
    <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-4xl backdrop-blur">
      👨‍🎓
    </div>
    <div className="flex-1">
      <h3 className="text-3xl font-bold mb-2">{child.name}</h3>
      <div className="grid grid-cols-2 gap-4 text-sm opacity-90">
        <div className="flex items-center gap-2">
          <Award size={16} />
          <span>Class {child.class_name}</span>
        </div>
        {child.email && (
          <div className="flex items-center gap-2">
            <Mail size={16} />
            <span>{child.email}</span>
          </div>
        )}
        {child.date_of_birth && (
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>Born: {new Date(child.date_of_birth).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  </div>
  
  {child.notes && (
    <div className="mt-6 p-4 bg-white/10 rounded-lg backdrop-blur">
      <p className="text-sm font-medium mb-1">Notes:</p>
      <p className="text-sm opacity-90">{child.notes}</p>
    </div>
  )}
</div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Phone size={24} className="text-emerald-600" />
            Contact Information
          </h3>
          
          <div className="space-y-3">
            {child.email && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="font-medium text-gray-800">{child.email}</p>
              </div>
            )}
            {child.parent_contact && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Parent Contact</p>
                <p className="font-medium text-gray-800">{child.parent_contact}</p>
              </div>
            )}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">School Year</p>
              <p className="font-medium text-gray-800">{child.school_year || '2025-26'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {child.status || 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Award size={24} className="text-emerald-600" />
            Recent Achievements
          </h3>
          
          {achievements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent achievements</p>
          ) : (
            <div className="space-y-3">
              {achievements.map(achievement => (
                <div key={achievement.id} className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">🏆</span>
                    <p className="font-semibold text-gray-800">{achievement.subject}</p>
                  </div>
                  <p className="text-sm text-gray-600">{achievement.assessment_title}</p>
                  <p className="text-sm font-bold text-emerald-600 mt-1">
                    {achievement.grade}/{achievement.max_grade} ({((achievement.grade/achievement.max_grade)*100).toFixed(0)}%)
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Teacher Comments */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <MessageCircle size={24} className="text-emerald-600" />
          Teacher Comments
        </h3>
        
        {teacherComments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No teacher comments yet</p>
        ) : (
          <div className="space-y-4">
            {teacherComments.map(comment => (
              <div key={comment.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{comment.teachers?.full_name || 'Teacher'}</p>
                    <p className="text-xs text-gray-500">
                      {comment.teachers?.subjects?.join(', ') || ''} • {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    comment.comment_type === 'behavior' ? 'bg-blue-100 text-blue-700' :
                    comment.comment_type === 'performance' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {comment.comment_type}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{comment.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentMyChildPage;