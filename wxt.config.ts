import { defineConfig } from 'wxt';

// Build-time settings from .env (git-ignored): WXT_API_URL = deployed cloud API, WXT_GOOGLE_CLIENT_ID = Google sign-in.
try { process.loadEnvFile(); } catch {}
const api = new URL(process.env.WXT_API_URL || 'http://localhost:8787');
const googleClientId = process.env.WXT_GOOGLE_CLIENT_ID;
// WXT_V2=1 (npm run build:v2) builds v2: Koo over the Facebook page with an on-page panel, no side panel.
const v2 = !!process.env.WXT_V2;

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  outDir: v2 ? 'output/v2' : 'output/v1', // builds land in output/v1|v2/chrome-mv3 (visible in Chrome's "Load unpacked" picker)
  // Vite scans every non-hidden .html for deps, which now includes output/; limit it to our sources.
  vite: () => ({ optimizeDeps: { entries: ['entrypoints/**/*.html'] } }),
  // Chrome 137+ ignores --load-extension, so load output/v1/chrome-mv3-dev manually via chrome://extensions.
  webExt: { disabled: true },
  hooks: { 'build:manifestGenerated': (_, manifest) => {
    if (!v2) return;
    delete manifest.side_panel;
    manifest.permissions = manifest.permissions?.filter((p) => p !== 'sidePanel');
    // Its own extension ID, so v1 and v2 can be installed side by side (Google sign-in, off for now, needs v1's fixed ID).
    delete manifest.key;
    manifest.name = 'Koo v2';
  } },
  manifest: {
    name: 'Koo',
    description: 'Reads Facebook group posts for you and finds flats that match.',
    // `identity` (Google sign-in) only when sign-in is configured; it's switched off for now (lib/api.ts).
    permissions: ['storage', 'sidePanel', ...(googleClientId ? ['identity'] : [])],
    // Own-key providers + our cloud API (Koo credits).
    host_permissions: ['https://api.anthropic.com/*', 'https://api.openai.com/*', 'https://generativelanguage.googleapis.com/*', `${api.origin}/*`],
    action: {},
    // v2 shows the panel page in an iframe on Facebook.
    ...(v2 && { web_accessible_resources: [{ resources: ['sidepanel.html', 'chunks/*'], matches: ['https://www.facebook.com/*'] }] }),
    // Public key → fixed extension ID (ickjoonhepcjfhdiopbckhgalfdgijbj) for every unpacked install, which Google
    // sign-in needs. The matching private key stays out of git.
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwOzGEpRDmVGUoaQ35Kvg6EhYg6ea2Bj51H0KyYhECd5QeGATlYG1gPUBZ6sFgBxhlOU0yL9dQ6x50jrde7wXB0L40r5idQknSXpyOHyLZ5Pur6WRXFg7ZaDuGHQLMjodkyxQjbcZ4EXLPsKjKigjLM6dXHNARJsRypY0kJH5yU+4dY40E6FKpTJJ4vwhrQsllxr55xkK8q06gxCMZo7HxjPoN6Q1QO64K4cXzy2AvuxmXK3ek0irbOsixzaeAkI5ga4DXLIn/wbBfGSIvQiediQKtvhCzIETxm1lOiiTTyH/siJPnffy50HfVRgOU63tKftXo3BpIRvA+Fpzp5ajuQIDAQAB',
    ...(googleClientId && { oauth2: { client_id: googleClientId, scopes: ['openid', 'email', 'profile'] } }),
  },
});
