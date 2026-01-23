import React from "react";
import { Calendar, FileText, Trash2 } from "lucide-react";

const HomeworkCard = ({ classId, homework, onEdit, onDelete }) => {
  if (!homework || !classId) return null;

  const dueDate = new Date(homework.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const isOverdue = homework.isOverdue();
  const isDueToday = homework.isDueToday();

  const [className = "Unknown", classTime = ""] = classId.split("-");

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg p-6 border-l-4 transition-all hover:shadow-xl ${
        isOverdue
          ? "border-l-red-500 bg-red-50"
          : isDueToday
          ? "border-l-orange-500 bg-orange-50"
          : "border-l-emerald-500"
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {/* Class Info */}
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xl font-bold text-gray-800">{className}</h3>
            <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
              {classTime}
            </span>
          </div>

          {/* Assignment Description */}
          <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
            <p className="text-gray-800 leading-relaxed">{homework.description}</p>
          </div>

          {/* Attachments */}
          {homework.hasAttachments() && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                📎 Attachments ({homework.getAttachmentCount()})
              </p>
              <div className="space-y-1">
                {homework.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg"
                  >
                    {att.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Date Info */}
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                isOverdue
                  ? "bg-red-100 text-red-700"
                  : isDueToday
                  ? "bg-orange-100 text-orange-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <Calendar size={16} />
              <span className="font-semibold">
                Due: {homework.getFormattedDueDate()}
              </span>
            </div>

            {!isOverdue && (
              <span
                className={`text-sm font-medium ${
                  isDueToday ? "text-orange-600" : "text-gray-600"
                }`}
              >
                {homework.getStatusText()}
              </span>
            )}

            {isOverdue && (
              <span className="text-sm font-medium text-red-600">
                ⚠️ {homework.getStatusText()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onEdit(classId)}
            className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
            title="Edit homework"
          >
            <FileText size={20} />
          </button>
          <button
            onClick={() => onDelete(classId)}
            className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
            title="Delete homework"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeworkCard;