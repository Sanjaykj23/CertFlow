import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2, TriangleAlert } from 'lucide-react';
import type { FillSpec, ImageFit } from '../../lib/designer';
import type { Designer } from './store';
import { FillPanel } from './FillEditor';
import { IMAGE_ACCEPT, readImageFile } from './imageFiles';
import { Field, Segmented, SectionTitle, Slider, cx, fillCss } from './controls';

const PRESETS: { name: string; fill: FillSpec }[] = [
  { name: 'White', fill: { kind: 'solid', color: '#FFFFFF' } },
  { name: 'Parchment', fill: { kind: 'linear', angle: 135, stops: [{ offset: 0, color: '#FBF6EA' }, { offset: 1, color: '#EFE3C6' }] } },
  { name: 'Paper', fill: { kind: 'linear', angle: 180, stops: [{ offset: 0, color: '#FFFFFF' }, { offset: 1, color: '#EEF1F5' }] } },
  { name: 'Mist teal', fill: { kind: 'linear', angle: 160, stops: [{ offset: 0, color: '#E8F5F3' }, { offset: 1, color: '#CBEBE6' }] } },
  { name: 'Seal teal', fill: { kind: 'linear', angle: 135, stops: [{ offset: 0, color: '#12877F' }, { offset: 1, color: '#0A5753' }] } },
  { name: 'Deep ink', fill: { kind: 'linear', angle: 160, stops: [{ offset: 0, color: '#2B3A52' }, { offset: 1, color: '#0F1A2B' }] } },
  { name: 'Foil', fill: { kind: 'linear', angle: 135, stops: [{ offset: 0, color: '#F5E3B8' }, { offset: 1, color: '#D9A53A' }] } },
  { name: 'Sage', fill: { kind: 'linear', angle: 150, stops: [{ offset: 0, color: '#EEF3E8' }, { offset: 1, color: '#C9DBB8' }] } },
];

export const BackgroundPanel: React.FC<{ designer: Designer }> = ({ designer: d }) => {
  const bg = d.design.background;
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const img = await readImageFile(file);
      d.setBackground({ image: { src: img.src, fit: bg.image?.fit ?? 'cover', opacity: bg.image?.opacity ?? 1 } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The image could not be read.');
    } finally {
      setBusy(false);
    }
  };

  const setImage = (patch: Partial<{ fit: ImageFit; opacity: number }>, transient = false) => {
    if (!bg.image) return;
    d.setBackground({ image: { ...bg.image, ...patch } }, { transient });
  };

  return (
    <div className="p-4">
      <SectionTitle>Presets</SectionTitle>
      <ul className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <li key={p.name}>
            <button
              type="button"
              title={p.name}
              aria-label={`Use ${p.name} background`}
              onClick={() => d.setBackground({ fill: p.fill })}
              className={cx(
                'block h-12 w-full rounded-md border border-paper-300 transition-transform hover:scale-[1.04]',
                JSON.stringify(bg.fill) === JSON.stringify(p.fill) && 'ring-2 ring-seal-500 ring-offset-1',
              )}
              style={{ background: fillCss(p.fill) }}
            />
          </li>
        ))}
      </ul>

      <SectionTitle>Custom fill</SectionTitle>
      <FillPanel
        value={bg.fill}
        allowNone={false}
        onChange={(f, o) => f && d.setBackground({ fill: f }, { transient: !!o?.transient })}
        onCommit={d.commit}
      />

      <SectionTitle>Background image</SectionTitle>
      {bg.image ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <img src={bg.image.src} alt="Current background" className="h-14 w-20 rounded-md border border-paper-300 object-cover" />
            <div className="flex flex-col gap-1.5">
              <button type="button" className="btn-secondary btn-sm" onClick={() => input.current?.click()} disabled={busy}>
                Replace
              </button>
              <button type="button" className="btn-danger-ghost btn-sm" onClick={() => d.setBackground({ image: null })}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Remove
              </button>
            </div>
          </div>
          <Field label="Fit">
            <Segmented
              label="Background image fit"
              value={bg.image.fit}
              onChange={(v) => setImage({ fit: v })}
              options={[
                { value: 'cover', label: 'Cover' },
                { value: 'contain', label: 'Contain' },
                { value: 'fill', label: 'Stretch' },
              ]}
            />
          </Field>
          <Field label="Opacity">
            <Slider
              label="Background image opacity"
              value={Math.round(bg.image.opacity * 100)}
              min={5}
              max={100}
              step={1}
              display={(n) => `${n}%`}
              onLive={(n) => setImage({ opacity: n / 100 }, true)}
              onEnd={d.commit}
            />
          </Field>
        </div>
      ) : (
        <button type="button" className="btn-secondary w-full" onClick={() => input.current?.click()} disabled={busy}>
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {busy ? 'Reading image' : 'Upload image'}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        aria-label="Upload background image"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = '';
        }}
      />
      {error && (
        <p role="alert" className="alert-error mt-3 !py-2 text-[12px]">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      <p className="hint">PNG, JPEG or SVG, up to 5 MB. The image is saved inside the template.</p>
    </div>
  );
};
