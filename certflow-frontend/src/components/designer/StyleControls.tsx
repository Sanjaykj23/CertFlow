/**
 * Type-specific style controls, shared by the context toolbar (compact, inline)
 * and the inspector (stacked, labelled).
 */
import React from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold,
  CaseUpper,
  Italic,
  SlidersHorizontal,
  Underline,
} from 'lucide-react';
import type { DashStyle, DesignElement, EllipseEl, FillSpec, ImageEl, ImageFit, LineEl, QrEl, RectEl, TextEl } from '../../lib/designer';
import type { Designer } from './store';
import { ColorField } from './ColorField';
import { FillEditor } from './FillEditor';
import { FontPicker } from './FontPicker';
import { Divider, Field, IconButton, Popover, Segmented, Slider, Stepper } from './controls';

export interface StyleProps {
  d: Designer;
  els: DesignElement[];
  stacked?: boolean;
}

function common<T>(els: DesignElement[], get: (e: DesignElement) => T): T | null {
  if (els.length === 0) return null;
  const first = get(els[0]);
  return els.every((e) => JSON.stringify(get(e)) === JSON.stringify(first)) ? first : null;
}

function useEdit(d: Designer, els: DesignElement[]) {
  const ids = els.map((e) => e.id);
  return {
    set: (patch: Record<string, unknown>) => d.update(ids, patch),
    live: (patch: Record<string, unknown>) => d.update(ids, patch, { transient: true }),
    commit: d.commit,
  };
}

const Row: React.FC<{ stacked?: boolean; label: string; children: React.ReactNode }> = ({ stacked, label, children }) =>
  stacked ? <Field label={label}>{children}</Field> : <>{children}</>;

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96];

const DASHES: { value: DashStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

export const TextControls: React.FC<StyleProps> = ({ d, els, stacked }) => {
  const e = useEdit(d, els);
  const ts = els as TextEl[];
  const size = common(els, (x) => (x as TextEl).fontSize);
  const family = common(els, (x) => (x as TextEl).fontFamily);
  const bold = ts.every((t) => t.bold);
  const italic = ts.every((t) => t.italic);
  const underline = ts.every((t) => t.underline);
  const upper = ts.every((t) => t.uppercase);
  const align = common(els, (x) => (x as TextEl).align);
  const valign = common(els, (x) => (x as TextEl).valign);
  const color = common(els, (x) => (x as TextEl).color);
  const lh = common(els, (x) => (x as TextEl).lineHeight) ?? ts[0].lineHeight;
  const ls = common(els, (x) => (x as TextEl).letterSpacing) ?? ts[0].letterSpacing;

  const spacing = (
    <div className="space-y-3">
      <Field label="Line height">
        <Slider label="Line height" value={lh} min={0.8} max={3} step={0.05} display={(n) => n.toFixed(2)} onLive={(n) => e.live({ lineHeight: n })} onEnd={e.commit} />
      </Field>
      <Field label="Letter spacing">
        <Slider label="Letter spacing" value={ls} min={-5} max={30} step={0.5} display={(n) => `${n} pt`} onLive={(n) => e.live({ letterSpacing: n })} onEnd={e.commit} />
      </Field>
    </div>
  );

  const valignControl = (
    <Segmented
      label="Vertical alignment"
      value={valign}
      onChange={(v) => e.set({ valign: v })}
      options={[
        { value: 'top', label: <AlignVerticalJustifyStart className="h-4 w-4" aria-hidden="true" />, title: 'Align text to top' },
        { value: 'middle', label: <AlignVerticalJustifyCenter className="h-4 w-4" aria-hidden="true" />, title: 'Align text to middle' },
        { value: 'bottom', label: <AlignVerticalJustifyEnd className="h-4 w-4" aria-hidden="true" />, title: 'Align text to bottom' },
      ]}
    />
  );

  const alignControl = (
    <Segmented
      label="Text alignment"
      value={align}
      onChange={(v) => e.set({ align: v })}
      options={[
        { value: 'left', label: <AlignLeft className="h-4 w-4" aria-hidden="true" />, title: 'Align left' },
        { value: 'center', label: <AlignCenter className="h-4 w-4" aria-hidden="true" />, title: 'Align centre' },
        { value: 'right', label: <AlignRight className="h-4 w-4" aria-hidden="true" />, title: 'Align right' },
      ]}
    />
  );

  const toggles = (
    <div className="flex items-center gap-0.5">
      <IconButton label="Bold" pressed={bold} onClick={() => e.set({ bold: !bold })}>
        <Bold className="h-4 w-4" aria-hidden="true" />
      </IconButton>
      <IconButton label="Italic" pressed={italic} onClick={() => e.set({ italic: !italic })}>
        <Italic className="h-4 w-4" aria-hidden="true" />
      </IconButton>
      <IconButton label="Underline" pressed={underline} onClick={() => e.set({ underline: !underline })}>
        <Underline className="h-4 w-4" aria-hidden="true" />
      </IconButton>
      <IconButton label="Uppercase" pressed={upper} onClick={() => e.set({ uppercase: !upper })}>
        <CaseUpper className="h-4 w-4" aria-hidden="true" />
      </IconButton>
    </div>
  );

  const sizeField = (
    <>
      <datalist id="font-sizes">{FONT_SIZES.map((s) => <option key={s} value={s} />)}</datalist>
      <Stepper label="Font size" value={size} min={4} max={400} decimals={1} list="font-sizes" onCommit={(n) => e.set({ fontSize: n })} width={stacked ? 'w-full' : 'w-[96px]'} />
    </>
  );

  const colorField = (
    <ColorField
      label="Text colour"
      value={color ?? ts[0].color}
      mixed={color === null}
      caption={stacked ? (color ?? 'Mixed') : undefined}
      buttonClass={stacked ? 'inline-flex h-8 w-full items-center gap-2 rounded-md border border-paper-300 bg-white px-2 text-[12px] uppercase text-ink-600 hover:border-ink-300' : undefined}
      onChange={(c, o) => c && (o?.transient ? e.live({ color: c }) : e.set({ color: c }))}
      onCommit={e.commit}
    />
  );

  if (stacked) {
    return (
      <div className="space-y-3">
        <Row stacked label="Font"><FontPicker block value={family} onChange={(id) => e.set({ fontFamily: id })} /></Row>
        <div className="grid grid-cols-2 gap-2">
          <Row stacked label="Size">{sizeField}</Row>
          <Row stacked label="Colour">{colorField}</Row>
        </div>
        <Row stacked label="Style">{toggles}</Row>
        <Row stacked label="Align">{alignControl}</Row>
        <Row stacked label="Vertical align">{valignControl}</Row>
        <Row stacked label="Spacing">{spacing}</Row>
      </div>
    );
  }

  return (
    <>
      <FontPicker value={family} onChange={(id) => e.set({ fontFamily: id })} />
      {sizeField}
      <Divider />
      {toggles}
      <Divider />
      {alignControl}
      {colorField}
      <Popover
        label="Spacing and vertical alignment"
        width={248}
        buttonContent={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
      >
        {() => (
          <div className="space-y-3">
            {spacing}
            <Field label="Vertical align">{valignControl}</Field>
          </div>
        )}
      </Popover>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Shapes: rect, ellipse, line                                         */
/* ------------------------------------------------------------------ */

export const ShapeControls: React.FC<StyleProps> = ({ d, els, stacked }) => {
  const e = useEdit(d, els);
  const isLine = els.every((x) => x.type === 'line');
  const allRect = els.every((x) => x.type === 'rect');
  const shapes = els as (RectEl | EllipseEl | LineEl)[];
  const fill = common(els, (x) => (x as RectEl).fill) as FillSpec | null;
  const fillMixed = !isLine && common(els, (x) => JSON.stringify((x as RectEl).fill ?? null)) === null;
  const stroke = common(els, (x) => (x as RectEl).stroke ?? null);
  const strokeMixed = common(els, (x) => (x as RectEl).stroke ?? '__none__') === null;
  const sw = common(els, (x) => (x as RectEl).strokeWidth);
  const dash = common(els, (x) => (x as RectEl).dash);
  const radius = allRect ? common(els, (x) => (x as RectEl).cornerRadius) : null;
  const cap = isLine ? common(els, (x) => (x as LineEl).cap) : null;

  const fillControl = !isLine && (
    <Row stacked={stacked} label="Fill">
      <FillEditor
        label="Fill"
        value={fillMixed ? shapes[0].type === 'line' ? null : (shapes[0] as RectEl).fill : fill}
        mixed={fillMixed}
        caption={stacked ? (fillMixed ? 'Mixed' : fill ? (fill.kind === 'solid' ? fill.color : 'Gradient') : 'None') : undefined}
        onChange={(f, o) => (o?.transient ? e.live({ fill: f }) : e.set({ fill: f }))}
        onCommit={e.commit}
      />
    </Row>
  );

  const strokeControl = (
    <Row stacked={stacked} label={isLine ? 'Colour' : 'Outline'}>
      <ColorField
        label={isLine ? 'Line colour' : 'Outline colour'}
        allowNone={!isLine}
        value={strokeMixed ? '#CBD3DE' : stroke}
        mixed={strokeMixed}
        caption={stacked ? (strokeMixed ? 'Mixed' : stroke ?? 'None') : undefined}
        onChange={(c, o) => (o?.transient ? e.live({ stroke: c }) : e.set({ stroke: c }))}
        onCommit={e.commit}
      />
    </Row>
  );

  const widthControl = (
    <Row stacked={stacked} label="Weight">
      <Stepper label="Outline width" value={sw} min={0} max={80} step={0.5} decimals={1} onCommit={(n) => e.set({ strokeWidth: n })} width={stacked ? 'w-full' : 'w-[96px]'} />
    </Row>
  );

  const dashControl = (
    <Row stacked={stacked} label="Dash">
      <Segmented label="Dash style" value={dash} options={DASHES} onChange={(v) => e.set({ dash: v })} />
    </Row>
  );

  const radiusControl = allRect && (
    <Row stacked={stacked} label="Corner radius">
      <Stepper label="Corner radius" value={radius} min={0} max={400} step={1} decimals={0} onCommit={(n) => e.set({ cornerRadius: n })} width={stacked ? 'w-full' : 'w-[96px]'} />
    </Row>
  );

  const capControl = isLine && (
    <Row stacked={stacked} label="Line ends">
      <Segmented
        label="Line ends"
        value={cap}
        onChange={(v) => e.set({ cap: v })}
        options={[
          { value: 'butt', label: 'Flat' },
          { value: 'round', label: 'Round' },
        ]}
      />
    </Row>
  );

  if (stacked) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {fillControl}
          {strokeControl}
        </div>
        {widthControl}
        {dashControl}
        {radiusControl}
        {capControl}
      </div>
    );
  }
  return (
    <>
      {fillControl}
      {strokeControl}
      {widthControl}
      {dashControl}
      {radiusControl}
      {capControl}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Image                                                               */
/* ------------------------------------------------------------------ */

export const ImageControls: React.FC<StyleProps> = ({ d, els, stacked }) => {
  const e = useEdit(d, els);
  const fit = common(els, (x) => (x as ImageEl).fit);
  const radius = common(els, (x) => (x as ImageEl).cornerRadius);
  const fitOptions: { value: ImageFit; label: string }[] = [
    { value: 'contain', label: 'Contain' },
    { value: 'cover', label: 'Cover' },
    { value: 'fill', label: 'Stretch' },
  ];
  return (
    <div className={stacked ? 'space-y-3' : 'flex items-center gap-2'}>
      <Row stacked={stacked} label="Fit">
        <Segmented label="Image fit" value={fit} options={fitOptions} onChange={(v) => e.set({ fit: v })} />
      </Row>
      <Row stacked={stacked} label="Corner radius">
        <Stepper label="Corner radius" value={radius} min={0} max={500} decimals={0} onCommit={(n) => e.set({ cornerRadius: n })} width={stacked ? 'w-full' : 'w-[96px]'} />
      </Row>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* QR                                                                  */
/* ------------------------------------------------------------------ */

export const QrControls: React.FC<StyleProps> = ({ d, els, stacked }) => {
  const e = useEdit(d, els);
  const fg = common(els, (x) => (x as QrEl).fg);
  const bg = common(els, (x) => (x as QrEl).bg ?? null);
  const bgMixed = common(els, (x) => (x as QrEl).bg ?? '__none__') === null;
  const cap = (s: string | null) => (stacked ? s ?? 'Mixed' : undefined);
  const btn = stacked ? 'inline-flex h-8 w-full items-center gap-2 rounded-md border border-paper-300 bg-white px-2 text-[12px] uppercase text-ink-600 hover:border-ink-300' : undefined;
  return (
    <div className={stacked ? 'grid grid-cols-2 gap-2' : 'flex items-center gap-1'}>
      <Row stacked={stacked} label="Code colour">
        <ColorField
          label="QR foreground colour"
          value={fg ?? '#0F1A2B'}
          mixed={fg === null}
          caption={cap(fg)}
          buttonClass={btn}
          onChange={(c, o) => c && (o?.transient ? e.live({ fg: c }) : e.set({ fg: c }))}
          onCommit={e.commit}
        />
      </Row>
      <Row stacked={stacked} label="Background">
        <ColorField
          label="QR background colour"
          allowNone
          value={bgMixed ? '#CBD3DE' : bg}
          mixed={bgMixed}
          caption={stacked ? (bgMixed ? 'Mixed' : bg ?? 'None') : undefined}
          buttonClass={btn}
          onChange={(c, o) => (o?.transient ? e.live({ bg: c }) : e.set({ bg: c }))}
          onCommit={e.commit}
        />
      </Row>
    </div>
  );
};

/** Picks the right control group for the selection, or nothing for mixed types. */
export const TypeControls: React.FC<StyleProps> = (props) => {
  const { els } = props;
  if (els.length === 0) return null;
  if (els.every((x) => x.type === 'text')) return <TextControls {...props} />;
  if (els.every((x) => x.type === 'rect' || x.type === 'ellipse' || x.type === 'line')) return <ShapeControls {...props} />;
  if (els.every((x) => x.type === 'image')) return <ImageControls {...props} />;
  if (els.every((x) => x.type === 'qr')) return <QrControls {...props} />;
  return null;
};

