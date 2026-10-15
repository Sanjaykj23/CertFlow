/** Persistence of the demo database: one JSON document in localStorage (via `store`, never throws). */
import { store } from '../lib/storage';
import { buildSeed } from './seed';
import type { DB } from './types';

export const DB_KEY = 'certflow_demo_db_v1';

let db: DB | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let disabled = false;
let dirty = false;
let hooked = false;

function valid(x: any): x is DB {
  return !!x && x.v === 1 && x.users && x.orgs && x.certs && x.pipes && Array.isArray(x.members);
}

export function getDb(): DB {
  if (db) return db;
  try {
    const raw = store.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (valid(parsed)) db = parsed;
    }
  } catch {
    /* corrupt data: reseed below */
  }
  if (!db) {
    db = buildSeed(Date.now());
    saveNow();
  }
  if (!hooked && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    hooked = true;
    const flush = () => {
      if (dirty) saveNow();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
  }
  return db;
}

export function saveNow(): void {
  if (disabled || !db) return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  dirty = false;
  try {
    store.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* ignore: state still lives in memory */
  }
}

/** Debounced save. */
export function scheduleSave(): void {
  dirty = true;
  if (disabled || timer) return;
  timer = setTimeout(() => {
    timer = null;
    saveNow();
  }, 500);
}

/** Drops all persisted state and prevents further saves (used right before a reload). */
export function wipeDb(): void {
  disabled = true;
  if (timer) clearTimeout(timer);
  timer = null;
  db = null;
  store.removeItem(DB_KEY);
}

/** Test helper: replace the in-memory database. */
export function setDbForTests(next: DB | null): void {
  db = next;
  disabled = false;
}
