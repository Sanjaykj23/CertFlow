import React, { useMemo, useState } from 'react';
import { DesignCanvas } from '../CertificateCanvas';
import type { Designer } from './store';
import { STARTER_TEMPLATES } from './StarterTemplates';
import type { StarterTemplate } from './StarterTemplates';
import { cx } from './controls';

export const TemplatesPanel: React.FC<{
  designer: Designer;
  onApplied?: (t: StarterTemplate) => void;
}> = ({ designer: d, onApplied }) => {
  const [pending, setPending] = useState<string | null>(null);
  // Built once so thumbnails do not regenerate element ids on every render.
  const built = useMemo(() => STARTER_TEMPLATES.map((t) => ({ t, design: t.build() })), []);

  const apply = (id: string) => {
    const hit = built.find((b) => b.t.id === id);
    if (!hit) return;
    d.load(hit.design);
    onApplied?.(hit.t);
    setPending(null);
  };

  const choose = (id: string) => {
    if (d.design.elements.length === 0) apply(id);
    else setPending(id);
  };

  const pendingName = built.find((b) => b.t.id === pending)?.t.name;

  return (
    <div className="p-4">
      <p className="mb-3 text-[12.5px] leading-relaxed text-ink-500">Start from a finished design. Every text, shape and field stays editable.</p>
      {pending && (
        <div role="alertdialog" aria-label="Confirm replace design" className="alert-warn mb-3 flex-col !items-stretch">
          <p className="font-semibold">Replace current design?</p>
          <p className="text-[12px]">
            <strong>{pendingName}</strong> will replace everything on the page and clear undo history.
          </p>
          <div className="mt-1 flex gap-2">
            <button type="button" className="btn-dark btn-sm" onClick={() => apply(pending)}>
              Replace
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setPending(null)}>
              Keep mine
            </button>
          </div>
        </div>
      )}
      <ul className="grid grid-cols-2 gap-3">
        {built.map(({ t, design }) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => choose(t.id)}
              aria-label={`Use template ${t.name}`}
              title={t.description}
              className={cx(
                'group block w-full rounded-md border bg-white p-1.5 text-left transition-colors hover:border-seal-500',
                pending === t.id ? 'border-seal-500 ring-2 ring-seal-500/30' : 'border-paper-200',
              )}
            >
              <span className="pointer-events-none block overflow-hidden rounded border border-paper-200">
                <DesignCanvas design={design} />
              </span>
              <span className="mt-1.5 block truncate px-0.5 text-[12px] font-semibold text-ink">{t.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
