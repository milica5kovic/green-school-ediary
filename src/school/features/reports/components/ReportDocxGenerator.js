// ============================================================================
// REPORT DOCX GENERATOR — matches Green School / Cambridge template exactly
// ============================================================================

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, VerticalAlign, ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { getReportType, getYearFromClassName, PSD_SCALE } from '../services/reportsService';

// ── Page geometry (A4) ────────────────────────────────────────────────────
const PAGE_W  = 11906;
const MARGIN  = 720;
const CONTENT = PAGE_W - MARGIN * 2; // 10466 DXA ≈ 18.3 cm

// ── Colours ───────────────────────────────────────────────────────────────
const GREEN  = '5a9e4b';
const DARK   = '1a1a1a';
const GREY   = '666666';
const LGREY  = 'f5f5f5';

// ── Border helpers ────────────────────────────────────────────────────────
const B_THIN  = { style: BorderStyle.SINGLE, size: 4, color: 'cccccc' };
const B_NIL   = { style: BorderStyle.NIL,    size: 0, color: 'auto'  };
const BORDERS      = { top: B_THIN, bottom: B_THIN, left: B_THIN, right: B_THIN };
const BORDERS_NONE = { top: B_NIL, bottom: B_NIL, left: B_NIL, right: B_NIL };
const TABLE_NO_BORDERS = { top: B_NIL, bottom: B_NIL, left: B_NIL, right: B_NIL, insideH: B_NIL, insideV: B_NIL };

// ── Text helpers (Calibri = primary, Arial = secondary) ───────────────────
const r   = (text, o = {}) => new TextRun({ text: String(text ?? ''), font: 'Calibri', size: 20, ...o });
const rb  = (text, o = {}) => r(text,  { bold: true, ...o });
const ri  = (text, o = {}) => r(text,  { italics: true, color: GREY, ...o });
// Arial variants for secondary
const ra  = (text, o = {}) => new TextRun({ text: String(text ?? ''), font: 'Arial', size: 20, ...o });
const rba = (text, o = {}) => ra(text, { bold: true, ...o });
const ria = (text, o = {}) => ra(text, { italics: true, color: GREY, ...o });

const para = (children, o = {}) =>
  new Paragraph({ children: Array.isArray(children) ? children : [r(children)], spacing: { after: 60 }, ...o });

const emptyLine = (after = 120) => new Paragraph({ children: [r('')], spacing: { after } });

// ── Table cell helper ─────────────────────────────────────────────────────
const cell = (content, { w, shaded, bold: b, rowSpan, colSpan, borders = BORDERS, vAlign, fontSize } = {}) => {
  const fs = fontSize || 18;
  const paras = Array.isArray(content)
    ? content
    : [new Paragraph({ children: [b ? rb(content, { size: fs }) : r(content, { size: fs })], spacing: { after: 60 } })];
  return new TableCell({
    children: paras,
    borders,
    shading: shaded ? { type: ShadingType.CLEAR, fill: LGREY } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: vAlign ?? VerticalAlign.TOP,
    ...(w       ? { width: { size: w, type: WidthType.DXA } } : {}),
    ...(rowSpan ? { rowSpan }  : {}),
    ...(colSpan ? { columnSpan: colSpan } : {}),
  });
};

// ── Asset loader ──────────────────────────────────────────────────────────
async function loadAsset(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch { return null; }
}

async function loadAllAssets() {
  const [gsLogo, divLine, cambLogo] = await Promise.all([
    loadAsset('/report-assets/image1.png'),  // Green School logo
    loadAsset('/report-assets/image2.png'),  // Decorative line
    loadAsset('/report-assets/image5.png'),  // Cambridge logo
  ]);
  return { gsLogo, divLine, cambLogo };
}

// ── Header block (shared by both templates) ───────────────────────────────
// Layout matches the real template:
//   Row 1: GS logo centred (full width)
//   Row 2: [Website + E-mail | Address + Phone | Cambridge logo]
//   Row 3: Decorative line full width
function buildHeader({ gsLogo, divLine, cambLogo, schoolInfo }) {
  const blocks = [];
  const { website, email, address, phone } = schoolInfo || {};

  // Logo pixel sizes computed from exact image dimensions:
  // GS logo:   1500×843  → ratio 1.78  → display at 160×90
  // Cambridge: 2048×893  → ratio 2.29  → display at 120×52
  // Div line:  2048×133  → ratio 15.40 → display at 688×45

  // ── Row 1: GS logo centred ──────────────────────────────────────────────
  if (gsLogo) {
    blocks.push(new Paragraph({
      children: [new ImageRun({ type: 'png', data: gsLogo, transformation: { width: 200, height: 112 }, altText: { title: 'Green School', description: 'Green School logo', name: 'gslogo' } })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }));
  } else {
    blocks.push(new Paragraph({
      children: [rb('Green School by Chartwell', { size: 26, color: GREEN })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }));
  }

  // ── Row 2: contact (left+middle) + Cambridge logo (right) ───────────────
  // No borders, more left padding on contact cells
  const C1 = Math.floor(CONTENT * 0.33);
  const C2 = Math.floor(CONTENT * 0.33);
  const C3 = CONTENT - C1 - C2;

  const cambCell = cambLogo
    ? [new Paragraph({ children: [new ImageRun({ type: 'png', data: cambLogo, transformation: { width: 120, height: 52 }, altText: { title: 'Cambridge', description: 'Cambridge logo', name: 'camblogo' } })], alignment: AlignmentType.RIGHT, spacing: { after: 0 } })]
    : [para([r('Cambridge International Education', { size: 14, color: GREY })], { alignment: AlignmentType.RIGHT })];

  const contactCellOpts = { borders: BORDERS_NONE, vAlign: VerticalAlign.CENTER };
  blocks.push(new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [C1, C2, C3],
    borders: TABLE_NO_BORDERS,
    rows: [new TableRow({ children: [
      new TableCell({
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Website: ' + (website || ''), font: 'Arial', size: 16 })], alignment: AlignmentType.RIGHT, spacing: { after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: 'E-mail: '  + (email   || ''), font: 'Arial', size: 16 })], alignment: AlignmentType.RIGHT, spacing: { after: 0  } }),
        ],
        borders: BORDERS_NONE,
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        verticalAlign: VerticalAlign.CENTER,
        width: { size: C1, type: WidthType.DXA },
      }),
      new TableCell({
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Address: ' + (address || ''), font: 'Arial', size: 16 })], alignment: AlignmentType.RIGHT, spacing: { after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: 'Phone: '   + (phone   || ''), font: 'Arial', size: 16 })], alignment: AlignmentType.RIGHT, spacing: { after: 0  } }),
        ],
        borders: BORDERS_NONE,
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        verticalAlign: VerticalAlign.CENTER,
        width: { size: C2, type: WidthType.DXA },
      }),
      new TableCell({
        children: cambCell,
        borders: BORDERS_NONE,
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        verticalAlign: VerticalAlign.CENTER,
        width: { size: C3, type: WidthType.DXA },
      }),
    ]})],
  }));

  // ── Row 3: decorative line immediately after contact row ─────────────────
  if (divLine) {
    blocks.push(new Paragraph({
      children: [new ImageRun({ type: 'png', data: divLine, transformation: { width: 688, height: 45 }, altText: { title: 'line', description: 'decorative line', name: 'divline' } })],
      spacing: { before: 60, after: 220 },
    }));
  } else {
    blocks.push(new Paragraph({
      children: [r('')],
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 1 } },
      spacing: { after: 220 },
    }));
  }

  return blocks;
}

// ── PRIMARY report ─────────────────────────────────────────────────────────
// Layout: header → title → student info → PSD grid → grades table → comments
function buildPrimaryDoc({ student, entries, meta, psdStmts, period, classTeacherName, assets, schoolInfo }) {
  const children = [...buildHeader({ ...assets, schoolInfo })];
  const reportLabel = period.type === 'mid_year' ? 'MID-YEAR REPORT' : 'END OF THE YEAR REPORT';

  // Title
  children.push(new Paragraph({
    children: [
      rb(reportLabel + '   ', { size: 28, color: DARK }),
      rb(`SCHOOL YEAR ${period.school_year}`, { size: 28, color: GREEN }),
    ],
    spacing: { after: 200 },
  }));

  // Student info table
  const IW = [2600, CONTENT - 2600];
  children.push(new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: IW,
    rows: [
      new TableRow({ children: [cell('Student', { shaded: true, bold: true, w: IW[0] }), cell(student.name || '—', { w: IW[1] })] }),
      new TableRow({ children: [cell('Class',   { shaded: true, bold: true, w: IW[0] }), cell(student.class_name || '—', { w: IW[1] })] }),
      new TableRow({ children: [cell('Class Teacher', { shaded: true, bold: true, w: IW[0] }), cell(classTeacherName || '—', { w: IW[1] })] }),
      new TableRow({ children: [cell(`Days Absent / ${period.absences_total_days || '—'}`, { shaded: true, bold: true, w: IW[0] }), cell(String(meta?.days_absent ?? '—'), { w: IW[1] })] }),
      new TableRow({ children: [cell('Late Arrivals', { shaded: true, bold: true, w: IW[0] }), cell(String(meta?.late_arrivals ?? '—'), { w: IW[1] })] }),
    ],
  }));
  children.push(emptyLine(160));

  // PSD grid
  if (psdStmts.length > 0) {
    children.push(new Paragraph({
      children: [rb('PERSONAL / SOCIAL DEVELOPMENT AND WORK HABITS', { size: 20, color: GREEN })],
      spacing: { before: 160, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GREEN, space: 1 } },
    }));
    const COL0 = CONTENT - 4 * 1250;
    children.push(new Table({
      width: { size: CONTENT, type: WidthType.DXA },
      columnWidths: [COL0, 1250, 1250, 1250, 1250],
      rows: [
        new TableRow({ tableHeader: true, children: [
          cell('', { shaded: true, w: COL0 }),
          ...PSD_SCALE.map(s => cell(s, { shaded: true, bold: true, w: 1250 })),
        ]}),
        ...psdStmts.map(stmt => {
          const tick = meta?.psd_ticks?.[stmt.id];
          return new TableRow({ children: [
            cell(stmt.text, { w: COL0 }),
            ...PSD_SCALE.map((_, i) => cell(tick === i ? '✔' : '', { w: 1250 })),
          ]});
        }),
      ],
    }));
    children.push(emptyLine(160));
  }

  // Grades table
  children.push(new Paragraph({
    children: [rb('GRADES FOR ACADEMIC ATTAINMENT AND EFFORT', { size: 20, color: GREEN })],
    spacing: { before: 160, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GREEN, space: 1 } },
  }));
  const GW = [CONTENT - 2000, 1000, 1000];
  children.push(new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: GW,
    rows: [
      new TableRow({ tableHeader: true, children: [
        cell('Subject',    { shaded: true, bold: true, w: GW[0] }),
        cell('Attainment', { shaded: true, bold: true, w: GW[1] }),
        cell('Effort',     { shaded: true, bold: true, w: GW[2] }),
      ]}),
      ...entries.map(e => new TableRow({ children: [
        cell(e.subject_name,   { w: GW[0] }),
        cell(e.attainment || '—', { w: GW[1] }),
        cell(e.effort     || '—', { w: GW[2] }),
      ]})),
    ],
  }));

  // Per-subject comments (2-col layout, same as secondary)
  const withComments = entries.filter(e => e.comment?.trim());
  if (withComments.length > 0) {
    children.push(emptyLine(160));
    children.push(new Paragraph({
      children: [rb('SUBJECT COMMENTS', { size: 20, color: GREEN })],
      spacing: { before: 160, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GREEN, space: 1 } },
    }));
    for (const entry of withComments) {
      children.push(buildSubjectCard(entry));
      children.push(emptyLine(80));
    }
  }

  // Self-appraisal
  const sa = meta?.self_appraisal || {};
  if (sa.good_at || sa.improve || sa.try_to) {
    children.push(emptyLine(80));
    children.push(new Paragraph({
      children: [rb('STUDENT SELF-APPRAISAL', { size: 20, color: GREEN })],
      spacing: { before: 160, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GREEN, space: 1 } },
    }));
    for (const [label, val] of [['I am good at...', sa.good_at], ['I need to improve...', sa.improve], ['I will try to...', sa.try_to]]) {
      if (val) children.push(para([rb(label + '  ', { size: 18 }), r(val, { size: 18 })]));
    }
  }

  if (meta?.targets) {
    children.push(emptyLine(80));
    children.push(new Paragraph({ children: [rb('TARGETS', { size: 20, color: GREEN })], spacing: { before: 160, after: 120 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GREEN, space: 1 } } }));
    children.push(para(meta.targets));
  }

  // Signatures
  children.push(emptyLine(160));
  const SW = [CONTENT / 2, CONTENT / 2];
  children.push(new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: SW,
    rows: [
      new TableRow({ children: [
        cell([para([rb('Class Teacher: ', { size: 18 }), r(classTeacherName || '________________', { size: 18 })])], { borders: BORDERS_NONE, w: SW[0] }),
        cell([para([rb('Head Teacher: ',  { size: 18 }), r('________________', { size: 18 })])],                   { borders: BORDERS_NONE, w: SW[1] }),
      ]}),
      new TableRow({ children: [
        cell([para([r('Signature: ________________', { size: 18, color: GREY })])], { borders: BORDERS_NONE, w: SW[0] }),
        cell([para([r('Signature: ________________', { size: 18, color: GREY })])], { borders: BORDERS_NONE, w: SW[1] }),
      ]}),
    ],
  }));

  return children;
}

// ── SECONDARY report ──────────────────────────────────────────────────────
// Font: Arial throughout
function buildSecondaryDoc({ student, entries, meta, period, classTeacherName, assets, schoolInfo }) {
  const children = [...buildHeader({ ...assets, schoolInfo })];
  const reportLabel = period.type === 'mid_year' ? 'MID-YEAR REPORT' : 'END OF THE YEAR REPORT';

  // Title
  children.push(new Paragraph({
    children: [
      rba(reportLabel + '   ', { size: 28, color: DARK }),
      rba(`SCHOOL YEAR ${period.school_year}`, { size: 28, color: GREEN }),
    ],
    spacing: { after: 160 },
  }));

  // Student info
  children.push(new Paragraph({ children: [rba('Registration number: ', { size: 20 }), ra(`/${period.absences_total_days || '—'}`, { size: 20 })], spacing: { after: 80 } }));
  children.push(emptyLine(80));
  children.push(new Paragraph({
    children: [
      rba('Student: ', { size: 22 }),
      rba(student.name || '—', { size: 22, color: DARK }),
      ra('        ', { size: 22 }),
      rba('Year: ', { size: 22 }),
      ra(String(getYearFromClassName(student.class_name) ?? '—'), { size: 22 }),
    ],
    spacing: { after: 200 },
  }));

  // Per-subject cards (Arial)
  for (const entry of entries) {
    children.push(buildSubjectCard(entry, 'Arial'));
    children.push(emptyLine(80));
  }

  // Class teacher + signature
  children.push(emptyLine(120));
  const CW = [CONTENT / 2, CONTENT / 2];
  children.push(new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: CW,
    rows: [
      new TableRow({ children: [
        cell([new Paragraph({ children: [rba('Class Teacher: ', { size: 18 }), ra(classTeacherName || '________________', { size: 18 })], spacing: { after: 60 } })], { w: CW[0] }),
        cell([new Paragraph({ children: [rba('Head of School: ', { size: 18 }), ra('________________', { size: 18 })], spacing: { after: 60 } })], { w: CW[1] }),
      ]}),
      new TableRow({ children: [
        cell([new Paragraph({ children: [ra('Signature: ________________', { size: 18, color: GREY })], spacing: { after: 60 } })], { w: CW[0] }),
        cell([new Paragraph({ children: [ra('Signature: ________________', { size: 18, color: GREY })], spacing: { after: 60 } })], { w: CW[1] }),
      ]}),
    ],
  }));

  // Legend
  children.push(emptyLine(200));
  children.push(new Paragraph({ children: [ria('Assessment: A* Exceptional  ·  A Outstanding  ·  B Very Good  ·  C Good  ·  D Satisfactory  ·  E Needs Improvement  ·  F Poor  ·  G Very Poor  ·  U Ungraded', { size: 16 })], spacing: { after: 60 } }));
  children.push(new Paragraph({ children: [ria('Effort: 1 Excellent  ·  2 Satisfactory  ·  3 Needs Improvement', { size: 16 })], spacing: { after: 60 } }));

  return children;
}

// ── Per-subject 2-column card (font = 'Calibri' for primary, 'Arial' for secondary) ──
function buildSubjectCard(entry, font = 'Calibri') {
  const bold = (text, o = {}) => new TextRun({ text: String(text ?? ''), font, size: 18, bold: true, ...o });
  const norm = (text, o = {}) => new TextRun({ text: String(text ?? ''), font, size: 18, ...o });

  const LW = Math.floor(CONTENT * 0.38);
  const RW = CONTENT - LW;

  const leftParas = [
    new Paragraph({ children: [bold('Subject: '), bold(entry.subject_name, { color: GREEN })], spacing: { after: 100 } }),
    new Paragraph({ children: [bold('Teacher: '), norm(entry.teacher?.full_name || '—')], spacing: { after: 100 } }),
    new Paragraph({ children: [bold('Attainment: '), norm(entry.attainment || '—')], spacing: { after: 100 } }),
    new Paragraph({ children: [bold('Effort: '), norm(entry.effort || '—')], spacing: { after: 60 } }),
  ];

  const rightParas = [
    new Paragraph({ children: [bold('Comment:')], spacing: { after: 80 } }),
    new Paragraph({ children: [norm(entry.comment || '—')], spacing: { after: 60 } }),
  ];

  return new Table({
    width: { size: CONTENT, type: WidthType.DXA },
    columnWidths: [LW, RW],
    rows: [new TableRow({ children: [
      cell(leftParas,  { w: LW }),
      cell(rightParas, { w: RW }),
    ]})],
  });
}

// ── Entry point ────────────────────────────────────────────────────────────
export async function generateReportForStudent({ studentRow, period, psdStmts, rs, schoolInfo }) {
  const { student, entries = [], meta } = studentRow;
  const reportType = getReportType(student?.class_name);
  if (!reportType) throw new Error(`Cannot determine report type for class "${student?.class_name}" — class name must contain a year number (e.g. Y1, Y5A, Year 7).`);

  const [{ data: teachers }, assets] = await Promise.all([
    rs.supabase.from('teachers').select('id, full_name, class_teacher_for'),
    loadAllAssets(),
  ]);

  const classTeacher = (teachers || []).find(t => t.class_teacher_for === student.class_name);
  const classTeacherName = classTeacher?.full_name;

  const args = { student, entries, meta, psdStmts, period, classTeacherName, assets, schoolInfo };
  const sections = reportType === 'primary' ? buildPrimaryDoc(args) : buildSecondaryDoc(args);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: 16838 },
          margin: { top: 400, bottom: MARGIN, left: MARGIN, right: MARGIN },
        },
      },
      children: sections,
    }],
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
  });

  const blob = await Packer.toBlob(doc);
  const typeSuffix = reportType === 'primary' ? 'Primary' : 'Secondary';
  const fileName = `${typeSuffix}_${(student.name || 'Student').replace(/\s+/g, '_')}_${student.class_name}.docx`;
  saveAs(blob, fileName);

  if (meta?.id) {
    try { await rs.saveMeta(meta.id, { status: 'generated' }); } catch {/* non-fatal */}
  }
}

export async function generateReportsForClass({ classRows, period, psdStmts, rs, schoolInfo }) {
  for (const row of classRows) {
    await generateReportForStudent({ studentRow: row, period, psdStmts, rs, schoolInfo });
  }
}
