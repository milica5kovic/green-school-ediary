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

// Same palette + hash as the app's timetable chips, so PDF colors match the UI
const SUBJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  '#f97316', '#84cc16',
];
function subjectColorRgb(subject = '') {
  let hash = 0;
  for (const c of subject) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return hexToRgb(SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length]);
}
// Soften a color toward white for cell backgrounds
const pastel = (rgb, strength = 0.15) => rgb.map(v => Math.round(v * strength + 255 * (1 - strength)));

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
function renderTimetablePage(doc, {
  entries, timeSlots, schoolName, logoData, primaryColor,
  subtitle, perspective, teachers,
}) {
  const W = doc.internal.pageSize.getWidth();   // 297mm (landscape)
  const H = doc.internal.pageSize.getHeight();  // 210mm (landscape)
  const headerRgb = hexToRgb(primaryColor);

  // ---- Banner header: full-width colored strip ----
  const BANNER_H = 24;
  doc.setFillColor(...headerRgb);
  doc.rect(0, 0, W, BANNER_H, 'F');
  // subtle darker accent line under the banner
  doc.setFillColor(...headerRgb.map(v => Math.round(v * 0.75)));
  doc.rect(0, BANNER_H, W, 1.2, 'F');

  if (logoData) {
    const maxH = 16;
    const ratio = logoData.width / logoData.height;
    const logoW = Math.min(maxH * ratio, 36);
    // white card behind the logo so it pops on the colored banner
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(8, 3.5, logoW + 5, maxH + 3, 2, 2, 'F');
    doc.addImage(logoData.data, 'PNG', 10.5, 5, logoW, maxH);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text(schoolName, W / 2, 10.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.5);
  doc.text(subtitle, W / 2, 18.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`School year 2026-27`, W - 8, 8, { align: 'right' });

  const tableStartY = BANNER_H + 4;

  // ---- Build table ----
  const sortedSlots = [...timeSlots].sort((a, b) => a.slot_number - b.slot_number);
  const teacherMap = teachers.reduce((acc, t) => { acc[t.id] = t; return acc; }, {});

  // Entries starting at each (day, slot)
  const direct = {};
  DAYS.forEach(d => {
    direct[d] = {};
    sortedSlots.forEach(s => { direct[d][s.slot_number] = []; });
  });
  entries.forEach(e => {
    if (direct[e.day_of_week]?.[e.slot_number] !== undefined) {
      direct[e.day_of_week][e.slot_number].push(e);
    }
  });

  const cellText = (e) => {
    const teacherName =
      e.teacher?.full_name || teacherMap[e.teacher_id]?.full_name || '';
    if (perspective === 'class') return `${e.subject}\n${teacherName}`;
    if (perspective === 'teacher') return `${e.subject}\n${e.class_name}`;
    return `${e.class_name} — ${e.subject}`;
  };

  const head = [['Period', ...DAY_NAMES]];

  // Double periods fill BOTH rows: a pure-double cell merges over the
  // next period row (rowSpan 2) — no more "×2" markers.
  const skip = {};
  DAYS.forEach(d => { skip[d] = new Set(); });

  const body = sortedSlots.map((slot, si) => {
    const row = [{
      content:
        `${slot.label || `Period ${slot.slot_number}`}\n` +
        `${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}`,
      _period: true,
    }];

    DAYS.forEach(day => {
      if (skip[day].has(slot.slot_number)) return; // covered by a rowSpan above

      const startsHere = direct[day][slot.slot_number] || [];
      const prevSlot = si > 0 ? sortedSlots[si - 1] : null;
      const carried = prevSlot && prevSlot.slot_number === slot.slot_number - 1 && !skip[day].has(prevSlot.slot_number)
        ? (direct[day][prevSlot.slot_number] || []).filter(e => e.is_double)
        : [];
      const cellEntries = [...carried, ...startsHere];

      if (cellEntries.length === 0) {
        row.push({ content: '', _empty: true });
        return;
      }

      const nextSlot = sortedSlots[si + 1];
      const nextAdjacent = nextSlot && nextSlot.slot_number === slot.slot_number + 1;
      const canMerge =
        carried.length === 0 &&
        startsHere.every(e => e.is_double) &&
        nextAdjacent &&
        (direct[day][nextSlot.slot_number] || []).length === 0;

      const cell = {
        content: [...new Set(cellEntries.map(cellText))].join('\n\n'),
        _subject: cellEntries[0].subject,
      };
      if (canMerge) {
        cell.rowSpan = 2;
        skip[day].add(nextSlot.slot_number);
      }
      row.push(cell);
    });
    return row;
  });

  // Stretch the table to fill the whole page height
  const footerSpace = 8;
  const headH = 9;
  const rowH = (H - tableStartY - footerSpace - headH) / sortedSlots.length;

  autoTable(doc, {
    head,
    body,
    startY: tableStartY,
    theme: 'grid',
    styles: {
      lineColor: [255, 255, 255],
      lineWidth: 0.7,
    },
    headStyles: {
      fillColor: headerRgb,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9.5,
      halign: 'center',
      valign: 'middle',
      minCellHeight: headH,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 },
      valign: 'middle',
      halign: 'center',
      textColor: [35, 45, 40],
      minCellHeight: rowH,
    },
    columnStyles: (() => {
      const dayW = (W - 16 - 34) / 5; // equal width for all five days
      const cols = { 0: { cellWidth: 34 } };
      for (let i = 1; i <= 5; i++) cols[i] = { cellWidth: dayW, halign: 'center' };
      return cols;
    })(),
    margin: { left: 8, right: 8, top: tableStartY, bottom: footerSpace },
    tableWidth: W - 16,
    didParseCell(data) {
      if (data.section !== 'body') return;
      const raw = data.cell.raw;
      if (raw && raw._period) {
        data.cell.styles.fillColor = pastel(headerRgb, 0.22);
        data.cell.styles.textColor = headerRgb.map(v => Math.round(v * 0.55));
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 9;
      } else if (raw && raw._subject) {
        data.cell.styles.fillColor = pastel(subjectColorRgb(raw._subject));
        data.cell.styles.fontStyle = 'bold';
      } else if (raw && raw._empty) {
        data.cell.styles.fillColor = [248, 249, 250];
      }
    },
  });
}

function addFooter(doc, schoolName) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const pageCount = doc.internal.getNumberOfPages();
  const dateStr = new Date().toLocaleDateString('en-GB');
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(170, 170, 170);
    doc.text(`${schoolName} — generated ${dateStr}`, W / 2, H - 3.5, { align: 'center' });
    doc.text(`${i}/${pageCount}`, W - 8, H - 3.5, { align: 'right' });
  }
}

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
  const logoData = await loadImageBase64(logoUrl);

  let subtitle = 'School Timetable';
  if (filterType === 'class' && filterValue) subtitle = `Class Timetable — ${filterValue}`;
  if (filterType === 'teacher' && filterValue) subtitle = `Teacher Timetable — ${filterValue}`;

  // Only the filtered lessons belong on the page
  const teacherNameOf = (e) =>
    e.teacher?.full_name || teachers.find(t => t.id === e.teacher_id)?.full_name || '';
  let pageEntries = entries;
  if (filterType === 'class' && filterValue) {
    pageEntries = entries.filter(e => e.class_name === filterValue);
  } else if (filterType === 'teacher' && filterValue) {
    pageEntries = entries.filter(e => teacherNameOf(e) === filterValue);
  }

  renderTimetablePage(doc, {
    entries: pageEntries, timeSlots, schoolName, logoData, primaryColor,
    subtitle, perspective: filterType, teachers,
  });

  addFooter(doc, schoolName);

  const safeName = filterValue?.replace(/\s+/g, '-') || '';
  const filename =
    filterType === 'class'   ? `timetable-class-${safeName}.pdf` :
    filterType === 'teacher' ? `timetable-teacher-${safeName}.pdf` :
                               `timetable-all.pdf`;

  doc.save(filename);
}

/**
 * Export a timetable BOOK — one page per class (for students/parents)
 * or one page per teacher — in a single PDF.
 *
 * @param {Object} opts
 * @param {'classes'|'teachers'} opts.mode
 * @param {Array}  opts.entries    - timetable_entries (with .teacher nested)
 * @param {Array}  opts.timeSlots
 * @param {Array}  opts.classes    - class names (for mode 'classes')
 * @param {Array}  opts.teachers   - teacher rows (for lookup + mode 'teachers')
 * @param {string} opts.schoolName
 * @param {string} opts.logoUrl
 * @param {string} opts.primaryColor
 */
export async function exportTimetableBookPDF({
  mode = 'classes',
  entries = [],
  timeSlots = [],
  classes = [],
  teachers = [],
  schoolName = 'School',
  logoUrl = null,
  primaryColor = '#22c55e',
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logoData = await loadImageBase64(logoUrl);

  const pages = mode === 'classes'
    ? [...classes].sort().map(c => ({
        subtitle: `Class Timetable — ${c}`,
        perspective: 'class',
        entries: entries.filter(e => e.class_name === c),
      }))
    : [...teachers]
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
        .map(t => ({
          subtitle: `Teacher Timetable — ${t.full_name}`,
          perspective: 'teacher',
          entries: entries.filter(e => e.teacher_id === t.id),
        }))
        // skip teachers with no lessons — no point printing empty grids
        .filter(p => p.entries.length > 0);

  if (pages.length === 0) return;

  pages.forEach((page, idx) => {
    if (idx > 0) doc.addPage();
    renderTimetablePage(doc, {
      entries: page.entries,
      timeSlots, schoolName, logoData, primaryColor,
      subtitle: page.subtitle,
      perspective: page.perspective,
      teachers,
    });
  });

  addFooter(doc, schoolName);
  doc.save(mode === 'classes' ? 'timetables-all-classes.pdf' : 'timetables-all-teachers.pdf');
}
