import React from 'react';
import { Circle, Frame, Minus, QrCode, RectangleHorizontal, Square, Rows3 } from 'lucide-react';
import { createEllipse, createLine, createQr, createRect, createText } from '../../lib/designer';
import type { DesignElement, TextEl } from '../../lib/designer';
import { fontCss } from '../../lib/fonts';
import type { Designer } from './store';
import { SectionTitle } from './controls';

/** Centres an element on the page, nudging repeated adds so they do not stack exactly. */
export function placeCentered<T extends DesignElement>(d: Designer, el: T): T {
  const { width: W, height: H, elements } = d.design;
  const w = Math.min(el.width, W - 40);
  const nudge = (elements.length % 6) * 10;
  return { ...el, width: w, x: (W - w) / 2 + nudge, y: (H - el.height) / 2 + nudge };
}

const TEXT_PRESETS: { label: string; sample: string; patch: Partial<TextEl>; previewSize: number }[] = [
  { label: 'Heading', sample: 'Add a heading', previewSize: 22, patch: { name: 'Heading', text: 'Add a heading', fontFamily: 'Playfair Display', fontSize: 44, bold: true, width: 560 } },
  { label: 'Subheading', sample: 'Add a subheading', previewSize: 17, patch: { name: 'Subheading', text: 'Add a subheading', fontFamily: 'Montserrat', fontSize: 24, width: 460, color: '#2B3A52' } },
  { label: 'Body', sample: 'Add body text', previewSize: 14, patch: { name: 'Body text', text: 'Add body text here', fontFamily: 'Lora', fontSize: 16, width: 420, color: '#2B3A52' } },
  { label: 'Caption', sample: 'ADD A CAPTION', previewSize: 11, patch: { name: 'Caption', text: 'Add a caption', fontFamily: 'Montserrat', fontSize: 11, width: 300, color: '#5A6678', uppercase: true, letterSpacing: 1.5 } },
];

const Tile: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={`Add ${label.toLowerCase()}`}
    aria-label={`Add ${label.toLowerCase()}`}
    className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-md border border-paper-200 bg-white text-[12px] font-medium text-ink-700 transition-colors hover:border-seal-500 hover:bg-seal-50"
  >
    {children}
    <span>{label}</span>
  </button>
);

export const ElementsPanel: React.FC<{ designer: Designer }> = ({ designer: d }) => {
  const add = (el: DesignElement) => d.add(placeCentered(d, el));
  return (
    <div className="p-4">
      <SectionTitle>Text</SectionTitle>
      <ul className="space-y-1.5">
        {TEXT_PRESETS.map((p) => (
          <li key={p.label}>
            <button
              type="button"
              aria-label={`Add ${p.label.toLowerCase()}`}
              onClick={() => add(createText(p.patch))}
              className="flex w-full items-center justify-between gap-3 rounded-md border border-paper-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-seal-500 hover:bg-seal-50"
            >
              <span
                className="truncate text-ink"
                style={{
                  fontFamily: fontCss(p.patch.fontFamily ?? 'Montserrat'),
                  fontSize: p.previewSize,
                  fontWeight: p.patch.bold ? 700 : 400,
                  letterSpacing: p.patch.uppercase ? '0.08em' : undefined,
                  color: p.patch.color,
                }}
              >
                {p.sample}
              </span>
              <span className="eyebrow shrink-0">{p.patch.fontSize} pt</span>
            </button>
          </li>
        ))}
      </ul>

      <SectionTitle>Shapes</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <Tile label="Rectangle" onClick={() => add(createRect({ name: 'Rectangle', width: 240, height: 140 }))}>
          <Square className="h-5 w-5" aria-hidden="true" />
        </Tile>
        <Tile label="Rounded" onClick={() => add(createRect({ name: 'Rounded rectangle', width: 240, height: 140, cornerRadius: 24 }))}>
          <RectangleHorizontal className="h-5 w-5" aria-hidden="true" />
        </Tile>
        <Tile label="Circle" onClick={() => add(createEllipse({ name: 'Circle', width: 140, height: 140, fill: { kind: 'solid', color: '#12877F' } }))}>
          <Circle className="h-5 w-5" aria-hidden="true" />
        </Tile>
        <Tile label="Line" onClick={() => add(createLine({ name: 'Line', width: 280, strokeWidth: 2 }))}>
          <Minus className="h-5 w-5" aria-hidden="true" />
        </Tile>
        <Tile
          label="Thick bar"
          onClick={() => add(createRect({ name: 'Bar', width: 360, height: 14, fill: { kind: 'solid', color: '#0F1A2B' } }))}
        >
          <Rows3 className="h-5 w-5" aria-hidden="true" />
        </Tile>
        <Tile
          label="Frame"
          onClick={() => add(createRect({ name: 'Frame', width: 400, height: 280, fill: null, stroke: '#0F1A2B', strokeWidth: 3 }))}
        >
          <Frame className="h-5 w-5" aria-hidden="true" />
        </Tile>
      </div>

      <SectionTitle>Verification</SectionTitle>
      <Tile label="QR code" onClick={() => add(createQr({ name: 'QR code', width: 90 }))}>
        <QrCode className="h-5 w-5" aria-hidden="true" />
      </Tile>
      <p className="hint">The QR code links to the public verification page for each certificate.</p>
    </div>
  );
};
