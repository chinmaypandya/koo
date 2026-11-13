import { defineConfig } from 'wxt';

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
    permissions: ['storage', 'sidePanel'],
    host_permissions: ['https://api.anthropic.com/*', 'https://api.openai.com/*', 'https://generativelanguage.googleapis.com/*', 'http://localhost:8787/*'],
    action: {},
  },
});
