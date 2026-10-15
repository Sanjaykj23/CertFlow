import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
  CertificateValues,
  LayoutConfig,
  FALLBACK_LAYOUT,
  SAMPLE_VALUES,
  resolveText,
} from './certificate';

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
export function buildCertificatePdf({ layout, values, verifyUrl, backgroundDataUrl }: BuildOptions): jsPDF {
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

export function downloadCertificatePdf(opts: BuildOptions, fileName: string): void {
  buildCertificatePdf(opts).save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
