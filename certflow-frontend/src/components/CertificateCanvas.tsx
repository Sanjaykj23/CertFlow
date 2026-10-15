import React, { useId, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  CertificateValues,
  LayoutConfig,
  FALLBACK_LAYOUT,
  SAMPLE_VALUES,
  resolveText,
} from '../lib/certificate';
import type { Design, DashStyle, FillSpec, ImageFit } from '../lib/designer';
import { layoutText } from '../lib/designer';
import { fontCss } from '../lib/fonts';

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
const LegacyCertificateCanvas: React.FC<CertificateCanvasProps> = ({
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

export const CertificateCanvas: React.FC<CertificateCanvasProps> = (props) => {
  if (props.layout?.design) {
    return <DesignCanvas design={props.layout.design} values={props.values} verifyUrl={props.verifyUrl} className={props.className} />;
  }
  return <LegacyCertificateCanvas {...props} />;
};

/* ------------------------------------------------------------------ */
/* DesignCanvas: renders a version 2 Design                            */
/* ------------------------------------------------------------------ */

export interface DesignCanvasProps {
  design: Design;
  /** Values for {{placeholders}}. Defaults to SAMPLE_VALUES. */
  values?: Partial<CertificateValues>;
  /** Encoded into QR elements. */
  verifyUrl?: string;
  /** Draw {{tokens}} as written instead of substituting values (editing view). */
  rawTokens?: boolean;
  /** Element ids that must not be drawn (for example while the text is being edited inline). */
  hideIds?: string[];
  className?: string;
  style?: React.CSSProperties;
  svgRef?: React.Ref<SVGSVGElement>;
}

/** Quiet zone, in QR modules, kept inside a QR element's box on every side. */
const QR_QUIET = 2;

/**
 * Gradient line for a CSS-style angle (0 = towards the top, 90 = towards the
 * right, 180 = towards the bottom) across a box.
 */
function gradientLine(x: number, y: number, w: number, h: number, angle: number) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = x + w / 2;
  const cy = y + h / 2;
  return { x1: cx - (dx * len) / 2, y1: cy - (dy * len) / 2, x2: cx + (dx * len) / 2, y2: cy + (dy * len) / 2 };
}

function dashProps(dash: DashStyle, sw: number): { strokeDasharray?: string; strokeLinecap?: 'round' } {
  if (dash === 'dashed') return { strokeDasharray: `${4 * sw} ${3 * sw}` };
  if (dash === 'dotted') return { strokeDasharray: `1 ${2 * sw}`, strokeLinecap: 'round' };
  return {};
}

function qrModules(url: string): { n: number; cells: [number, number][] } | null {
  try {
    const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    const cells: [number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.modules.get(r, c)) cells.push([r, c]);
    return { n, cells };
  } catch {
    return null;
  }
}

function qrPathFor(m: { n: number; cells: [number, number][] } | null, x: number, y: number, size: number): string {
  if (!m) return '';
  const cell = size / (m.n + 2 * QR_QUIET);
  const ox = x + QR_QUIET * cell;
  const oy = y + QR_QUIET * cell;
  const e = (cell + 0.15).toFixed(2);
  let d = '';
  for (const [r, c] of m.cells) d += `M${(ox + c * cell).toFixed(2)} ${(oy + r * cell).toFixed(2)}h${e}v${e}h-${e}z`;
  return d;
}

function fitAspect(fit: ImageFit): string {
  return fit === 'cover' ? 'xMidYMid slice' : fit === 'contain' ? 'xMidYMid meet' : 'none';
}

export const DesignCanvas: React.FC<DesignCanvasProps> = ({
  design,
  values,
  verifyUrl = 'https://certflow.example/verify/sample-token',
  rawTokens = false,
  hideIds,
  className = '',
  style,
  svgRef,
}) => {
  const rid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const merged = useMemo(() => ({ ...SAMPLE_VALUES, ...(values || {}) }), [values]);
  const qrData = useMemo(() => (design.elements.some((e) => e.type === 'qr') ? qrModules(verifyUrl) : null), [design.elements, verifyUrl]);
  const hidden = useMemo(() => new Set(hideIds || []), [hideIds]);
  const W = design.width;
  const H = design.height;

  const defs: React.ReactNode[] = [];

  const fillRef = (fill: FillSpec | null, key: string, x: number, y: number, w: number, h: number): string => {
    if (!fill) return 'none';
    if (fill.kind === 'solid') return fill.color;
    const id = `g-${rid}-${key}`;
    const l = gradientLine(x, y, w, h, fill.angle);
    defs.push(
      <linearGradient key={id} id={id} gradientUnits="userSpaceOnUse" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}>
        {[...fill.stops]
          .sort((a, b) => a.offset - b.offset)
          .map((s, i) => (
            <stop key={i} offset={s.offset} stopColor={s.color} />
          ))}
      </linearGradient>,
    );
    return `url(#${id})`;
  };

  const bg = design.background;
  const bgFill = fillRef(bg.fill, 'bg', 0, 0, W, H);
  const pageClip = `pc-${rid}`;

  const nodes = design.elements.map((el) => {
    if (el.hidden || hidden.has(el.id)) return null;
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const wrap = (child: React.ReactNode) => (
      <g key={el.id} transform={el.rotation ? `rotate(${el.rotation} ${cx} ${cy})` : undefined} opacity={el.opacity < 1 ? el.opacity : undefined}>
        {child}
      </g>
    );

    switch (el.type) {
      case 'text': {
        const resolved = rawTokens ? el.text : resolveText(el.text, merged);
        const lay = layoutText(el, resolved);
        return wrap(
          <text
            textAnchor={lay.anchor}
            fontFamily={fontCss(el.fontFamily)}
            fontSize={el.fontSize}
            fontWeight={el.bold ? 700 : 400}
            fontStyle={el.italic ? 'italic' : 'normal'}
            letterSpacing={el.letterSpacing || undefined}
            textDecoration={el.underline ? 'underline' : undefined}
            fill={el.color}
            style={{ whiteSpace: 'pre' }}
          >
            {lay.lines.map((ln, i) => (
              <tspan key={i} x={lay.anchorX} y={ln.baselineY}>
                {ln.text.length ? ln.text : '​'}
              </tspan>
            ))}
          </text>,
        );
      }
      case 'rect': {
        const hasStroke = !!el.stroke && el.strokeWidth > 0;
        const r = Math.max(0, Math.min(el.cornerRadius, Math.min(el.width, el.height) / 2));
        return wrap(
          <rect
            x={el.x}
            y={el.y}
            width={el.width}
            height={el.height}
            rx={r || undefined}
            ry={r || undefined}
            fill={fillRef(el.fill, el.id, el.x, el.y, el.width, el.height)}
            stroke={hasStroke ? el.stroke! : 'none'}
            strokeWidth={hasStroke ? el.strokeWidth : undefined}
            {...(hasStroke ? dashProps(el.dash, el.strokeWidth) : {})}
          />,
        );
      }
      case 'ellipse': {
        const hasStroke = !!el.stroke && el.strokeWidth > 0;
        return wrap(
          <ellipse
            cx={cx}
            cy={cy}
            rx={el.width / 2}
            ry={el.height / 2}
            fill={fillRef(el.fill, el.id, el.x, el.y, el.width, el.height)}
            stroke={hasStroke ? el.stroke! : 'none'}
            strokeWidth={hasStroke ? el.strokeWidth : undefined}
            {...(hasStroke ? dashProps(el.dash, el.strokeWidth) : {})}
          />,
        );
      }
      case 'line': {
        const dp = dashProps(el.dash, el.strokeWidth);
        return wrap(
          <line
            x1={el.x}
            y1={el.y}
            x2={el.x + el.width}
            y2={el.y}
            stroke={el.stroke}
            strokeWidth={el.strokeWidth}
            strokeLinecap={dp.strokeLinecap ?? el.cap}
            strokeDasharray={dp.strokeDasharray}
          />,
        );
      }
      case 'image': {
        const clipId = `ic-${rid}-${el.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
        const r = Math.max(0, Math.min(el.cornerRadius, Math.min(el.width, el.height) / 2));
        defs.push(
          <clipPath key={clipId} id={clipId}>
            <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={r || undefined} ry={r || undefined} />
          </clipPath>,
        );
        return wrap(
          <image
            href={el.src}
            x={el.x}
            y={el.y}
            width={el.width}
            height={el.height}
            preserveAspectRatio={fitAspect(el.fit)}
            clipPath={el.fit === 'cover' || r > 0 ? `url(#${clipId})` : undefined}
          />,
        );
      }
      case 'qr': {
        return wrap(
          <>
            {el.bg ? <rect x={el.x} y={el.y} width={el.width} height={el.height} fill={el.bg} /> : null}
            <path d={qrPathFor(qrData, el.x, el.y, Math.min(el.width, el.height))} fill={el.fg} />
          </>,
        );
      }
      default:
        return null;
    }
  });

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={`block h-auto w-full ${className}`}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={pageClip}>
          <rect x="0" y="0" width={W} height={H} />
        </clipPath>
        {defs}
      </defs>
      <g clipPath={`url(#${pageClip})`}>
        <rect x="0" y="0" width={W} height={H} fill={bgFill} />
        {bg.image ? (
          <image
            href={bg.image.src}
            x="0"
            y="0"
            width={W}
            height={H}
            preserveAspectRatio={fitAspect(bg.image.fit)}
            opacity={bg.image.opacity}
          />
        ) : null}
        {nodes}
      </g>
    </svg>
  );
};
