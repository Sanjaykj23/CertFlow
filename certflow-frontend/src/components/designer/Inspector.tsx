import React from 'react';
import { PanelRightClose, Palette } from 'lucide-react';
import { elementBounds, unionBounds } from '../../lib/designer';
import type { DesignElement } from '../../lib/designer';
import type { Designer } from './store';
import { Field, NumberField, SectionTitle, Slider, fillCss } from './controls';
import { TypeControls } from './StyleControls';
import { PageSizeFields } from './TopBar';

function same(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return vals.every((v) => Math.abs(v - vals[0]) < 1e-6) ? vals[0] : null;
}

export const Inspector: React.FC<{
  designer: Designer;
  onClose: () => void;
  onOpenBackground: () => void;
}> = ({ designer: d, onClose, onOpenBackground }) => {
  const els = d.selectedElements;
  const ids = els.map((e) => e.id);
  const single = els.length === 1 ? els[0] : null;
  const multi = els.length > 1;
  const union = unionBounds(els.map((e) => elementBounds(e)));

  const x = multi ? union?.x ?? null : single ? single.x : null;
  const y = multi ? union?.y ?? null : single ? single.y : null;
  const w = same(els.map((e) => e.width));
  const h = same(els.map((e) => e.height));
  const rot = same(els.map((e) => e.rotation));
  const op = same(els.map((e) => e.opacity));
  const hasLine = els.some((e) => e.type === 'line');
  const allQr = els.every((e) => e.type === 'qr');

  const move = (axis: 'x' | 'y', value: number) => {
    if (multi && union) {
      const delta = value - (axis === 'x' ? union.x : union.y);
      d.update(ids, (el: DesignElement) => ({ [axis]: el[axis] + delta }));
    } else d.update(ids, { [axis]: value });
  };

  const setSize = (axis: 'width' | 'height', value: number) => {
    const v = Math.max(1, value);
    if (allQr) d.update(ids, { width: v, height: v });
    else d.update(ids, { [axis]: v });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-paper-200 px-4 py-2.5">
        <h2 className="panel-title">{els.length === 0 ? 'Page' : multi ? `${els.length} elements` : 'Element'}</h2>
        <button type="button" className="btn-icon" aria-label="Hide inspector" title="Hide inspector" onClick={onClose}>
          <PanelRightClose className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {els.length === 0 ? (
          <div>
            <SectionTitle>Page size</SectionTitle>
            <PageSizeFields designer={d} />
            <SectionTitle>Background</SectionTitle>
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="block h-12 w-16 shrink-0 rounded-md border border-paper-300"
                style={{
                  background: d.design.background.image
                    ? `url("${d.design.background.image.src}") center/cover, ${fillCss(d.design.background.fill)}`
                    : fillCss(d.design.background.fill),
                }}
              />
              <div className="min-w-0 text-[12.5px] text-ink-600">
                <p>
                  {d.design.background.fill.kind === 'solid' ? `Solid ${d.design.background.fill.color}` : 'Gradient fill'}
                </p>
                <p className="text-ink-400">{d.design.background.image ? 'With a background image' : 'No background image'}</p>
              </div>
            </div>
            <button type="button" className="btn-secondary btn-sm mt-3" onClick={onOpenBackground}>
              <Palette className="h-3.5 w-3.5" aria-hidden="true" />
              Edit background
            </button>
            <SectionTitle>Summary</SectionTitle>
            <p className="text-[12.5px] text-ink-500">
              <span className="num">{d.design.elements.length}</span> elements on a{' '}
              <span className="num">
                {Math.round(d.design.width)} x {Math.round(d.design.height)}
              </span>{' '}
              pt page.
            </p>
          </div>
        ) : (
          <div>
            {single ? (
              <Field label="Name">
                <input
                  type="text"
                  aria-label="Element name"
                  value={single.name}
                  onChange={(e) => d.rename(single.id, e.target.value)}
                  className="h-8 w-full rounded-md border border-paper-300 px-2.5 text-[13px] focus:border-seal-500 focus:outline-none focus:ring-2 focus:ring-seal-500/20"
                />
              </Field>
            ) : (
              <p className="text-[12.5px] text-ink-500">Position moves the whole group. Size and rotation apply to each element.</p>
            )}

            <SectionTitle>Position and size</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              <Field label="X"><NumberField label="X position" value={x} suffix="pt" decimals={1} onCommit={(n) => move('x', n)} /></Field>
              <Field label="Y"><NumberField label="Y position" value={y} suffix="pt" decimals={1} onCommit={(n) => move('y', n)} /></Field>
              <Field label="Width"><NumberField label="Width" value={w} min={1} suffix="pt" decimals={1} onCommit={(n) => setSize('width', n)} /></Field>
              <Field label="Height">
                <NumberField label="Height" value={hasLine ? 0 : h} min={1} suffix="pt" decimals={1} disabled={hasLine} onCommit={(n) => setSize('height', n)} />
              </Field>
              <Field label="Rotation"><NumberField label="Rotation in degrees" value={rot} min={-360} max={360} suffix="deg" decimals={1} onCommit={(n) => d.update(ids, { rotation: n })} /></Field>
              <Field label="Opacity">
                <NumberField label="Opacity percent" value={op === null ? null : Math.round(op * 100)} min={0} max={100} decimals={0} suffix="%" onCommit={(n) => d.update(ids, { opacity: n / 100 })} />
              </Field>
            </div>
            <Slider
              className="mt-2"
              label="Opacity slider"
              value={Math.round((op ?? els[0].opacity) * 100)}
              min={0}
              max={100}
              step={1}
              display={(n) => `${n}%`}
              onLive={(n) => d.update(ids, { opacity: n / 100 }, { transient: true })}
              onEnd={d.commit}
            />

            {single?.type === 'text' && (
              <>
                <SectionTitle>Text</SectionTitle>
                <textarea
                  aria-label="Text content"
                  value={single.text}
                  rows={3}
                  onChange={(e) => d.update([single.id], { text: e.target.value }, { transient: true })}
                  onBlur={d.commit}
                  className="block w-full resize-y rounded-md border border-paper-300 px-2.5 py-2 text-[13px] focus:border-seal-500 focus:outline-none focus:ring-2 focus:ring-seal-500/20"
                />
                <p className="hint">Use {'{{participant_name}}'} style fields. Lines break only where you press Enter.</p>
              </>
            )}

            <SectionTitle>Style</SectionTitle>
            <TypeControls d={d} els={els} stacked />
            {els.length > 1 && new Set(els.map((e) => e.type)).size > 1 && !els.every((e) => e.type === 'rect' || e.type === 'ellipse' || e.type === 'line') && (
              <p className="text-[12.5px] text-ink-400">Select elements of one kind to edit their style together.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

