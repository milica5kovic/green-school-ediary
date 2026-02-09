import React from 'react';
import { Calendar, FileText, Edit2, Trash2, Paperclip } from 'lucide-react';

const HomeworkCard = ({ homework, onEdit, onDelete }) => {
  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return { text: Math.abs(diff) + 'd overdue', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (diff === 0) return { text: 'Due today', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    if (diff === 1) return { text: 'Due tomorrow', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    if (diff <= 7) return { text: diff + ' days left', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    return { text: diff + ' days left', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
  };

  const dueInfo = getDaysUntilDue(homework.due_date);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
              {homework.class_name}
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {homework.subject}
            </span>
            {homework.attachments && homework.attachments.length > 0 && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center gap-1">
                <Paperclip size={12} />
                {homework.attachments.length}
              </span>
            )}
          </div>
          
          <h4 className="font-semibold text-gray-900 mb-1 truncate">{homework.title}</h4>
          
          {homework.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{homework.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              Assigned {new Date(homework.assigned_date).toLocaleDateString()}
            </span>
            <span className={'font-medium ' + dueInfo.color}>
              {dueInfo.text}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(homework)}
            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(homework.id)}
            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeworkCard;