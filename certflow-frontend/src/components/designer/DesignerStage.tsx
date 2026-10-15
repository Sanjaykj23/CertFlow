/**
 * Interactive editing canvas. The page is rendered by DesignCanvas and an
 * identical-viewBox overlay <svg> sits on top holding every piece of editing UI
 * (outlines, handles, guides, marquee), so one pixel-to-page mapping serves all.
 * All pointer input is handled on the scroller with pointer capture.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DesignCanvas } from '../CertificateCanvas';
import type { CertificateValues } from '../../lib/certificate';
import { DesignElement, Rect, TextEl, centerOf, elementBounds, unionBounds } from '../../lib/designer';
import type { Designer } from './store';
import { Lines, mergeLines, pageLines, rectLines, snapAngle, snapRect, snapValue } from './snapping';
import { useStageShortcuts } from './useStageShortcuts';
import { TextEditor } from './stage/TextEditor';
import {
  HANDLE_DIR,
  HandleId,
  Pt,
  applySize,
  cursorForHandle,
  elementIntersectsRect,
  handleLocal,
  handlesFor,
  hitElement,
  isCorner,
  resizeBox,
  round2,
  topmostAt,
} from './stage/geometry';

/* Optional font helper written by another agent; absent file simply yields {}. */
const fontModules = import.meta.glob('../../lib/fonts{.ts,/index.ts}', { eager: true }) as Record<
  string,
  { fontCss?: (family: string) => string }
>;
const fontCss: ((family: string) => string) | undefined = Object.values(fontModules).find((m) => typeof m.fontCss === 'function')?.fontCss;

export interface DesignerStageProps {
  designer: Designer;
  values?: Partial<CertificateValues>;
  zoom: 'fit' | number;
  onZoom: (z: 'fit' | number) => void;
  onEffectiveZoom?: (scale: number) => void;
  showGrid: boolean;
  snap: boolean;
  preview: boolean;
  className?: string;
}

const SEAL = '#12877F';
const FOIL = '#C28A1B';
const INK = '#0F1A2B';
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const PAD = 56;
const SNAP_PX = 6;
const DRAG_PX = 3;
const ROTATE_OFFSET_PX = 28;
const HANDLE_PX = 9;
const GRID = 20;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

type LabelKind = 'size' | 'angle' | 'pos';

type Gesture =
  | { kind: 'pan'; sx: number; sy: number; left: number; top: number }
  | {
      kind: 'move';
      start: Pt;
      cx: number;
      cy: number;
      ids: string[];
      snapshot: Map<string, DesignElement>;
      bounds: Rect;
      lines: Lines;
      active: boolean;
      collapseTo: string | null;
    }
  | {
      kind: 'resize';
      handle: HandleId;
      el: DesignElement;
      offset: Pt;
      lines: Lines;
    }
  | { kind: 'rotate'; el: DesignElement; center: Pt; a0: number }
  | { kind: 'marquee'; start: Pt; cx: number; cy: number; additive: boolean; base: string[]; active: boolean };

const angleOf = (c: Pt, p: Pt) => (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI;

export const DesignerStage: React.FC<DesignerStageProps> = ({
  designer,
  values,
  zoom,
  onZoom,
  onEffectiveZoom,
  showGrid,
  snap,
  preview,
  className = '',
}) => {
  const { design, selection, selectedElements } = designer;

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverCursor, setHoverCursor] = useState<string>('default');
  const [gestureCursor, setGestureCursor] = useState<string | null>(null);
  const [guides, setGuides] = useState<Lines>({ x: [], y: [] });
  const [labelKind, setLabelKind] = useState<LabelKind | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [space, setSpace] = useState(false);

  /* ------------------------------ scale ------------------------------ */
  const fitScale =
    viewport.w > 0 && viewport.h > 0
      ? Math.min((viewport.w - 2 * PAD) / design.width, (viewport.h - 2 * PAD) / design.height)
      : 1;
  const scale = clampZoom(zoom === 'fit' ? (Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1) : zoom);

  // latest values for event handlers
  const designerRef = useRef(designer);
  designerRef.current = designer;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const spaceRef = useRef(space);
  spaceRef.current = space;
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;
  const effRef = useRef(onEffectiveZoom);
  effRef.current = onEffectiveZoom;
  const gestureRef = useRef<Gesture | null>(null);
  const zoomAnchor = useRef<{ px: number; py: number; ox: number; oy: number; scale: number; at: number } | null>(null);
  const pendingZoom = useRef<{ value: number; timer: number } | null>(null);

  useEffect(() => {
    effRef.current?.(scale);
  }, [scale]);

  /* Track viewport size (ResizeObserver is disconnected on unmount). */
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const read = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setViewport((v) => (v.w === w && v.h === h ? v : { w, h }));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Keep the point under the pointer fixed after a wheel zoom. */
  useLayoutEffect(() => {
    const a = zoomAnchor.current;
    const sc = scrollerRef.current;
    const page = pageRef.current;
    if (!a || !sc || !page) return;
    zoomAnchor.current = null;
    if (Date.now() - a.at > 1000 || Math.abs(a.scale - scale) > 1e-6) return;
    sc.scrollLeft = page.offsetLeft + a.px * scale - a.ox;
    sc.scrollTop = page.offsetTop + a.py * scale - a.oy;
  }, [scale]);

  /* ctrl/cmd + wheel zooms around the pointer. Needs a non-passive listener. */
  useEffect(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const page = pageRef.current;
      if (!page) return;
      const base = pendingZoom.current?.value ?? scaleRef.current;
      const unit = e.deltaMode === 1 ? 0.05 : 0.003;
      const next = clampZoom(base * Math.exp(-e.deltaY * unit));
      const pr = page.getBoundingClientRect();
      const sr = sc.getBoundingClientRect();
      zoomAnchor.current = {
        px: (e.clientX - pr.left) / scaleRef.current,
        py: (e.clientY - pr.top) / scaleRef.current,
        ox: e.clientX - sr.left,
        oy: e.clientY - sr.top,
        scale: next,
        at: Date.now(),
      };
      if (pendingZoom.current) window.clearTimeout(pendingZoom.current.timer);
      pendingZoom.current = {
        value: next,
        timer: window.setTimeout(() => {
          pendingZoom.current = null;
        }, 80),
      };
      onZoomRef.current(next);
    };
    sc.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      sc.removeEventListener('wheel', onWheel);
      if (pendingZoom.current) window.clearTimeout(pendingZoom.current.timer);
    };
  }, []);

  /* ------------------------------ editing ----------------------------- */
  const editingEl = useMemo(
    () => (editingId ? (design.elements.find((e) => e.id === editingId && e.type === 'text') as TextEl | undefined) : undefined),
    [design.elements, editingId],
  );
  useEffect(() => {
    if (editingId && (preview || !editingEl)) setEditingId(null);
  }, [editingId, preview, editingEl]);

  const startEdit = useCallback((id: string) => {
    if (previewRef.current) return;
    const el = designerRef.current.design.elements.find((e) => e.id === id);
    if (!el || el.type !== 'text' || el.locked) return;
    designerRef.current.select([id]);
    setEditingId(id);
  }, []);

  const finishEdit = (text: string, refocus: boolean) => {
    const el = editingEl;
    setEditingId(null);
    if (el && text !== el.text) {
      const oldLines = el.text.split('\n').length;
      const newLines = text.split('\n').length;
      const lh = el.fontSize * el.lineHeight;
      const auto = Math.abs(el.height - oldLines * lh) < 1;
      const height = auto ? newLines * lh : Math.max(el.height, newLines * lh);
      designerRef.current.update([el.id], { text, height });
    }
    if (refocus) containerRef.current?.focus({ preventScroll: true });
  };

  useStageShortcuts({
    containerRef,
    designer,
    enabled: !preview,
    getScale: () => scaleRef.current,
    onZoom: (z) => onZoomRef.current(z),
    onEditText: startEdit,
    onSpace: setSpace,
  });

  /* ------------------------------ pointer ----------------------------- */
  const toPage = (clientX: number, clientY: number): Pt => {
    const r = pageRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return { x: 0, y: 0 };
    const k = r.width / designerRef.current.design.width;
    return { x: (clientX - r.left) / k, y: (clientY - r.top) / k };
  };

  const otherLines = (excludeIds: string[]): Lines => {
    const d = designerRef.current.design;
    const ex = new Set(excludeIds);
    const rects = d.elements.filter((e) => !e.hidden && !ex.has(e.id)).map((e) => elementBounds(e));
    return mergeLines(pageLines(d.width, d.height), rectLines(rects));
  };

  const endGesture = (cancel: boolean) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g) return;
    const d = designerRef.current;
    if (g.kind === 'move') {
      if (cancel) {
        d.update(g.ids, (el) => g.snapshot.get(el.id) ?? {}, { transient: true });
      } else if (!g.active && g.collapseTo) {
        d.select([g.collapseTo]);
      }
      d.commit();
    } else if (g.kind === 'resize' || g.kind === 'rotate') {
      if (cancel) d.update([g.el.id], g.el as unknown as Record<string, unknown>, { transient: true });
      d.commit();
    }
    setGuides((v) => (v.x.length || v.y.length ? { x: [], y: [] } : v));
    setLabelKind(null);
    setMarquee(null);
    setGestureCursor(null);
  };

  useEffect(() => () => {
    // finish any gesture if the stage unmounts mid-drag
    if (gestureRef.current) endGesture(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const sc = scrollerRef.current;
    if (!sc || gestureRef.current) return;
    const sr = sc.getBoundingClientRect();
    if (e.clientX - sr.left > sc.clientWidth || e.clientY - sr.top > sc.clientHeight) return; // scrollbar
    containerRef.current?.focus({ preventScroll: true });

    const capture = () => {
      try {
        sc.setPointerCapture(e.pointerId);
      } catch {
        /* pointer may already be gone */
      }
    };

    if (e.button === 1 || (e.button === 0 && spaceRef.current)) {
      e.preventDefault();
      gestureRef.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, left: sc.scrollLeft, top: sc.scrollTop };
      setGestureCursor('grabbing');
      capture();
      return;
    }
    if (e.button !== 0 || previewRef.current) return;

    const d = designerRef.current;
    const pt = toPage(e.clientX, e.clientY);
    const k = scaleRef.current;
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    const handleAttr = (e.target as Element).closest?.('[data-handle]')?.getAttribute('data-handle') ?? null;
    const sel = d.selectedElements;

    if (handleAttr && sel.length === 1 && !sel[0].locked) {
      const el = sel[0];
      e.preventDefault();
      if (handleAttr === 'rotate') {
        const c = centerOf(el);
        gestureRef.current = { kind: 'rotate', el: { ...el }, center: c, a0: angleOf(c, pt) };
        setGestureCursor('grabbing');
        setLabelKind('angle');
      } else {
        const h = handleAttr as HandleId;
        const c = centerOf(el);
        const hl = handleLocal(el, h);
        const rad = (el.rotation * Math.PI) / 180;
        const hp = {
          x: c.x + hl.x * Math.cos(rad) - hl.y * Math.sin(rad),
          y: c.y + hl.x * Math.sin(rad) + hl.y * Math.cos(rad),
        };
        gestureRef.current = {
          kind: 'resize',
          handle: h,
          el: { ...el },
          offset: { x: hp.x - pt.x, y: hp.y - pt.y },
          lines: otherLines([el.id]),
        };
        setGestureCursor(cursorForHandle(h, el.rotation));
        setLabelKind('size');
      }
      capture();
      return;
    }

    const hit = topmostAt(d.design.elements, pt, 2 / k);
    if (hit) {
      e.preventDefault();
      let ids: string[];
      let collapseTo: string | null = null;
      if (additive) {
        d.select([hit.id], true);
        if (selection.includes(hit.id)) return; // toggled off: nothing to drag
        ids = [...selection, hit.id];
      } else if (!selection.includes(hit.id)) {
        d.select([hit.id]);
        ids = [hit.id];
      } else {
        ids = selection;
        if (selection.length > 1) collapseTo = hit.id;
      }
      const movable = d.design.elements.filter((el) => ids.includes(el.id) && !el.locked && !el.hidden);
      if (movable.length === 0) return;
      const b = unionBounds(movable.map((m) => elementBounds(m))) as Rect;
      gestureRef.current = {
        kind: 'move',
        start: pt,
        cx: e.clientX,
        cy: e.clientY,
        ids: movable.map((m) => m.id),
        snapshot: new Map(movable.map((m) => [m.id, { ...m }])),
        bounds: b,
        lines: otherLines(movable.map((m) => m.id)),
        active: false,
        collapseTo,
      };
      setGestureCursor('move');
      capture();
      return;
    }

    // empty space: marquee (and clear selection unless extending)
    e.preventDefault();
    if (!additive) d.clearSelection();
    gestureRef.current = {
      kind: 'marquee',
      start: pt,
      cx: e.clientX,
      cy: e.clientY,
      additive,
      base: additive ? selection : [],
      active: false,
    };
    capture();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    const d = designerRef.current;
    const k = scaleRef.current;
    const sc = scrollerRef.current;

    if (!g) {
      if (previewRef.current || e.pointerType === 'touch') return;
      const pt = toPage(e.clientX, e.clientY);
      const handleAttr = (e.target as Element).closest?.('[data-handle]')?.getAttribute('data-handle');
      if (handleAttr) {
        setHoverId((h) => (h === null ? h : null));
        return; // handle shapes carry their own cursor
      }
      const hit = spaceRef.current ? null : topmostAt(d.design.elements, pt, 2 / k);
      setHoverId((h) => (h === (hit?.id ?? null) ? h : hit?.id ?? null));
      const cur = spaceRef.current ? 'grab' : !hit ? 'default' : hit.type === 'text' && !d.selection.includes(hit.id) ? 'text' : 'move';
      setHoverCursor((c) => (c === cur ? c : cur));
      return;
    }

    if (g.kind === 'pan' && sc) {
      sc.scrollLeft = g.left - (e.clientX - g.sx);
      sc.scrollTop = g.top - (e.clientY - g.sy);
      return;
    }

    const pt = toPage(e.clientX, e.clientY);
    const thr = SNAP_PX / k;

    if (g.kind === 'marquee') {
      if (!g.active) {
        if (Math.hypot(e.clientX - g.cx, e.clientY - g.cy) < DRAG_PX) return;
        g.active = true;
      }
      const r: Rect = {
        x: Math.min(g.start.x, pt.x),
        y: Math.min(g.start.y, pt.y),
        width: Math.abs(pt.x - g.start.x),
        height: Math.abs(pt.y - g.start.y),
      };
      setMarquee(r);
      const hits = d.design.elements.filter((el) => !el.hidden && !el.locked && elementIntersectsRect(el, r)).map((el) => el.id);
      const next = g.additive ? [...new Set([...g.base, ...hits])] : hits;
      if (next.join('|') !== d.selection.join('|')) d.select(next);
      return;
    }

    if (g.kind === 'move') {
      if (!g.active) {
        if (Math.hypot(e.clientX - g.cx, e.clientY - g.cy) < DRAG_PX) return;
        g.active = true;
        setLabelKind('pos');
      }
      let dx = pt.x - g.start.x;
      let dy = pt.y - g.start.y;
      let lockX = false;
      let lockY = false;
      if (e.shiftKey) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          dy = 0;
          lockY = true;
        } else {
          dx = 0;
          lockX = true;
        }
      }
      let gd: Lines = { x: [], y: [] };
      if (snapRef.current) {
        const moving: Rect = { ...g.bounds, x: g.bounds.x + dx, y: g.bounds.y + dy };
        const s = snapRect(moving, g.lines, thr);
        if (!lockX) dx += s.dx;
        if (!lockY) dy += s.dy;
        gd = { x: lockX ? [] : s.guides.x, y: lockY ? [] : s.guides.y };
      }
      setGuides(gd);
      const snap = g.snapshot;
      d.update(
        g.ids,
        (el) => {
          const o = snap.get(el.id);
          return o ? { x: round2(o.x + dx), y: round2(o.y + dy) } : {};
        },
        { transient: true },
      );
      return;
    }

    if (g.kind === 'rotate') {
      let rot = g.el.rotation + (angleOf(g.center, pt) - g.a0);
      rot = snapAngle(rot, e.shiftKey ? 15 : null, 3);
      d.update([g.el.id], { rotation: Math.round(rot * 10) / 10 }, { transient: true });
      return;
    }

    if (g.kind === 'resize') {
      const el = g.el;
      let p: Pt = { x: pt.x + g.offset.x, y: pt.y + g.offset.y };
      const [sx, sy] = HANDLE_DIR[g.handle];
      let gd: Lines = { x: [], y: [] };
      if (snapRef.current && el.rotation % 360 === 0) {
        if (sx !== 0) {
          const r = snapValue(p.x, g.lines.x, thr);
          p = { ...p, x: r.value };
          if (r.guide !== null) gd = { ...gd, x: [r.guide] };
        }
        if (sy !== 0 && el.type !== 'line') {
          const r = snapValue(p.y, g.lines.y, thr);
          p = { ...p, y: r.value };
          if (r.guide !== null) gd = { ...gd, y: [r.guide] };
        }
      }
      setGuides(gd);

      if (el.type === 'text' && isCorner(g.handle)) {
        // corner handles scale the font with the box
        const raw = resizeBox({ box: el, handle: g.handle, point: p, keepAspect: true });
        const minS = 4 / el.fontSize;
        const maxS = 600 / el.fontSize;
        const s = Math.min(maxS, Math.max(minS, raw.width / el.width));
        const nb = applySize(el, sx, sy, el.width * s, el.height * s);
        d.update(
          [el.id],
          {
            x: round2(nb.x),
            y: round2(nb.y),
            width: round2(nb.width),
            height: round2(nb.height),
            fontSize: round2(el.fontSize * s),
            letterSpacing: round2(el.letterSpacing * s),
          },
          { transient: true },
        );
        return;
      }
      const forced = el.type === 'image' || el.type === 'qr';
      const nb = resizeBox({
        box: el,
        handle: g.handle,
        point: p,
        keepAspect: isCorner(g.handle) && (e.shiftKey || forced),
        square: el.type === 'qr',
        fixedHeight: el.type === 'line' || el.type === 'text',
      });
      d.update(
        [el.id],
        { x: round2(nb.x), y: round2(nb.y), width: round2(nb.width), height: round2(nb.height) },
        { transient: true },
      );
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      scrollerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    endGesture(false);
  };
  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      scrollerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    endGesture(true);
  };

  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (previewRef.current) return;
    if ((e.target as Element).closest?.('[data-handle]')) return;
    const hit = topmostAt(designerRef.current.design.elements, toPage(e.clientX, e.clientY), 2 / scaleRef.current);
    if (hit && hit.type === 'text') startEdit(hit.id);
  };

  /* ------------------------------ render ------------------------------ */
  const pageW = design.width * scale;
  const pageH = design.height * scale;
  const contentW = Math.max(viewport.w, pageW + 2 * PAD);
  const contentH = Math.max(viewport.h, pageH + 2 * PAD);
  const hideIds = useMemo(() => (editingId ? [editingId] : undefined), [editingId]);

  const showUi = !preview;
  const inv = 1 / scale;
  const selSet = new Set(selection);
  const single = selectedElements.length === 1 ? selectedElements[0] : null;
  const showHandles = showUi && single && !single.locked && !single.hidden && !editingId;
  const selBounds = unionBounds(selectedElements.filter((s) => !s.hidden).map((s) => elementBounds(s)));
  const hoverEl = hoverId && !selSet.has(hoverId) && !gestureRef.current ? design.elements.find((e) => e.id === hoverId) : undefined;

  let labelText = '';
  if (labelKind && selBounds) {
    if (labelKind === 'angle' && single) labelText = `${Math.round(single.rotation)}°`;
    else if (labelKind === 'pos') labelText = `${Math.round(selBounds.x)}, ${Math.round(selBounds.y)}`;
    else if (single) labelText = `${Math.round(single.width)} x ${Math.round(single.height)}`;
    else labelText = `${Math.round(selBounds.width)} x ${Math.round(selBounds.height)}`;
  }

  const frameOf = (el: DesignElement) => {
    const h = el.type === 'line' ? Math.max(el.strokeWidth, 2) : el.height;
    return { x: el.x, y: el.y + (el.height - h) / 2, w: el.width, h };
  };

  const cursor = gestureCursor ?? (space && !preview ? 'grab' : preview ? 'default' : hoverCursor);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="application"
      aria-label="Design canvas"
      className={`relative h-full min-h-0 w-full select-none overflow-hidden bg-paper-100 text-ink outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-seal-500 ${className}`}
    >
      <div
        ref={scrollerRef}
        tabIndex={-1}
        className="absolute inset-0 overflow-auto outline-none"
        style={{ cursor, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={() => endGesture(false)}
        onPointerLeave={() => {
          if (!gestureRef.current) setHoverId(null);
        }}
        onDoubleClick={onDoubleClick}
      >
        <div className="relative flex" style={{ width: contentW, height: contentH }}>
          <div
            ref={pageRef}
            className="relative m-auto flex-none shadow-[0_10px_40px_-8px_rgba(15,26,43,0.28),0_2px_6px_rgba(15,26,43,0.14)]"
            style={{ width: pageW, height: pageH }}
          >
            <div className="pointer-events-none absolute inset-0">
              <DesignCanvas design={design} values={values} rawTokens={!preview} hideIds={hideIds} />
            </div>

            {showUi && (
              <svg
                viewBox={`0 0 ${design.width} ${design.height}`}
                className="absolute inset-0 h-full w-full"
                style={{ overflow: 'visible', pointerEvents: 'none' }}
                aria-hidden="true"
              >
                {showGrid && (
                  <g>
                    <defs>
                      <pattern id="stage-grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                        <path d={`M ${GRID} 0 H 0 V ${GRID}`} fill="none" stroke={INK} strokeOpacity={0.14} strokeWidth={inv} />
                      </pattern>
                    </defs>
                    <rect x={0} y={0} width={design.width} height={design.height} fill="url(#stage-grid)" />
                  </g>
                )}

                {hoverEl && !hoverEl.hidden && (() => {
                  const f = frameOf(hoverEl);
                  const c = centerOf(hoverEl);
                  return (
                    <rect
                      x={f.x}
                      y={f.y}
                      width={f.w}
                      height={f.h}
                      transform={`rotate(${hoverEl.rotation} ${c.x} ${c.y})`}
                      fill="none"
                      stroke={SEAL}
                      strokeOpacity={0.7}
                      strokeWidth={inv}
                    />
                  );
                })()}

                {selectedElements.map((el) => {
                  if (el.hidden) return null;
                  const f = frameOf(el);
                  const c = centerOf(el);
                  return (
                    <rect
                      key={el.id}
                      x={f.x}
                      y={f.y}
                      width={f.w}
                      height={f.h}
                      transform={`rotate(${el.rotation} ${c.x} ${c.y})`}
                      fill="none"
                      stroke={SEAL}
                      strokeWidth={1.5 * inv}
                      strokeDasharray={el.locked ? `${4 * inv} ${3 * inv}` : undefined}
                    />
                  );
                })}

                {selectedElements.length > 1 && selBounds && (
                  <rect
                    x={selBounds.x}
                    y={selBounds.y}
                    width={selBounds.width}
                    height={selBounds.height}
                    fill="none"
                    stroke={SEAL}
                    strokeWidth={1.5 * inv}
                  />
                )}

                {guides.x.map((x) => (
                  <line key={`gx${x}`} x1={x} x2={x} y1={0} y2={design.height} stroke={FOIL} strokeWidth={inv} />
                ))}
                {guides.y.map((y) => (
                  <line key={`gy${y}`} x1={0} x2={design.width} y1={y} y2={y} stroke={FOIL} strokeWidth={inv} />
                ))}

                {marquee && (
                  <rect
                    x={marquee.x}
                    y={marquee.y}
                    width={marquee.width}
                    height={marquee.height}
                    fill={SEAL}
                    fillOpacity={0.08}
                    stroke={SEAL}
                    strokeWidth={inv}
                  />
                )}

                {showHandles && single && (() => {
                  const c = centerOf(single);
                  const hs = HANDLE_PX * inv;
                  const hit = 18 * inv;
                  const topY = c.y - single.height / 2;
                  const ry = topY - ROTATE_OFFSET_PX * inv;
                  return (
                    <g transform={`rotate(${single.rotation} ${c.x} ${c.y})`}>
                      <line x1={c.x} x2={c.x} y1={topY} y2={ry} stroke={SEAL} strokeWidth={inv} />
                      {handlesFor(single).map((h) => {
                        const p = handleLocal(single, h);
                        const hx = c.x + p.x;
                        const hy = c.y + p.y;
                        return (
                          <g key={h}>
                            <rect
                              x={hx - hs / 2}
                              y={hy - hs / 2}
                              width={hs}
                              height={hs}
                              fill="#fff"
                              stroke={SEAL}
                              strokeWidth={1.5 * inv}
                              pointerEvents="none"
                            />
                            <rect
                              data-handle={h}
                              x={hx - hit / 2}
                              y={hy - hit / 2}
                              width={hit}
                              height={hit}
                              fill="transparent"
                              pointerEvents="all"
                              style={{ cursor: cursorForHandle(h, single.rotation) }}
                            />
                          </g>
                        );
                      })}
                      <circle cx={c.x} cy={ry} r={6 * inv} fill="#fff" stroke={SEAL} strokeWidth={1.5 * inv} pointerEvents="none" />
                      <circle
                        data-handle="rotate"
                        cx={c.x}
                        cy={ry}
                        r={11 * inv}
                        fill="transparent"
                        pointerEvents="all"
                        style={{ cursor: 'grab' }}
                      />
                    </g>
                  );
                })()}

                {labelText && selBounds && (
                  <g transform={`translate(${selBounds.x + selBounds.width / 2} ${selBounds.y + selBounds.height + 18 * inv}) scale(${inv})`}>
                    <rect
                      x={-(labelText.length * 3 + 8)}
                      y={-9}
                      width={labelText.length * 6 + 16}
                      height={18}
                      rx={9}
                      fill={INK}
                    />
                    <text className="font-mono" fontSize={10} fill="#fff" textAnchor="middle" dominantBaseline="central" y={0.5}>
                      {labelText}
                    </text>
                  </g>
                )}
              </svg>
            )}

            {showUi && editingEl && (
              <TextEditor
                key={editingEl.id}
                el={editingEl}
                scale={scale}
                pageWidth={design.width}
                fontFamily={fontCss ? fontCss(editingEl.fontFamily) : undefined}
                onDone={finishEdit}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignerStage;
