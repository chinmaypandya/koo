// Sign-in + UPI credits are built but switched off for now; flip to true (and set WXT_API_URL) to turn them on.
export const SIGN_IN_ENABLED = false;
// The Koo cloud API (Koo credits). Set WXT_API_URL in .env before `npm run build`; default = the local server (`npm run server`).
export const API: string = (SIGN_IN_ENABLED && import.meta.env.WXT_API_URL) || 'http://localhost:8787';
// Local mode → Koo credits use the local server (`npm run server`, key in server/.env): no sign-in, no credits.
// It applies while sign-in is off or no central API is configured.
export const LOCAL = !SIGN_IN_ENABLED || !import.meta.env.WXT_API_URL;
