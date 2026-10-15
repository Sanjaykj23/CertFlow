/**
 * Font registry shared by the SVG renderer, the editor panels and the browser
 * PDF builder. Built-in families need no files. Google families are loaded in
 * the browser from Google Fonts and embedded in PDFs from /fonts/*.ttf.
 */
export type FontCategory = 'serif' | 'sans' | 'script' | 'display' | 'mono';

export interface FontFiles {
  regular?: string;
  bold?: string;
  italic?: string;
  boldItalic?: string;
}

export interface FontFamilyDef {
  id: string;
  label: string;
  category: FontCategory;
  /** CSS font-family stack. */
  css: string;
  /** Google Fonts css2 family spec (empty for built-ins). */
  google: string;
  /** File names under /fonts that really exist. */
  files: FontFiles;
}

function gf(name: string, file: string, category: FontCategory, variants: ('R' | 'B' | 'I' | 'BI')[], fallback: string, label = name): FontFamilyDef {
  const has = (v: string) => (variants as string[]).includes(v);
  const files: FontFiles = {};
  if (has('R')) files.regular = `${file}-Regular.ttf`;
  if (has('B')) files.bold = `${file}-Bold.ttf`;
  if (has('I')) files.italic = `${file}-Italic.ttf`;
  if (has('BI')) files.boldItalic = `${file}-BoldItalic.ttf`;
  const fam = name.replace(/ /g, '+');
  let google: string;
  if (has('I') || has('BI')) {
    const parts: string[] = [];
    if (has('R')) parts.push('0,400');
    if (has('B')) parts.push('0,700');
    if (has('I')) parts.push('1,400');
    if (has('BI')) parts.push('1,700');
    google = `${fam}:ital,wght@${parts.join(';')}`;
  } else {
    const w = [has('R') ? '400' : '', has('B') ? '700' : ''].filter(Boolean).join(';');
    google = `${fam}:wght@${w}`;
  }
  return { id: name, label, category, css: `'${name}', ${fallback}`, google, files };
}

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = 'Helvetica, Arial, sans-serif';
const CURSIVE = "'Brush Script MT', cursive";
const MONO = "'Courier New', monospace";

export const FONT_FAMILIES: FontFamilyDef[] = [
  { id: 'Helvetica', label: 'Helvetica', category: 'sans', css: "Helvetica, Arial, 'Liberation Sans', sans-serif", google: '', files: {} },
  { id: 'Times', label: 'Times', category: 'serif', css: "'Times New Roman', Times, 'Liberation Serif', serif", google: '', files: {} },
  { id: 'Courier', label: 'Courier', category: 'mono', css: "'Courier New', Courier, 'Liberation Mono', monospace", google: '', files: {} },
  gf('Playfair Display', 'PlayfairDisplay', 'serif', ['R', 'B', 'I', 'BI'], SERIF),
  gf('Cormorant Garamond', 'CormorantGaramond', 'serif', ['R', 'B', 'I', 'BI'], SERIF),
  gf('Libre Baskerville', 'LibreBaskerville', 'serif', ['R', 'B', 'I', 'BI'], SERIF),
  gf('Merriweather', 'Merriweather', 'serif', ['R', 'B', 'I', 'BI'], SERIF),
  gf('Lora', 'Lora', 'serif', ['R', 'B', 'I', 'BI'], SERIF),
  gf('Cinzel', 'Cinzel', 'display', ['R', 'B'], SERIF),
  gf('Montserrat', 'Montserrat', 'sans', ['R', 'B', 'I', 'BI'], SANS),
  gf('Poppins', 'Poppins', 'sans', ['R', 'B', 'I', 'BI'], SANS),
  gf('Raleway', 'Raleway', 'sans', ['R', 'B', 'I', 'BI'], SANS),
  gf('Oswald', 'Oswald', 'display', ['R', 'B'], "Impact, 'Arial Narrow', sans-serif"),
  gf('Great Vibes', 'GreatVibes', 'script', ['R'], CURSIVE),
  gf('Dancing Script', 'DancingScript', 'script', ['R', 'B'], CURSIVE),
  gf('Pinyon Script', 'PinyonScript', 'script', ['R'], CURSIVE),
  gf('Roboto Mono', 'RobotoMono', 'mono', ['R', 'B', 'I', 'BI'], MONO),
];

const BY_ID = new Map(FONT_FAMILIES.map((f) => [f.id, f]));

export function getFont(id: string): FontFamilyDef | undefined {
  return BY_ID.get(id);
}

/** CSS font-family stack for an id; unknown ids fall back to Helvetica. */
export function fontCss(id: string): string {
  return (BY_ID.get(id) ?? FONT_FAMILIES[0]).css;
}

/**
 * Best available file for a face (public URL), or null for built-ins / missing files.
 * Falls back across variants, e.g. bold-italic -> bold -> regular.
 */
export function fontFilePath(id: string, opts: { bold?: boolean; italic?: boolean } = {}): string | null {
  const def = BY_ID.get(id);
  if (!def) return null;
  const f = def.files;
  const { bold, italic } = opts;
  const order = bold && italic ? [f.boldItalic, f.bold, f.italic, f.regular] : bold ? [f.bold, f.regular] : italic ? [f.italic, f.regular] : [f.regular];
  const hit = order.find(Boolean);
  if (!hit) return null;
  let base = '/';
  try {
    base = import.meta.env.BASE_URL || '/';
  } catch {
    /* not running under Vite */
  }
  return `${base}fonts/${hit}`;
}

/** Which face of a family a request actually resolves to (used by PDF to pick the jsPDF style). */
export function resolvedFace(id: string, opts: { bold?: boolean; italic?: boolean }): { bold: boolean; italic: boolean } {
  const f = BY_ID.get(id)?.files;
  if (!f) return { bold: !!opts.bold, italic: !!opts.italic };
  if (opts.bold && opts.italic) {
    if (f.boldItalic) return { bold: true, italic: true };
    if (f.bold) return { bold: true, italic: false };
    if (f.italic) return { bold: false, italic: true };
    return { bold: false, italic: false };
  }
  if (opts.bold) return f.bold ? { bold: true, italic: false } : { bold: false, italic: false };
  if (opts.italic) return f.italic ? { bold: false, italic: true } : { bold: false, italic: false };
  return { bold: false, italic: false };
}

const LINK_ID = 'certflow-google-fonts';
let linkKey = '';

/**
 * Appends (or updates) ONE stylesheet link for the requested families and
 * resolves when the faces have loaded. Never rejects.
 */
export function ensureFontsLoaded(ids?: string[]): Promise<void> {
  try {
    if (typeof document === 'undefined') return Promise.resolve();
    const defs = (ids && ids.length ? ids.map((i) => BY_ID.get(i)).filter((d): d is FontFamilyDef => !!d) : FONT_FAMILIES).filter((d) => d.google);
    if (defs.length === 0) return Promise.resolve();
    const requested = new Set(defs.map((d) => d.id));
    const previous = new Set(linkKey ? linkKey.split('|') : []);
    const union = new Set([...previous, ...requested]);
    const key = FONT_FAMILIES.filter((d) => union.has(d.id)).map((d) => d.id).join('|');
    if (key !== linkKey) {
      linkKey = key;
      const href = `https://fonts.googleapis.com/css2?${FONT_FAMILIES.filter((d) => union.has(d.id))
        .map((d) => `family=${d.google}`)
        .join('&')}&display=swap`;
      let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.id = LINK_ID;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      if (link.href !== href) link.href = href;
    }
    const link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
    const fonts = document.fonts;
    if (!fonts || typeof fonts.load !== 'function') return Promise.resolve();
    const afterSheet = new Promise<void>((resolve) => {
      if (!link || link.sheet) return resolve();
      const done = () => resolve();
      link.addEventListener('load', done, { once: true });
      link.addEventListener('error', done, { once: true });
      setTimeout(done, 4000);
    });
    return afterSheet
      .then(() => {
        const loads: Promise<unknown>[] = [];
        for (const d of defs) {
          const q = `"${d.id}"`;
          loads.push(fonts.load(`400 16px ${q}`).catch(() => null));
          if (d.files.bold) loads.push(fonts.load(`700 16px ${q}`).catch(() => null));
          if (d.files.italic) loads.push(fonts.load(`italic 400 16px ${q}`).catch(() => null));
          if (d.files.boldItalic) loads.push(fonts.load(`italic 700 16px ${q}`).catch(() => null));
        }
        return Promise.all(loads);
      })
      .then(() => undefined)
      .catch(() => undefined);
  } catch {
    return Promise.resolve();
  }
}
