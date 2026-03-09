import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Clock, Download, Calendar, Award, 
  Edit2, Loader2
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useAuth } from '../../../../core/context/AuthContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import ScheduleModal from './ScheduleModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================================================
// SCHEDULE PAGE - Teacher's Weekly Schedule
// Uses useTermTheme for dynamic colors + tenant branding for PDF
// ============================================================================

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const EMPTY_SCHEDULE = {
  Monday: [],
  Tuesday: [],
  Wednesday: [],
  Thursday: [],
  Friday: [],
};

const SchedulePage = () => {
  const { scheduleService } = useApp();
  const { teacher, profile } = useAuth();
  const branding = useBranding();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  const [schedule, setSchedule] = useState(EMPTY_SCHEDULE);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('class');
  const [editingEntry, setEditingEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load schedule
  useEffect(() => {
    let mounted = true;

    const loadSchedule = async () => {
      if (!scheduleService || !teacher?.user_id) {
        setSchedule(EMPTY_SCHEDULE);
        return;
      }

      try {
        setLoading(true);
        const data = await scheduleService.getWeekSchedule(teacher.user_id);
        if (mounted) setSchedule(data || EMPTY_SCHEDULE);
      } catch (error) {
        console.error('Error loading schedule:', error);
        if (mounted) setSchedule(EMPTY_SCHEDULE);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSchedule();
    return () => { mounted = false; };
  }, [teacher?.user_id, scheduleService, refreshTrigger]);

  // Calculate stats
  const getScheduleStats = () => {
    let classes = 0, duties = 0, extras = 0;
    Object.values(schedule).forEach(day => {
      day.forEach(entry => {
        const type = entry.type || 'class';
        if (type === 'class') classes++;
        else if (type === 'duty') duties++;
        else extras++;
      });
    });
    return { classes, duties, extras };
  };

  const getClassesBySubject = () => {
    const subjects = {};
    Object.values(schedule).forEach(day => {
      day.forEach(cls => {
        if (!cls.type || cls.type === 'class') {
          subjects[cls.subject] = (subjects[cls.subject] || 0) + 1;
        }
      });
    });
    return subjects;
  };

  const stats = getScheduleStats();
  const subjectStats = getClassesBySubject();

  // Handlers
  const canEdit = () => !!teacher?.user_id;

  const handleSave = async (entry) => {
    if (!scheduleService || !teacher?.user_id) {
      alert('You need a teacher profile to add schedule entries');
      return;
    }

    try {
      setLoading(true);
      if (editingEntry?.id) {
        await scheduleService.deleteScheduleClass(editingEntry.id);
      }
      await scheduleService.addScheduleClass(
        entry.day, entry.time, entry.class, entry.subject,
        entry.type || 'class', teacher.user_id
      );
      setRefreshTrigger(prev => prev + 1);
      setShowModal(false);
      setEditingEntry(null);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!entry.id || !window.confirm('Delete this entry?')) return;
    try {
      setLoading(true);
      await scheduleService.deleteScheduleClass(entry.id);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (day, entry, id) => {
    setEditingEntry({ day, entry, id, ...entry });
    setModalType(entry.type || 'class');
    setShowModal(true);
  };

  const openAddModal = (type) => {
    setEditingEntry(null);
    setModalType(type);
    setShowModal(true);
  };

  // Entry styling
  const getEntryStyle = (entry) => {
    const type = entry.type || 'class';
    if (type === 'duty') return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' };
    if (type === 'extracurricular') return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' };
    return { 
      bg: '', 
      border: '', 
      text: '',
      style: { backgroundColor: theme.withAlpha(0.08), borderColor: theme.withAlpha(0.2) }
    };
  };

  const getEntryIcon = (entry) => {
    const type = entry.type || 'class';
    if (type === 'duty') return '🔔';
    if (type === 'extracurricular') return '⭐';
    return '📚';
  };

  // PDF Export with tenant branding
  const exportPDF = async () => {
    try {
      setLoading(true);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.width;

      const logoUrl = branding.logoUrl;
      const schoolName = branding.name || 'School';
      
      const generatePDF = (hasLogo, logoImg) => {
        let startX = 20;
        
        if (hasLogo && logoImg) {
          const logoAspectRatio = logoImg.width / logoImg.height;
          const logoHeight = 12;
          const logoWidth = logoHeight * logoAspectRatio;
          pdf.addImage(logoImg, 'PNG', 20, 12, logoWidth, logoHeight);
          startX = 20 + logoWidth + 5;
        }

        pdf.setFontSize(22);
        pdf.setTextColor(0, 133, 66);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Weekly Timetable', startX, 18);

        pdf.setFontSize(10);
        pdf.setTextColor(107, 114, 128);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${schoolName} • Academic Year 2025-26`, startX, 23);

        const actualTimeSlots = [];
        Object.values(schedule).forEach(day => {
          day.forEach(entry => {
            if (!actualTimeSlots.includes(entry.time)) actualTimeSlots.push(entry.time);
          });
        });
        
        const snackBreak = '10:30 - 10:55';
        const lunchBreakPart1 = '12:30 - 12:50';
        const lunchBreakPart2 = '12:50 - 13:25';

        if (!actualTimeSlots.includes(snackBreak)) actualTimeSlots.push(snackBreak);
        if (!actualTimeSlots.includes(lunchBreakPart1)) actualTimeSlots.push(lunchBreakPart1);
        if (!actualTimeSlots.includes(lunchBreakPart2)) actualTimeSlots.push(lunchBreakPart2);
        actualTimeSlots.sort();

        const tableData = actualTimeSlots.map(time => {
          const row = [time];
          if (time === snackBreak) { DAYS.forEach(() => row.push('SNACK BREAK')); return row; }
          if (time === lunchBreakPart1) { DAYS.forEach(() => row.push('LUNCH')); return row; }
          if (time === lunchBreakPart2) {
            DAYS.forEach(day => {
              const entries = schedule[day]?.filter(e => e.time === time) || [];
              row.push(entries.length > 0 
                ? entries.map(e => e.type === 'duty' ? `DUTY: ${e.subject}` : e.type === 'extracurricular' ? `EXTRA: ${e.subject}` : `${e.class}\n${e.subject}`).join('\n')
                : 'LUNCH');
            });
            return row;
          }
          DAYS.forEach(day => {
            const entries = schedule[day]?.filter(e => e.time === time) || [];
            row.push(entries.length === 0 ? '' : entries.map(e => 
              e.type === 'duty' ? `DUTY: ${e.subject}` : e.type === 'extracurricular' ? `EXTRA: ${e.subject}` : `${e.class}\n${e.subject}`
            ).join('\n'));
          });
          return row;
        });

        const rowCount = tableData.length;
        let fontSize = rowCount > 12 ? 7.5 : rowCount > 10 ? 8 : 9;
        let cellPadding = rowCount > 12 ? 2.5 : rowCount > 10 ? 3 : 3.5;
        const tableWidth = 257;
        const marginLeft = (pageWidth - tableWidth) / 2;

        autoTable(pdf, {
          startY: 30,
          head: [['Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']],
          body: tableData,
          theme: 'grid',
          styles: { fontSize, cellPadding, lineColor: [200, 200, 200], lineWidth: 0.15, overflow: 'linebreak', halign: 'center', valign: 'middle', minCellHeight: 10 },
          headStyles: { fillColor: [0, 133, 66], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 4 },
          columnStyles: { 0: { cellWidth: 27, fillColor: [249, 250, 251], fontStyle: 'bold', fontSize } },
          margin: { left: marginLeft, right: marginLeft, top: 30, bottom: 15 },
          tableWidth,
          didParseCell: function(data) {
            if (data.section === 'body' && data.column.index > 0) {
              const cellText = data.cell.text.join(' ');
              if (cellText === 'SNACK BREAK') { data.cell.styles.fillColor = [255, 237, 213]; data.cell.styles.textColor = [194, 65, 12]; data.cell.styles.fontStyle = 'bold'; }
              else if (cellText === 'LUNCH') { data.cell.styles.fillColor = [254, 226, 226]; data.cell.styles.textColor = [185, 28, 28]; data.cell.styles.fontStyle = 'bold'; }
              else if (cellText.includes('DUTY:')) { data.cell.styles.fillColor = [254, 243, 199]; data.cell.styles.textColor = [146, 64, 14]; }
              else if (cellText.includes('EXTRA:')) { data.cell.styles.fillColor = [237, 233, 254]; data.cell.styles.textColor = [107, 33, 168]; }
              else if (cellText.length > 0) { data.cell.styles.fillColor = [209, 250, 229]; data.cell.styles.textColor = [0, 133, 66]; data.cell.styles.fontStyle = 'bold'; }
            }
          },
          didDrawCell: function(data) {
            if (data.section === 'body' && data.column.index > 0 && data.cell.text.length > 0) {
              const cellText = data.cell.text.join(' ');
              if (cellText === 'SNACK BREAK' || cellText === 'LUNCH') return;
              pdf.setLineWidth(1.5);
              if (cellText.includes('DUTY:')) pdf.setDrawColor(245, 158, 11);
              else if (cellText.includes('EXTRA:')) pdf.setDrawColor(168, 85, 247);
              else if (cellText.length > 0) pdf.setDrawColor(0, 133, 66);
              if (cellText.length > 0) pdf.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
            }
          }
        });

        pdf.save(`${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_Timetable_${new Date().toISOString().split('T')[0]}.pdf`);
        setLoading(false);
      };

      if (logoUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => generatePDF(true, img);
        img.onerror = () => generatePDF(false, null);
        img.src = logoUrl;
      } else {
        generatePDF(false, null);
      }
    } catch (error) {
      console.error('PDF error:', error);
      alert('Failed to generate PDF');
      setLoading(false);
    }
  };

  const showNoTeacherMsg = !teacher?.user_id && profile?.role === 'admin';

  return (
    <div className="space-y-5">
      {/* ═══ TERM BANNER ═══ */}
      {theme.hasActiveTerm && (
        <div 
          className="rounded-xl px-4 py-2.5 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}
        >
          <div className="flex items-center gap-2">
            <TermIcon size={16} style={theme.textStyle} />
            <span className="text-sm font-semibold" style={theme.textStyle}>{theme.name} Term</span>
            <span className="text-xs text-gray-500">
              {new Date(theme.activeTerm.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(theme.activeTerm.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <span className="text-xs font-medium" style={theme.textStyle}>{theme.daysRemaining} days left</span>
        </div>
      )}

      {/* ═══ NO TEACHER MESSAGE ═══ */}
      {showNoTeacherMsg && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 No Teaching Schedule</h3>
          <p className="text-blue-700 text-sm">
            You are logged in as an administrator without a teacher profile.
            To create a schedule, you need to have a teacher account with teaching assignments.
          </p>
          <p className="text-blue-600 text-xs mt-2">
            Visit <strong>Management → Profiles</strong> to manage teacher accounts.
          </p>
        </div>
      )}

      {/* ═══ MAIN CARD ═══ */}
      {!showNoTeacherMsg && (
        <div 
          className="bg-white rounded-2xl shadow-lg p-6 border"
          style={{ borderColor: theme.withAlpha(0.2) }}
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">My Weekly Schedule</h2>
              <p className="text-gray-500 mt-1 text-sm">Manage your teaching schedule</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit() && (
                <>
                  <button onClick={() => openAddModal('class')} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: theme.color }}>
                    <Plus size={18} /> Add Class
                  </button>
                  <button onClick={() => openAddModal('duty')} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-all disabled:opacity-50">
                    <Calendar size={18} /> Add Duty
                  </button>
                  <button onClick={() => openAddModal('extracurricular')} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-purple-500 text-white hover:bg-purple-600 transition-all disabled:opacity-50">
                    <Award size={18} /> Add Extra
                  </button>
                </>
              )}
              <button onClick={exportPDF} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                Export PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-xl p-4 border" style={{ backgroundColor: theme.withAlpha(0.08), borderColor: theme.withAlpha(0.2) }}>
              <p className="text-3xl font-bold" style={{ color: theme.color }}>{stats.classes}</p>
              <p className="text-sm mt-1" style={{ color: theme.color }}>📚 Classes</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-3xl font-bold text-amber-700">{stats.duties}</p>
              <p className="text-sm text-amber-600 mt-1">🔔 Duties</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-3xl font-bold text-purple-700">{stats.extras}</p>
              <p className="text-sm text-purple-600 mt-1">⭐ Extras</p>
            </div>
            {Object.entries(subjectStats).slice(0, 2).map(([subject, count]) => (
              <div key={subject} className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-3xl font-bold text-blue-700">{count}</p>
                <p className="text-sm text-blue-600 mt-1 truncate">{subject}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SCHEDULE BY DAY ═══ */}
      {!showNoTeacherMsg && (
        <div className="space-y-4">
          {DAYS.map(day => (
            <div key={day} className="bg-white rounded-2xl shadow-lg p-6 border" style={{ borderColor: theme.withAlpha(0.15) }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold" style={{ color: theme.color }}>{day}</h3>
                <span className="text-sm px-3 py-1 rounded-full font-medium"
                  style={{ backgroundColor: theme.withAlpha(0.1), color: theme.color }}>
                  {schedule[day]?.length || 0} {schedule[day]?.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {!schedule[day] || schedule[day].length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <Clock size={40} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400 italic">No entries scheduled</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {schedule[day].sort((a, b) => a.time.localeCompare(b.time)).map((entry, idx) => {
                    const entryStyle = getEntryStyle(entry);
                    const isClass = !entry.type || entry.type === 'class';
                    return (
                      <div key={entry.id || idx}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:shadow-sm ${entryStyle.bg} ${entryStyle.border}`}
                        style={isClass ? entryStyle.style : {}}>
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-2xl">{getEntryIcon(entry)}</span>
                          <span className={`text-sm font-bold w-28 ${isClass ? '' : entryStyle.text}`} style={isClass ? { color: theme.color } : {}}>
                            {entry.time}
                          </span>
                          <div className="flex items-center gap-3">
                            {isClass && (
                              <span className="font-semibold bg-white px-3 py-1 rounded-lg text-sm" style={{ color: theme.color }}>
                                {entry.class}
                              </span>
                            )}
                            <span className="text-gray-700 font-medium">{entry.subject}</span>
                            {entry.type && entry.type !== 'class' && (
                              <span className={`text-xs bg-white px-2 py-1 rounded capitalize ${entryStyle.text}`}>{entry.type}</span>
                            )}
                          </div>
                        </div>
                        {canEdit() && (
                          <div className="flex gap-1">
                            <button onClick={() => handleEdit(day, entry, entry.id)} disabled={loading}
                              className="p-2 rounded-lg text-gray-400 hover:bg-white hover:text-gray-600 transition-colors disabled:opacity-50">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(entry)} disabled={loading}
                              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ScheduleModal
          onClose={() => { setShowModal(false); setEditingEntry(null); setModalType('class'); }}
          onSave={handleSave}
          existingSchedule={editingEntry}
          days={DAYS}
          modalType={modalType}
        />
      )}
    </div>
  );
};

export default SchedulePage;