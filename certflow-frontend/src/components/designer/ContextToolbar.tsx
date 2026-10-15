import React from 'react';
import {
  AlignHorizontalDistributeCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalDistributeCenter,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowDown,
  ArrowUp,
  BringToFront,
  Copy,
  Layers,
  Lock,
  SendToBack,
  Trash2,
  Unlock,
  AlignStartHorizontal,
  Droplet,
} from 'lucide-react';
import type { Designer } from './store';
import { Divider, Field, IconButton, Popover, Slider } from './controls';
import { TypeControls } from './StyleControls';

const AlignMenu: React.FC<{ d: Designer }> = ({ d }) => {
  const multi = d.selection.length > 1;
  const items = [
    { to: 'left', label: 'Align left', icon: AlignHorizontalJustifyStart },
    { to: 'centerH', label: 'Align centre', icon: AlignHorizontalJustifyCenter },
    { to: 'right', label: 'Align right', icon: AlignHorizontalJustifyEnd },
    { to: 'top', label: 'Align top', icon: AlignVerticalJustifyStart },
    { to: 'middleV', label: 'Align middle', icon: AlignVerticalJustifyCenter },
    { to: 'bottom', label: 'Align bottom', icon: AlignVerticalJustifyEnd },
  ] as const;
  return (
    <Popover label="Align" width={232} buttonContent={<AlignStartHorizontal className="h-4 w-4" aria-hidden="true" />}>
      {() => (
        <div>
          <p className="mb-2 text-[12px] text-ink-500">{multi ? 'Align to the selection bounds.' : 'Align to the page.'}</p>
          <div className="grid grid-cols-6 gap-1">
            {items.map((i) => (
              <IconButton key={i.to} label={i.label} onClick={() => d.align(i.to)}>
                <i.icon className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1 border-t border-paper-200 pt-2">
            <IconButton label="Distribute horizontally" disabled={d.selection.length < 3} onClick={() => d.distribute('h')}>
              <AlignHorizontalDistributeCenter className="h-4 w-4" aria-hidden="true" />
            </IconButton>
            <IconButton label="Distribute vertically" disabled={d.selection.length < 3} onClick={() => d.distribute('v')}>
              <AlignVerticalDistributeCenter className="h-4 w-4" aria-hidden="true" />
            </IconButton>
            <span className="ml-1 text-[12px] text-ink-400">{d.selection.length < 3 ? 'Select 3 or more to distribute' : 'Distribute'}</span>
          </div>
        </div>
      )}
    </Popover>
  );
};

const OrderMenu: React.FC<{ d: Designer }> = ({ d }) => (
  <Popover label="Order" width={200} buttonContent={<Layers className="h-4 w-4" aria-hidden="true" />}>
    {(close) => (
      <ul>
        {(
          [
            ['front', 'Bring to front', BringToFront],
            ['forward', 'Bring forward', ArrowUp],
            ['backward', 'Send backward', ArrowDown],
            ['back', 'Send to back', SendToBack],
          ] as const
        ).map(([mode, label, Icon]) => (
          <li key={mode}>
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                d.arrange(mode);
                close();
              }}
            >
              <span>{label}</span>
              <Icon className="h-4 w-4 text-ink-400" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    )}
  </Popover>
);

export const OpacityMenu: React.FC<{ d: Designer }> = ({ d }) => {
  const els = d.selectedElements;
  const ids = els.map((e) => e.id);
  const first = els[0]?.opacity ?? 1;
  return (
    <Popover label="Opacity" width={232} buttonContent={<Droplet className="h-4 w-4" aria-hidden="true" />}>
      {() => (
        <Field label="Opacity">
          <Slider
            label="Opacity"
            value={Math.round(first * 100)}
            min={0}
            max={100}
            step={1}
            display={(n) => `${n}%`}
            onLive={(n) => d.update(ids, { opacity: n / 100 }, { transient: true })}
            onEnd={d.commit}
          />
        </Field>
      )}
    </Popover>
  );
};

export const ContextToolbar: React.FC<{ designer: Designer }> = ({ designer: d }) => {
  const els = d.selectedElements;
  const none = els.length === 0;
  const allLocked = els.length > 0 && els.every((e) => e.locked);

  return (
    <div
      role="toolbar"
      aria-label="Element formatting"
      className="flex min-h-[44px] shrink-0 items-center gap-1.5 overflow-x-auto border-b border-paper-200 bg-white px-3 py-1.5"
    >
      {none ? (
        <p className="text-[12.5px] text-ink-400">Select an element to format it, or add one from the left panel. Drag on empty space to select several.</p>
      ) : (
        <>
          <TypeControls d={d} els={els} />
          <Divider />
          <OpacityMenu d={d} />
          <AlignMenu d={d} />
          <OrderMenu d={d} />
          <Divider />
          <IconButton label={allLocked ? 'Unlock' : 'Lock'} pressed={allLocked} onClick={() => d.update(els.map((e) => e.id), { locked: !allLocked })}>
            {allLocked ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Unlock className="h-4 w-4" aria-hidden="true" />}
          </IconButton>
          <IconButton label="Duplicate" onClick={() => d.duplicate()}>
            <Copy className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="Delete" className="hover:!bg-bad-50 hover:!text-bad-500" onClick={() => d.remove()}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </>
      )}
    </div>
  );
};
