import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { FillSpec } from '../../lib/designer';
import { ColorField, ColorPanel } from './ColorField';
import { NumberField, Popover, Segmented, Slider, fillCss } from './controls';

export interface FillChange {
  transient?: boolean;
}

interface PanelProps {
  value: FillSpec | null;
  allowNone?: boolean;
  onChange: (fill: FillSpec | null, opts?: FillChange) => void;
  onCommit: () => void;
}

const DEFAULT_GRADIENT: FillSpec = {
  kind: 'linear',
  angle: 135,
  stops: [
    { offset: 0, color: '#12877F' },
    { offset: 1, color: '#0A5753' },
  ],
};

type Mode = 'none' | 'solid' | 'linear';

/** Inline fill editor: none, solid colour or linear gradient with up to three stops. */
export const FillPanel: React.FC<PanelProps> = ({ value, allowNone = true, onChange, onCommit }) => {
  const mode: Mode = !value ? 'none' : value.kind;

  const setMode = (m: Mode) => {
    if (m === mode) return;
    if (m === 'none') onChange(null);
    else if (m === 'solid') {
      const first = value?.kind === 'linear' ? value.stops[0]?.color : '#12877F';
      onChange({ kind: 'solid', color: first ?? '#12877F' });
    } else {
      if (value?.kind === 'solid') {
        onChange({ kind: 'linear', angle: 135, stops: [{ offset: 0, color: value.color }, { offset: 1, color: '#0F1A2B' }] });
      } else onChange(DEFAULT_GRADIENT);
    }
  };

  const setStop = (i: number, patch: Partial<{ offset: number; color: string }>, opts?: FillChange) => {
    if (value?.kind !== 'linear') return;
    onChange({ ...value, stops: value.stops.map((s, j) => (j === i ? { ...s, ...patch } : s)) }, opts);
  };

  const modes: { value: Mode; label: string }[] = [
    ...(allowNone ? [{ value: 'none' as Mode, label: 'None' }] : []),
    { value: 'solid', label: 'Solid' },
    { value: 'linear', label: 'Gradient' },
  ];

  return (
    <div className="space-y-3">
      <Segmented label="Fill type" value={mode} options={modes} onChange={setMode} />
      {value?.kind === 'solid' && (
        <ColorPanel value={value.color} onChange={(c, o) => c && onChange({ kind: 'solid', color: c }, o)} onCommit={onCommit} />
      )}
      {value?.kind === 'linear' && (
        <div className="space-y-3">
          <div className="h-10 rounded-md border border-paper-300" style={{ background: fillCss(value) }} aria-hidden="true" />
          <div>
            <div className="eyebrow mb-1">Angle</div>
            <Slider
              label="Gradient angle"
              value={value.angle}
              min={0}
              max={360}
              step={1}
              display={(n) => `${Math.round(n)} deg`}
              onLive={(n) => onChange({ ...value, angle: n }, { transient: true })}
              onEnd={onCommit}
            />
          </div>
          <div>
            <div className="eyebrow mb-1">Stops</div>
            <ul className="space-y-1.5">
              {value.stops.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <ColorField
                    label={`Stop ${i + 1} colour`}
                    value={s.color}
                    onChange={(c, o) => c && setStop(i, { color: c }, o)}
                    onCommit={onCommit}
                  />
                  <span className="num flex-1 text-[12px] uppercase text-ink-500">{s.color}</span>
                  <NumberField
                    label={`Stop ${i + 1} position`}
                    value={Math.round(s.offset * 100)}
                    min={0}
                    max={100}
                    decimals={0}
                    suffix="%"
                    className="w-[72px]"
                    onCommit={(n) => setStop(i, { offset: n / 100 })}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    aria-label={`Remove stop ${i + 1}`}
                    title={`Remove stop ${i + 1}`}
                    disabled={value.stops.length <= 2}
                    onClick={() => onChange({ ...value, stops: value.stops.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            {value.stops.length < 3 && (
              <button
                type="button"
                className="btn-secondary btn-sm mt-2"
                onClick={() => onChange({ ...value, stops: [...value.stops, { offset: 0.5, color: '#C28A1B' }] })}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add stop
              </button>
            )}
          </div>
        </div>
      )}
      {mode === 'none' && <p className="text-[12px] text-ink-400">No fill. Only the outline shows.</p>}
    </div>
  );
};

interface FieldProps extends PanelProps {
  label: string;
  caption?: string;
  mixed?: boolean;
}

/** Fill swatch button that opens the fill editor in a popover. */
export const FillEditor: React.FC<FieldProps> = ({ label, caption, mixed, ...panel }) => (
  <Popover
    label={label}
    width={288}
    buttonClass="inline-flex h-8 shrink-0 items-center gap-2 rounded-md px-1.5 text-[12px] text-ink-600 hover:bg-paper-100"
    buttonContent={
      <>
        <span
          aria-hidden="true"
          className="relative block h-5 w-5 shrink-0 overflow-hidden rounded border border-paper-300"
          style={{ background: mixed ? '#CBD3DE' : fillCss(panel.value) }}
        >
          {!panel.value && !mixed && <span className="absolute left-[-3px] top-1/2 block h-px w-[26px] -rotate-45 bg-bad-500" />}
        </span>
        {caption && <span>{caption}</span>}
      </>
    }
  >
    {() => <FillPanel {...panel} />}
  </Popover>
);
