import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, MinusCircle, X } from 'lucide-react';
import { useApp } from '../../../core/context/AppContext';

const StudentHomeworkTracker = ({ homework, onClose }) => {
  const { supabase } = useApp();
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [homework.id]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('class_name', homework.class_name)
        .eq('status', 'active')
        .order('name');

      setStudents(studentsData || []);

      const { data: submissionsData } = await supabase
        .from('student_homework')
        .select('*')
        .eq('homework_id', homework.id);

      const submissionsMap = {};
      (submissionsData || []).forEach(sub => {
        submissionsMap[sub.student_id] = sub;
      });
      setSubmissions(submissionsMap);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (studentId, newStatus) => {
    try {
      const existing = submissions[studentId];

      if (existing) {
        const { error } = await supabase
          .from('student_homework')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('student_homework')
          .insert([{
            homework_id: homework.id,
            student_id: studentId,
            status: newStatus
          }])
          .select()
          .single();

        if (error) throw error;

        setSubmissions(prev => ({
          ...prev,
          [studentId]: data
        }));
      }

      setSubmissions(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          status: newStatus
        }
      }));

    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'done') return <CheckCircle size={20} className="text-green-600" />;
    if (status === 'partially_done') return <MinusCircle size={20} className="text-orange-600" />;
    return <Circle size={20} className="text-gray-400" />;
  };

  const getStatusColor = (status) => {
    if (status === 'done') return 'bg-green-50 border-green-200';
    if (status === 'partially_done') return 'bg-orange-50 border-orange-200';
    return 'bg-gray-50 border-gray-200';
  };

  const stats = {
    done: Object.values(submissions).filter(s => s.status === 'done').length,
    partially: Object.values(submissions).filter(s => s.status === 'partially_done').length,
    notDone: students.length - Object.values(submissions).filter(s => s.status !== 'not_done').length
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
          <div className="flex items-center justify-between text-white">
            <div>
              <h3 className="text-xl font-bold">{homework.title}</h3>
              <p className="text-emerald-100 text-sm mt-1">
                {homework.class_name} • {homework.subject}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{stats.done}</p>
              <p className="text-xs text-emerald-100">Done</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{stats.partially}</p>
              <p className="text-xs text-emerald-100">Partial</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{stats.notDone}</p>
              <p className="text-xs text-emerald-100">Not Done</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map(student => {
                const submission = submissions[student.id];
                const status = submission?.status || 'not_done';

                return (
                  <div
                    key={student.id}
                    className={'p-4 rounded-lg border transition-all ' + getStatusColor(status)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status)}
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500">#{student.student_no}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(student.id, 'not_done')}
                          className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ' + (status === 'not_done' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                        >
                          Not Done
                        </button>
                        <button
                          onClick={() => updateStatus(student.id, 'partially_done')}
                          className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ' + (status === 'partially_done' ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-600 hover:bg-orange-200')}
                        >
                          Partial
                        </button>
                        <button
                          onClick={() => updateStatus(student.id, 'done')}
                          className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ' + (status === 'done' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600 hover:bg-green-200')}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentHomeworkTracker;