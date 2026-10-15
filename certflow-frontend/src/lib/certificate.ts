/**
 * Certificate layout types shared by the Template Builder, the SVG renderer,
 * the PDF builder and the demo backend. Coordinates are PDF points
 * (A4 landscape = 842 x 595) measured from the top-left corner. For text, `y`
 * is the baseline and `x` is the anchor point for the chosen alignment.
 */
export interface TextElement {
  id: string;
  placeholder: string;
  x: number;
  y: number;
  fontSize: number;
  /** Helvetica | Times-Roman | Courier */
  fontFamily: string;
  /** NORMAL | BOLD | ITALIC | BOLD_ITALIC */
  fontStyle: string;
  colorHex: string;
  /** LEFT | CENTER | RIGHT */
  alignment: string;
}

export interface QrConfig {
  enabled: boolean;
  /** Top-left corner of the QR square. */
  x: number;
  y: number;
  size: number;
}

export interface LayoutConfig {
  orientation: string;
  width: number;
  height: number;
  textElements: TextElement[];
  qrCode: QrConfig;
  /**
   * Full editor design (version 2). When present, every renderer draws this and
   * ignores textElements and qrCode, which are kept only so older renderers
   * still produce a usable certificate.
   */
  design?: import('./designer').Design;
}

export interface CertificateValues {
  participant_name: string;
  event_name: string;
  organization_name: string;
  certificate_type: string;
  /** Used for both {{issue_date}} and {{date}}. */
  issue_date: string;
  certificate_number: string;
}

export const SAMPLE_VALUES: CertificateValues = {
  participant_name: 'Priya Sharma',
  event_name: 'National AI Hackathon 2026',
  organization_name: 'CertFlow Academy',
  certificate_type: 'Winner',
  issue_date: '16 Oct 2026',
  certificate_number: 'CF-2026-000128',
};

/** Replaces {{placeholders}} with values. Unknown placeholders are left as written. */
export function resolveText(text: string, values: Partial<CertificateValues>): string {
  const map: Record<string, string | undefined> = {
    participant_name: values.participant_name,
    event_name: values.event_name,
    organization_name: values.organization_name,
    certificate_type: values.certificate_type,
    issue_date: values.issue_date,
    date: values.issue_date,
    certificate_number: values.certificate_number,
  };
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (whole, key: string) => {
    const hit = map[key.toLowerCase()];
    return hit === undefined ? whole : hit;
  });
}

export const FALLBACK_LAYOUT: LayoutConfig = {
  orientation: 'LANDSCAPE',
  width: 842,
  height: 595,
  textElements: [
    { id: 'title', placeholder: 'CERTIFICATE OF PARTICIPATION', x: 421, y: 140, fontSize: 30, fontFamily: 'Times-Roman', fontStyle: 'BOLD', colorHex: '#0F1A2B', alignment: 'CENTER' },
    { id: 'to', placeholder: 'THIS IS PRESENTED TO', x: 421, y: 195, fontSize: 13, fontFamily: 'Helvetica', fontStyle: 'NORMAL', colorHex: '#5A6678', alignment: 'CENTER' },
    { id: 'name', placeholder: '{{participant_name}}', x: 421, y: 260, fontSize: 36, fontFamily: 'Times-Roman', fontStyle: 'BOLD', colorHex: '#0B6F69', alignment: 'CENTER' },
    { id: 'event', placeholder: '{{event_name}}', x: 421, y: 330, fontSize: 20, fontFamily: 'Helvetica', fontStyle: 'BOLD', colorHex: '#0F1A2B', alignment: 'CENTER' },
    { id: 'date', placeholder: 'Issued on {{issue_date}}', x: 80, y: 500, fontSize: 12, fontFamily: 'Helvetica', fontStyle: 'NORMAL', colorHex: '#5A6678', alignment: 'LEFT' },
  ],
  qrCode: { enabled: true, x: 690, y: 430, size: 90 },
};
