/** Minimal single-page PDF writer (standard fonts only) used for previews and downloads. */
import { CertificateValues, LayoutConfig, resolveText } from '../lib/certificate';

function fontName(family: string, style: string): string {
  const f = (family || '').toLowerCase();
  const s = (style || '').toUpperCase();
  const bold = s.includes('BOLD');
  const italic = s.includes('ITALIC');
  if (f.includes('times')) return bold && italic ? 'Times-BoldItalic' : bold ? 'Times-Bold' : italic ? 'Times-Italic' : 'Times-Roman';
  if (f.includes('courier')) return bold && italic ? 'Courier-BoldOblique' : bold ? 'Courier-Bold' : italic ? 'Courier-Oblique' : 'Courier';
  return bold && italic ? 'Helvetica-BoldOblique' : bold ? 'Helvetica-Bold' : italic ? 'Helvetica-Oblique' : 'Helvetica';
}

function esc(s: string): string {
  return s.replace(/[^\x20-\x7e]/g, '?').replace(/([\\()])/g, '\\$1');
}

function rgb(hex: string): string {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  const n = (i: number) => (parseInt(full.slice(i, i + 2), 16) / 255 || 0).toFixed(3);
  return `${n(0)} ${n(2)} ${n(4)}`;
}

export function buildPdf(layout: LayoutConfig, values: Partial<CertificateValues>): Uint8Array {
  const W = layout.width || 842;
  const H = layout.height || 595;
  const fonts: string[] = [];
  const fid = (name: string) => {
    let i = fonts.indexOf(name);
    if (i < 0) {
      fonts.push(name);
      i = fonts.length - 1;
    }
    return `F${i + 1}`;
  };
  let c = '';
  // border
  c += `0.8 0.65 0.2 RG 2 w ${14} ${14} ${W - 28} ${H - 28} re S\n`;
  for (const t of layout.textElements || []) {
    const text = resolveText(t.placeholder, values);
    const name = fontName(t.fontFamily, t.fontStyle);
    const factor = name.startsWith('Courier') ? 0.6 : name.startsWith('Times') ? 0.47 : 0.52;
    const w = text.length * t.fontSize * factor;
    const al = (t.alignment || 'LEFT').toUpperCase();
    const x = al === 'CENTER' ? t.x - w / 2 : al === 'RIGHT' ? t.x - w : t.x;
    c += `BT /${fid(name)} ${t.fontSize} Tf ${rgb(t.colorHex)} rg ${x.toFixed(1)} ${(H - t.y).toFixed(1)} Td (${esc(text)}) Tj ET\n`;
  }
  const q = layout.qrCode;
  if (q && q.enabled) {
    const y = H - q.y - q.size;
    c += `0 g ${q.x} ${y} ${q.size} ${q.size} re S\n`;
    const cell = q.size / 9;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        const corner = (i < 3 && j < 3) || (i < 3 && j > 5) || (i > 5 && j < 3);
        if (corner || (i * 7 + j * 13 + i * j) % 3 === 0) {
          c += `${(q.x + i * cell).toFixed(1)} ${(y + j * cell).toFixed(1)} ${cell.toFixed(1)} ${cell.toFixed(1)} re f\n`;
        }
      }
    }
  }
  const objs: string[] = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  const fontRefs = fonts.map((_, i) => `/F${i + 1} ${5 + i} 0 R`).join(' ');
  objs[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /Font << ${fontRefs} >> >> >>`;
  objs[4] = `<< /Length ${c.length} >>\nstream\n${c}endstream`;
  fonts.forEach((f, i) => {
    objs[5 + i] = `<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`;
  });
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}
