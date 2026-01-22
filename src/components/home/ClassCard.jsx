import React, { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ClassCard = ({ cls, onRemove }) => {
  const { attendanceService, studentsDb, getDateKey, selectedDate } = useApp();
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0 });
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [behaviorComment, setBehaviorComment] = useState('');
  const [localAttendance, setLocalAttendance] = useState({}); // Local state for instant updates

  const dateKey = getDateKey(selectedDate);

  // Load students and attendance once
  useEffect(() => {
    const loadData = async () => {
      try {
        const classStudents = studentsDb[cls.class] || [];
        setStudents(classStudents);

        // Load attendance from Supabase
        await attendanceService.loadClassAttendance(dateKey, cls.id);

        // Initialize local attendance state
        const attendance = {};
        classStudents.forEach(student => {
          attendance[student.id] = attendanceService.getAttendance(dateKey, cls.id, student.id);
        });
        setLocalAttendance(attendance);

        // Calculate stats
        updateStats(classStudents, attendance);
      } catch (error) {
        console.error('Error loading attendance:', error);
      }
    };

    loadData();
  }, [cls.id, cls.class, dateKey, studentsDb, attendanceService]);

  const updateStats = (studentList, attendanceData) => {
    const newStats = {
      total: studentList.length,
      present: 0,
      absent: 0,
      late: 0
    };

    studentList.forEach(student => {
      const record = attendanceData[student.id];
      if (record?.isPresent()) newStats.present++;
      else if (record?.isAbsent()) newStats.absent++;
      else if (record?.isLate()) newStats.late++;
    });

    setStats(newStats);
  };

  const handleMarkAttendance = async (studentId, status) => {
    try {
      // Optimistic update - update UI immediately
      const updatedRecord = await attendanceService.markAttendance(dateKey, cls.id, studentId, status);
      
      // Update local state
      setLocalAttendance(prev => ({
        ...prev,
        [studentId]: updatedRecord
      }));

      // Recalculate stats with new attendance
      const newAttendance = {
        ...localAttendance,
        [studentId]: updatedRecord
      };
      updateStats(students, newAttendance);

    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance. Please try again.');
      
      // Reload from database on error
      const record = attendanceService.getAttendance(dateKey, cls.id, studentId);
      setLocalAttendance(prev => ({
        ...prev,
        [studentId]: record
      }));
    }
  };

  const openBehaviorModal = (studentId) => {
    const record = localAttendance[studentId];
    setSelectedStudent(studentId);
    setBehaviorComment(record?.comment || '');
    setShowBehaviorModal(true);
  };

  const saveBehaviorComment = async () => {
    try {
      await attendanceService.updateComment(dateKey, cls.id, selectedStudent, behaviorComment);
      
      // Update local state
      const updatedRecord = attendanceService.getAttendance(dateKey, cls.id, selectedStudent);
      setLocalAttendance(prev => ({
        ...prev,
        [selectedStudent]: updatedRecord
      }));

      setShowBehaviorModal(false);
      setBehaviorComment('');
      setSelectedStudent(null);
    } catch (error) {
      console.error('Error saving comment:', error);
      alert('Failed to save comment. Please try again.');
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-gray-800">
                {cls.class} - {cls.subject}
              </h3>
              <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
                {cls.time}
              </span>
            </div>
            <p className="text-gray-600 mt-1">{cls.title}</p>
          </div>
          <button
            onClick={() => onRemove(cls.id)}
            className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
            title="Remove class"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-200">
            <p className="text-2xl font-bold text-emerald-700">{stats.total}</p>
            <p className="text-xs text-emerald-600">Total</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
            <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            <p className="text-xs text-green-600">Present</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
            <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
            <p className="text-xs text-red-600">Absent</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
            <p className="text-2xl font-bold text-orange-600">{stats.late}</p>
            <p className="text-xs text-orange-600">Late</p>
          </div>
        </div>

        {/* Student List */}
        <div className="space-y-2">
          {students.map((student) => {
            const attendanceData = localAttendance[student.id];

            return (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-emerald-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-emerald-700">
                      {student.student_no}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{student.name}</p>
                    {attendanceData?.comment && (
                      <p className="text-xs text-gray-500 italic">
                        💬 {attendanceData.comment}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMarkAttendance(student.id, 'present')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      attendanceData?.status === 'present'
                        ? 'bg-green-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                    }`}
                  >
                    Present
                  </button>
                  <button
                    onClick={() => handleMarkAttendance(student.id, 'late')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      attendanceData?.status === 'late'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-orange-100'
                    }`}
                  >
                    Late
                  </button>
                  <button
                    onClick={() => handleMarkAttendance(student.id, 'absent')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      attendanceData?.status === 'absent'
                        ? 'bg-red-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                    }`}
                  >
                    Absent
                  </button>
                  <button
                    onClick={() => openBehaviorModal(student.id)}
                    className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
                    title="Add behavior comment"
                  >
                    <MessageSquare size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Behavior Comment Modal */}
      {showBehaviorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">Behavior Comment</h3>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              rows={4}
              placeholder="Enter behavior comment..."
              value={behaviorComment}
              onChange={(e) => setBehaviorComment(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={saveBehaviorComment}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2 rounded-lg font-medium hover:shadow-lg transition-all"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowBehaviorModal(false);
                  setBehaviorComment('');
                  setSelectedStudent(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClassCard;