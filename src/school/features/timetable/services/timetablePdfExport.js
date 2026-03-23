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

  // Header bar
  const headerTopY = 8;
  doc.setFillColor(...headerRgb);
  doc.rect(0, 0, W, 28, 'F');

  if (logoData) {
    const maxH = 18;
    const ratio = logoData.width / logoData.height;
    const logoW = Math.min(maxH * ratio, 40);
    doc.addImage(logoData.data, 'PNG', 10, (28 - maxH) / 2, logoW, maxH);
  }
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(schoolName, W / 2, headerTopY + 6, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 240, 228);
  doc.text(subtitle, W / 2, headerTopY + 14, { align: 'center' });

  const tableStartY = 32;
  const sortedSlots = [...timeSlots].sort((a, b) => a.slot_number - b.slot_number);

  // Build lookup — double-period entries appear in both their slot and the next slot
  const lookup = {};
  DAYS.forEach(d => {
    lookup[d] = {};
    sortedSlots.forEach(s => { lookup[d][s.slot_number] = []; });
  });
  entries.forEach(e => {
    if (lookup[e.day_of_week]?.[e.slot_number] !== undefined) {
      lookup[e.day_of_week][e.slot_number].push(e);
    }
    // For double periods, also populate the next slot so both rows show the class
    if (e.is_double) {
      const nextSlotNum = e.slot_number + 1;
      if (lookup[e.day_of_week]?.[nextSlotNum] !== undefined) {
        lookup[e.day_of_week][nextSlotNum].push(e);
      }
    }
  });

  const head = [['Period / Time', ...DAY_NAMES]];
  const body = sortedSlots.map(slot => {
    const periodLabel =
      `${slot.label || `Period ${slot.slot_number}`}\n` +
      `${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}`;
    const row = [periodLabel];
    DAYS.forEach(day => {
      // Deduplicate by entry id so a double entry doesn't appear twice in the same slot
      const seen = new Set();
      const cellEntries = (lookup[day][slot.slot_number] || []).filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
      if (cellEntries.length === 0) {
        row.push('');
      } else {
        const lines = cellEntries.map(e => {
          const teacherName = e.teacher?.full_name || '';
          if (filterType === 'class') return `${e.subject}\n${teacherName}`;
          if (filterType === 'teacher') return `${e.class_name} • ${e.subject}`;
          return `${e.class_name}: ${e.subject}\n${teacherName}`;
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
      fontSize: 9,
      halign: 'center',
      cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: { top: 5, right: 5, bottom: 5, left: 5 },
      valign: 'middle',
      textColor: [25, 25, 25],
      lineColor: [210, 220, 210],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 34, fontStyle: 'bold', halign: 'center', fillColor: [230, 245, 235] },
      1: { halign: 'center', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 'auto' },
      3: { halign: 'center', cellWidth: 'auto' },
      4: { halign: 'center', cellWidth: 'auto' },
      5: { halign: 'center', cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: [248, 252, 249] },
    margin: { left: 12, right: 12, top: tableStartY },
    tableWidth: W - 24,
    didParseCell(data) {
      // Period column — soft green tint
      if (data.column.index === 0 && data.section === 'body') {
        data.cell.styles.fillColor = [220, 242, 229];
        data.cell.styles.textColor = [20, 90, 50];
      }
      // Empty cells — very light grey
      if (data.section === 'body' && data.column.index > 0 && !data.cell.text?.join('').trim()) {
        data.cell.styles.fillColor = [245, 245, 245];
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
