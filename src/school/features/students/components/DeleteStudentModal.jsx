import React, { useState } from 'react';
import { AlertTriangle, Trash2, UserX, Archive, X, Loader2 } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useBranding } from '../../../../core/context/BrandingContext';

/**
 * DeleteStudentModal - Shows options for removing a student
 * 
 * Options:
 * 1. Change status to "withdrawn" (soft delete - keeps records)
 * 2. Change status to "transferred" (soft delete - keeps records)
 * 3. Permanently delete (hard delete - removes all data)
 */
const DeleteStudentModal = ({ student, onClose, onSuccess }) => {
  const { supabase } = useApp();
  const { primaryColor } = useBranding();
  
  const [selectedOption, setSelectedOption] = useState('withdrawn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const options = [
    {
      id: 'withdrawn',
      title: 'Mark as Withdrawn',
      description: 'Student left the school. Records are kept for reference.',
      icon: UserX,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      recommended: true,
    },
    {
      id: 'transferred',
      title: 'Mark as Transferred',
      description: 'Student moved to another school. Records are preserved.',
      icon: Archive,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      id: 'delete',
      title: 'Permanently Delete',
      description: 'Remove all student data. This cannot be undone!',
      icon: Trash2,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      dangerous: true,
    },
  ];

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      if (selectedOption === 'delete') {
        // Hard delete - need to remove related records first
        const studentId = student.id;

        // 1. Delete from student_parents
        await supabase.from('student_parents').delete().eq('student_id', studentId);
        
        // 2. Delete from grades
        await supabase.from('grades').delete().eq('student_id', studentId);
        
        // 3. Delete from attendance
        await supabase.from('attendance').delete().eq('student_id', studentId);
        
        // 4. Delete from student_homework
        await supabase.from('student_homework').delete().eq('student_id', studentId);
        
        // 5. Delete from class_teacher_comments
        await supabase.from('class_teacher_comments').delete().eq('student_id', studentId);
        
        // 6. Delete from subject_term_comments
        await supabase.from('subject_term_comments').delete().eq('student_id', studentId);
        
        // 7. Delete from teacher_comments
        await supabase.from('teacher_comments').delete().eq('student_id', studentId);
        
        // 8. Delete from term_reports
        await supabase.from('term_reports').delete().eq('student_id', studentId);
        
        // 9. Update enrollment_applications to remove reference
        await supabase
          .from('enrollment_applications')
          .update({ current_student_id: null })
          .eq('current_student_id', studentId);
        
        // 10. Finally delete the student
        const { error: deleteError } = await supabase
          .from('students')
          .delete()
          .eq('id', studentId);

        if (deleteError) throw deleteError;

        console.log('✅ Student permanently deleted');
      } else {
        // Soft delete - just update status
        const { error: updateError } = await supabase
          .from('students')
          .update({ 
            status: selectedOption,
            updated_at: new Date().toISOString()
          })
          .eq('id', student.id);

        if (updateError) throw updateError;

        console.log(`✅ Student status changed to: ${selectedOption}`);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Remove Student</h3>
              <p className="text-gray-500 text-sm">Choose how to handle this student</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Student Info */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: primaryColor }}
            >
              {student.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{student.name}</p>
              <p className="text-sm text-gray-500">{student.class_name} • #{student.student_no}</p>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedOption === option.id;
            
            return (
              <label
                key={option.id}
                className={`
                  relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                  ${isSelected 
                    ? `${option.borderColor} ${option.bgColor}` 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <input
                  type="radio"
                  name="deleteOption"
                  value={option.id}
                  checked={isSelected}
                  onChange={() => setSelectedOption(option.id)}
                  className="sr-only"
                />
                
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${option.bgColor}`}>
                  <Icon size={20} className={option.color} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${isSelected ? option.color : 'text-gray-800'}`}>
                      {option.title}
                    </p>
                    {option.recommended && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{option.description}</p>
                </div>

                {/* Radio indicator */}
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                  ${isSelected ? option.borderColor : 'border-gray-300'}
                `}>
                  {isSelected && (
                    <div className={`w-2.5 h-2.5 rounded-full ${option.color.replace('text-', 'bg-')}`} />
                  )}
                </div>
              </label>
            );
          })}

          {/* Warning for permanent delete */}
          {selectedOption === 'delete' && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mt-4">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-red-800">Warning: This action is irreversible!</p>
                <p className="text-red-700 mt-1">
                  All grades, attendance records, homework submissions, and comments for this student will be permanently deleted.
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`
              flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors 
              flex items-center justify-center gap-2 disabled:opacity-50
              ${selectedOption === 'delete' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-amber-600 hover:bg-amber-700'
              }
            `}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : selectedOption === 'delete' ? (
              <>
                <Trash2 size={16} />
                Delete Permanently
              </>
            ) : (
              <>
                <UserX size={16} />
                Mark as {selectedOption === 'withdrawn' ? 'Withdrawn' : 'Transferred'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteStudentModal;