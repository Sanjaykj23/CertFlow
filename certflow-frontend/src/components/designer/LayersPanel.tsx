import React, { useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp, Circle, Eye, EyeOff, GripVertical, Image as ImageIcon, Lock, Minus, QrCode, Square, Type, Unlock } from 'lucide-react';
import type { DesignElement } from '../../lib/designer';
import type { Designer } from './store';
import { IconButton, cx } from './controls';

const ICONS: Record<DesignElement['type'], LucideIcon> = {
  text: Type,
  rect: Square,
  ellipse: Circle,
  line: Minus,
  image: ImageIcon,
  qr: QrCode,
};

export const LayersPanel: React.FC<{ designer: Designer }> = ({ designer: d }) => {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const cancel = useRef(false);

  const layers = [...d.design.elements].reverse();
  const hasSel = d.selection.length > 0;

  const finishRename = (id: string) => {
    if (!cancel.current && draft.trim()) d.rename(id, draft.trim());
    cancel.current = false;
    setEditing(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-paper-200 px-3 py-2">
        <span className="eyebrow mr-auto">Top to bottom</span>
        <IconButton label="Bring forward" disabled={!hasSel} onClick={() => d.arrange('forward')}>
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </IconButton>
        <IconButton label="Send backward" disabled={!hasSel} onClick={() => d.arrange('backward')}>
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </IconButton>
      </div>
      {layers.length === 0 ? (
        <p className="p-4 text-[13px] text-ink-500">This page has no elements yet. Add text, shapes or images from the other tabs.</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto p-2" aria-label="Layers">
          {layers.map((el) => {
            const Icon = ICONS[el.type];
            const selected = d.selection.includes(el.id);
            const index = d.design.elements.findIndex((x) => x.id === el.id);
            return (
              <li
                key={el.id}
                draggable={editing !== el.id}
                onDragStart={(e) => {
                  setDragId(el.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', el.id);
                }}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  setOverId(el.id);
                }}
                onDragLeave={() => setOverId((o) => (o === el.id ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId && dragId !== el.id) d.moveLayer(dragId, index);
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                className={cx(
                  'group flex items-center gap-1 rounded-md border px-1.5 py-1',
                  selected ? 'border-seal-500/40 bg-seal-50' : 'border-transparent hover:bg-paper-100',
                  overId === el.id && dragId !== el.id && '!border-t-2 !border-t-seal-500',
                  dragId === el.id && 'opacity-50',
                  el.hidden && 'text-ink-400',
                )}
              >
                <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-ink-300" aria-hidden="true" />
                <Icon className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />
                {editing === el.id ? (
                  <input
                    autoFocus
                    aria-label="Layer name"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => finishRename(el.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') {
                        cancel.current = true;
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="h-7 min-w-0 flex-1 rounded border border-seal-500 bg-white px-1.5 text-[13px] focus:outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={(e) => d.select([el.id], e.shiftKey)}
                    onDoubleClick={() => {
                      setDraft(el.name);
                      setEditing(el.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'F2') {
                        setDraft(el.name);
                        setEditing(el.id);
                      }
                    }}
                    aria-pressed={selected}
                    title="Click to select, double-click to rename"
                    className="min-w-0 flex-1 truncate rounded px-1 py-1 text-left text-[13px] text-ink-800"
                  >
                    {el.name}
                    {el.type === 'text' && <span className="ml-1.5 text-[11.5px] text-ink-400">{el.text.split('\n')[0].slice(0, 22)}</span>}
                  </button>
                )}
                <IconButton label={el.hidden ? `Show ${el.name}` : `Hide ${el.name}`} pressed={el.hidden} className="!h-7 !w-7" onClick={() => d.toggleHidden(el.id)}>
                  {el.hidden ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                </IconButton>
                <IconButton label={el.locked ? `Unlock ${el.name}` : `Lock ${el.name}`} pressed={el.locked} className="!h-7 !w-7" onClick={() => d.toggleLock(el.id)}>
                  {el.locked ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <Unlock className="h-3.5 w-3.5" aria-hidden="true" />}
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
