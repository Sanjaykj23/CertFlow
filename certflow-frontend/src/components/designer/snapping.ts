/**
 * Pure snapping maths for the design stage. No React, no DOM.
 * All values are page points unless noted. Thresholds are passed in page
 * points (callers divide a screen-pixel threshold by the current scale).
 */
import type { Rect } from '../../lib/designer';

export interface Lines {
  /** x positions of vertical lines */
  x: number[];
  /** y positions of horizontal lines */
  y: number[];
}

export interface SnapResult {
  dx: number;
  dy: number;
  /** Lines that the (snapped) rect now sits on. */
  guides: Lines;
}

const EPS = 0.01;

/** Edges and centre lines of the page. */
export function pageLines(width: number, height: number): Lines {
  return { x: [0, width / 2, width], y: [0, height / 2, height] };
}

/** Left / centre / right and top / middle / bottom lines of each rect. */
export function rectLines(rects: Rect[]): Lines {
  const out: Lines = { x: [], y: [] };
  for (const r of rects) {
    out.x.push(r.x, r.x + r.width / 2, r.x + r.width);
    out.y.push(r.y, r.y + r.height / 2, r.y + r.height);
  }
  return out;
}

export function mergeLines(...sets: Lines[]): Lines {
  return { x: sets.flatMap((s) => s.x), y: sets.flatMap((s) => s.y) };
}

function uniqueSorted(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) if (out.length === 0 || Math.abs(out[out.length - 1] - v) > EPS) out.push(v);
  return out;
}

/**
 * Finds the smallest shift that puts any of `values` on any of `lines`, if
 * within `threshold`. Returns delta 0 and line null when nothing is close.
 */
export function snapAxis(values: number[], lines: number[], threshold: number): { delta: number; line: number | null } {
  let best = Infinity;
  let bestLine: number | null = null;
  for (const v of values) {
    for (const l of lines) {
      const d = l - v;
      if (Math.abs(d) <= threshold && Math.abs(d) < Math.abs(best)) {
        best = d;
        bestLine = l;
      }
    }
  }
  return bestLine === null ? { delta: 0, line: null } : { delta: best, line: bestLine };
}

/** Lines in `lines` that any of `values` (after being shifted by `delta`) lies on. */
export function matchingLines(values: number[], delta: number, lines: number[]): number[] {
  const hit: number[] = [];
  for (const l of lines) {
    if (values.some((v) => Math.abs(v + delta - l) <= EPS)) hit.push(l);
  }
  return uniqueSorted(hit);
}

/** Snap a moving rect (edges + centre) against a set of guide lines. */
export function snapRect(moving: Rect, lines: Lines, threshold: number): SnapResult {
  const xs = [moving.x, moving.x + moving.width / 2, moving.x + moving.width];
  const ys = [moving.y, moving.y + moving.height / 2, moving.y + moving.height];
  const sx = snapAxis(xs, lines.x, threshold);
  const sy = snapAxis(ys, lines.y, threshold);
  return {
    dx: sx.delta,
    dy: sy.delta,
    guides: {
      x: sx.line === null ? [] : matchingLines(xs, sx.delta, lines.x),
      y: sy.line === null ? [] : matchingLines(ys, sy.delta, lines.y),
    },
  };
}

/** Snap a single coordinate (a dragged edge) against guide lines. */
export function snapValue(value: number, lines: number[], threshold: number): { value: number; guide: number | null } {
  const r = snapAxis([value], lines, threshold);
  return { value: value + r.delta, guide: r.line };
}

export function normalizeAngle(deg: number): number {
  const a = deg % 360;
  return a < 0 ? a + 360 : a;
}

/**
 * Rotation snapping. With `step` (Shift held) rounds to the nearest step.
 * Otherwise sticks to 0/90/180/270 within `tolerance` degrees.
 */
export function snapAngle(deg: number, step: number | null, tolerance = 3): number {
  const a = normalizeAngle(deg);
  if (step && step > 0) return normalizeAngle(Math.round(a / step) * step);
  for (const t of [0, 90, 180, 270, 360]) {
    if (Math.abs(a - t) <= tolerance) return t === 360 ? 0 : t;
  }
  return a;
}
