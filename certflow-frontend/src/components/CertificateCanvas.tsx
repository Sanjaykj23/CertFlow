import React, { useMemo } from 'react';
import QRCode from 'qrcode';
import {
  CertificateValues,
  LayoutConfig,
  FALLBACK_LAYOUT,
  SAMPLE_VALUES,
  resolveText,
} from '../lib/certificate';

interface CertificateCanvasProps {
  layout?: LayoutConfig | null;
  values?: Partial<CertificateValues>;
  /** Encoded into the QR code. Defaults to a sample link. */
  verifyUrl?: string;
  /** Optional background image (URL or data URI) drawn behind the text. */
  backgroundUrl?: string | null;
  /** Draw a hairline frame when there is no background image. Default true. */
  frame?: boolean;
  className?: string;
}

function svgFont(family: string): string {
  const f = (family || '').toLowerCase();
  if (f.includes('times')) return "'Times New Roman', Times, 'Liberation Serif', serif";
  if (f.includes('courier')) return "'Courier New', Courier, 'Liberation Mono', monospace";
  return "Helvetica, Arial, 'Liberation Sans', sans-serif";
}

function qrPath(url: string, x: number, y: number, size: number): string {
  try {
    const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    const cell = size / n;
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.modules.get(r, c)) {
          const px = (x + c * cell).toFixed(2);
          const py = (y + r * cell).toFixed(2);
          d += `M${px} ${py}h${(cell + 0.2).toFixed(2)}v${(cell + 0.2).toFixed(2)}h-${(cell + 0.2).toFixed(2)}z`;
        }
      }
    }
    return d;
  } catch {
    return '';
  }
}

/**
 * Renders a certificate as inline SVG using the same layout the PDF is built
 * from, so what the organizer designs is what the recipient receives.
 */
export const CertificateCanvas: React.FC<CertificateCanvasProps> = ({
  layout,
  values,
  verifyUrl = 'https://certflow.example/verify/sample-token',
  backgroundUrl,
  frame = true,
  className = '',
}) => {
  const cfg = layout && layout.textElements ? layout : FALLBACK_LAYOUT;
  const merged = { ...SAMPLE_VALUES, ...(values || {}) };
  const width = cfg.width || 842;
  const height = cfg.height || 595;

  const qr = useMemo(() => {
    if (!cfg.qrCode?.enabled) return null;
    return {
      d: qrPath(verifyUrl, cfg.qrCode.x, cfg.qrCode.y, cfg.qrCode.size),
      x: cfg.qrCode.x,
      y: cfg.qrCode.y,
      size: cfg.qrCode.size,
    };
  }, [cfg.qrCode?.enabled, cfg.qrCode?.x, cfg.qrCode?.y, cfg.qrCode?.size, verifyUrl]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`block h-auto w-full bg-white ${className}`}
      role="img"
      aria-label={`Certificate for ${merged.participant_name}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />
      {backgroundUrl ? (
        <image href={backgroundUrl} x="0" y="0" width={width} height={height} preserveAspectRatio="none" />
      ) : frame ? (
        <g fill="none">
          <rect x="14" y="14" width={width - 28} height={height - 28} stroke="#CBD3DE" strokeWidth="1" />
          <rect x="22" y="22" width={width - 44} height={height - 44} stroke="#E0E5EC" strokeWidth="0.75" />
        </g>
      ) : null}

      {cfg.textElements.map((el) => {
        const anchor = el.alignment === 'LEFT' ? 'start' : el.alignment === 'RIGHT' ? 'end' : 'middle';
        const style = (el.fontStyle || '').toUpperCase();
        return (
          <text
            key={el.id}
            x={el.x}
            y={el.y}
            textAnchor={anchor}
            fontSize={el.fontSize}
            fontFamily={svgFont(el.fontFamily)}
            fontWeight={style.includes('BOLD') ? 700 : 400}
            fontStyle={style.includes('ITALIC') ? 'italic' : 'normal'}
            fill={el.colorHex || '#0F1A2B'}
          >
            {resolveText(el.placeholder, merged)}
          </text>
        );
      })}

      {qr && (
        <g>
          <rect x={qr.x - 4} y={qr.y - 4} width={qr.size + 8} height={qr.size + 8} fill="#FFFFFF" />
          <path d={qr.d} fill="#0F1A2B" />
        </g>
      )}
    </svg>
  );
};
