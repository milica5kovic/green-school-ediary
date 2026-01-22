import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const DateNavigator = () => {
  const { selectedDate, setSelectedDate, formatDate } = useApp();

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
      <div className="flex items-center justify-between">
        <button
          onClick={() => changeDate(-1)}
          className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-emerald-600" />
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {formatDate(selectedDate)}
          </h2>
          <p className="text-sm text-emerald-600 mt-1">
            Daily Classes & Attendance
          </p>
        </div>
        <button
          onClick={() => changeDate(1)}
          className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
        >
          <ChevronRight size={24} className="text-emerald-600" />
        </button>
      </div>
    </div>
  );
};

export default DateNavigator;