/** Geometry helpers for the design stage: hit testing, handles, resizing. Pure. */
import { DesignElement, Rect, centerOf, rotatePoint } from '../../../lib/designer';
import { normalizeAngle } from '../snapping';

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
export interface Pt {
  x: number;
  y: number;
}

export const HANDLE_DIR: Record<HandleId, [number, number]> = {
  nw: [-1, -1],
  n: [0, -1],
  ne: [1, -1],
  e: [1, 0],
  se: [1, 1],
  s: [0, 1],
  sw: [-1, 1],
  w: [-1, 0],
};

export const MIN_SIZE = 8;

export function handlesFor(el: DesignElement): HandleId[] {
  if (el.type === 'line') return ['w', 'e'];
  if (el.type === 'text') return ['nw', 'ne', 'se', 'sw', 'w', 'e'];
  return ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
}

export function isCorner(h: HandleId): boolean {
  return HANDLE_DIR[h][0] !== 0 && HANDLE_DIR[h][1] !== 0;
}

/** Mouse cursor for a handle on an element rotated by `rotation` degrees. */
export function cursorForHandle(h: HandleId, rotation: number): string {
  const [dx, dy] = HANDLE_DIR[h];
  const ang = normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI + rotation) % 180;
  const idx = Math.round(ang / 45) % 4;
  return ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'][idx];
}

/** Page-space point -> element-local coordinates relative to the element centre. */
export function toLocal(p: Pt, el: Rect & { rotation: number }): Pt {
  const c = centerOf(el);
  const q = rotatePoint(p.x, p.y, c.x, c.y, -el.rotation);
  return { x: q.x - c.x, y: q.y - c.y };
}

/** Is page point p over the (rotated) element? `tol` is extra page points of slack. */
export function hitElement(el: DesignElement, p: Pt, tol = 0): boolean {
  const q = toLocal(p, el);
  const hw = el.width / 2;
  if (el.type === 'line') {
    const hh = Math.max(el.strokeWidth / 2, 0) + tol;
    return Math.abs(q.x) <= hw + tol && Math.abs(q.y) <= hh;
  }
  const hh = el.height / 2;
  if (el.type === 'ellipse') {
    const a = hw + tol;
    const b = hh + tol;
    if (a <= 0 || b <= 0) return false;
    return (q.x / a) ** 2 + (q.y / b) ** 2 <= 1;
  }
  return Math.abs(q.x) <= hw + tol && Math.abs(q.y) <= hh + tol;
}

/** Topmost visible, unlocked element under p (elements are back-to-front). */
export function topmostAt(elements: DesignElement[], p: Pt, tol = 0): DesignElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.hidden || el.locked) continue;
    if (hitElement(el, p, tol)) return el;
  }
  return null;
}

export function corners(el: Rect & { rotation: number }): Pt[] {
  const c = centerOf(el);
  return [
    rotatePoint(el.x, el.y, c.x, c.y, el.rotation),
    rotatePoint(el.x + el.width, el.y, c.x, c.y, el.rotation),
    rotatePoint(el.x + el.width, el.y + el.height, c.x, c.y, el.rotation),
    rotatePoint(el.x, el.y + el.height, c.x, c.y, el.rotation),
  ];
}

/** Does the rotated element overlap the axis-aligned rect? (separating axis test) */
export function elementIntersectsRect(el: Rect & { rotation: number }, r: Rect): boolean {
  const a = corners(el);
  const b: Pt[] = [
    { x: r.x, y: r.y },
    { x: r.x + r.width, y: r.y },
    { x: r.x + r.width, y: r.y + r.height },
    { x: r.x, y: r.y + r.height },
  ];
  const rad = (el.rotation * Math.PI) / 180;
  const axes: Pt[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: Math.cos(rad), y: Math.sin(rad) },
    { x: -Math.sin(rad), y: Math.cos(rad) },
  ];
  for (const ax of axes) {
    const pa = a.map((p) => p.x * ax.x + p.y * ax.y);
    const pb = b.map((p) => p.x * ax.x + p.y * ax.y);
    if (Math.max(...pa) < Math.min(...pb) - 1e-9 || Math.max(...pb) < Math.min(...pa) - 1e-9) return false;
  }
  return true;
}

/**
 * Builds the new page-space box when the handle with direction (sx, sy) is
 * dragged so the box has size w x h, keeping the opposite edge / corner fixed.
 * A zero direction on an axis keeps that axis centred on the original centre.
 */
export function applySize(box: Rect & { rotation: number }, sx: number, sy: number, w: number, h: number): Rect {
  const hw = box.width / 2;
  const hh = box.height / 2;
  const span = (s: number, half: number, size: number): [number, number] =>
    s > 0 ? [-half, -half + size] : s < 0 ? [half - size, half] : [-size / 2, size / 2];
  const [x0, x1] = span(sx, hw, w);
  const [y0, y1] = span(sy, hh, h);
  const c = centerOf(box);
  const nc = rotatePoint(c.x + (x0 + x1) / 2, c.y + (y0 + y1) / 2, c.x, c.y, box.rotation);
  return { x: nc.x - w / 2, y: nc.y - h / 2, width: w, height: h };
}

export interface ResizeInput {
  box: Rect & { rotation: number };
  handle: HandleId;
  /** Pointer position in page space (already including the grab offset). */
  point: Pt;
  /** Corner handles keep the starting aspect ratio. */
  keepAspect: boolean;
  /** Edge handles resize both axes equally (QR codes). */
  square?: boolean;
  /** Height is fixed (lines). */
  fixedHeight?: boolean;
  minSize?: number;
}

export function resizeBox(inp: ResizeInput): Rect {
  const { box, handle, point } = inp;
  const min = inp.minSize ?? MIN_SIZE;
  const [sx, sy] = HANDLE_DIR[handle];
  const lp = toLocal(point, box);
  const hw = box.width / 2;
  const hh = box.height / 2;
  const rawW = sx > 0 ? lp.x + hw : sx < 0 ? hw - lp.x : box.width;
  const rawH = inp.fixedHeight ? box.height : sy > 0 ? lp.y + hh : sy < 0 ? hh - lp.y : box.height;
  let w = box.width;
  let h = box.height;
  if (inp.fixedHeight) {
    w = Math.max(min, rawW);
  } else if (sx !== 0 && sy !== 0) {
    if (inp.keepAspect && box.width > 0 && box.height > 0) {
      let s = Math.max(rawW / box.width, rawH / box.height);
      s = Math.max(s, min / Math.min(box.width, box.height));
      w = box.width * s;
      h = box.height * s;
    } else {
      w = Math.max(min, rawW);
      h = Math.max(min, rawH);
    }
  } else if (sx !== 0) {
    w = Math.max(min, rawW);
    h = inp.square ? w : box.height;
  } else {
    h = Math.max(min, rawH);
    w = inp.square ? h : box.width;
  }
  return applySize(box, sx, sy, w, h);
}

/** Local position of a handle relative to the box centre. */
export function handleLocal(box: Rect, h: HandleId): Pt {
  const [sx, sy] = HANDLE_DIR[h];
  return { x: (sx * box.width) / 2, y: (sy * box.height) / 2 };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
