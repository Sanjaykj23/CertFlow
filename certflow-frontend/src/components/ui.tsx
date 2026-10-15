import React, { useEffect } from 'react';
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
  <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {back && (
        <Link
          to={back.to}
          className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-500 transition-colors hover:text-seal-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {back.label}
        </Link>
      )}
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
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
    {icon || <Seal size={44} tone="muted" mark="none" />}
    <h3 className="mt-4 font-display text-[16px] font-semibold text-ink">{title}</h3>
    {description && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const Spinner: React.FC<{ className?: string; label?: string }> = ({ className = '', label }) => (
  <span className={`inline-flex items-center gap-2.5 text-[13px] text-ink-500 ${className}`} role="status">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-seal-500 border-t-transparent" />
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
        <div className="flex items-start justify-between gap-4 border-b border-paper-200 px-5 py-4">
          <div className="min-w-0">
            <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink">{title}</h3>
            {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{description}</p>}
          </div>
          <button type="button" className="btn-icon -mr-1.5 -mt-1" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-paper-200 bg-paper-50 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
};

/** Formats an ISO timestamp for tables, e.g. "16 Oct, 00:19". */
export function formatWhen(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
