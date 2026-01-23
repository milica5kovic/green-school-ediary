import React, { useState, useEffect } from 'react';
import { Upload, X, FileText } from 'lucide-react';

const HomeworkModal = ({ onClose, onSave, existingHomework, classId }) => {
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [selectedClass, setSelectedClass] = useState(classId || '');

  // All classes Y1-Y9 with Y5A and Y5B
  const classes = [
    'Y1', 'Y2', 'Y3', 'Y4', 
    'Y5A', 'Y5B', 
    'Y6', 'Y7', 'Y8', 'Y9'
  ];

  useEffect(() => {
    if (existingHomework) {
      setDescription(existingHomework.description);
      const date = new Date(existingHomework.dueDate);
      setDueDate(date.toISOString().split('T')[0]);
      setAttachments(existingHomework.attachments || []);
    }
    if (classId) {
      setSelectedClass(classId);
    }
  }, [existingHomework, classId]);

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    }));
    setAttachments([...attachments, ...newAttachments]);
  };

  const removeAttachment = (attachmentId) => {
    setAttachments(attachments.filter((att) => att.id !== attachmentId));
  };

  const handleSave = () => {
    if (description && dueDate && selectedClass) {
      // Create a fake class ID for homework not tied to today's classes
      const hwClassId = existingHomework 
        ? classId 
        : `${selectedClass}-homework-${Date.now()}`;
      onSave(hwClassId, description, dueDate, attachments);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold mb-6">
          {existingHomework ? 'Edit Homework' : 'Assign Homework'}
        </h3>

        <div className="space-y-4">
          {/* Class Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class/Year Group *
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={!!existingHomework} // Can't change class when editing
            >
              <option value="">Select class...</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Description *
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              rows={4}
              placeholder="Describe the homework assignment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date *
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Optional)
            </label>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
              <Upload size={24} className="text-gray-400" />
              <span className="text-gray-600">Click to upload files</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              />
            </label>

            {/* Attachment List */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {att.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(att.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={!description || !dueDate || !selectedClass}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {existingHomework ? 'Update' : 'Assign'} Homework
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeworkModal;