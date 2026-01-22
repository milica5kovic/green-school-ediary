import React from "react";
import { Calendar, FileText, Trash2 } from "lucide-react";

const HomeworkCard = ({ classId, homework, onEdit, onDelete }) => {
  if (!homework || !classId) return null;

  
const hw = homework;
  const dueDate = new Date(homework.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const isOverdue = homework.isOverdue();
  const isDueToday = homework.isDueToday();

  const [className = "Unknown", classTime = ""] = classId.split("-");

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg p-6 border-l-4 ${
        isOverdue
          ? "border-l-red-500 bg-red-50"
          : isDueToday
          ? "border-l-orange-500 bg-orange-50"
          : "border-l-emerald-500"
      }`}
    >
      console.log("HomeworkCard props:", arguments[0]);

      <div className="flex justify-between items-start">
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-xl font-bold text-gray-800">{className}</h3>
            <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">
              {classTime}
            </span>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4 border">
            <p>{homework.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>{homework.getFormattedDueDate()}</span>
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          <button onClick={() => onEdit(classId)}>
            <FileText size={20} />
          </button>
          <button onClick={() => onDelete(classId)}>
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeworkCard;
