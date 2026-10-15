/**
 * Public surface of the demo backend. When VITE_DEMO=true the app talks to
 * this in-browser simulation instead of the Java services. Keep the two
 * exports stable: installDemoBackend and resetDemoData.
 */
import { AxiosError } from 'axios';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { store } from '../lib/storage';
import { getDb, scheduleSave, wipeDb } from './db';
import { hasWork, tick } from './engine';
import { handleRequest } from './routes';
import type { ApiRequest } from './routes';
import { blobToDataUrl } from './util';

const API_PREFIX = '/api/v1';
const TICK_MS = 300;

let ticker: ReturnType<typeof setInterval> | null = null;
let installed = false;

function startTicker(): void {
  if (ticker) return;
  ticker = setInterval(() => {
    try {
      const db = getDb();
      const changed = tick(db);
      if (changed || hasWork(db)) scheduleSave();
    } catch {
      /* a failed tick must never break the app; the next tick retries */
    }
  }, TICK_MS);
}

function splitUrl(config: InternalAxiosRequestConfig): { path: string; query: Record<string, string> } {
  const raw = config.url || '/';
  const base = config.baseURL || '';
  const full = raw.startsWith(API_PREFIX) ? raw : `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
  const [pathPart, queryPart = ''] = full.split('?');
  const path = pathPart.startsWith(API_PREFIX) ? pathPart.slice(API_PREFIX.length) || '/' : pathPart;
  const query: Record<string, string> = {};
  new URLSearchParams(queryPart).forEach((v, k) => {
    query[k] = v;
  });
  const params = config.params as Record<string, unknown> | undefined;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) query[k] = String(v);
    }
  }
  return { path, query };
}

async function readBody(data: unknown): Promise<any> {
  if (data === undefined || data === null || data === '') return undefined;
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const out: Record<string, any> = {};
    for (const [key, value] of data.entries()) {
      if (typeof value === 'string') {
        out[key] = value;
        continue;
      }
      const file = value as Blob;
      if (key === 'template') {
        try {
          out.template = JSON.parse(await file.text());
        } catch {
          out.template = null;
        }
      } else if (key === 'background') {
        out.__backgroundDataUrl = await blobToDataUrl(file);
      } else if (key === 'file') {
        out.__fileText = await file.text();
      }
    }
    return out;
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

function bearerToken(config: InternalAxiosRequestConfig): string | null {
  const headers: any = config.headers;
  const value: unknown = headers?.get ? headers.get('Authorization') : headers?.Authorization;
  if (typeof value === 'string' && value.startsWith('Bearer ')) return value.slice(7);
  return null;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await delay(120 + Math.random() * 230);

  const { path, query } = splitUrl(config);
  const request: ApiRequest = {
    method: (config.method || 'get').toUpperCase(),
    path,
    query,
    body: await readBody(config.data),
    token: bearerToken(config),
  };

  const result = handleRequest(getDb(), request);
  if (request.method !== 'GET') scheduleSave();

  let data: any = result.body;
  let contentType = 'application/json';
  if (result.binary) {
    contentType = result.binary.type;
    // Copy into a fresh ArrayBuffer so the Blob never aliases shared memory.
    const bytes = new Uint8Array(result.binary.bytes);
    data = config.responseType === 'blob' ? new Blob([bytes], { type: result.binary.type }) : bytes.buffer;
  }

  const response: AxiosResponse = {
    data,
    status: result.status,
    statusText: result.status < 400 ? 'OK' : 'Error',
    headers: { 'content-type': contentType, ...(result.headers || {}) },
    config,
    request: {},
  };

  const accepted = config.validateStatus ? config.validateStatus(result.status) : result.status >= 200 && result.status < 300;
  if (accepted) return response;

  throw new AxiosError(
    (result.body && result.body.message) || `Request failed with status code ${result.status}`,
    result.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    {},
    response,
  );
}

/** Replaces the HTTP adapter of the given axios instances with the in-browser mock API. */
export function installDemoBackend(instances: AxiosInstance[]): void {
  for (const instance of instances) {
    instance.defaults.adapter = demoAdapter;
  }
  if (!installed) {
    installed = true;
    getDb(); // seed (or restore) before the first request
    startTicker();
  }
}

/** Wipes all demo data and reloads the app so it reseeds. */
export function resetDemoData(): void {
  wipeDb();
  store.removeItem('certflow_token');
  store.removeItem('certflow_user');
  store.removeItem('certflow_active_org');
  window.location.reload();
}
