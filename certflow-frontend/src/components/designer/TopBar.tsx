import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  Grid3x3,
  Loader2,
  Magnet,
  PanelBottom,
  PanelRight,
  Redo2,
  Save,
  TriangleAlert,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PAGE_SIZES } from '../../lib/designer';
import type { Designer } from './store';
import { IconButton, NumberField, Popover, cx } from './controls';

const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

/** Page size presets plus custom width and height. Shared by the top bar and the inspector. */
export const PageSizeFields: React.FC<{ designer: Designer; onDone?: () => void }> = ({ designer: d, onDone }) => {
  const { width, height } = d.design;
  const [w, setW] = useState<number | null>(null);
  const [h, setH] = useState<number | null>(null);
  const cw = w ?? width;
  const ch = h ?? height;
  return (
    <div>
      <ul className="mb-3">
        {PAGE_SIZES.map((p) => {
          const active = p.width === width && p.height === height;
          return (
            <li key={p.id}>
              <button
                type="button"
                className={cx('menu-item', active && 'bg-seal-50 text-seal-800')}
                aria-pressed={active}
                onClick={() => {
                  d.setPage(p.width, p.height);
                  setW(null);
                  setH(null);
                  onDone?.();
                }}
              >
                <span>{p.label}</span>
                <span className="num text-[11.5px] text-ink-400">
                  {p.width} x {p.height}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <div>
          <div className="eyebrow mb-1">Width</div>
          <NumberField label="Custom page width" value={cw} min={100} max={4000} decimals={0} suffix="pt" onCommit={(n) => setW(n)} />
        </div>
        <div>
          <div className="eyebrow mb-1">Height</div>
          <NumberField label="Custom page height" value={ch} min={100} max={4000} decimals={0} suffix="pt" onCommit={(n) => setH(n)} />
        </div>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={cw === width && ch === height}
          onClick={() => {
            d.setPage(Math.round(cw), Math.round(ch));
            setW(null);
            setH(null);
            onDone?.();
          }}
        >
          Apply
        </button>
      </div>
      <p className="alert-warn mt-3 !px-2.5 !py-2 text-[12px]">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Changing the page size does not rescale elements. Check the layout afterwards.</span>
      </p>
    </div>
  );
};

export interface TopBarProps {
  designer: Designer;
  eventId: string;
  name: string;
  onName: (n: string) => void;
  onBack: (e: React.MouseEvent) => void;
  showGrid: boolean;
  onGrid: (v: boolean) => void;
  snap: boolean;
  onSnap: (v: boolean) => void;
  zoom: 'fit' | number;
  effectiveZoom: number;
  onZoom: (z: 'fit' | number) => void;
  preview: boolean;
  onPreview: (v: boolean) => void;
  saving: boolean;
  dirty: boolean;
  onSave: () => void;
  saveError: string | null;
  narrow: boolean;
  onToggleSheet: () => void;
  sheetOpen: boolean;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
}

export const TopBar: React.FC<TopBarProps> = (p) => {
  const d = p.designer;
  const eff = p.effectiveZoom || 1;
  const stepZoom = (dir: 1 | -1) => {
    const next =
      dir > 0 ? ZOOM_STEPS.find((z) => z > eff + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1] : [...ZOOM_STEPS].reverse().find((z) => z < eff - 0.001) ?? ZOOM_STEPS[0];
    p.onZoom(next);
  };

  return (
    <div className="shrink-0 border-b border-paper-200 bg-white">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2">
        <Link to={`/events/${p.eventId}`} onClick={p.onBack} className="btn-ghost btn-sm -ml-1 shrink-0" aria-label="Back to event">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Event</span>
        </Link>
        {p.narrow && (
          <IconButton label="Toggle design panels" pressed={p.sheetOpen} onClick={p.onToggleSheet}>
            <PanelBottom className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        )}
        <input
          type="text"
          aria-label="Template name"
          placeholder="Template name"
          value={p.name}
          onChange={(e) => p.onName(e.target.value)}
          className="h-8 min-w-[120px] max-w-[280px] flex-1 rounded-md border border-transparent bg-transparent px-2 font-display text-[14px] font-semibold text-ink hover:border-paper-300 focus:border-seal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-seal-500/20"
        />
        {p.dirty && <span className="stamp-foil shrink-0">Unsaved</span>}

        <div className="mx-1 hidden h-5 w-px bg-paper-300 sm:block" aria-hidden="true" />
        <IconButton label="Undo" disabled={!d.canUndo} onClick={d.undo}>
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        </IconButton>
        <IconButton label="Redo" disabled={!d.canRedo} onClick={d.redo}>
          <Redo2 className="h-4 w-4" aria-hidden="true" />
        </IconButton>

        <Popover
          label="Page size"
          width={290}
          buttonClass="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-paper-300 bg-white px-2.5 text-[12px] font-medium text-ink-700 hover:border-ink-300"
          buttonContent={
            <>
              <span className="num">
                {Math.round(d.design.width)} x {Math.round(d.design.height)}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
            </>
          }
        >
          {(close) => <PageSizeFields designer={d} onDone={close} />}
        </Popover>

        <IconButton label="Show grid" pressed={p.showGrid} onClick={() => p.onGrid(!p.showGrid)}>
          <Grid3x3 className="h-4 w-4" aria-hidden="true" />
        </IconButton>
        <IconButton label="Snap to guides" pressed={p.snap} onClick={() => p.onSnap(!p.snap)}>
          <Magnet className="h-4 w-4" aria-hidden="true" />
        </IconButton>

        <div className="flex items-center">
          <IconButton label="Zoom out" onClick={() => stepZoom(-1)}>
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <Popover
            label="Zoom level"
            width={160}
            buttonClass="inline-flex h-8 w-[64px] items-center justify-center rounded-md text-[12px] font-medium text-ink-700 hover:bg-paper-100"
            buttonContent={<span className="num">{Math.round(eff * 100)}%</span>}
          >
            {(close) => (
              <ul>
                {(['fit', 0.5, 0.75, 1, 1.5, 2] as const).map((z) => (
                  <li key={z}>
                    <button
                      type="button"
                      className={cx('menu-item', p.zoom === z && 'bg-seal-50 text-seal-800')}
                      aria-pressed={p.zoom === z}
                      onClick={() => {
                        p.onZoom(z);
                        close();
                      }}
                    >
                      {z === 'fit' ? 'Fit to screen' : `${z * 100}%`}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Popover>
          <IconButton label="Zoom in" onClick={() => stepZoom(1)}>
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className={cx('btn-secondary btn-sm', p.preview && '!border-seal-500 !bg-seal-50 !text-seal-800')}
            aria-pressed={p.preview}
            onClick={() => p.onPreview(!p.preview)}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <IconButton label={p.inspectorOpen ? 'Hide inspector' : 'Show inspector'} pressed={p.inspectorOpen} onClick={p.onToggleInspector}>
            <PanelRight className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <button type="button" className="btn-primary btn-sm" disabled={p.saving} onClick={p.onSave} title="Save template (Ctrl+S)">
            {p.saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            {p.saving ? 'Saving' : 'Save'}
          </button>
        </div>
      </div>
      {p.saveError && (
        <div role="alert" className="alert-error mx-3 mb-2 !py-2">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{p.saveError}</span>
        </div>
      )}
    </div>
  );
};
