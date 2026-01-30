import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../infrastructure/supabaseClient';

const ScheduleModal = ({ onClose, onSave, existingSchedule, days, modalType = 'class' }) => {
  const [formData, setFormData] = useState({
    day: existingSchedule?.day || days[0],
    time: existingSchedule?.time || '',
    class: existingSchedule?.class || '',
    subject: existingSchedule?.subject || '',
    type: modalType
  });
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const timeSlots = [
  '09:00 - 09:40',
  '09:45 - 10:30',
  '10:30 - 10:55', // SNACK BREAK
  '11:00 - 11:45',
  '11:50 - 12:30',
  '12:30 - 12:50', // LUNCH (part 1)
  '12:50 - 13:25', // LUNCH (part 2)
  '13:30 - 14:15',
  '14:20 - 15:00',
  '15:05 - 15:45',
];


  useEffect(() => {
    loadClasses();
    loadSubjects();
  }, []);

  const loadClasses = async () => {
    const { data } = await supabase
      .from('custom_classes')
      .select('*')
      .eq('is_active', true)
      .order('class_name');
    setClasses(data || []);
  };

  const loadSubjects = async () => {
    const { data } = await supabase
      .from('custom_subjects')
      .select('*')
      .eq('is_active', true)
      .order('subject_name');
    setSubjects(data || []);
  };

const handleSubmit = (e) => {
  e.preventDefault();
  
  if (modalType === 'duty') {
    if (!formData.day || !formData.time || !formData.subject) {
      alert('Please fill in all fields');
      return;
    }
    onSave({ 
      day: formData.day,
      time: formData.time,
      class: 'Duty', 
      subject: formData.subject,
      type: 'duty' 
    });
  } else if (modalType === 'extracurricular') {
    if (!formData.day || !formData.time || !formData.subject) {
      alert('Please fill in all fields');
      return;
    }
    onSave({ 
      day: formData.day,
      time: formData.time,
      class: 'Extra', 
      subject: formData.subject,
      type: 'extracurricular' 
    });
  } else {
    if (!formData.day || !formData.time || !formData.class || !formData.subject) {
      alert('Please fill in all fields');
      return;
    }
    onSave({ ...formData, type: 'class' });
  }
};

  const getTitle = () => {
    if (modalType === 'duty') return '🔔 Add Duty';
    if (modalType === 'extracurricular') return '⭐ Add Extracurricular';
    return '📚 Add Class';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">{getTitle()}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Day *
            </label>
            <select
              value={formData.day}
              onChange={(e) => setFormData({ ...formData, day: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {days.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time *
            </label>
            <select
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Select time...</option>
              {timeSlots.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          {modalType === 'class' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <select
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Select class...</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.class_name}>{cls.class_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {modalType === 'duty' ? 'Duty Description *' : 
               modalType === 'extracurricular' ? 'Activity Name *' : 'Subject *'}
            </label>
            {modalType === 'class' ? (
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">Select subject...</option>
                {subjects.map(subj => (
                  <option key={subj.id} value={subj.subject_name}>{subj.subject_name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder={modalType === 'duty' ? 'e.g., Playground Duty' : 'e.g., Chess Club'}
              />
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleModal;