// Markdown -> editable DOCX converter for the final patent packages.
// Usage: node md2docx.cjs <in.md> <out.docx>
// Handles: headings, paragraphs, bullet lists, numbered lists (literal numbers with hanging indent),
// pipe tables, blockquotes, horizontal rules, inline **bold**, *italic*, `code`,
// and the page-break marker line "<!-- pagebreak -->". Other HTML comment lines are dropped.
// The mandated review line is placed in the page header of every document and is not repeated in the body.
const path = require('path');
const fs = require('fs');
const docx = require('C:/Users/1/AppData/Roaming/npm/node_modules/docx');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, LevelFormat, ShadingType, PageNumber, PageBreak, Header, Footer,
} = docx;

const HEADER_LINE = 'Prepared for Ravi Kiran Raju Yerra. Attorney review recommended before filing. Not legal advice.';

const [,, inPath, outPath] = process.argv;
if (!inPath || !outPath) { console.error('usage: node md2docx.cjs in.md out.docx'); process.exit(2); }
const src = fs.readFileSync(inPath, 'utf8').replace(/\r\n/g, '\n');
const lines = src.split('\n');
if (lines[0].trim() !== HEADER_LINE) { console.error('first line must be the review header: ' + inPath); process.exit(3); }
lines.shift();

const FONT = 'Times New Roman';
const SIZE = 24; // half-points => 12 pt
const PAGE_W = 12240, PAGE_H = 15840, MARGIN = 1440; // US Letter, 1 inch
const TEXT_W = PAGE_W - 2 * MARGIN; // 9360 DXA

function inlineRuns(text, base = {}) {
  const runs = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size: SIZE, ...base }));
    const tok = m[0];
    if (tok.startsWith('`')) runs.push(new TextRun({ text: tok.slice(1, -1), font: 'Consolas', size: SIZE - 2, ...base }));
    else if (tok.startsWith('**')) runs.push(new TextRun({ text: tok.slice(2, -2), font: FONT, size: SIZE, bold: true, ...base }));
    else runs.push(new TextRun({ text: tok.slice(1, -1), font: FONT, size: SIZE, italics: true, ...base }));
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), font: FONT, size: SIZE, ...base }));
  return runs;
}

const children = [];
let i = 0;
let title = null;

function flushTable(rows) {
  const cols = Math.max(...rows.map(r => r.length));
  const weights = Array.from({ length: cols }, (_, ci) => {
    const maxLen = Math.max(...rows.map(r => (r[ci] || '').length));
    return Math.min(Math.max(maxLen, 4), 60);
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map(w => Math.max(Math.floor(TEXT_W * w / sum), 700));
  const used = widths.reduce((a, b) => a + b, 0);
  widths[cols - 1] += TEXT_W - used;
  const border = { style: BorderStyle.SINGLE, size: 4, color: '888888' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const tRows = rows.map((r, ri) => new TableRow({
    tableHeader: ri === 0,
    children: widths.map((w, ci) => new TableCell({
      width: { size: w, type: WidthType.DXA },
      borders,
      shading: ri === 0 ? { type: ShadingType.CLEAR, fill: 'EDEDED', color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 90, right: 90 },
      children: [new Paragraph({ children: inlineRuns(r[ci] || '', ri === 0 ? { bold: true, size: SIZE - 4 } : { size: SIZE - 4 }), spacing: { after: 0, line: 240 } })],
    })),
  }));
  children.push(new Table({ rows: tRows, columnWidths: widths, width: { size: TEXT_W, type: WidthType.DXA } }));
  children.push(new Paragraph({ spacing: { after: 120 } }));
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => c.trim());
}

while (i < lines.length) {
  const line = lines[i];
  const t = line.trim();
  if (t === '') { i++; continue; }
  if (t === '<!-- pagebreak -->') {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    i++; continue;
  }
  if (t.startsWith('<!--')) { i++; continue; }
  if (/^-{3,}$/.test(t)) {
    children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 1 } }, spacing: { after: 200 } }));
    i++; continue;
  }
  const h = /^(#{1,6})\s+(.*)$/.exec(t);
  if (h) {
    const level = h[1].length;
    const text = h[2].replace(/\*\*/g, '');
    if (level === 1 && !title) title = text;
    const map = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 };
    children.push(new Paragraph({
      heading: map[Math.min(level, 4)],
      children: [new TextRun({ text, font: FONT, bold: true, size: level === 1 ? 32 : level === 2 ? 28 : 26, color: '000000' })],
      spacing: { before: level === 1 ? 240 : 200, after: 120 },
      keepNext: true,
    }));
    i++; continue;
  }
  if (t.startsWith('|')) {
    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith('|')) {
      const r = lines[i].trim();
      if (!/^\|?\s*:?-{3,}/.test(r)) rows.push(splitRow(r));
      i++;
    }
    if (rows.length) flushTable(rows);
    continue;
  }
  if (t.startsWith('>')) {
    const buf = [];
    while (i < lines.length && lines[i].trim().startsWith('>')) { buf.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
    const text = buf.join(' ').trim();
    if (text) children.push(new Paragraph({
      children: inlineRuns(text, { italics: true, size: SIZE - 2, color: '333333' }),
      indent: { left: 540, right: 540 },
      border: { left: { style: BorderStyle.SINGLE, size: 12, color: '999999', space: 8 } },
      spacing: { after: 200, line: 264 },
    }));
    continue;
  }
  if (/^[-*]\s+/.test(t)) {
    while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
      const text = lines[i].trim().replace(/^[-*]\s+/, '');
      children.push(new Paragraph({ children: inlineRuns(text), numbering: { reference: 'bullets', level: 0 }, spacing: { after: 80, line: 264 } }));
      i++;
    }
    continue;
  }
  if (/^\d+\.\s+/.test(t)) {
    while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
      const m = /^(\d+\.)\s+(.*)$/.exec(lines[i].trim());
      children.push(new Paragraph({
        children: [new TextRun({ text: m[1] + '\t', font: FONT, size: SIZE }), ...inlineRuns(m[2])],
        indent: { left: 540, hanging: 540 }, tabStops: [{ type: 'left', position: 540 }],
        spacing: { after: 80, line: 264 },
      }));
      i++;
    }
    continue;
  }
  const buf = [t];
  i++;
  while (i < lines.length) {
    const n = lines[i].trim();
    if (n === '' || /^(#{1,6})\s/.test(n) || n.startsWith('|') || n.startsWith('>') || n.startsWith('<!--') || /^[-*]\s+/.test(n) || /^\d+\.\s+/.test(n) || /^-{3,}$/.test(n)) break;
    buf.push(n); i++;
  }
  const text = buf.join(' ');
  const isClaim = /^\*\*\d+\.\*\*/.test(text) || /^\*\*A\d/.test(text);
  const isSpecPara = /^\[\d{4}\]/.test(text);
  children.push(new Paragraph({
    children: inlineRuns(text),
    spacing: { after: isClaim ? 200 : 160, line: 276 },
    alignment: isSpecPara ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
    keepLines: isClaim,
  }));
}

const doc = new Document({
  creator: 'Ravi Kiran Raju Yerra',
  title: title || path.basename(inPath, '.md'),
  description: HEADER_LINE,
  styles: {
    default: { document: { run: { font: FONT, size: SIZE } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 32, bold: true, color: '000000' }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 28, bold: true, color: '000000' }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 26, bold: true, color: '000000' }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
      { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 24, bold: true, italics: true, color: '000000' }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 3 } },
    ],
  },
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
    }],
  },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: HEADER_LINE, font: FONT, size: 18, color: '555555' }),
      ] })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: 'Page ', font: FONT, size: 18, color: '555555' }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: '555555' }),
      ] })] }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('wrote', outPath, buf.length, 'bytes');
}).catch(e => { console.error(e); process.exit(1); });
