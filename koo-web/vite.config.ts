import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

// Absolute-URL SEO bits need the live address: set VITE_SITE_URL (e.g. https://koo.app) in the Pages build settings.
// With it, pages get canonical/og:url/og:image tags and the build writes sitemap.xml and a Sitemap line in robots.txt.
const seo = (site: string): Plugin => ({
  name: 'koo-seo',
  transformIndexHtml(html, ctx) {
    if (!site) return html;
    const path = ctx.path === '/index.html' ? '/' : ctx.path;
    return html.replace('</title>', `</title>\n  <link rel="canonical" href="${site}${path}">\n  <meta property="og:url" content="${site}${path}">\n  <meta property="og:image" content="${site}/og.png">\n  <meta name="twitter:image" content="${site}/og.png">`);
  },
  generateBundle() {
    // AI crawlers (ChatGPT, Claude, Perplexity, Gemini…) are welcome: they are how assistants find and cite Koo.
    const robots = `User-agent: *\nAllow: /\nDisallow: /login.html\n${site ? `\nSitemap: ${site}/sitemap.xml\n` : ''}`;
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
    if (site) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc></url>\n  <url><loc>${site}/llms.txt</loc></url>\n</urlset>\n` });
  },
});

export default defineConfig(({ mode }) => {
  const site = (loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL ?? '').replace(/\/$/, '');
  return {
    plugins: [react(), seo(site)],
    build: { rollupOptions: { input: { index: resolve(__dirname, 'index.html'), login: resolve(__dirname, 'login.html') } } },
  };
});
