// The OpenBroker cloud API (Koo credits). Set WXT_API_URL in .env before `npm run build`; default = `npm run cloud:dev`.
export const API: string = import.meta.env.WXT_API_URL || 'http://localhost:8787';
// No central API configured → Koo credits use the local worker (`npm run cloud:dev` with DEV_NO_AUTH=1): no sign-in,
// no credits, your own key in cloud/.dev.vars.
export const LOCAL = !import.meta.env.WXT_API_URL;
