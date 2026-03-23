// ============================================================
// TIMETABLE PDF EXPORT — Landscape A4, multi-page support
// ============================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAYS = [0, 1, 2, 3, 4];

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [34, 120, 80];
}

async function loadImageBase64(imageUrl) {
  if (!imageUrl) return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    return new Promise(resolve => {
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          resolve({ data: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      const sep = imageUrl.includes('?') ? '&' : '?';
      img.src = `${imageUrl}${sep}t=${Date.now()}`;
    });
  } catch { return null; }
}

/**
 * Render one timetable page (header + table) into an existing jsPDF document.
 */
function renderTimetablePage(doc, { entries, timeSlots, schoolName, logoData, primaryColor, subtitle, filterType }) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const headerRgb = hexToRgb(primaryColor);

  // Header
  const headerTopY = 10;
  if (logoData) {
    const maxH = 18;
    const ratio = logoData.width / logoData.height;
    const logoW = Math.min(maxH * ratio, 40);
    doc.addImage(logoData.data, 'PNG', 10, 8, logoW, maxH);
  }
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(schoolName, W / 2, headerTopY + 6, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(subtitle, W / 2, headerTopY + 13, { align: 'center' });

  const tableStartY = headerTopY + 20;
  const sortedSlots = [...timeSlots].sort((a, b) => a.slot_number - b.slot_number);

  // Build lookup
  const lookup = {};
  DAYS.forEach(d => {
    lookup[d] = {};
    sortedSlots.forEach(s => { lookup[d][s.slot_number] = []; });
  });
  entries.forEach(e => {
    if (lookup[e.day_of_week]?.[e.slot_number] !== undefined) {
      lookup[e.day_of_week][e.slot_number].push(e);
    }
  });

  const head = [['Period / Time', ...DAY_NAMES]];
  const body = sortedSlots.map(slot => {
    const periodLabel =
      `${slot.label || `Period ${slot.slot_number}`}\n` +
      `${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}`;
    const row = [periodLabel];
    DAYS.forEach(day => {
      const cellEntries = lookup[day][slot.slot_number] || [];
      if (cellEntries.length === 0) {
        row.push('');
      } else {
        const lines = cellEntries.map(e => {
          const teacherName = e.teacher?.full_name || '';
          const dbl = e.is_double ? ' ×2' : '';
          if (filterType === 'class') return `${e.subject}${dbl}\n${teacherName}`;
          if (filterType === 'teacher') return `${e.class_name} • ${e.subject}${dbl}`;
          return `${e.class_name}: ${e.subject}${dbl}\n${teacherName}`;
        });
        row.push(lines.join('\n'));
      }
    });
    return row;
  });

  autoTable(doc, {
    head,
    body,
    startY: tableStartY,
    theme: 'grid',
    headStyles: {
      fillColor: headerRgb,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      valign: 'middle',
      textColor: [30, 30, 30],
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold', halign: 'center', fillColor: [245, 247, 245] },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    alternateRowStyles: { fillColor: [250, 253, 250] },
    margin: { left: 12, right: 12, top: tableStartY },
    tableWidth: W - 24,
    didParseCell(data) {
      if (data.column.index === 0 && data.section === 'body') {
        data.cell.styles.fillColor = [238, 248, 242];
      }
    },
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(190, 190, 190);
  doc.text(`${schoolName}  ·  Green School Ediary`, W / 2, H - 5, { align: 'center' });
}

/**
 * Export timetable to PDF.
 *
 * filterType: 'class' | 'teacher' | 'all'
 * filterValue: specific class name or teacher ID, or '' for all
 *
 * When filterValue is '' (showing all), generates one page per class or teacher.
 * When filterValue is set, generates a single page for that entity.
 */
export async function exportTimetablePDF({
  entries = [],
  timeSlots = [],
  schoolName = 'School',
  logoUrl = null,
  primaryColor = '#22c55e',
  filterType = 'all',
  filterValue = '',
  teachers = [],
  classes = [],
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logoData = await loadImageBase64(logoUrl);
  const teacherMap = teachers.reduce((acc, t) => { acc[t.id] = t; return acc; }, {});

  // Build the list of "pages" to render
  let pages = [];

  if (filterType === 'teacher' && filterValue) {
    // Single teacher
    const teacher = teacherMap[filterValue];
    pages = [{
      entries: entries.filter(e => e.teacher_id === filterValue),
      subtitle: `Teacher Timetable — ${teacher?.full_name || filterValue}`,
    }];
  } else if (filterType === 'teacher' && !filterValue) {
    // All teachers — one page each
    pages = [...teachers]
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
      .map(t => ({
        entries: entries.filter(e => e.teacher_id === t.id),
        subtitle: `Teacher Timetable — ${t.full_name}`,
      }))
      .filter(p => p.entries.length > 0);
  } else if (filterType === 'class' && filterValue) {
    // Single class
    pages = [{
      entries: entries.filter(e => e.class_name === filterValue),
      subtitle: `Class Timetable — ${filterValue}`,
    }];
  } else if (filterType === 'class' && !filterValue) {
    // All classes — one page each
    const sortedClasses = [...classes].sort();
    pages = sortedClasses
      .map(c => ({
        entries: entries.filter(e => e.class_name === c),
        subtitle: `Class Timetable — ${c}`,
      }))
      .filter(p => p.entries.length > 0);
  } else {
    // 'all' — single overview page
    pages = [{ entries, subtitle: 'Complete School Timetable' }];
  }

  if (pages.length === 0) {
    pages = [{ entries: [], subtitle: 'No timetable data found' }];
  }

  // Render pages
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) doc.addPage();
    renderTimetablePage(doc, {
      entries: pages[i].entries,
      timeSlots,
      schoolName,
      logoData,
      primaryColor,
      subtitle: pages[i].subtitle,
      filterType,
    });
  }

  // Add page numbers if multiple pages
  if (pages.length > 1) {
    const totalPages = doc.internal.getNumberOfPages();
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(190, 190, 190);
      doc.text(`Page ${i} of ${totalPages}`, W - 15, H - 5, { align: 'right' });
    }
  }

  // Save
  const safeName = filterValue?.replace(/\s+/g, '-') || 'all';
  const filename =
    filterType === 'class'   ? `timetable-class-${safeName}.pdf` :
    filterType === 'teacher' ? `timetable-teacher-${safeName}.pdf` :
                               `timetable-all.pdf`;
  doc.save(filename);
}
