/** Small helpers shared by the demo backend. Node-safe (no direct DOM use). */

const g: any = globalThis;

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  if (g.crypto && g.crypto.getRandomValues) g.crypto.getRandomValues(a);
  else for (let i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
  return a;
}

const HEX: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

export function uuid(): string {
  const b = randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => HEX[x]);
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`;
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode(...bytes.subarray(i, i + CH));
  return g.btoa(s);
}

/** 32 random bytes, base64url, no padding -> 43 characters. */
export function newToken(): string {
  return toBase64(randomBytes(32)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function newOtp(): string {
  const b = randomBytes(4);
  const n = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
  return String(n % 1000000).padStart(6, '0');
}

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'org'
  );
}

export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$/;
export function isEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim());
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function iso(ms: number | null | undefined): string | null {
  return ms == null ? null : new Date(ms).toISOString();
}
export function ymd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const type = blob.type || 'application/octet-stream';
  return `data:${type};base64,${toBase64(buf)}`;
}
