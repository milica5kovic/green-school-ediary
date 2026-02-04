import React, { useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import AttendanceLogPage from '../attendanceLog/AttendanceLogPage';
import GradesAnalytics from './GradesAnalytics';

const AnalyticsTab = () => {
  const [activeView, setActiveView] = useState('attendance');

  return (
    <div className="space-y-6">
      {/* Toggle Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveView('attendance')}
          className={`flex-1 px-6 py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            activeView === 'attendance'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <BarChart3 size={20} />
          Attendance Analytics
        </button>
        <button
          onClick={() => setActiveView('grades')}
          className={`flex-1 px-6 py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            activeView === 'grades'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <TrendingUp size={20} />
          Grades Analytics
        </button>
      </div>

      {/* Content */}
      {activeView === 'attendance' && <AttendanceLogPage embedded={true} />}
      {activeView === 'grades' && <GradesAnalytics />}
    </div>
  );
};

export default AnalyticsTab;