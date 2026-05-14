// ============================================================
// TIMETABLE PDF EXPORT — Landscape A4 with school logo
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
 * Export timetable to a portrait PDF.
 *
 * @param {Object} opts
 * @param {Array}  opts.entries       - timetable_entries (with .teacher nested)
 * @param {Array}  opts.timeSlots     - time_slots (sorted)
 * @param {string} opts.schoolName
 * @param {string} opts.logoUrl
 * @param {string} opts.primaryColor  - hex color for table header
 * @param {'all'|'class'|'teacher'} opts.filterType
 * @param {string} opts.filterValue   - class name or teacher name
 * @param {Array}  opts.teachers      - all teachers (for name lookup)
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
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 297mm (landscape)
  const H = doc.internal.pageSize.getHeight();  // 210mm (landscape)
  const headerRgb = hexToRgb(primaryColor);

  // ---- Header ----
  let headerTopY = 10;

  const logoData = await loadImageBase64(logoUrl);
  if (logoData) {
    const maxH = 18;
    const ratio = logoData.width / logoData.height;
    const logoW = Math.min(maxH * ratio, 40);
    doc.addImage(logoData.data, 'PNG', 10, 8, logoW, maxH);
  }

  // School name — centered
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(schoolName, W / 2, headerTopY + 6, { align: 'center' });

  // Subtitle
  let subtitle = 'School Timetable';
  if (filterType === 'class' && filterValue) subtitle = `Class Timetable — ${filterValue}`;
  if (filterType === 'teacher' && filterValue) subtitle = `Teacher Timetable — ${filterValue}`;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(subtitle, W / 2, headerTopY + 13, { align: 'center' });

  const tableStartY = headerTopY + 20;

  // ---- Build table ----
  const sortedSlots = [...timeSlots].sort((a, b) => a.slot_number - b.slot_number);
  const teacherMap = teachers.reduce((acc, t) => { acc[t.id] = t; return acc; }, {});

  // Lookup: lookup[day][slot_number] = array of entries
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
          const teacherName =
            e.teacher?.full_name || teacherMap[e.teacher_id]?.full_name || '';
          const doubleMarker = e.is_double ? ' ×2' : '';
          if (filterType === 'class') return `${e.subject}${doubleMarker}\n${teacherName}`;
          if (filterType === 'teacher') return `${e.class_name} • ${e.subject}${doubleMarker}`;
          return `${e.class_name}: ${e.subject}${doubleMarker}`;
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
      0: {
        cellWidth: 32,
        fontStyle: 'bold',
        halign: 'center',
        fillColor: [245, 247, 245],
      },
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

  // ---- Footer ----
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(190, 190, 190);
    doc.text(schoolName, W / 2, H - 5, { align: 'center' });
  }

  // ---- Save ----
  const safeName = filterValue?.replace(/\s+/g, '-') || '';
  const filename =
    filterType === 'class'   ? `timetable-class-${safeName}.pdf` :
    filterType === 'teacher' ? `timetable-teacher-${safeName}.pdf` :
                               `timetable-all.pdf`;

  doc.save(filename);
}
