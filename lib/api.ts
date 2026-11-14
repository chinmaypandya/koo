// The Koo cloud API (Koo credits). Set WXT_API_URL in .env before `npm run build`; default = the local server (`npm run server`).
export const API: string = import.meta.env.WXT_API_URL || 'http://localhost:8787';
// No central API configured → Koo credits use the local server (`npm run server`, key in server/.env): no sign-in,
// no credits.
export const LOCAL = !import.meta.env.WXT_API_URL;
