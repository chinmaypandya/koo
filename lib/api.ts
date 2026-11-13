// The OpenBroker cloud API (Koo credits). Set WXT_API_URL in .env before `npm run build`; default = `npm run cloud:dev`.
export const API: string = import.meta.env.WXT_API_URL || 'http://localhost:8787';
