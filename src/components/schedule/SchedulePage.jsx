import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Clock, Download, Calendar, Users, Award } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ScheduleModal from './ScheduleModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
const SchedulePage = () => {
  const { scheduleService } = useApp();
  const [schedule, setSchedule] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('class'); // 'class', 'duty', 'extracurricular'
  const [editingEntry, setEditingEntry] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    '08:00 - 08:45',
    '08:45 - 09:30',
    '09:30 - 10:15',
    '10:15 - 10:30', // Break
    '10:30 - 11:15',
    '11:15 - 12:00',
    '12:00 - 12:45',
    '12:45 - 13:30', // Lunch
    
    '13:30 - 14:15',
    '14:15 - 15:00',
    '15:00 - 15:45'
  ];

  const loadSchedule = useCallback(async () => {
    if (!scheduleService) return;
    
    try {
      setLocalLoading(true);
      const weekSchedule = await scheduleService.getWeekSchedule();
      setSchedule(weekSchedule);
    } catch (error) {
      console.error('Error loading schedule:', error);
      alert('Failed to load schedule');
    } finally {
      setLocalLoading(false);
    }
  }, [scheduleService]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleSave = async (entry) => {
    if (!scheduleService) return;
    
    try {
      setLocalLoading(true);

      if (editingEntry) {
        await scheduleService.deleteScheduleClass(editingEntry.id);
        await scheduleService.addScheduleClass(
          entry.day,
          entry.time,
          entry.class,
          entry.subject,
          entry.type || 'class'
        );
      } else {
        await scheduleService.addScheduleClass(
          entry.day,
          entry.time,
          entry.class,
          entry.subject,
          entry.type || 'class'
        );
      }

      await loadSchedule();
      setShowModal(false);
      setEditingEntry(null);
      setModalType('class');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule entry. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (scheduleItem) => {
    if (!scheduleService) return;
    
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      setLocalLoading(true);
      
      if (scheduleItem.id) {
        await scheduleService.deleteScheduleClass(scheduleItem.id);
        await loadSchedule();
      } else {
        alert('Cannot delete: schedule item ID not found');
      }
    } catch (error) {
      console.error('Error deleting schedule entry:', error);
      alert('Failed to delete schedule entry: ' + error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = (day, entry, id) => {
    setEditingEntry({ day, entry, id });
    setModalType(entry.type || 'class');
    setShowModal(true);
  };

  const openAddModal = (type) => {
    setEditingEntry(null);
    setModalType(type);
    setShowModal(true);
  };

  const getTotalClasses = () => {
    let total = 0;
    Object.values(schedule).forEach((day) => {
      day.forEach((entry) => {
        if (!entry.type || entry.type === 'class') total++;
      });
    });
    return total;
  };

  const getClassesBySubject = () => {
    const subjects = {};
    Object.values(schedule).forEach((day) => {
      day.forEach((cls) => {
        if (!cls.type || cls.type === 'class') {
          subjects[cls.subject] = (subjects[cls.subject] || 0) + 1;
        }
      });
    });
    return subjects;
  };
  const getScheduleStats = () => {
  let classes = 0;
  let duties = 0;
  let extras = 0;

  Object.values(schedule).forEach((day) => {
    day.forEach((entry) => {
      const type = entry.type || 'class';
      if (type === 'class') classes++;
      else if (type === 'duty') duties++;
      else if (type === 'extracurricular') extras++;
    });
  });

  return { classes, duties, extras };
};

const scheduleStats = getScheduleStats();


 const exportTimetable = async () => {
  try {
    setLocalLoading(true);

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const logoImg = new Image();
    logoImg.src = '/logo.png';
    
    logoImg.onload = () => {
      const pageWidth = pdf.internal.pageSize.width;

      // Calculate logo dimensions to maintain aspect ratio
      const logoAspectRatio = logoImg.width / logoImg.height;
      const logoHeight = 12;
      const logoWidth = logoHeight * logoAspectRatio;

      // Add logo on the left
      pdf.addImage(logoImg, 'PNG', 20, 12, logoWidth, logoHeight);

      // Add title next to logo
      pdf.setFontSize(22);
      pdf.setTextColor(0, 133, 66); // Green School green color
      pdf.setFont('helvetica', 'bold');
      pdf.text('Weekly Timetable', 20 + logoWidth + 5, 18);

      // Add academic year below title
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Academic Year 2025-26', 20 + logoWidth + 5, 23);

      // Get only actual time slots
      const actualTimeSlots = [];
      Object.values(schedule).forEach(day => {
        day.forEach(entry => {
          if (!actualTimeSlots.includes(entry.time)) {
            actualTimeSlots.push(entry.time);
          }
        });
      });
      
      // Add breaks to time slots if they don't exist
const snackBreak = '10:30 - 10:55';
const lunchBreakPart1 = '12:30 - 12:50';
const lunchBreakPart2 = '12:50 - 13:25';

if (!actualTimeSlots.includes(snackBreak)) {
  actualTimeSlots.push(snackBreak);
}
if (!actualTimeSlots.includes(lunchBreakPart1)) {
  actualTimeSlots.push(lunchBreakPart1);
}
if (!actualTimeSlots.includes(lunchBreakPart2)) {
  actualTimeSlots.push(lunchBreakPart2);
}
      
      actualTimeSlots.sort();

      // Prepare table data
      const tableData = actualTimeSlots.map(time => {
        const row = [time];
        
       // Check if this is a break time
if (time === snackBreak) {
  // Snack break for all days
  days.forEach(() => row.push('SNACK BREAK'));
  return row;
}

if (time === lunchBreakPart1) {
  // First part of lunch (12:30-12:50) - everyone has lunch
  days.forEach(() => row.push('LUNCH'));
  return row;
}

if (time === lunchBreakPart2) {
  // Second part of lunch (12:50-13:25) - check for duties
  days.forEach(day => {
    const entries = schedule[day]?.filter(e => e.time === time) || [];
    if (entries.length > 0) {
      // If there's a duty during this time, show that
      const entryTexts = entries.map(entry => {
        const type = entry.type || 'class';
        if (type === 'duty') {
          return `DUTY: ${entry.subject}`;
        } else if (type === 'extracurricular') {
          return `EXTRA: ${entry.subject}`;
        } else {
          return `${entry.class}\n${entry.subject}`;
        }
      });
      row.push(entryTexts.join('\n'));
    } else {
      // Otherwise, it's still lunch
      row.push('LUNCH');
    }
  });
  return row;
}
        
        
        
        // Regular classes
        days.forEach(day => {
          const entries = schedule[day]?.filter(e => e.time === time) || [];
          if (entries.length === 0) {
            row.push('');
          } else {
            const entryTexts = entries.map(entry => {
              const type = entry.type || 'class';
              if (type === 'duty') {
                return `DUTY: ${entry.subject}`;
              } else if (type === 'extracurricular') {
                return `EXTRA: ${entry.subject}`;
              } else {
                return `${entry.class}\n${entry.subject}`;
              }
            });
            row.push(entryTexts.join('\n'));
          }
        });
        return row;
      });

      // Dynamic sizing based on content
      const rowCount = tableData.length;
      let fontSize = 9;
      let cellPadding = 3.5;
      
      if (rowCount > 10) {
        fontSize = 8;
        cellPadding = 3;
      }
      if (rowCount > 12) {
        fontSize = 7.5;
        cellPadding = 2.5;
      }

      // Create centered table
      const tableWidth = 257;
      const marginLeft = (pageWidth - tableWidth) / 2;

      autoTable(pdf, {
        startY: 30,
        head: [['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: fontSize,
          cellPadding: cellPadding,
          lineColor: [200, 200, 200],
          lineWidth: 0.15,
          overflow: 'linebreak',
          cellWidth: 'wrap',
          halign: 'center',
          valign: 'middle',
          minCellHeight: 10,
        },
        headStyles: {
          fillColor: [0, 133, 66], // Green School green
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'center',
          cellPadding: 4,
        },
        columnStyles: {
          0: { 
            cellWidth: 27,
            fillColor: [249, 250, 251],
            fontStyle: 'bold',
            fontSize: fontSize,
          },
          1: { cellWidth: 46 },
          2: { cellWidth: 46 },
          3: { cellWidth: 46 },
          4: { cellWidth: 46 },
          5: { cellWidth: 46 },
        },
        margin: { left: marginLeft, right: marginLeft, top: 30, bottom: 15 },
        tableWidth: tableWidth,
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index > 0) {
            const cellText = data.cell.text.join(' ');
            
            // Breaks styling
            if (cellText === 'SNACK BREAK') {
              data.cell.styles.fillColor = [255, 237, 213]; // Light orange
              data.cell.styles.textColor = [194, 65, 12]; // Dark orange
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = fontSize + 1;
            } else if (cellText === 'LUNCH') {
              data.cell.styles.fillColor = [254, 226, 226]; // Light red
              data.cell.styles.textColor = [185, 28, 28]; // Dark red
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = fontSize + 1;
            }
            // Duties and activities
            else if (cellText.includes('DUTY:')) {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [146, 64, 14];
              data.cell.styles.fontStyle = 'normal';
            } else if (cellText.includes('EXTRA:')) {
              data.cell.styles.fillColor = [237, 233, 254];
              data.cell.styles.textColor = [107, 33, 168];
              data.cell.styles.fontStyle = 'normal';
            }
            // Regular classes
            else if (cellText.length > 0) {
              data.cell.styles.fillColor = [209, 250, 229]; // Light green (matching logo)
              data.cell.styles.textColor = [0, 133, 66]; // Green School green
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        didDrawCell: function(data) {
          if (data.section === 'body' && data.column.index > 0 && data.cell.text.length > 0) {
            const cellText = data.cell.text.join(' ');
            
            // No border for breaks
            if (cellText === 'SNACK BREAK' || cellText === 'LUNCH') {
              return;
            }
            
            if (cellText.includes('DUTY:')) {
              pdf.setDrawColor(245, 158, 11);
              pdf.setLineWidth(1.5);
              pdf.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
            } else if (cellText.includes('EXTRA:')) {
              pdf.setDrawColor(168, 85, 247);
              pdf.setLineWidth(1.5);
              pdf.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
            } else if (cellText.length > 0) {
              pdf.setDrawColor(0, 133, 66); // Green School green
              pdf.setLineWidth(1.5);
              pdf.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
            }
          }
        }
      });

      // Save PDF
      const filename = `Green_School_Timetable_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
      setLocalLoading(false);
    };

    logoImg.onerror = () => {
      console.warn('Logo not found');
      
      const pageWidth = pdf.internal.pageSize.width;

      pdf.setFontSize(22);
      pdf.setTextColor(0, 133, 66);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Green School - Weekly Timetable', 20, 18);

      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Academic Year 2025-26', 20, 23);

      const actualTimeSlots = [];
      Object.values(schedule).forEach(day => {
        day.forEach(entry => {
          if (!actualTimeSlots.includes(entry.time)) {
            actualTimeSlots.push(entry.time);
          }
        });
      });
      
      const snackBreak = '10:30 - 10:55';
      const lunchBreak = '12:50 - 13:25';
      
      if (!actualTimeSlots.includes(snackBreak)) {
        actualTimeSlots.push(snackBreak);
      }
      if (!actualTimeSlots.includes(lunchBreak)) {
        actualTimeSlots.push(lunchBreak);
      }
      
      actualTimeSlots.sort();

      const tableData = actualTimeSlots.map(time => {
        const row = [time];
        
        if (time === snackBreak) {
          days.forEach(() => row.push('SNACK BREAK'));
          return row;
        }
        
        if (time === lunchBreak) {
          days.forEach(() => row.push('LUNCH'));
          return row;
        }
        
        days.forEach(day => {
          const entries = schedule[day]?.filter(e => e.time === time) || [];
          if (entries.length === 0) {
            row.push('');
          } else {
            const entryTexts = entries.map(entry => {
              const type = entry.type || 'class';
              if (type === 'duty') {
                return `DUTY: ${entry.subject}`;
              } else if (type === 'extracurricular') {
                return `EXTRA: ${entry.subject}`;
              } else {
                return `${entry.class}\n${entry.subject}`;
              }
            });
            row.push(entryTexts.join('\n'));
          }
        });
        return row;
      });

      const rowCount = tableData.length;
      let fontSize = 9;
      let cellPadding = 3.5;
      
      if (rowCount > 10) {
        fontSize = 8;
        cellPadding = 3;
      }
      if (rowCount > 12) {
        fontSize = 7.5;
        cellPadding = 2.5;
      }

      const tableWidth = 257;
      const marginLeft = (pageWidth - tableWidth) / 2;

      autoTable(pdf, {
        startY: 30,
        head: [['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: fontSize,
          cellPadding: cellPadding,
          lineColor: [200, 200, 200],
          lineWidth: 0.15,
          overflow: 'linebreak',
          cellWidth: 'wrap',
          halign: 'center',
          valign: 'middle',
          minCellHeight: 10,
        },
        headStyles: {
          fillColor: [0, 133, 66],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
          halign: 'center',
          cellPadding: 4,
        },
        columnStyles: {
          0: { 
            cellWidth: 27,
            fillColor: [249, 250, 251],
            fontStyle: 'bold',
            fontSize: fontSize,
          },
          1: { cellWidth: 46 },
          2: { cellWidth: 46 },
          3: { cellWidth: 46 },
          4: { cellWidth: 46 },
          5: { cellWidth: 46 },
        },
        margin: { left: marginLeft, right: marginLeft, top: 30, bottom: 15 },
        tableWidth: tableWidth,
        didParseCell: function(data) {
          if (data.section === 'body' && data.column.index > 0) {
            const cellText = data.cell.text.join(' ');
            
            if (cellText === 'SNACK BREAK') {
              data.cell.styles.fillColor = [255, 237, 213];
              data.cell.styles.textColor = [194, 65, 12];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = fontSize + 1;
            } else if (cellText === 'LUNCH') {
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.textColor = [185, 28, 28];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fontSize = fontSize + 1;
            } else if (cellText.includes('DUTY:')) {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [146, 64, 14];
              data.cell.styles.fontStyle = 'normal';
            } else if (cellText.includes('EXTRA:')) {
              data.cell.styles.fillColor = [237, 233, 254];
              data.cell.styles.textColor = [107, 33, 168];
              data.cell.styles.fontStyle = 'normal';
            } else if (cellText.length > 0) {
              data.cell.styles.fillColor = [209, 250, 229];
              data.cell.styles.textColor = [0, 133, 66];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        didDrawCell: function(data) {
          if (data.section === 'body' && data.column.index > 0 && data.cell.text.length > 0) {
            const cellText = data.cell.text.join(' ');
            
            if (cellText === 'SNACK BREAK' || cellText === 'LUNCH') {
              return;
            }
            
            if (cellText.includes('DUTY:')) {
              pdf.setDrawColor(245, 158, 11);
              pdf.setLineWidth(1.5);
              pdf.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
            } else if (cellText.includes('EXTRA:')) {
              pdf.setDrawColor(168, 85, 247);
              pdf.setLineWidth(1.5);
              pdf.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
            } else if (cellText.length > 0) {
              pdf.setDrawColor(0, 133, 66);
              pdf.setLineWidth(1.5);
              pdf.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
            }
          }
        }
      });

      pdf.save(`Green_School_Timetable_${new Date().toISOString().split('T')[0]}.pdf`);
      setLocalLoading(false);
    };

  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF: ' + error.message);
    setLocalLoading(false);
  }
};
  const getEntryStyle = (entry) => {
    const type = entry.type || 'class';
    if (type === 'duty') {
      return 'bg-yellow-50 border-yellow-200';
    } else if (type === 'extracurricular') {
      return 'bg-purple-50 border-purple-200';
    }
    return 'bg-emerald-50 border-emerald-200';
  };

  const getEntryIcon = (entry) => {
    const type = entry.type || 'class';
    if (type === 'duty') return '🔔';
    if (type === 'extracurricular') return '⭐';
    return '📚';
  };

  const subjectStats = getClassesBySubject();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">My Weekly Schedule</h2>
            <p className="text-gray-600 mt-1">Manage your teaching schedule</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => openAddModal('class')}
              disabled={localLoading}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              Add Class
            </button>
            <button
              onClick={() => openAddModal('duty')}
              disabled={localLoading}
              className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Calendar size={20} />
              Add Duty
            </button>
            <button
              onClick={() => openAddModal('extracurricular')}
              disabled={localLoading}
              className="bg-gradient-to-r from-purple-500 to-violet-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Award size={20} />
              Add Extra
            </button>
            <button
  onClick={exportTimetable}
  disabled={localLoading}
  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
>
  <Download size={20} />
  {localLoading ? 'Generating...' : 'Export PDF'}
</button>
          </div>
        </div>

        {/* Stats */}
      
<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
    <p className="text-3xl font-bold text-emerald-700">{scheduleStats.classes}</p>
    <p className="text-sm text-emerald-600 mt-1">📚 Classes</p>
  </div>
  <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
    <p className="text-3xl font-bold text-orange-700">{scheduleStats.duties}</p>
    <p className="text-sm text-orange-600 mt-1">🔔 Duties</p>
  </div>
  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
    <p className="text-3xl font-bold text-purple-700">{scheduleStats.extras}</p>
    <p className="text-sm text-purple-600 mt-1">⭐ Extras</p>
  </div>
  {Object.entries(subjectStats).slice(0, 2).map(([subject, count]) => (
    <div key={subject} className="bg-blue-50 rounded-xl p-4 border border-blue-200">
      <p className="text-3xl font-bold text-blue-700">{count}</p>
      <p className="text-sm text-blue-600 mt-1">{subject}</p>
    </div>
  ))}
</div>
      </div>

      {/* Schedule Grid */}
      <div className="space-y-6">
        {days.map((day) => (
          <div key={day} className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-emerald-900">{day}</h3>
              <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
                {schedule[day]?.length || 0} {schedule[day]?.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            {!schedule[day] || schedule[day].length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 italic">No entries scheduled</p>
              </div>
            ) : (
              <div className="space-y-2">
                {schedule[day].map((cls, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-lg border hover:opacity-80 transition-colors ${getEntryStyle(cls)}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-2xl">{getEntryIcon(cls)}</span>
                      <span className="text-sm font-bold text-emerald-600 w-28">
                        {cls.time}
                      </span>
                      <div className="flex items-center gap-3">
                        {(!cls.type || cls.type === 'class') && (
                          <span className="font-semibold text-gray-800 bg-white px-3 py-1 rounded-lg">
                            {cls.class}
                          </span>
                        )}
                        <span className="text-gray-700 font-medium">{cls.subject}</span>
                        {cls.type && cls.type !== 'class' && (
                          <span className="text-xs bg-white px-2 py-1 rounded capitalize">
                            {cls.type}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(day, cls, cls.id)}
                        disabled={localLoading}
                        className="p-2 hover:bg-white/50 text-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                        title="Edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(cls)}
                        disabled={localLoading}
                        className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <ScheduleModal
          onClose={() => {
            setShowModal(false);
            setEditingEntry(null);
            setModalType('class');
          }}
          onSave={handleSave}
          existingSchedule={editingEntry?.entry}
          days={days}
          modalType={modalType}
        />
      )}
    </div>
  );
};

export default SchedulePage;