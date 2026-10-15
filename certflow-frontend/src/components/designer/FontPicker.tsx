import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { FONT_FAMILIES, fontCss, ensureFontsLoaded } from '../../lib/fonts';
import type { FontCategory } from '../../lib/fonts';
import { Popover, cx } from './controls';

const GROUPS: { id: FontCategory; label: string }[] = [
  { id: 'serif', label: 'Serif' },
  { id: 'sans', label: 'Sans serif' },
  { id: 'display', label: 'Display' },
  { id: 'script', label: 'Script' },
  { id: 'mono', label: 'Monospace' },
];

const List: React.FC<{ value: string | null; onPick: (id: string) => void }> = ({ value, onPick }) => {
  const [q, setQ] = useState('');
  useEffect(() => {
    void ensureFontsLoaded();
  }, []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return FONT_FAMILIES.filter((f) => !s || f.label.toLowerCase().includes(s));
  }, [q]);

  return (
    <div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        <input
          autoFocus
          type="search"
          aria-label="Search fonts"
          placeholder="Search fonts"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-8 w-full rounded-md border border-paper-300 pl-8 pr-2 text-[13px] focus:border-seal-500 focus:outline-none focus:ring-2 focus:ring-seal-500/20"
        />
      </div>
      <div className="max-h-[320px] overflow-y-auto">
        {GROUPS.map((g) => {
          const items = filtered.filter((f) => f.category === g.id);
          if (items.length === 0) return null;
          return (
            <section key={g.id} aria-label={g.label}>
              <h4 className="eyebrow px-1 pb-1 pt-2">{g.label}</h4>
              <ul>
                {items.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => onPick(f.id)}
                      aria-pressed={value === f.id}
                      className={cx(
                        'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[17px] leading-tight text-ink hover:bg-paper-100',
                        value === f.id && 'bg-seal-50 text-seal-800',
                      )}
                      style={{ fontFamily: fontCss(f.id) }}
                    >
                      {f.label}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {filtered.length === 0 && <p className="px-2 py-3 text-[13px] text-ink-400">No font matches that search.</p>}
      </div>
    </div>
  );
};

/** Searchable font list. `value` null means mixed. */
export const FontPicker: React.FC<{
  value: string | null;
  onChange: (id: string) => void;
  className?: string;
  block?: boolean;
}> = ({ value, onChange, className, block }) => (
  <Popover
    label="Font family"
    width={280}
    buttonClass={cx(
      'inline-flex h-8 items-center justify-between gap-2 rounded-md border border-paper-300 bg-white px-2.5 text-[13px] text-ink hover:border-ink-300',
      block ? 'w-full' : 'w-[168px] shrink-0',
      className,
    )}
    buttonContent={
      <>
        <span className="truncate" style={{ fontFamily: value ? fontCss(value) : undefined }}>
          {value ?? 'Mixed fonts'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
      </>
    }
  >
    {(close) => (
      <List
        value={value}
        onPick={(id) => {
          void ensureFontsLoaded([id]);
          onChange(id);
          close();
        }}
      />
    )}
  </Popover>
);
