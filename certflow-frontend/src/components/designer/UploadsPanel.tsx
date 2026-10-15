import React, { useRef, useState } from 'react';
import { ImagePlus, TriangleAlert, X } from 'lucide-react';
import { createImage } from '../../lib/designer';
import type { Designer } from './store';
import { IMAGE_ACCEPT, readImageFile } from './imageFiles';
import type { LoadedImage } from './imageFiles';
import { cx } from './controls';
import { placeCentered } from './ElementsPanel';

export const UploadsPanel: React.FC<{
  designer: Designer;
  uploads: LoadedImage[];
  onUploads: (next: LoadedImage[]) => void;
}> = ({ designer: d, uploads, onUploads }) => {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const ingest = async (files: FileList | File[]) => {
    setError(null);
    const added: LoadedImage[] = [];
    const errors: string[] = [];
    for (const f of Array.from(files)) {
      try {
        added.push(await readImageFile(f));
      } catch (e) {
        errors.push(e instanceof Error ? e.message : 'The file could not be read.');
      }
    }
    if (added.length) onUploads([...added, ...uploads]);
    if (errors.length) setError(errors.join(' '));
  };

  const place = (img: LoadedImage) => {
    const { width: W, height: H } = d.design;
    const scale = Math.min((W * 0.4) / img.width, (H * 0.4) / img.height, 2);
    const w = Math.max(8, img.width * scale);
    const h = Math.max(8, img.height * scale);
    d.add(placeCentered(d, createImage(img.src, { name: img.name.replace(/\.[^.]+$/, '') || 'Image', width: w, height: h, fit: 'contain' })));
  };

  return (
    <div className="p-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) void ingest(e.dataTransfer.files);
        }}
        className={cx(
          'rounded-md border border-dashed px-4 py-6 text-center transition-colors',
          over ? 'border-seal-500 bg-seal-50' : 'border-paper-300 bg-paper-50',
        )}
      >
        <ImagePlus className="mx-auto h-6 w-6 text-ink-400" aria-hidden="true" />
        <p className="mt-2 text-[13px] font-semibold text-ink">Drop images here</p>
        <p className="mt-0.5 text-[12px] text-ink-500">PNG, JPEG or SVG, up to 5 MB each</p>
        <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => input.current?.click()}>
          Choose files
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept={IMAGE_ACCEPT}
          className="sr-only"
          aria-label="Upload images"
          onChange={(e) => {
            if (e.target.files?.length) void ingest(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <p role="alert" className="alert-error mt-3 !py-2 text-[12px]">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {uploads.length > 0 ? (
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {uploads.map((u) => (
            <li key={u.id} className="group relative">
              <button
                type="button"
                onClick={() => place(u)}
                title={`Add ${u.name} to the page`}
                aria-label={`Add ${u.name} to the page`}
                className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border border-paper-200 bg-[repeating-conic-gradient(#EEF1F5_0%_25%,#fff_0%_50%)] bg-[length:14px_14px] p-1.5 hover:border-seal-500"
              >
                <img src={u.src} alt="" className="max-h-full max-w-full object-contain" />
              </button>
              <button
                type="button"
                className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded bg-white/90 text-ink-500 shadow-panel hover:text-bad-500 group-focus-within:flex group-hover:flex"
                aria-label={`Remove ${u.name} from uploads`}
                title="Remove from uploads"
                onClick={() => onUploads(uploads.filter((x) => x.id !== u.id))}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <p className="mt-1 truncate text-[11.5px] text-ink-500">{u.name}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">Uploaded logos and signatures appear here for this session. Click one to add it.</p>
      )}
    </div>
  );
};
