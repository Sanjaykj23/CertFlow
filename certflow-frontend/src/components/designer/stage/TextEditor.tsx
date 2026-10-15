import React, { useEffect, useRef, useState } from 'react';
import type { TextEl } from '../../../lib/designer';

interface TextEditorProps {
  el: TextEl;
  scale: number;
  /** Page width in points, used to give wide unwrapped lines room. */
  pageWidth: number;
  fontFamily?: string;
  /** Called exactly once with the final text. `refocus` is true after Escape. */
  onDone: (text: string, refocus: boolean) => void;
}

/** Textarea laid over a text element so editing looks like editing in place. */
export const TextEditor: React.FC<TextEditorProps> = ({ el, scale, pageWidth, fontFamily, onDone }) => {
  const [draft, setDraft] = useState(el.text);
  const draftRef = useRef(el.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.focus({ preventScroll: true });
    t.select();
  }, []);

  const finish = (refocus: boolean) => {
    if (done.current) return;
    done.current = true;
    onDone(draftRef.current, refocus);
  };

  const lines = draft.split('\n').length;
  const lhPx = el.fontSize * el.lineHeight * scale;
  const total = lines * lhPx;
  const boxH = el.height * scale;
  const height = Math.max(boxH, total);
  const padTop = el.valign === 'top' ? 0 : Math.max(0, (boxH - total) / (el.valign === 'middle' ? 2 : 1));

  const extra = pageWidth; // lines never wrap, so allow them to extend past the box
  const leftPt = el.align === 'left' ? el.x : el.align === 'right' ? el.x - extra : el.x - extra / 2;
  const left = leftPt * scale;
  const top = el.y * scale;
  const width = (el.width + extra) * scale;
  const originX = (el.x + el.width / 2) * scale - left;
  const originY = (el.y + el.height / 2) * scale - top;

  return (
    <textarea
      ref={ref}
      value={draft}
      wrap="off"
      spellCheck={false}
      aria-label="Edit text"
      onChange={(e) => {
        draftRef.current = e.target.value;
        setDraft(e.target.value);
      }}
      onBlur={() => finish(false)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(true);
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="absolute m-0 resize-none border-0 bg-transparent outline-none"
      style={{
        left,
        top,
        width,
        height,
        boxSizing: 'border-box',
        padding: 0,
        paddingTop: padTop,
        overflow: 'hidden',
        whiteSpace: 'pre',
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: `${originX}px ${originY}px`,
        fontFamily: fontFamily || 'inherit',
        fontSize: el.fontSize * scale,
        lineHeight: `${lhPx}px`,
        fontWeight: el.bold ? 700 : 400,
        fontStyle: el.italic ? 'italic' : 'normal',
        textDecoration: el.underline ? 'underline' : 'none',
        textTransform: el.uppercase ? 'uppercase' : 'none',
        letterSpacing: el.letterSpacing * scale,
        textAlign: el.align,
        color: el.color,
        caretColor: el.color,
        opacity: el.opacity,
        userSelect: 'text',
        WebkitUserSelect: 'text',
        cursor: 'text',
      }}
    />
  );
};
