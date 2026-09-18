// @ts-check
import { defineConfig } from 'astro/config';
import { readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// The site's canonical origin. This single line is the ONLY place the domain
// lives: canonical tags, Open Graph URLs, JSON-LD, sitemap.xml and robots.txt
// all derive from `site`. Buying a different domain = edit this one string.
const SITE = 'https://readunderstory.ink';

// Sitemap without a dependency: after the static build, walk dist/ for
// index.html files and emit one <url> per page. A new lesson file becomes
// a sitemap row on the next build — no registry to maintain.
function understorySitemap() {
  return {
    name: 'understory-sitemap',
    hooks: {
      /** @param {{ dir: URL }} payload */
      'astro:build:done': async ({ dir }) => {
        const outDir = fileURLToPath(dir);
        /** @type {string[]} */
        const urls = [];
        /**
         * @param {string} path
         */
        const walk = (path) => {
          for (const entry of readdirSync(path, { withFileTypes: true })) {
            const full = join(path, entry.name);
            if (entry.isDirectory()) {
              walk(full);
            } else if (entry.name === 'index.html') {
              const rel = relative(outDir, full).split(sep).join('/');
              const route = rel === 'index.html' ? '' : rel.replace(/index\.html$/, '');
              urls.push(`${SITE}/${route}`);
            }
          }
        };
        walk(outDir);
        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
          `\n</urlset>\n`;
        writeFileSync(join(outDir, 'sitemap.xml'), xml);
      },
    },
  };
}

export default defineConfig({
  site: SITE,

  build: {
    // Inline every stylesheet into each page's <head>. The site's entire CSS
    // is ~26 KB (≈6 KB compressed), and inlining removes the render-blocking
    // request — the "network dependency tree" Lighthouse flags, and the
    // single biggest lever on FCP/LCP for a cold page load (most readers
    // arrive on a deep lesson page, so every arrival is a cold start).
    inlineStylesheets: 'always',
  },

  integrations: [understorySitemap()],
});
