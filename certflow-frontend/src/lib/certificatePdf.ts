import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
  CertificateValues,
  LayoutConfig,
  FALLBACK_LAYOUT,
  SAMPLE_VALUES,
  resolveText,
} from './certificate';
import { getFont, fontFilePath, resolvedFace } from './fonts';
import { layoutText } from './designer';
import type { Design, DesignElement, DashStyle, FillSpec, ImageFit, TextEl } from './designer';

interface BuildOptions {
  layout?: LayoutConfig | null;
  values?: Partial<CertificateValues>;
  verifyUrl: string;
  /** Data URI of a background image (PNG or JPEG). */
  backgroundDataUrl?: string | null;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0');
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function pdfFont(family: string): 'helvetica' | 'times' | 'courier' {
  const f = (family || '').toLowerCase();
  if (f.includes('times')) return 'times';
  if (f.includes('courier')) return 'courier';
  return 'helvetica';
}

function pdfStyle(style: string): 'normal' | 'bold' | 'italic' | 'bolditalic' {
  const s = (style || '').toUpperCase();
  if (s.includes('BOLD') && s.includes('ITALIC')) return 'bolditalic';
  if (s.includes('BOLD')) return 'bold';
  if (s.includes('ITALIC')) return 'italic';
  return 'normal';
}

/** Builds a real PDF in the browser from the same layout the SVG preview uses. */
export async function buildCertificatePdf(opts: BuildOptions): Promise<jsPDF> {
  const { layout, values, verifyUrl, backgroundDataUrl } = opts;
  if (layout?.design) return buildDesignPdf(layout.design, values, verifyUrl);
  const cfg = layout && layout.textElements ? layout : FALLBACK_LAYOUT;
  const merged = { ...SAMPLE_VALUES, ...(values || {}) };
  const width = cfg.width || 842;
  const height = cfg.height || 595;

  const doc = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [width, height],
  });

  if (backgroundDataUrl) {
    try {
      doc.addImage(backgroundDataUrl, 'PNG', 0, 0, width, height);
    } catch {
      /* unsupported image, continue without it */
    }
  } else {
    doc.setDrawColor(203, 211, 222);
    doc.setLineWidth(1);
    doc.rect(14, 14, width - 28, height - 28);
    doc.setDrawColor(224, 229, 236);
    doc.setLineWidth(0.75);
    doc.rect(22, 22, width - 44, height - 44);
  }

  for (const el of cfg.textElements) {
    const [r, g, b] = hexToRgb(el.colorHex);
    doc.setFont(pdfFont(el.fontFamily), pdfStyle(el.fontStyle));
    doc.setFontSize(el.fontSize);
    doc.setTextColor(r, g, b);
    const align = el.alignment === 'LEFT' ? 'left' : el.alignment === 'RIGHT' ? 'right' : 'center';
    doc.text(resolveText(el.placeholder, merged), el.x, el.y, { align });
  }

  if (cfg.qrCode?.enabled) {
    const { x, y, size } = cfg.qrCode;
    doc.setFillColor(255, 255, 255);
    doc.rect(x - 4, y - 4, size + 8, size + 8, 'F');
    doc.setFillColor(15, 26, 43);
    const qr = QRCode.create(verifyUrl, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    const cell = size / n;
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (qr.modules.get(row, col)) {
          doc.rect(x + col * cell, y + row * cell, cell + 0.1, cell + 0.1, 'F');
        }
      }
    }
  }

  return doc;
}

export async function downloadCertificatePdf(opts: BuildOptions, fileName: string): Promise<void> {
  (await buildCertificatePdf(opts)).save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

/* ------------------------------------------------------------------ */
/* Design (version 2) renderer                                         */
/* ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Style = 'normal' | 'bold' | 'italic' | 'bolditalic';
const QR_QUIET = 2;

function styleOf(bold: boolean, italic: boolean): Style {
  return bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
}

function parseColor(c: string | null | undefined): [number, number, number] {
  if (!c) return [0, 0, 0];
  const m = c.trim().match(/^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return hexToRgb(c);
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}

function colorAt(stops: { offset: number; color: string }[], t: number): [number, number, number] {
  const st = [...stops].sort((a, b) => a.offset - b.offset);
  if (st.length === 0) return [255, 255, 255];
  if (t <= st[0].offset) return parseColor(st[0].color);
  for (let i = 1; i < st.length; i++) {
    if (t <= st[i].offset) {
      const span = st[i].offset - st[i - 1].offset || 1;
      return mix(parseColor(st[i - 1].color), parseColor(st[i].color), (t - st[i - 1].offset) / span);
    }
  }
  return parseColor(st[st.length - 1].color);
}

/** Rotation matrix for a clockwise rotation (screen space) around (cx, cy), in PDF space. */
function rotationMatrix(doc: jsPDF, degrees: number, cx: number, cy: number, pageH: number): unknown {
  const phi = (-degrees * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const px = cx;
  const py = pageH - cy;
  const Matrix = (doc as any).Matrix;
  return new Matrix(cos, sin, -sin, cos, px - px * cos + py * sin, py - px * sin - py * cos);
}

function withState(doc: jsPDF, fn: () => void): void {
  doc.saveGraphicsState();
  try {
    fn();
  } finally {
    doc.restoreGraphicsState();
  }
}

function setOpacity(doc: jsPDF, opacity: number): void {
  if (opacity < 1) doc.setGState(new (doc as any).GState({ opacity: Math.max(0, opacity), 'stroke-opacity': Math.max(0, opacity) }));
}

function applyDash(doc: jsPDF, dash: DashStyle, sw: number, cap?: 'butt' | 'round'): void {
  if (dash === 'dashed') doc.setLineDashPattern([4 * sw, 3 * sw], 0);
  else if (dash === 'dotted') doc.setLineDashPattern([1, 2 * sw], 0);
  else doc.setLineDashPattern([], 0);
  doc.setLineCap(dash === 'dotted' ? 'round' : (cap ?? 'butt'));
}

/** Fills the current clip (or the box) with a linear gradient by drawing thin bands. */
function drawGradient(doc: jsPDF, fill: Extract<FillSpec, { kind: 'linear' }>, x: number, y: number, w: number, h: number, pageH: number): void {
  const bands = 48;
  const a = (fill.angle * Math.PI) / 180;
  const len = Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a));
  const cx = x + w / 2;
  const cy = y + h / 2;
  const reach = Math.hypot(w, h);
  withState(doc, () => {
    // after this rotation the gradient axis is horizontal
    doc.setCurrentTransformationMatrix(rotationMatrix(doc, fill.angle - 90, cx, cy, pageH) as any);
    const bw = len / bands;
    for (let i = 0; i < bands; i++) {
      const [r, g, b] = colorAt(fill.stops, (i + 0.5) / bands);
      doc.setFillColor(r, g, b);
      doc.rect(cx - len / 2 + i * bw, cy - reach, bw + 0.6, reach * 2, 'F');
    }
    // extend the end colours beyond the gradient line
    const [r0, g0, b0] = colorAt(fill.stops, 0);
    doc.setFillColor(r0, g0, b0);
    doc.rect(cx - len / 2 - reach, cy - reach, reach, reach * 2, 'F');
    const [r1, g1, b1] = colorAt(fill.stops, 1);
    doc.setFillColor(r1, g1, b1);
    doc.rect(cx + len / 2 - 0.6, cy - reach, reach, reach * 2, 'F');
  });
}

type ShapePath = (style: string | null) => void;

function paintFill(doc: jsPDF, fill: FillSpec | null, x: number, y: number, w: number, h: number, pageH: number, shape: ShapePath): void {
  if (!fill) return;
  if (fill.kind === 'solid') {
    const [r, g, b] = parseColor(fill.color);
    doc.setFillColor(r, g, b);
    shape('F');
    return;
  }
  withState(doc, () => {
    shape(null);
    doc.clip();
    doc.discardPath();
    drawGradient(doc, fill, x, y, w, h, pageH);
  });
}

/* ---- fonts ---- */

const fontBase64Cache = new Map<string, Promise<string | null>>();

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(bin);
}

function fetchFontBase64(url: string): Promise<string | null> {
  let hit = fontBase64Cache.get(url);
  if (!hit) {
    hit = (async () => {
      try {
        if (typeof fetch !== 'function') return null;
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        const head = new Uint8Array(buf, 0, 4);
        if (!(head[0] === 0 && head[1] === 1 && head[2] === 0 && head[3] === 0)) return null; // not a plain TTF (or an HTML fallback page)
        return bufferToBase64(buf);
      } catch {
        return null;
      }
    })();
    fontBase64Cache.set(url, hit);
  }
  return hit;
}

interface FontChoice {
  name: string;
  style: Style;
}

function builtinFor(familyId: string): 'helvetica' | 'times' | 'courier' {
  const def = getFont(familyId);
  if (!def) return 'helvetica';
  if (familyId === 'Times') return 'times';
  if (familyId === 'Courier') return 'courier';
  if (def.category === 'serif') return 'times';
  if (def.category === 'mono') return 'courier';
  return 'helvetica';
}

async function registerFonts(doc: jsPDF, design: Design): Promise<Map<string, FontChoice>> {
  const result = new Map<string, FontChoice>();
  const wanted = new Map<string, { id: string; bold: boolean; italic: boolean }>();
  for (const el of design.elements) {
    if (el.type === 'text' && !el.hidden) wanted.set(`${el.fontFamily}|${el.bold}|${el.italic}`, { id: el.fontFamily, bold: el.bold, italic: el.italic });
  }
  await Promise.all(
    [...wanted.entries()].map(async ([key, w]) => {
      const fallback: FontChoice = { name: builtinFor(w.id), style: styleOf(w.bold, w.italic) };
      const url = fontFilePath(w.id, { bold: w.bold, italic: w.italic });
      if (!url) {
        result.set(key, fallback);
        return;
      }
      const b64 = await fetchFontBase64(url);
      if (!b64) {
        result.set(key, fallback);
        return;
      }
      try {
        const face = resolvedFace(w.id, { bold: w.bold, italic: w.italic });
        const style = styleOf(face.bold, face.italic);
        const fileName = url.split('/').pop() || `${w.id}.ttf`;
        const name = `cf-${w.id.replace(/[^A-Za-z0-9]/g, '')}`;
        doc.addFileToVFS(fileName, b64);
        doc.addFont(fileName, name, style);
        result.set(key, { name, style });
      } catch {
        result.set(key, fallback);
      }
    }),
  );
  return result;
}

/* ---- images ---- */

async function rasterise(src: string, boxW: number, boxH: number): Promise<string | null> {
  try {
    if (typeof document === 'undefined') return null;
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image'));
      img.src = src;
    });
    const nw = img.naturalWidth || boxW || 300;
    const nh = img.naturalHeight || boxH || 300;
    const scale = Math.min(4, Math.max(1, 1600 / Math.max(nw, nh)));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(nw * scale));
    canvas.height = Math.max(1, Math.round(nh * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

async function prepareImage(src: string, boxW: number, boxH: number): Promise<{ data: string; format: 'PNG' | 'JPEG' } | null> {
  const m = /^data:image\/([a-z0-9.+-]+)/i.exec(src || '');
  if (!m) return null;
  const kind = m[1].toLowerCase();
  if (kind === 'png') return { data: src, format: 'PNG' };
  if (kind === 'jpeg' || kind === 'jpg') return { data: src, format: 'JPEG' };
  const png = await rasterise(src, boxW, boxH);
  return png ? { data: png, format: 'PNG' } : null;
}

function fitRect(fit: ImageFit, nw: number, nh: number, x: number, y: number, w: number, h: number) {
  if (fit === 'fill' || !nw || !nh) return { x, y, w, h };
  const s = fit === 'cover' ? Math.max(w / nw, h / nh) : Math.min(w / nw, h / nh);
  const dw = nw * s;
  const dh = nh * s;
  return { x: x + (w - dw) / 2, y: y + (h - dh) / 2, w: dw, h: dh };
}

function drawImage(doc: jsPDF, img: { data: string; format: 'PNG' | 'JPEG' }, fit: ImageFit, x: number, y: number, w: number, h: number, radius: number): void {
  let nw = 0;
  let nh = 0;
  try {
    const props = doc.getImageProperties(img.data);
    nw = props.width;
    nh = props.height;
  } catch {
    /* fall back to stretching */
  }
  const r = fitRect(fit, nw, nh, x, y, w, h);
  withState(doc, () => {
    if (fit === 'cover' || radius > 0) {
      if (radius > 0) doc.roundedRect(x, y, w, h, radius, radius, null);
      else doc.rect(x, y, w, h, null);
      doc.clip();
      doc.discardPath();
    }
    try {
      doc.addImage(img.data, img.format, r.x, r.y, r.w, r.h);
    } catch {
      /* unsupported image data */
    }
  });
}

/* ---- main ---- */

async function buildDesignPdf(design: Design, values: Partial<CertificateValues> | undefined, verifyUrl: string): Promise<jsPDF> {
  const W = design.width;
  const H = design.height;
  const merged = { ...SAMPLE_VALUES, ...(values || {}) };
  const doc = new jsPDF({ orientation: W >= H ? 'landscape' : 'portrait', unit: 'pt', format: [W, H] });

  const fonts = await registerFonts(doc, design);

  const images = new Map<string, { data: string; format: 'PNG' | 'JPEG' } | null>();
  await Promise.all([
    ...(design.background.image ? [prepareImage(design.background.image.src, W, H).then((v) => void images.set('bg', v))] : []),
    ...design.elements.filter((e) => e.type === 'image' && !e.hidden).map((e) => prepareImage((e as any).src, e.width, e.height).then((v) => void images.set(e.id, v))),
  ]);

  // background
  const bgFill = design.background.fill;
  paintFill(doc, bgFill, 0, 0, W, H, H, (style) => doc.rect(0, 0, W, H, style));
  if (design.background.image) {
    const img = images.get('bg');
    if (img) {
      withState(doc, () => {
        setOpacity(doc, design.background.image!.opacity);
        drawImage(doc, img, design.background.image!.fit, 0, 0, W, H, 0);
      });
    }
  }

  let qr: { n: number; cells: [number, number][] } | null = null;
  if (design.elements.some((e) => e.type === 'qr' && !e.hidden)) {
    try {
      const q = QRCode.create(verifyUrl, { errorCorrectionLevel: 'M' });
      const cells: [number, number][] = [];
      for (let r = 0; r < q.modules.size; r++) for (let c = 0; c < q.modules.size; c++) if (q.modules.get(r, c)) cells.push([r, c]);
      qr = { n: q.modules.size, cells };
    } catch {
      qr = null;
    }
  }

  for (const el of design.elements) {
    if (el.hidden) continue;
    withState(doc, () => {
      setOpacity(doc, el.opacity);
      if (el.rotation) {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        doc.setCurrentTransformationMatrix(rotationMatrix(doc, el.rotation, cx, cy, H) as any);
      }
      drawElement(doc, el, { H, merged, fonts, images, qr });
    });
  }

  return doc;
}

interface DrawCtx {
  H: number;
  merged: Partial<CertificateValues>;
  fonts: Map<string, FontChoice>;
  images: Map<string, { data: string; format: 'PNG' | 'JPEG' } | null>;
  qr: { n: number; cells: [number, number][] } | null;
}

function drawText(doc: jsPDF, el: TextEl, ctx: DrawCtx): void {
  const lay = layoutText(el, resolveText(el.text, ctx.merged));
  const font = ctx.fonts.get(`${el.fontFamily}|${el.bold}|${el.italic}`) ?? { name: 'helvetica', style: styleOf(el.bold, el.italic) };
  doc.setFont(font.name, font.style);
  doc.setFontSize(el.fontSize);
  const [r, g, b] = parseColor(el.color);
  doc.setTextColor(r, g, b);
  const cs = el.letterSpacing || 0;
  for (const ln of lay.lines) {
    if (!ln.text) continue;
    const w = doc.getTextWidth(ln.text) + cs * ln.text.length;
    const x = lay.anchor === 'start' ? lay.anchorX : lay.anchor === 'middle' ? lay.anchorX - w / 2 : lay.anchorX - w;
    doc.text(ln.text, x, ln.baselineY, cs ? ({ charSpace: cs } as any) : undefined);
    if (el.underline) {
      const uy = ln.baselineY + el.fontSize * 0.12;
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(Math.max(0.5, el.fontSize * 0.06));
      doc.setLineDashPattern([], 0);
      doc.line(x, uy, x + w - cs, uy);
    }
  }
}

function drawElement(doc: jsPDF, el: DesignElement, ctx: DrawCtx): void {
  switch (el.type) {
    case 'text':
      drawText(doc, el, ctx);
      return;
    case 'rect': {
      const r = Math.max(0, Math.min(el.cornerRadius, Math.min(el.width, el.height) / 2));
      const shape: ShapePath = (style) => (r > 0 ? doc.roundedRect(el.x, el.y, el.width, el.height, r, r, style) : doc.rect(el.x, el.y, el.width, el.height, style));
      paintFill(doc, el.fill, el.x, el.y, el.width, el.height, ctx.H, shape);
      if (el.stroke && el.strokeWidth > 0) {
        const [sr, sg, sb] = parseColor(el.stroke);
        doc.setDrawColor(sr, sg, sb);
        doc.setLineWidth(el.strokeWidth);
        applyDash(doc, el.dash, el.strokeWidth);
        shape('S');
        doc.setLineDashPattern([], 0);
      }
      return;
    }
    case 'ellipse': {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const shape: ShapePath = (style) => doc.ellipse(cx, cy, el.width / 2, el.height / 2, style);
      paintFill(doc, el.fill, el.x, el.y, el.width, el.height, ctx.H, shape);
      if (el.stroke && el.strokeWidth > 0) {
        const [sr, sg, sb] = parseColor(el.stroke);
        doc.setDrawColor(sr, sg, sb);
        doc.setLineWidth(el.strokeWidth);
        applyDash(doc, el.dash, el.strokeWidth);
        shape('S');
        doc.setLineDashPattern([], 0);
      }
      return;
    }
    case 'line': {
      const [sr, sg, sb] = parseColor(el.stroke);
      doc.setDrawColor(sr, sg, sb);
      doc.setLineWidth(el.strokeWidth);
      applyDash(doc, el.dash, el.strokeWidth, el.cap);
      doc.line(el.x, el.y, el.x + el.width, el.y);
      doc.setLineDashPattern([], 0);
      return;
    }
    case 'image': {
      const img = ctx.images.get(el.id);
      if (img) {
        const r = Math.max(0, Math.min(el.cornerRadius, Math.min(el.width, el.height) / 2));
        drawImage(doc, img, el.fit, el.x, el.y, el.width, el.height, r);
      }
      return;
    }
    case 'qr': {
      if (el.bg) {
        const [r, g, b] = parseColor(el.bg);
        doc.setFillColor(r, g, b);
        doc.rect(el.x, el.y, el.width, el.height, 'F');
      }
      if (!ctx.qr) return;
      const size = Math.min(el.width, el.height);
      const cell = size / (ctx.qr.n + 2 * QR_QUIET);
      const [r, g, b] = parseColor(el.fg);
      doc.setFillColor(r, g, b);
      for (const [row, col] of ctx.qr.cells) {
        doc.rect(el.x + (QR_QUIET + col) * cell, el.y + (QR_QUIET + row) * cell, cell + 0.15, cell + 0.15, 'F');
      }
      return;
    }
  }
}
