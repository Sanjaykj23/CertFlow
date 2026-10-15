import React from 'react';
import { CornerDownRight, Plus } from 'lucide-react';
import { PLACEHOLDERS, createText } from '../../lib/designer';
import type { Designer } from './store';
import { placeCentered } from './ElementsPanel';

export const FieldsPanel: React.FC<{ designer: Designer }> = ({ designer: d }) => {
  const sel = d.selectedElements;
  const target = sel.length === 1 && sel[0].type === 'text' ? sel[0] : null;

  return (
    <div className="p-4">
      <p className="mb-3 text-[12.5px] leading-relaxed text-ink-500">
        Fields fill in with each participant's details when certificates are issued. Click a field to add it as new text.
      </p>
      {target && (
        <p className="alert-info mb-3 !py-2 text-[12px]">
          <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            <strong>{target.name}</strong> is selected. Use the small button on a field to append it there.
          </span>
        </p>
      )}
      <ul className="space-y-1.5">
        {PLACEHOLDERS.map((p) => (
          <li key={p.token} className="flex items-stretch gap-1.5">
            <button
              type="button"
              onClick={() =>
                d.add(
                  placeCentered(
                    d,
                    createText({ name: p.label, text: p.token, fontFamily: 'Montserrat', fontSize: 26, width: 520, bold: p.token === '{{participant_name}}' }),
                  ),
                )
              }
              aria-label={`Add field ${p.label}`}
              className="group flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md border border-paper-200 bg-white px-3 py-2 text-left transition-colors hover:border-seal-500 hover:bg-seal-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-ink">{p.label}</span>
                <span className="num block truncate text-[11px] text-seal-700">{p.token}</span>
                <span className="block truncate text-[11.5px] text-ink-400">e.g. {p.sample}</span>
              </span>
              <Plus className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-seal-600" aria-hidden="true" />
            </button>
            {target && (
              <button
                type="button"
                className="btn-secondary w-9 shrink-0 !px-0"
                title={`Insert ${p.label} into selected text`}
                aria-label={`Insert ${p.label} into selected text`}
                onClick={() => d.update([target.id], { text: `${target.text}${target.text && !target.text.endsWith(' ') && !target.text.endsWith('\n') ? ' ' : ''}${p.token}` })}
              >
                <CornerDownRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
