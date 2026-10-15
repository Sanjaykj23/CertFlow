/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" turns on the in-browser demo backend (no Java services needed). */
  readonly VITE_DEMO?: string;
}
