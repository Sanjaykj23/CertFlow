/**
 * Small shared building blocks for the editor panels: popover, number field,
 * slider, segmented control and a few helpers.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus } from 'lucide-react';
import type { FillSpec } from '../../lib/designer';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** CSS for a fill. Angles follow the CSS convention (0 = up, 90 = right, 180 = down). */
export function fillCss(fill: FillSpec | null | undefined): string {
  if (!fill) return 'transparent';
  if (fill.kind === 'solid') return fill.color;
  const stops = [...fill.stops].sort((a, b) => a.offset - b.offset);
  return `linear-gradient(${fill.angle}deg, ${stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ')})`;
}

export function useMedia(query: string): boolean {
  const get = () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches);
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

export function normalizeHex(v: string): string | null {
  let s = v.trim();
  if (!s) return null;
  if (!s.startsWith('#')) s = `#${s}`;
  if (/^#[0-9a-fA-F]{3}$/.test(s)) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toUpperCase() : null;
}

/* ------------------------------------------------------------------ */
/* Popover                                                             */
/* ------------------------------------------------------------------ */

interface PopoverProps {
  label: string;
  buttonClass?: string;
  buttonContent: React.ReactNode;
  width?: number;
  align?: 'start' | 'end';
  disabled?: boolean;
  pressed?: boolean;
  children: (close: () => void) => React.ReactNode;
  onClose?: () => void;
}

export const Popover: React.FC<PopoverProps> = ({
  label,
  buttonClass = 'btn-icon',
  buttonContent,
  width = 240,
  align = 'start',
  disabled,
  children,
  onClose,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; maxH: number }>({ left: 0, top: 0, maxH: 400 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const close = useCallback(() => {
    setOpen(false);
    closeRef.current?.();
  }, []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(width, vw - 16);
    let left = align === 'end' ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    const top = r.bottom + 6;
    setPos({ left, top, maxH: Math.max(160, vh - top - 12) });
  }, [open, width, align]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      if (t.closest('[data-popover-layer]')) return;
      close();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        btnRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('keydown', key, true);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={cx(buttonClass, open && 'bg-paper-100 text-ink')}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {buttonContent}
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            data-popover-layer=""
            role="dialog"
            aria-label={label}
            className="fixed z-[70] overflow-y-auto rounded-md border border-paper-200 bg-white p-3 shadow-pop"
            style={{ left: pos.left, top: pos.top, width: Math.min(width, window.innerWidth - 16), maxHeight: pos.maxH }}
          >
            {children(close)}
          </div>,
          document.body,
        )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  pressed?: boolean;
}

/** Icon button with aria-pressed. Pass `pressed` only for real toggles. */
export const IconButton: React.FC<ToggleProps> = ({ label, pressed, className = '', children, ...rest }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={pressed}
    className={cx(
      'btn-icon shrink-0',
      pressed && 'bg-seal-50 text-seal-700 hover:bg-seal-100 hover:text-seal-800',
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);

export const Divider: React.FC = () => <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-paper-300" />;

/* ------------------------------------------------------------------ */
/* Number field                                                        */
/* ------------------------------------------------------------------ */

interface NumberFieldProps {
  label: string;
  /** null shows a blank (mixed) value. */
  value: number | null;
  onCommit: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  decimals?: number;
  disabled?: boolean;
  className?: string;
  inputClass?: string;
  list?: string;
  suffix?: string;
  prefix?: string;
}

function fmt(n: number | null, decimals: number): string {
  if (n === null || !Number.isFinite(n)) return '';
  return String(Number(n.toFixed(decimals)));
}

export const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  onCommit,
  step = 1,
  min,
  max,
  decimals = 1,
  disabled,
  className,
  inputClass,
  list,
  suffix,
  prefix,
}) => {
  const [text, setText] = useState(fmt(value, decimals));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(fmt(value, decimals));
  }, [value, decimals]);

  const clamp = (n: number) => Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n));

  const apply = () => {
    const n = parseFloat(text.replace(',', '.'));
    if (!Number.isFinite(n)) {
      setText(fmt(value, decimals));
      return;
    }
    const c = clamp(n);
    setText(fmt(c, decimals));
    if (value === null || Math.abs(c - value) > 1e-9) onCommit(c);
  };

  return (
    <div className={cx('relative', className)}>
      {prefix && (
        <span aria-hidden="true" className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[10.5px] text-ink-400">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        title={label}
        list={list}
        disabled={disabled}
        value={text}
        placeholder={value === null ? 'Mixed' : undefined}
        onFocus={(e) => {
          focused.current = true;
          e.currentTarget.select();
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          focused.current = false;
          apply();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            apply();
            (e.currentTarget as HTMLInputElement).select();
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const base = parseFloat(text);
            const cur = Number.isFinite(base) ? base : value ?? 0;
            const d = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
            const next = clamp(Number((cur + d).toFixed(decimals)));
            setText(fmt(next, decimals));
            onCommit(next);
          } else if (e.key === 'Escape') {
            setText(fmt(value, decimals));
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className={cx(
          'num block h-8 w-full rounded-md border border-paper-300 bg-white text-[12.5px] text-ink transition-colors hover:border-ink-300 focus:border-seal-500 focus:outline-none focus:ring-2 focus:ring-seal-500/20 disabled:bg-paper-100 disabled:text-ink-400',
          prefix ? 'pl-6 pr-2' : 'px-2',
          suffix && 'pr-7',
          inputClass,
        )}
      />
      {suffix && (
        <span aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10.5px] text-ink-400">
          {suffix}
        </span>
      )}
    </div>
  );
};

/** Number input with minus and plus buttons. */
export const Stepper: React.FC<NumberFieldProps & { width?: string }> = ({ width = 'w-[88px]', ...p }) => {
  const step = p.step ?? 1;
  const bump = (dir: 1 | -1) => {
    const cur = p.value ?? 0;
    const next = Math.max(p.min ?? -Infinity, Math.min(p.max ?? Infinity, Number((cur + dir * step).toFixed(p.decimals ?? 1))));
    p.onCommit(next);
  };
  return (
    <div className={cx('flex items-center', width)}>
      <button type="button" className="btn-icon h-8 w-6 shrink-0" aria-label={`Decrease ${p.label.toLowerCase()}`} title={`Decrease ${p.label.toLowerCase()}`} onClick={() => bump(-1)} disabled={p.disabled}>
        <Minus className="h-3 w-3" aria-hidden="true" />
      </button>
      <NumberField {...p} className="min-w-0 flex-1" inputClass="text-center px-1" />
      <button type="button" className="btn-icon h-8 w-6 shrink-0" aria-label={`Increase ${p.label.toLowerCase()}`} title={`Increase ${p.label.toLowerCase()}`} onClick={() => bump(1)} disabled={p.disabled}>
        <Plus className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Slider                                                              */
/* ------------------------------------------------------------------ */

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Called continuously while dragging. */
  onLive: (n: number) => void;
  /** Called once when the gesture ends. */
  onEnd: () => void;
  display?: (n: number) => string;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, onLive, onEnd, display, className }) => (
  <div className={cx('flex items-center gap-2', className)}>
    <input
      type="range"
      aria-label={label}
      title={label}
      min={min}
      max={max}
      step={step}
      value={Number.isFinite(value) ? value : min}
      onChange={(e) => onLive(parseFloat(e.target.value))}
      onPointerUp={onEnd}
      onKeyUp={onEnd}
      onBlur={onEnd}
      className="h-5 min-w-0 flex-1 cursor-pointer accent-seal-600"
    />
    <span className="num w-11 shrink-0 text-right text-[11.5px] text-ink-500">{display ? display(value) : String(value)}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T | null;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cx('inline-flex shrink-0 rounded-md border border-paper-300 bg-white p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title ?? (typeof o.label === 'string' ? o.label : String(o.value))}
          aria-label={o.title ?? (typeof o.label === 'string' ? o.label : String(o.value))}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex h-7 min-w-[28px] items-center justify-center rounded px-2 text-[12px] font-medium transition-colors',
            value === o.value ? 'bg-ink text-white' : 'text-ink-600 hover:bg-paper-100',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Label above a control (used in panels and the inspector). */
export const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <div className={className}>
    <div className="eyebrow mb-1">{label}</div>
    {children}
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="eyebrow mb-2 mt-4 border-t border-paper-200 pt-3 first:mt-0 first:border-t-0 first:pt-0">{children}</h3>
);
