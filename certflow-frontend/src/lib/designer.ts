/**
 * Design model for the certificate editor (version 2).
 *
 * A Design is a page plus a stack of elements (index 0 is the back-most).
 * All units are PDF points measured from the top-left corner of the page.
 * Every element is an axis-aligned box (x, y, width, height) that is rotated
 * around its own centre by `rotation` degrees (clockwise).
 *
 * The same model is read by three renderers that must agree:
 *   - the SVG renderer (components/CertificateCanvas.tsx) used by the editor and previews,
 *   - the browser PDF builder (lib/certificatePdf.ts),
 *   - the Java PDFBox renderer (certflow-common PdfBoxRenderer).
 *
 * Text has NO automatic wrapping so all renderers lay it out identically:
 * lines break only at "\n". The box width decides where aligned text sits.
 * Use layoutText() so every renderer places baselines the same way.
 */
import type { LayoutConfig, TextElement as LegacyTextElement } from './certificate';

export type FillSpec =
  | { kind: 'solid'; color: string }
  | { kind: 'linear'; angle: number; stops: { offset: number; color: string }[] };

export type DashStyle = 'solid' | 'dashed' | 'dotted';
export type ImageFit = 'cover' | 'contain' | 'fill';

interface ElementBase {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise, around the box centre. */
  rotation: number;
  /** 0 to 1 */
  opacity: number;
  locked: boolean;
  hidden: boolean;
}

export interface TextEl extends ElementBase {
  type: 'text';
  /** May contain {{placeholders}} and "\n" line breaks. */
  text: string;
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  uppercase: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
  valign: 'top' | 'middle' | 'bottom';
  /** Multiple of fontSize, e.g. 1.2 */
  lineHeight: number;
  /** Extra space between characters in points. */
  letterSpacing: number;
}

export interface RectEl extends ElementBase {
  type: 'rect';
  fill: FillSpec | null;
  stroke: string | null;
  strokeWidth: number;
  dash: DashStyle;
  cornerRadius: number;
}

export interface EllipseEl extends ElementBase {
  type: 'ellipse';
  fill: FillSpec | null;
  stroke: string | null;
  strokeWidth: number;
  dash: DashStyle;
}

/** A straight line from the left edge to the right edge of its box, vertically centred. `height` is ignored (0). */
export interface LineEl extends ElementBase {
  type: 'line';
  stroke: string;
  strokeWidth: number;
  dash: DashStyle;
  cap: 'butt' | 'round';
}

export interface ImageEl extends ElementBase {
  type: 'image';
  /** data: URI (PNG, JPEG or SVG). */
  src: string;
  fit: ImageFit;
  cornerRadius: number;
}

/** The verification QR code. Square: width === height. */
export interface QrEl extends ElementBase {
  type: 'qr';
  fg: string;
  /** null = transparent */
  bg: string | null;
}

export type DesignElement = TextEl | RectEl | EllipseEl | LineEl | ImageEl | QrEl;
export type ElementType = DesignElement['type'];

export interface DesignBackground {
  fill: FillSpec;
  image: { src: string; fit: ImageFit; opacity: number } | null;
}

export interface Design {
  version: 2;
  width: number;
  height: number;
  background: DesignBackground;
  elements: DesignElement[];
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export interface PageSize {
  id: string;
  label: string;
  width: number;
  height: number;
}

export const PAGE_SIZES: PageSize[] = [
  { id: 'a4-landscape', label: 'A4 landscape', width: 842, height: 595 },
  { id: 'a4-portrait', label: 'A4 portrait', width: 595, height: 842 },
  { id: 'letter-landscape', label: 'US Letter landscape', width: 792, height: 612 },
  { id: 'letter-portrait', label: 'US Letter portrait', width: 612, height: 792 },
  { id: 'wide', label: 'Widescreen 16:9', width: 960, height: 540 },
  { id: 'square', label: 'Square', width: 600, height: 600 },
];

export const PLACEHOLDERS: { token: string; label: string; sample: string }[] = [
  { token: '{{participant_name}}', label: 'Participant name', sample: 'Priya Sharma' },
  { token: '{{event_name}}', label: 'Event name', sample: 'National AI Hackathon 2026' },
  { token: '{{organization_name}}', label: 'Organization', sample: 'CertFlow Academy' },
  { token: '{{certificate_type}}', label: 'Certificate type', sample: 'Winner' },
  { token: '{{issue_date}}', label: 'Issue date', sample: '16 Oct 2026' },
  { token: '{{certificate_number}}', label: 'Certificate number', sample: 'CF-2026-000128' },
];

/* ------------------------------------------------------------------ */
/* Factories                                                           */
/* ------------------------------------------------------------------ */

let counter = 0;
export function uid(prefix = 'el'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${Math.floor(Math.random() * 1296).toString(36)}`;
}

function base(partial: Partial<ElementBase> & { name: string; width: number; height: number }): ElementBase {
  return {
    id: partial.id ?? uid(),
    name: partial.name,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width,
    height: partial.height,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    locked: partial.locked ?? false,
    hidden: partial.hidden ?? false,
  };
}

export function createText(p: Partial<TextEl> = {}): TextEl {
  const fontSize = p.fontSize ?? 24;
  const lineHeight = p.lineHeight ?? 1.2;
  const lines = (p.text ?? 'Add text').split('\n').length;
  return {
    ...base({ name: p.name ?? 'Text', width: p.width ?? 320, height: p.height ?? fontSize * lineHeight * lines, ...p }),
    type: 'text',
    text: p.text ?? 'Add text',
    fontFamily: p.fontFamily ?? 'Montserrat',
    fontSize,
    bold: p.bold ?? false,
    italic: p.italic ?? false,
    underline: p.underline ?? false,
    uppercase: p.uppercase ?? false,
    color: p.color ?? '#0F1A2B',
    align: p.align ?? 'center',
    valign: p.valign ?? 'top',
    lineHeight,
    letterSpacing: p.letterSpacing ?? 0,
  };
}

export function createRect(p: Partial<RectEl> = {}): RectEl {
  return {
    ...base({ name: p.name ?? 'Rectangle', width: p.width ?? 200, height: p.height ?? 120, ...p }),
    type: 'rect',
    fill: p.fill === undefined ? { kind: 'solid', color: '#12877F' } : p.fill,
    stroke: p.stroke ?? null,
    strokeWidth: p.strokeWidth ?? 2,
    dash: p.dash ?? 'solid',
    cornerRadius: p.cornerRadius ?? 0,
  };
}

export function createEllipse(p: Partial<EllipseEl> = {}): EllipseEl {
  return {
    ...base({ name: p.name ?? 'Ellipse', width: p.width ?? 140, height: p.height ?? 140, ...p }),
    type: 'ellipse',
    fill: p.fill === undefined ? { kind: 'solid', color: '#C28A1B' } : p.fill,
    stroke: p.stroke ?? null,
    strokeWidth: p.strokeWidth ?? 2,
    dash: p.dash ?? 'solid',
  };
}

export function createLine(p: Partial<LineEl> = {}): LineEl {
  return {
    ...base({ name: p.name ?? 'Line', width: p.width ?? 240, height: 0, ...p, }),
    height: 0,
    type: 'line',
    stroke: p.stroke ?? '#0F1A2B',
    strokeWidth: p.strokeWidth ?? 2,
    dash: p.dash ?? 'solid',
    cap: p.cap ?? 'butt',
  };
}

export function createImage(src: string, p: Partial<ImageEl> = {}): ImageEl {
  return {
    ...base({ name: p.name ?? 'Image', width: p.width ?? 160, height: p.height ?? 160, ...p }),
    type: 'image',
    src,
    fit: p.fit ?? 'contain',
    cornerRadius: p.cornerRadius ?? 0,
  };
}

export function createQr(p: Partial<QrEl> = {}): QrEl {
  const size = p.width ?? 90;
  return {
    ...base({ name: p.name ?? 'QR code', width: size, height: size, ...p }),
    width: size,
    height: size,
    type: 'qr',
    fg: p.fg ?? '#0F1A2B',
    bg: p.bg === undefined ? '#FFFFFF' : p.bg,
  };
}

export function blankDesign(width = 842, height = 595): Design {
  return {
    version: 2,
    width,
    height,
    background: { fill: { kind: 'solid', color: '#FFFFFF' }, image: null },
    elements: [],
  };
}

/* ------------------------------------------------------------------ */
/* Text layout shared by every renderer                                */
/* ------------------------------------------------------------------ */

export interface LaidOutLine {
  text: string;
  baselineY: number;
}

export interface TextLayout {
  anchorX: number;
  anchor: 'start' | 'middle' | 'end';
  lines: LaidOutLine[];
  lineHeightPx: number;
  totalHeight: number;
}

/** Baseline offset inside a line box, as a fraction of the font size, measured from the line box centre. */
export const BASELINE_FROM_CENTER = 0.32;

export function layoutText(el: TextEl, resolvedText: string): TextLayout {
  const text = el.uppercase ? resolvedText.toUpperCase() : resolvedText;
  const rawLines = text.split('\n');
  const lineHeightPx = el.fontSize * el.lineHeight;
  const totalHeight = lineHeightPx * rawLines.length;
  let top = el.y;
  if (el.valign === 'middle') top = el.y + (el.height - totalHeight) / 2;
  else if (el.valign === 'bottom') top = el.y + el.height - totalHeight;
  const anchor = el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'middle';
  const anchorX = el.align === 'left' ? el.x : el.align === 'right' ? el.x + el.width : el.x + el.width / 2;
  return {
    anchorX,
    anchor,
    lineHeightPx,
    totalHeight,
    lines: rawLines.map((t, i) => ({
      text: t,
      baselineY: top + i * lineHeightPx + lineHeightPx / 2 + BASELINE_FROM_CENTER * el.fontSize,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function centerOf(el: Rect): { x: number; y: number } {
  return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
}

export function rotatePoint(px: number, py: number, cx: number, cy: number, degrees: number): { x: number; y: number } {
  const r = (degrees * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = px - cx;
  const dy = py - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** Axis-aligned bounds of an element after rotation. */
export function elementBounds(el: Rect & { rotation: number }): Rect {
  const c = centerOf(el);
  const corners = [
    rotatePoint(el.x, el.y, c.x, c.y, el.rotation),
    rotatePoint(el.x + el.width, el.y, c.x, c.y, el.rotation),
    rotatePoint(el.x + el.width, el.y + el.height, c.x, c.y, el.rotation),
    rotatePoint(el.x, el.y + el.height, c.x, c.y, el.rotation),
  ];
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

export function unionBounds(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.width));
  const maxY = Math.max(...rects.map((r) => r.y + r.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/* ------------------------------------------------------------------ */
/* Conversion to and from the legacy layout                            */
/* ------------------------------------------------------------------ */

/** Opens a legacy layout (textElements + qrCode) as a design. */
export function legacyToDesign(layout: LayoutConfig): Design {
  const width = layout.width || 842;
  const height = layout.height || 595;
  const design = blankDesign(width, height);
  for (const t of layout.textElements || []) {
    const fontSize = t.fontSize || 14;
    const style = (t.fontStyle || '').toUpperCase();
    const align = t.alignment === 'LEFT' ? 'left' : t.alignment === 'RIGHT' ? 'right' : 'center';
    const boxWidth = align === 'center' ? Math.min(width - 40, 640) : 360;
    const boxX = align === 'center' ? t.x - boxWidth / 2 : align === 'left' ? t.x : t.x - boxWidth;
    const lineHeight = 1.2;
    const lineBox = fontSize * lineHeight;
    // invert the shared baseline formula (single line, valign top)
    const top = t.y - (lineBox / 2 + BASELINE_FROM_CENTER * fontSize);
    const fam = (t.fontFamily || 'Helvetica').toLowerCase();
    design.elements.push(
      createText({
        id: t.id,
        name: t.placeholder.length > 24 ? `${t.placeholder.slice(0, 22)}...` : t.placeholder,
        text: t.placeholder,
        x: boxX,
        y: top,
        width: boxWidth,
        height: lineBox,
        fontSize,
        fontFamily: fam.includes('times') ? 'Times' : fam.includes('courier') ? 'Courier' : 'Helvetica',
        bold: style.includes('BOLD'),
        italic: style.includes('ITALIC'),
        color: t.colorHex || '#0F1A2B',
        align,
        lineHeight,
      }),
    );
  }
  if (layout.qrCode?.enabled) {
    design.elements.push(createQr({ x: layout.qrCode.x, y: layout.qrCode.y, width: layout.qrCode.size, height: layout.qrCode.size }));
  }
  return design;
}

/** The design stored on a layout, or a converted legacy layout. */
export function ensureDesign(layout: LayoutConfig | null | undefined): Design {
  if (layout?.design && layout.design.version === 2) return layout.design;
  if (layout && Array.isArray(layout.textElements)) return legacyToDesign(layout);
  return blankDesign();
}

/**
 * Builds the layoutConfig sent to the API. It carries the full `design` plus
 * the legacy fields so older renderers still produce a reasonable certificate.
 */
export function layoutConfigFromDesign(design: Design): LayoutConfig {
  const textElements: LegacyTextElement[] = [];
  for (const el of design.elements) {
    if (el.type !== 'text' || el.hidden) continue;
    const lines = el.text.split('\n');
    const first = layoutText(el, lines[0] ?? '').lines[0];
    textElements.push({
      id: el.id,
      placeholder: lines.join(' '),
      x: Math.round(layoutText(el, '').anchorX),
      y: Math.round(first ? first.baselineY : el.y + el.fontSize),
      fontSize: Math.round(el.fontSize),
      fontFamily: /times|serif|playfair|garamond|baskerville|merriweather|lora|cinzel/i.test(el.fontFamily)
        ? 'Times-Roman'
        : /courier|mono/i.test(el.fontFamily)
          ? 'Courier'
          : 'Helvetica',
      fontStyle: el.bold && el.italic ? 'BOLD_ITALIC' : el.bold ? 'BOLD' : el.italic ? 'ITALIC' : 'NORMAL',
      colorHex: el.color,
      alignment: el.align.toUpperCase(),
    });
  }
  const qr = design.elements.find((e): e is QrEl => e.type === 'qr' && !e.hidden);
  return {
    orientation: design.width >= design.height ? 'LANDSCAPE' : 'PORTRAIT',
    width: design.width,
    height: design.height,
    textElements,
    qrCode: qr
      ? { enabled: true, x: Math.round(qr.x), y: Math.round(qr.y), size: Math.round(qr.width) }
      : { enabled: false, x: 0, y: 0, size: 0 },
    design,
  };
}

/** Deep copy for history snapshots and duplicates. */
export function cloneDesign(design: Design): Design {
  return JSON.parse(JSON.stringify(design)) as Design;
}
