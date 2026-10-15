import { RefObject, useEffect, useRef } from 'react';
import type { Designer } from './store';

export interface StageShortcutOptions {
  containerRef: RefObject<HTMLElement>;
  designer: Designer;
  /** False in preview mode: all shortcuts are ignored. */
  enabled: boolean;
  getScale: () => number;
  onZoom: (z: 'fit' | number) => void;
  /** Enter on a single selected text element. */
  onEditText: (id: string) => void;
  /** Space key held / released (for pan mode). */
  onSpace: (down: boolean) => void;
}

function isTyping(t: Element | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

const NUDGE_COMMIT_MS = 450;

/**
 * Keyboard shortcuts for the stage. Active while the stage container has focus
 * or the pointer is over it, and no text field is focused.
 */
export function useStageShortcuts(opts: StageShortcutOptions): void {
  const ref = useRef(opts);
  ref.current = opts;

  useEffect(() => {
    const container = opts.containerRef.current;
    let hover = false;
    let nudgeTimer: number | null = null;

    const flushNudge = () => {
      if (nudgeTimer !== null) {
        window.clearTimeout(nudgeTimer);
        nudgeTimer = null;
        ref.current.designer.commit();
      }
    };
    const onEnter = () => {
      hover = true;
    };
    const onLeave = () => {
      hover = false;
    };
    container?.addEventListener('pointerenter', onEnter);
    container?.addEventListener('pointerleave', onLeave);

    const active = (): boolean => {
      const c = ref.current.containerRef.current;
      if (!c || !ref.current.enabled) return false;
      const ae = document.activeElement;
      if (isTyping(ae)) return false;
      return hover || (!!ae && c.contains(ae));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.altKey) return;
      if (!active()) return;
      const { designer, onZoom, getScale, onEditText, onSpace } = ref.current;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const sel = designer.selectedElements;
      const unlocked = sel.filter((s) => !s.locked && !s.hidden);
      const handled = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      const isArrow = key.startsWith('arrow');
      if (!isArrow) flushNudge();

      if (key === ' ' || e.code === 'Space') {
        if (!mod) {
          handled();
          onSpace(true);
        }
        return;
      }
      if (mod) {
        if (key === 'z') {
          handled();
          if (e.shiftKey) designer.redo();
          else designer.undo();
        } else if (key === 'y') {
          handled();
          designer.redo();
        } else if (key === 'c') {
          if (sel.length) {
            handled();
            designer.copy();
          }
        } else if (key === 'v') {
          if (designer.hasClipboard) {
            handled();
            designer.paste();
          }
        } else if (key === 'd') {
          if (unlocked.length) {
            handled();
            designer.duplicate(unlocked.map((s) => s.id));
          }
        } else if (key === 'a') {
          handled();
          designer.selectAll();
        } else if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
          if (unlocked.length) {
            handled();
            const fwd = e.code === 'BracketRight';
            designer.arrange(e.shiftKey ? (fwd ? 'front' : 'back') : fwd ? 'forward' : 'backward', unlocked.map((s) => s.id));
          }
        }
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        if (unlocked.length) {
          handled();
          designer.remove(unlocked.map((s) => s.id));
        }
      } else if (key === 'escape') {
        if (sel.length) {
          handled();
          designer.clearSelection();
        }
      } else if (key === 'enter') {
        if (sel.length === 1 && sel[0].type === 'text' && !sel[0].locked) {
          handled();
          onEditText(sel[0].id);
        }
      } else if (isArrow) {
        if (unlocked.length) {
          handled();
          const step = e.shiftKey ? 10 : 1;
          const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
          const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
          designer.update(unlocked.map((s) => s.id), (el) => ({ x: el.x + dx, y: el.y + dy }), { transient: true });
          if (nudgeTimer !== null) window.clearTimeout(nudgeTimer);
          nudgeTimer = window.setTimeout(() => {
            nudgeTimer = null;
            ref.current.designer.commit();
          }, NUDGE_COMMIT_MS);
        }
      } else if (e.code === 'BracketLeft' || e.code === 'BracketRight') {
        if (unlocked.length) {
          handled();
          const fwd = e.code === 'BracketRight';
          designer.arrange(e.shiftKey ? (fwd ? 'front' : 'back') : fwd ? 'forward' : 'backward', unlocked.map((s) => s.id));
        }
      } else if (key === '+' || key === '=') {
        handled();
        onZoom(Math.min(4, getScale() * 1.25));
      } else if (key === '-' || key === '_') {
        handled();
        onZoom(Math.max(0.1, getScale() / 1.25));
      } else if (key === '0') {
        handled();
        onZoom('fit');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') ref.current.onSpace(false);
    };
    const onBlur = () => ref.current.onSpace(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      container?.removeEventListener('pointerenter', onEnter);
      container?.removeEventListener('pointerleave', onLeave);
      flushNudge();
    };
    // listeners are installed once; fresh values are read through `ref`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
