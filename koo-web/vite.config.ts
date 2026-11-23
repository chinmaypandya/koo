import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

// Absolute-URL SEO bits need the live address: set VITE_SITE_URL (e.g. https://koo.app) in the Pages build settings.
// With it, pages get canonical/og:url tags and the build writes sitemap.xml and a Sitemap line in robots.txt.
// Link previews (og:image) must be absolute too; without VITE_SITE_URL they fall back to this deployment's own
// address (CF_PAGES_URL, set by Cloudflare Pages during builds), so previews work even before a domain is set.
const seo = (site: string, media: string): Plugin => ({
  name: 'koo-seo',
  transformIndexHtml(html, ctx) {
    const path = ctx.path === '/index.html' ? '/' : ctx.path;
    const tags = [
      site && `<link rel="canonical" href="${site}${path}">`,
      site && `<meta property="og:url" content="${site}${path}">`,
      media && `<meta property="og:image" content="${media}/og.png">`,
      media && `<meta property="og:image:width" content="1200">`,
      media && `<meta property="og:image:height" content="630">`,
      media && `<meta name="twitter:image" content="${media}/og.png">`,
    ].filter(Boolean);
    return html.replace('</title>', `</title>${tags.map((t) => `\n  ${t}`).join('')}`);
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
  const media = site || (process.env.CF_PAGES_URL ?? '').replace(/\/$/, '');
  return {
    plugins: [react(), seo(site, media)],
    build: { rollupOptions: { input: { index: resolve(import.meta.dirname, 'index.html'), login: resolve(import.meta.dirname, 'login.html') } } },
  };
});
