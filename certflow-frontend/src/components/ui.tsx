import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Seal: the scalloped rosette that anchors the brand                  */
/* ------------------------------------------------------------------ */

type SealTone = 'seal' | 'foil' | 'bad' | 'ink' | 'muted';

const SEAL_COLORS: Record<SealTone, { fill: string; ring: string; mark: string }> = {
  seal: { fill: '#12877F', ring: '#9ED6CF', mark: '#FFFFFF' },
  foil: { fill: '#C28A1B', ring: '#F5E3B8', mark: '#FFFFFF' },
  bad: { fill: '#C0392B', ring: '#F3C3BD', mark: '#FFFFFF' },
  ink: { fill: '#0F1A2B', ring: '#5A6678', mark: '#FFFFFF' },
  muted: { fill: '#CBD3DE', ring: '#E0E5EC', mark: '#5A6678' },
};

function scallopPath(cx: number, cy: number, radius: number, lobes: number, depth: number): string {
  const steps = lobes * 8;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = radius + depth * Math.cos(t * lobes);
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

const SEAL_PATH = scallopPath(50, 50, 42, 14, 4.5);

interface SealProps {
  size?: number;
  tone?: SealTone;
  /** 'check' (verified), 'cross' (revoked), or 'none' */
  mark?: 'check' | 'cross' | 'none';
  className?: string;
}

export const Seal: React.FC<SealProps> = ({ size = 32, tone = 'seal', mark = 'check', className = '' }) => {
  const c = SEAL_COLORS[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d={SEAL_PATH} fill={c.fill} />
      <circle cx="50" cy="50" r="33" fill="none" stroke={c.ring} strokeWidth="2.5" />
      {mark === 'check' && (
        <path d="M34 51l11 11 21-23" fill="none" stroke={c.mark} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {mark === 'cross' && (
        <path d="M36 36l28 28M64 36L36 64" fill="none" stroke={c.mark} strokeWidth="7" strokeLinecap="round" />
      )}
    </svg>
  );
};

export const Logo: React.FC<{ className?: string; size?: number; inverted?: boolean }> = ({
  className = '',
  size = 28,
  inverted = false,
}) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <Seal size={size} tone={inverted ? 'foil' : 'seal'} />
    <span className={`font-display text-[19px] font-semibold tracking-tight ${inverted ? 'text-white' : 'text-ink'}`}>
      CertFlow
    </span>
  </span>
);

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */

interface PageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { to: string; label: string };
}

export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, description, actions, back }) => (
  <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {back && (
        <Link
          to={back.to}
          className="group mb-4 inline-flex items-center gap-1.5 rounded-md text-[12px] font-semibold text-ink-500 transition-colors hover:text-seal-700"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-paper-300 bg-white shadow-panel transition-transform group-hover:-translate-x-0.5">
            <ArrowLeft className="h-3 w-3" />
          </span>
          {back.label}
        </Link>
      )}
      {eyebrow && (
        <p className="eyebrow mb-2.5 flex items-center gap-2">
          <span className="h-px w-4 bg-seal-500/60" aria-hidden="true" />
          {eyebrow}
        </p>
      )}
      <h1 className="page-title">{title}</h1>
      {description && <p className="page-lead">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

/* ------------------------------------------------------------------ */
/* Status stamp                                                        */
/* ------------------------------------------------------------------ */

type StampTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'seal' | 'foil';

const STATUS_TONES: Record<string, StampTone> = {
  GENERATED: 'ok',
  SENT: 'ok',
  ISSUED: 'ok',
  COMPLETED: 'ok',
  DELIVERED: 'ok',
  VALID: 'ok',
  PUBLISHED: 'ok',
  SUCCESS: 'ok',
  ACTIVE: 'ok',
  VERIFIED: 'ok',
  PENDING: 'warn',
  PARTIALLY_FAILED: 'warn',
  QUEUED: 'warn',
  SCHEDULED: 'warn',
  RETRYING: 'warn',
  PROCESSING: 'info',
  RUNNING: 'info',
  IN_PROGRESS: 'info',
  GENERATING: 'info',
  SENDING: 'info',
  FAILED: 'bad',
  REVOKED: 'bad',
  BOUNCED: 'bad',
  ERROR: 'bad',
  DLQ: 'bad',
  REPLACED: 'foil',
  DRAFT: 'neutral',
  NOT_SENT: 'neutral',
  OWNER: 'foil',
  ADMIN: 'seal',
  OPERATOR: 'info',
  VIEWER: 'neutral',
};

const STAMP_CLASS: Record<StampTone, string> = {
  ok: 'stamp-ok',
  warn: 'stamp-warn',
  bad: 'stamp-bad',
  info: 'stamp-info',
  neutral: 'stamp-neutral',
  seal: 'stamp-seal',
  foil: 'stamp-foil',
};

const DOT_CLASS: Record<StampTone, string> = {
  ok: 'bg-ok-500',
  warn: 'bg-warn-500',
  bad: 'bg-bad-500',
  info: 'bg-info-500',
  neutral: 'bg-ink-300',
  seal: 'bg-seal-500',
  foil: 'bg-foil-500',
};

export const StatusStamp: React.FC<{ status?: string | null; tone?: StampTone; label?: string; dot?: boolean }> = ({
  status,
  tone,
  label,
  dot = true,
}) => {
  const key = (status || 'UNKNOWN').toUpperCase().replace(/[\s-]+/g, '_');
  const resolved = tone || STATUS_TONES[key] || 'neutral';
  const live = key === 'PROCESSING' || key === 'RUNNING' || key === 'GENERATING' || key === 'SENDING';
  return (
    <span className={STAMP_CLASS[resolved]}>
      {dot && <i className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[resolved]} ${live ? 'animate-pulse' : ''}`} />}
      {label || key.replace(/_/g, ' ')}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Empty state, spinner, modal                                         */
/* ------------------------------------------------------------------ */

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ title, description, action, icon, className = '' }) => (
  <div className={`flex flex-col items-center px-6 py-14 text-center ${className}`}>
    <div className="relative flex h-20 w-20 items-center justify-center">
      <span className="dot-grid absolute inset-0 rounded-full [mask-image:radial-gradient(circle,black_30%,transparent_70%)]" aria-hidden="true" />
      <span className="absolute inset-2 rounded-full border border-dashed border-paper-300" aria-hidden="true" />
      <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-400 shadow-raise ring-1 ring-paper-200">
        {icon || <Seal size={30} tone="muted" mark="none" />}
      </span>
    </div>
    <h3 className="mt-4 font-display text-[16px] font-semibold tracking-tight text-ink">{title}</h3>
    {description && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const Spinner: React.FC<{ className?: string; label?: string }> = ({ className = '', label }) => (
  <span className={`inline-flex items-center gap-2.5 text-[13px] text-ink-500 ${className}`} role="status">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-seal-500/25 border-t-seal-500" aria-hidden="true" />
    {label}
  </span>
);

export const PageLoading: React.FC<{ label?: string }> = ({ label = 'Loading' }) => (
  <div className="flex h-64 items-center justify-center">
    <Spinner label={label} />
  </div>
);

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width class, default max-w-md */
  width?: string;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, description, children, footer, width = 'max-w-md' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`dialog ${width}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-start justify-between gap-4 border-b border-paper-200 px-6 py-5">
          <div className="min-w-0">
            <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink">{title}</h3>
            {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{description}</p>}
          </div>
          <button type="button" className="btn-icon -mr-1.5 -mt-1" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-paper-200 bg-paper-50/80 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`skeleton block ${className}`} aria-hidden="true" />
);

/** Placeholder rows shaped like a ledger table. */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number; label?: string }> = ({ rows = 6, cols = 5, label = 'Loading' }) => (
  <div role="status" aria-label={label}>
    <div className="flex gap-6 border-b border-paper-200 bg-paper-50/70 px-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-2.5 flex-1 opacity-60" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex items-center gap-6 border-b border-paper-100 px-4 py-4 last:border-b-0">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className={`h-3 flex-1 ${c === 0 ? 'max-w-[180px]' : ''}`} />
        ))}
      </div>
    ))}
    <span className="sr-only">{label}</span>
  </div>
);

/** Full-page placeholder: header, figure row and a table panel. */
export const PageSkeleton: React.FC<{ label?: string; figures?: number }> = ({ label = 'Loading', figures = 4 }) => (
  <div role="status" aria-label={label} className="animate-fade-in">
    <div className="mb-8 space-y-3">
      <Skeleton className="h-2.5 w-28" />
      <Skeleton className="h-8 w-72 max-w-full" />
      <Skeleton className="h-3 w-96 max-w-full" />
    </div>
    {figures > 0 && (
      <div className={`mb-6 grid grid-cols-2 gap-4 ${figures >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {Array.from({ length: figures }).map((_, i) => (
          <div key={i} className="panel space-y-3 p-5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        ))}
      </div>
    )}
    <div className="panel overflow-hidden">
      <div className="panel-head">
        <Skeleton className="h-4 w-40" />
      </div>
      <TableSkeleton rows={5} label={label} />
    </div>
    <span className="sr-only">{label}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Count-up number                                                     */
/* ------------------------------------------------------------------ */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Animates from the previous value to the new one. Honours reduced motion. */
export const CountUp: React.FC<{ value: number; duration?: number; className?: string }> = ({
  value,
  duration = 700,
  className,
}) => {
  const [shown, setShown] = useState(prefersReducedMotion() ? value : 0);
  const from = useRef(shown);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(a + (value - a) * eased);
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration]);
  return <span className={className}>{shown.toLocaleString()}</span>;
};

/* ------------------------------------------------------------------ */
/* Icon chip                                                           */
/* ------------------------------------------------------------------ */

type ChipTone = 'seal' | 'foil' | 'ok' | 'warn' | 'bad' | 'info' | 'ink';

const CHIP_CLASS: Record<ChipTone, string> = {
  seal: 'border-seal-100 bg-seal-50 text-seal-700',
  foil: 'border-foil-100 bg-foil-50 text-foil-600',
  ok: 'border-ok-500/15 bg-ok-50 text-ok-700',
  warn: 'border-warn-500/20 bg-warn-50 text-warn-700',
  bad: 'border-bad-500/15 bg-bad-50 text-bad-700',
  info: 'border-info-500/15 bg-info-50 text-info-700',
  ink: 'border-paper-200 bg-paper-100 text-ink-600',
};

export const IconChip: React.FC<{ tone?: ChipTone; className?: string; children: React.ReactNode }> = ({
  tone = 'seal',
  className = '',
  children,
}) => (
  <span className={`chip-icon ${CHIP_CLASS[tone]} ${className}`} aria-hidden="true">
    {children}
  </span>
);

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

const AVATAR_TONES = [
  'bg-seal-50 text-seal-700 ring-seal-100',
  'bg-foil-50 text-foil-600 ring-foil-100',
  'bg-info-50 text-info-700 ring-info-500/15',
  'bg-paper-100 text-ink-600 ring-paper-200',
  'bg-ok-50 text-ok-700 ring-ok-500/15',
];

/** Initials in a soft circle; the colour is stable for a given name. */
export const Avatar: React.FC<{ name?: string | null; size?: 'sm' | 'md'; className?: string }> = ({
  name,
  size = 'md',
  className = '',
}) => {
  const text = (name || '?').trim();
  const parts = text.split(/[\s@.]+/).filter(Boolean);
  const initials = ((parts[0]?.[0] || '?') + (parts.length > 1 && !text.includes('@') ? parts[1][0] : '')).toUpperCase();
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  const tone = AVATAR_TONES[h % AVATAR_TONES.length];
  const dim = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-8 w-8 text-[12px]';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold ring-1 ${dim} ${tone} ${className}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
};

/** Formats an ISO timestamp for tables, e.g. "16 Oct, 00:19". */
export function formatWhen(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
