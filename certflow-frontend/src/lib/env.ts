/**
 * Demo mode swaps the HTTP backend for an in-browser simulation (src/demo).
 * Enable with `VITE_DEMO=true` at build or dev time.
 */
export const isDemo: boolean = import.meta.env.VITE_DEMO === 'true';
