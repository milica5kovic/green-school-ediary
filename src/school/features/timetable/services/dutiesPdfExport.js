// ============================================================
// DUTIES PDF EXPORT — Landscape A4 duty timetable
// ============================================================
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const DUTY_COLORS = {
  arrival:         [99,  102, 241],   // indigo
  welcome:         [16,  185, 129],   // green
  snack:           [245, 158, 11],    // amber
  lunch:           [59,  130, 246],   // blue
  extracurricular: [139, 92,  246],   // violet
  pickup:          [236, 72,  153],   // pink
};

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [34, 120, 80];
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
 * Export a "Duties" landscape A4 PDF.
 *
 * @param {Object} opts
 * @param {Array}  opts.dutySlots       - duty_slots rows (sorted by sort_order)
 * @param {Array}  opts.assignments     - duty_assignments rows (with .teacher nested)
 * @param {string} opts.schoolName
 * @param {string} opts.logoUrl
 * @param {string} opts.primaryColor    - hex
 */
export async function exportDutiesPDF({
  dutySlots = [],
  assignments = [],
  schoolName = 'School',
  logoUrl = null,
  primaryColor = '#22c55e',
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 297mm
  const H = doc.internal.pageSize.getHeight();  // 210mm
  const headerRgb = hexToRgb(primaryColor);

  // ── Header ────────────────────────────────────────────────
  const logoData = await loadImageBase64(logoUrl);
  if (logoData) {
    const maxH = 16;
    const ratio = logoData.width / logoData.height;
    const logoW = Math.min(maxH * ratio, 36);
    doc.addImage(logoData.data, 'PNG', 12, 8, logoW, maxH);
  }

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(schoolName, W / 2, 14, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Staff Duty Timetable', W / 2, 21, { align: 'center' });

  const tableStartY = 28;

  // ── Build table ───────────────────────────────────────────
  // Build lookup: { [slotId]: { [day]: names[] } }
  const lookup = {};
  for (const a of assignments) {
    if (!lookup[a.duty_slot_id]) lookup[a.duty_slot_id] = {};
    if (!lookup[a.duty_slot_id][a.day_of_week]) lookup[a.duty_slot_id][a.day_of_week] = [];
    const name = a.teacher?.full_name || 'Unknown';
    lookup[a.duty_slot_id][a.day_of_week].push(name.replace(/^(Ms?\.|Mr\.) /, ''));
  }

  const head = [['Duty / Time', ...DAY_NAMES]];

  const body = dutySlots.map(slot => {
    const timeLabel = `${slot.name}\n${slot.start_time?.slice(0, 5)} – ${slot.end_time?.slice(0, 5)}`;
    const row = [timeLabel];
    for (let d = 0; d < 5; d++) {
      const names = lookup[slot.id]?.[d] || [];
      const needed = slot.required_count || 0;
      let cell = names.join('\n');
      if (needed > 0 && names.length < needed) {
        cell += (cell ? '\n' : '') + `(${needed - names.length} more needed)`;
      }
      row.push(cell || '—');
    }
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
      fontSize: 7.5,
      cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
      valign: 'top',
      textColor: [30, 30, 30],
    },
    columnStyles: {
      0: {
        cellWidth: 38,
        fontStyle: 'bold',
        halign: 'left',
        fillColor: [248, 248, 248],
      },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    margin: { left: 12, right: 12, top: tableStartY },
    tableWidth: W - 24,
    didParseCell(data) {
      if (data.section !== 'body' || data.column.index === 0) return;

      // Color each duty row based on its type
      const slot = dutySlots[data.row.index];
      if (!slot) return;
      const rgb = DUTY_COLORS[slot.duty_type];
      if (rgb) {
        data.cell.styles.fillColor = [
          Math.round(rgb[0] * 0.08 + 255 * 0.92),
          Math.round(rgb[1] * 0.08 + 255 * 0.92),
          Math.round(rgb[2] * 0.08 + 255 * 0.92),
        ];
      }

      // Highlight cells that are under-staffed
      const dayIndex = data.column.index - 1;
      const assigned = lookup[slot.id]?.[dayIndex]?.length || 0;
      if (slot.required_count > 0 && assigned < slot.required_count) {
        data.cell.styles.textColor = [180, 100, 0];
      }
    },
    didParseCell_head(data) {
      // Row label gets the duty color
      if (data.section === 'body' && data.column.index === 0) {
        const slot = dutySlots[data.row.index];
        const rgb = DUTY_COLORS[slot?.duty_type];
        if (rgb) data.cell.styles.fillColor = [
          Math.round(rgb[0] * 0.15 + 255 * 0.85),
          Math.round(rgb[1] * 0.15 + 255 * 0.85),
          Math.round(rgb[2] * 0.15 + 255 * 0.85),
        ];
      }
    },
  });

  // ── Footer ────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(190, 190, 190);
    doc.text(`${schoolName}  ·  Staff Duties`, W / 2, H - 5, { align: 'center' });
  }

  doc.save('duties-timetable.pdf');
}
