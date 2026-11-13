import { defineConfig } from 'wxt';

// Build-time settings from .env (git-ignored): WXT_API_URL = deployed cloud API, WXT_GOOGLE_CLIENT_ID = Google sign-in.
try { process.loadEnvFile(); } catch {}
const api = new URL(process.env.WXT_API_URL || 'http://localhost:8787');
const googleClientId = process.env.WXT_GOOGLE_CLIENT_ID;

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  outDir: 'output', // visible in Chrome's "Load unpacked" picker, unlike .output
  // Vite scans every non-hidden .html for deps, which now includes output/; limit it to our sources.
  vite: () => ({ optimizeDeps: { entries: ['entrypoints/**/*.html'] } }),
  // Chrome 137+ ignores --load-extension, so load output/chrome-mv3-dev manually via chrome://extensions.
  webExt: { disabled: true },
  manifest: {
    name: 'OpenBroker',
    description: 'Reads Facebook group posts for you and finds flats that match.',
    permissions: ['storage', 'sidePanel', 'identity'],
    // Own-key providers + our cloud API (Koo credits).
    host_permissions: ['https://api.anthropic.com/*', 'https://api.openai.com/*', 'https://generativelanguage.googleapis.com/*', `${api.origin}/*`],
    action: {},
    // Public key → fixed extension ID (ickjoonhepcjfhdiopbckhgalfdgijbj) for every unpacked install, which Google
    // sign-in needs. The matching private key stays out of git.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwOzGEpRDmVGUoaQ35Kvg6EhYg6ea2Bj51H0KyYhECd5QeGATlYG1gPUBZ6sFgBxhlOU0yL9dQ6x50jrde7wXB0L40r5idQknSXpyOHyLZ5Pur6WRXFg7ZaDuGHQLMjodkyxQjbcZ4EXLPsKjKigjLM6dXHNARJsRypY0kJH5yU+4dY40E6FKpTJJ4vwhrQsllxr55xkK8q06gxCMZo7HxjPoN6Q1QO64K4cXzy2AvuxmXK3ek0irbOsixzaeAkI5ga4DXLIn/wbBfGSIvQiediQKtvhCzIETxm1lOiiTTyH/siJPnffy50HfVRgOU63tKftXo3BpIRvA+Fpzp5ajuQIDAQAB',
    ...(googleClientId && { oauth2: { client_id: googleClientId, scopes: ['openid', 'email', 'profile'] } }),
  },
});
