import React, { useState, useEffect } from 'react';
import { X, Upload, File, Trash2, Loader } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { toast } from '../../../../core/components/Toast';

const HomeworkModal = ({ onClose, onSave, existingHomework }) => {
  const { supabase } = useApp();
  
  const [formData, setFormData] = useState({
    class_name: existingHomework?.class_name || '',
    subject: existingHomework?.subject || '',
    title: existingHomework?.title || '',
    description: existingHomework?.description || '',
    due_date: existingHomework?.due_date || '',
  });

  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState(
    existingHomework?.attachments || []
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [availableClasses, setAvailableClasses] = useState([]);

  const availableSubjects = [
    'Mathematics',
    'ICT',
    'English',
    'Science',
    'History',
    'Geography',
    'Art',
    'Music',
    'PE',
    'Serbian'
  ];

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const { data } = await supabase
        .from('custom_classes')
        .select('class_name')
        .eq('is_active', true)
        .order('class_name');
      
      setAvailableClasses(data?.map(c => c.class_name) || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    const invalidFiles = selectedFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.warning('Some files exceed 10MB limit');
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = async (attachment) => {
    if (!window.confirm('Delete this file?')) return;

    try {
      const { error } = await supabase.storage
        .from('homework-files')
        .remove([attachment.path]);

      if (error) throw error;

      setExistingAttachments(prev => 
        prev.filter(att => att.path !== attachment.path)
      );
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) return [];

    setUploading(true);
    const uploadedAttachments = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = Date.now() + '_' + Math.random().toString(36).substring(7) + '.' + fileExt;
        const filePath = formData.class_name + '/' + fileName;

        setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        const { error: uploadError } = await supabase.storage
          .from('homework-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('homework-files')
          .getPublicUrl(filePath);

        uploadedAttachments.push({
          name: file.name,
          path: filePath,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type
        });
      }

      return uploadedAttachments;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files: ' + error.message);
      return [];
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.class_name || !formData.subject || !formData.title || !formData.due_date) {
      toast.warning('Please fill in all required fields');
      return;
    }

    try {
      const newAttachments = await uploadFiles();
      const allAttachments = [...existingAttachments, ...newAttachments];

      await onSave({
        ...formData,
        attachments: allAttachments
      });
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">
            {existingHomework ? 'Edit Assignment' : 'New Assignment'}
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class *
            </label>
            <select
              value={formData.class_name}
              onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Select Class</option>
              {availableClasses.map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <select
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Select Subject</option>
              {availableSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="e.g., Chapter 5 Exercises"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
              rows="3"
              placeholder="Assignment details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date *
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            
            <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
              <Upload size={32} className="text-gray-400 mb-2" />
              <span className="text-sm text-gray-600 font-medium">Click to upload files</span>
              <span className="text-xs text-gray-400 mt-1">
                PDF, DOC, DOCX, JPG, PNG (Max 10MB)
              </span>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {existingAttachments.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-gray-600">Current files:</p>
                {existingAttachments.map((attachment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <File size={16} className="text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExistingAttachment(attachment)}
                      className="p-1.5 hover:bg-red-100 text-red-600 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-gray-600">New files:</p>
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <File size={16} className="text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1.5 hover:bg-red-100 text-red-600 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploading && (
              <div className="mt-3 bg-emerald-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-emerald-700">Uploading files...</span>
                  <span className="text-sm font-bold text-emerald-600">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-emerald-200 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: uploadProgress + '%' }}
                  />
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="border-t px-6 py-4 bg-gray-50 flex gap-3">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Uploading...
              </>
            ) : (
              existingHomework ? 'Update Assignment' : 'Create Assignment'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-all font-semibold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeworkModal;