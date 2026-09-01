/** Vite `base` with trailing slash (`/` in dev, `/central-apps-hub/` in production). */
export const APP_BASE_URL = import.meta.env.BASE_URL;

/** Prefix without trailing slash (`''` in dev, `/central-apps-hub` in production). */
export const APP_BASE = APP_BASE_URL.replace(/\/$/, '');

export function appHref(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_BASE}${normalized}`;
}
