/**
 * Editor state: the design, the selection, and undo/redo history.
 *
 * Interactions that change the design many times in a row (dragging, resizing,
 * rotating, scrubbing a slider) pass `{ transient: true }` to updateElements()
 * so history is untouched, then call commit() once when the gesture ends. That
 * produces exactly one undo step per gesture.
 */
import { useCallback, useMemo, useReducer } from 'react';
import {
  Design,
  DesignBackground,
  DesignElement,
  Rect,
  cloneDesign,
  elementBounds,
  uid,
  unionBounds,
} from '../../lib/designer';

const HISTORY_LIMIT = 100;

export type ElementPatch = Partial<DesignElement> & Record<string, unknown>;
export type Arrange = 'front' | 'forward' | 'backward' | 'back';
export type AlignTo = 'left' | 'centerH' | 'right' | 'top' | 'middleV' | 'bottom';

interface State {
  design: Design;
  selection: string[];
  past: Design[];
  future: Design[];
  /** Design as it was before the current transient gesture began. */
  pending: Design | null;
  clipboard: DesignElement[];
  /** Bumped on every paste so repeated pastes cascade. */
  pasteCount: number;
}

type Action =
  | { type: 'load'; design: Design }
  | { type: 'select'; ids: string[]; additive: boolean }
  | { type: 'add'; element: DesignElement; select: boolean }
  | { type: 'update'; ids: string[]; patch: ElementPatch | ((el: DesignElement) => ElementPatch); transient: boolean }
  | { type: 'commit' }
  | { type: 'remove'; ids: string[] }
  | { type: 'duplicate'; ids: string[] }
  | { type: 'copy'; ids: string[] }
  | { type: 'paste' }
  | { type: 'arrange'; ids: string[]; mode: Arrange }
  | { type: 'moveLayer'; id: string; toIndex: number }
  | { type: 'background'; patch: Partial<DesignBackground>; transient: boolean }
  | { type: 'page'; width: number; height: number }
  | { type: 'align'; ids: string[]; to: AlignTo }
  | { type: 'distribute'; ids: string[]; axis: 'h' | 'v' }
  | { type: 'undo' }
  | { type: 'redo' };

function pushHistory(state: State, nextDesign: Design, base: Design): State {
  const past = [...state.past, base];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { ...state, design: nextDesign, past, future: [], pending: null };
}

/** Applies a change that should create its own undo step. */
function commitChange(state: State, nextDesign: Design): State {
  const base = state.pending ?? state.design;
  return pushHistory(state, nextDesign, base);
}

function mapElements(design: Design, ids: string[], fn: (el: DesignElement) => DesignElement): Design {
  const set = new Set(ids);
  return { ...design, elements: design.elements.map((el) => (set.has(el.id) ? fn(el) : el)) };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load':
      return { ...state, design: action.design, selection: [], past: [], future: [], pending: null };

    case 'select': {
      const valid = new Set(state.design.elements.map((e) => e.id));
      const ids = action.ids.filter((id) => valid.has(id));
      if (!action.additive) return { ...state, selection: ids };
      const next = new Set(state.selection);
      for (const id of ids) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return { ...state, selection: [...next] };
    }

    case 'add': {
      const next = { ...state.design, elements: [...state.design.elements, action.element] };
      const s = commitChange(state, next);
      return { ...s, selection: action.select ? [action.element.id] : s.selection };
    }

    case 'update': {
      const next = mapElements(state.design, action.ids, (el) => {
        const patch = typeof action.patch === 'function' ? action.patch(el) : action.patch;
        return { ...el, ...patch } as DesignElement;
      });
      if (action.transient) {
        return { ...state, design: next, pending: state.pending ?? state.design };
      }
      return commitChange(state, next);
    }

    case 'commit': {
      if (!state.pending) return state;
      if (JSON.stringify(state.pending) === JSON.stringify(state.design)) return { ...state, pending: null };
      return pushHistory(state, state.design, state.pending);
    }

    case 'remove': {
      const set = new Set(action.ids);
      const next = { ...state.design, elements: state.design.elements.filter((e) => !set.has(e.id)) };
      const s = commitChange(state, next);
      return { ...s, selection: s.selection.filter((id) => !set.has(id)) };
    }

    case 'duplicate': {
      const set = new Set(action.ids);
      const copies: DesignElement[] = [];
      const elements: DesignElement[] = [];
      for (const el of state.design.elements) {
        elements.push(el);
        if (set.has(el.id)) {
          const copy = { ...JSON.parse(JSON.stringify(el)), id: uid(), x: el.x + 16, y: el.y + 16, name: `${el.name} copy`, locked: false } as DesignElement;
          copies.push(copy);
          elements.push(copy);
        }
      }
      if (copies.length === 0) return state;
      const s = commitChange(state, { ...state.design, elements });
      return { ...s, selection: copies.map((c) => c.id) };
    }

    case 'copy': {
      const set = new Set(action.ids);
      const picked = state.design.elements.filter((e) => set.has(e.id)).map((e) => JSON.parse(JSON.stringify(e)) as DesignElement);
      return { ...state, clipboard: picked, pasteCount: 0 };
    }

    case 'paste': {
      if (state.clipboard.length === 0) return state;
      const step = (state.pasteCount + 1) * 16;
      const pasted = state.clipboard.map(
        (e) => ({ ...JSON.parse(JSON.stringify(e)), id: uid(), x: e.x + step, y: e.y + step, locked: false }) as DesignElement,
      );
      const s = commitChange(state, { ...state.design, elements: [...state.design.elements, ...pasted] });
      return { ...s, selection: pasted.map((p) => p.id), pasteCount: state.pasteCount + 1 };
    }

    case 'arrange': {
      const set = new Set(action.ids);
      const els = [...state.design.elements];
      const picked = els.filter((e) => set.has(e.id));
      const rest = els.filter((e) => !set.has(e.id));
      let out: DesignElement[];
      if (action.mode === 'front') out = [...rest, ...picked];
      else if (action.mode === 'back') out = [...picked, ...rest];
      else {
        out = [...els];
        const order = action.mode === 'forward' ? [...out.keys()].reverse() : [...out.keys()];
        for (const i of order) {
          if (!set.has(out[i].id)) continue;
          const j = action.mode === 'forward' ? i + 1 : i - 1;
          if (j < 0 || j >= out.length || set.has(out[j].id)) continue;
          [out[i], out[j]] = [out[j], out[i]];
        }
      }
      if (out.every((e, i) => e.id === els[i].id)) return state;
      return commitChange(state, { ...state.design, elements: out });
    }

    case 'moveLayer': {
      const els = [...state.design.elements];
      const from = els.findIndex((e) => e.id === action.id);
      if (from < 0) return state;
      const [item] = els.splice(from, 1);
      els.splice(Math.max(0, Math.min(els.length, action.toIndex)), 0, item);
      if (els.every((e, i) => e.id === state.design.elements[i].id)) return state;
      return commitChange(state, { ...state.design, elements: els });
    }

    case 'background': {
      const next = { ...state.design, background: { ...state.design.background, ...action.patch } };
      if (action.transient) return { ...state, design: next, pending: state.pending ?? state.design };
      return commitChange(state, next);
    }

    case 'page':
      return commitChange(state, { ...state.design, width: action.width, height: action.height });

    case 'align': {
      const targets = state.design.elements.filter((e) => action.ids.includes(e.id) && !e.locked);
      if (targets.length === 0) return state;
      const bounds = targets.map((e) => elementBounds(e));
      const frame: Rect =
        targets.length === 1
          ? { x: 0, y: 0, width: state.design.width, height: state.design.height }
          : (unionBounds(bounds) as Rect);
      const next = mapElements(state.design, targets.map((t) => t.id), (el) => {
        const b = elementBounds(el);
        let dx = 0;
        let dy = 0;
        if (action.to === 'left') dx = frame.x - b.x;
        if (action.to === 'right') dx = frame.x + frame.width - (b.x + b.width);
        if (action.to === 'centerH') dx = frame.x + frame.width / 2 - (b.x + b.width / 2);
        if (action.to === 'top') dy = frame.y - b.y;
        if (action.to === 'bottom') dy = frame.y + frame.height - (b.y + b.height);
        if (action.to === 'middleV') dy = frame.y + frame.height / 2 - (b.y + b.height / 2);
        return { ...el, x: el.x + dx, y: el.y + dy } as DesignElement;
      });
      return commitChange(state, next);
    }

    case 'distribute': {
      const targets = state.design.elements.filter((e) => action.ids.includes(e.id) && !e.locked);
      if (targets.length < 3) return state;
      const withB = targets.map((e) => ({ e, b: elementBounds(e) }));
      withB.sort((a, b) => (action.axis === 'h' ? a.b.x - b.b.x : a.b.y - b.b.y));
      const first = withB[0].b;
      const last = withB[withB.length - 1].b;
      const span = action.axis === 'h' ? last.x + last.width - first.x : last.y + last.height - first.y;
      const total = withB.reduce((sum, w) => sum + (action.axis === 'h' ? w.b.width : w.b.height), 0);
      const gap = (span - total) / (withB.length - 1);
      let cursor = action.axis === 'h' ? first.x : first.y;
      const shifts = new Map<string, number>();
      for (const w of withB) {
        const start = action.axis === 'h' ? w.b.x : w.b.y;
        shifts.set(w.e.id, cursor - start);
        cursor += (action.axis === 'h' ? w.b.width : w.b.height) + gap;
      }
      const next = mapElements(state.design, [...shifts.keys()], (el) => {
        const s = shifts.get(el.id) ?? 0;
        return (action.axis === 'h' ? { ...el, x: el.x + s } : { ...el, y: el.y + s }) as DesignElement;
      });
      return commitChange(state, next);
    }

    case 'undo': {
      // An uncommitted gesture is discarded by undo.
      if (state.pending) return { ...state, design: state.pending, pending: null };
      if (state.past.length === 0) return state;
      const prev = state.past[state.past.length - 1];
      const valid = new Set(prev.elements.map((e) => e.id));
      return {
        ...state,
        design: prev,
        past: state.past.slice(0, -1),
        future: [state.design, ...state.future],
        selection: state.selection.filter((id) => valid.has(id)),
      };
    }

    case 'redo': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const valid = new Set(next.elements.map((e) => e.id));
      return {
        ...state,
        design: next,
        past: [...state.past, state.design],
        future: state.future.slice(1),
        selection: state.selection.filter((id) => valid.has(id)),
      };
    }

    default:
      return state;
  }
}

export interface Designer {
  design: Design;
  selection: string[];
  selectedElements: DesignElement[];
  canUndo: boolean;
  canRedo: boolean;
  hasClipboard: boolean;
  /** Replace the whole design and clear history (opening a template). */
  load: (design: Design) => void;
  select: (ids: string[], additive?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  add: (element: DesignElement, opts?: { select?: boolean }) => void;
  update: (ids: string[], patch: ElementPatch | ((el: DesignElement) => ElementPatch), opts?: { transient?: boolean }) => void;
  commit: () => void;
  remove: (ids?: string[]) => void;
  duplicate: (ids?: string[]) => void;
  copy: (ids?: string[]) => void;
  paste: () => void;
  arrange: (mode: Arrange, ids?: string[]) => void;
  moveLayer: (id: string, toIndex: number) => void;
  setBackground: (patch: Partial<DesignBackground>, opts?: { transient?: boolean }) => void;
  setPage: (width: number, height: number) => void;
  align: (to: AlignTo, ids?: string[]) => void;
  distribute: (axis: 'h' | 'v', ids?: string[]) => void;
  toggleLock: (id: string) => void;
  toggleHidden: (id: string) => void;
  rename: (id: string, name: string) => void;
  undo: () => void;
  redo: () => void;
}

export function useDesigner(initial: Design): Designer {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    design: cloneDesign(initial),
    selection: [],
    past: [],
    future: [],
    pending: null,
    clipboard: [],
    pasteCount: 0,
  }));

  const sel = state.selection;
  const selectedElements = useMemo(
    () => state.design.elements.filter((e) => sel.includes(e.id)),
    [state.design.elements, sel],
  );

  const load = useCallback((design: Design) => dispatch({ type: 'load', design: cloneDesign(design) }), []);
  const select = useCallback((ids: string[], additive = false) => dispatch({ type: 'select', ids, additive }), []);
  const clearSelection = useCallback(() => dispatch({ type: 'select', ids: [], additive: false }), []);
  const selectAll = useCallback(
    () => dispatch({ type: 'select', ids: state.design.elements.filter((e) => !e.hidden && !e.locked).map((e) => e.id), additive: false }),
    [state.design.elements],
  );
  const add = useCallback(
    (element: DesignElement, opts?: { select?: boolean }) => dispatch({ type: 'add', element, select: opts?.select ?? true }),
    [],
  );
  const update = useCallback(
    (ids: string[], patch: ElementPatch | ((el: DesignElement) => ElementPatch), opts?: { transient?: boolean }) =>
      dispatch({ type: 'update', ids, patch, transient: !!opts?.transient }),
    [],
  );
  const commit = useCallback(() => dispatch({ type: 'commit' }), []);
  const remove = useCallback((ids?: string[]) => dispatch({ type: 'remove', ids: ids ?? sel }), [sel]);
  const duplicate = useCallback((ids?: string[]) => dispatch({ type: 'duplicate', ids: ids ?? sel }), [sel]);
  const copy = useCallback((ids?: string[]) => dispatch({ type: 'copy', ids: ids ?? sel }), [sel]);
  const paste = useCallback(() => dispatch({ type: 'paste' }), []);
  const arrange = useCallback((mode: Arrange, ids?: string[]) => dispatch({ type: 'arrange', ids: ids ?? sel, mode }), [sel]);
  const moveLayer = useCallback((id: string, toIndex: number) => dispatch({ type: 'moveLayer', id, toIndex }), []);
  const setBackground = useCallback(
    (patch: Partial<DesignBackground>, opts?: { transient?: boolean }) => dispatch({ type: 'background', patch, transient: !!opts?.transient }),
    [],
  );
  const setPage = useCallback((width: number, height: number) => dispatch({ type: 'page', width, height }), []);
  const align = useCallback((to: AlignTo, ids?: string[]) => dispatch({ type: 'align', ids: ids ?? sel, to }), [sel]);
  const distribute = useCallback((axis: 'h' | 'v', ids?: string[]) => dispatch({ type: 'distribute', ids: ids ?? sel, axis }), [sel]);
  const toggleLock = useCallback(
    (id: string) => dispatch({ type: 'update', ids: [id], patch: (el) => ({ locked: !el.locked }), transient: false }),
    [],
  );
  const toggleHidden = useCallback(
    (id: string) => dispatch({ type: 'update', ids: [id], patch: (el) => ({ hidden: !el.hidden }), transient: false }),
    [],
  );
  const rename = useCallback((id: string, name: string) => dispatch({ type: 'update', ids: [id], patch: { name }, transient: false }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  return {
    design: state.design,
    selection: sel,
    selectedElements,
    canUndo: state.past.length > 0 || state.pending !== null,
    canRedo: state.future.length > 0,
    hasClipboard: state.clipboard.length > 0,
    load,
    select,
    clearSelection,
    selectAll,
    add,
    update,
    commit,
    remove,
    duplicate,
    copy,
    paste,
    arrange,
    moveLayer,
    setBackground,
    setPage,
    align,
    distribute,
    toggleLock,
    toggleHidden,
    rename,
    undo,
    redo,
  };
}
