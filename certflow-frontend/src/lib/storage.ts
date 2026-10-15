/**
 * localStorage wrapper that never throws. Some embedded or sandboxed contexts
 * block storage; values then live in memory for the lifetime of the page.
 * The method names match the Storage API so it can replace localStorage directly.
 */
const memory = new Map<string, string>();

export const store = {
  getItem(key: string): string | null {
    try {
      const value = window.localStorage.getItem(key);
      if (value !== null) return value;
    } catch {
      /* storage unavailable, fall through to memory */
    }
    return memory.has(key) ? (memory.get(key) as string) : null;
  },
  setItem(key: string, value: string): void {
    memory.set(key, value);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* kept in memory only */
    }
  },
  removeItem(key: string): void {
    memory.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* nothing to remove */
    }
  },
};
