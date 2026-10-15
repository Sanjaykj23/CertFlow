/**
 * Public surface of the demo backend. The real implementation lives in the
 * other files of this folder; keep these two exports stable.
 */
import type { AxiosInstance } from 'axios';

/** Replaces the HTTP adapter of the given axios instances with the in-browser mock API. */
export function installDemoBackend(_instances: AxiosInstance[]): void {
  // Placeholder until the mock backend is wired in.
}

/** Wipes all demo data and reloads the app so it reseeds. */
export function resetDemoData(): void {
  window.location.reload();
}
