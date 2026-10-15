import React, { useEffect, useRef, useState } from 'react';
import { Ban } from 'lucide-react';
import { Popover, cx, normalizeHex } from './controls';

export const SWATCHES = [
  '#0F1A2B', '#2B3A52', '#5A6678', '#B8C0CC', '#FFFFFF', '#FBF6EA',
  '#0B6F69', '#12877F', '#9ED6CF', '#C28A1B', '#D9A53A', '#F5E3B8',
  '#C0392B', '#1F8A4C', '#B76E00', '#8B5A2B', '#3D4F3A', '#6B7A8F',
];

export interface ColorChange {
  transient?: boolean;
}

interface PanelProps {
  value: string | null;
  allowNone?: boolean;
  onChange: (color: string | null, opts?: ColorChange) => void;
  onCommit: () => void;
}

/** Inline colour picker: native picker, hex field and swatches. */
export const ColorPanel: React.FC<PanelProps> = ({ value, allowNone, onChange, onCommit }) => {
  const [hex, setHex] = useState(value ?? '');
  const timer = useRef<number | null>(null);
  useEffect(() => setHex(value ?? ''), [value]);
  useEffect(
    () => () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        onCommit();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const live = (c: string) => {
    onChange(c, { transient: true });
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      onCommit();
    }, 350);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="relative block h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-paper-300">
          <span className="sr-only">Pick a colour</span>
          <input
            type="color"
            value={value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
            onChange={(e) => live(e.target.value.toUpperCase())}
            className="absolute -inset-2 h-14 w-14 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
        <input
          type="text"
          aria-label="Hex colour"
          value={hex}
          placeholder={allowNone && !value ? 'None' : '#000000'}
          onChange={(e) => {
            setHex(e.target.value);
            const n = normalizeHex(e.target.value);
            if (n && n !== value) onChange(n);
          }}
          onBlur={() => setHex(value ?? '')}
          className="num h-9 min-w-0 flex-1 rounded-md border border-paper-300 px-2.5 text-[13px] uppercase focus:border-seal-500 focus:outline-none focus:ring-2 focus:ring-seal-500/20"
        />
      </div>
      <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Colour swatches">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colour ${c}`}
            title={c}
            onClick={() => onChange(c)}
            className={cx(
              'h-7 rounded border border-paper-300 transition-transform hover:scale-105',
              value?.toUpperCase() === c && 'ring-2 ring-seal-500 ring-offset-1',
            )}
            style={{ background: c }}
          />
        ))}
      </div>
      {allowNone && (
        <button type="button" className="btn-secondary btn-sm w-full" onClick={() => onChange(null)} aria-pressed={value === null}>
          <Ban className="h-3.5 w-3.5" aria-hidden="true" />
          No colour
        </button>
      )}
    </div>
  );
};

export const Swatch: React.FC<{ color: string | null; className?: string }> = ({ color, className }) => (
  <span
    aria-hidden="true"
    className={cx('relative block h-5 w-5 shrink-0 overflow-hidden rounded border border-paper-300', className)}
    style={{ background: color ?? '#fff' }}
  >
    {!color && <span className="absolute left-[-3px] top-1/2 block h-px w-[26px] -rotate-45 bg-bad-500" />}
  </span>
);

interface FieldProps extends PanelProps {
  label: string;
  /** Show a text caption beside the swatch. */
  caption?: string;
  buttonClass?: string;
  mixed?: boolean;
}

/** Colour swatch button that opens a popover with the picker. */
export const ColorField: React.FC<FieldProps> = ({ label, caption, buttonClass, mixed, ...panel }) => (
  <Popover
    label={label}
    width={232}
    buttonClass={buttonClass ?? 'inline-flex h-8 shrink-0 items-center gap-2 rounded-md px-1.5 text-[12px] text-ink-600 hover:bg-paper-100'}
    buttonContent={
      <>
        <Swatch color={mixed ? '#CBD3DE' : panel.value} />
        {caption && <span>{caption}</span>}
      </>
    }
  >
    {() => <ColorPanel {...panel} />}
  </Popover>
);
