// @ts-check
import { defineConfig } from 'astro/config';
import { readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://theunderstory.dev';

// Sitemap without a dependency: after the static build, walk dist/ for
// index.html files and emit one <url> per page. A new lesson file becomes
// a sitemap row on the next build — no registry to maintain.
function understorySitemap() {
  return {
    name: 'understory-sitemap',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const outDir = fileURLToPath(dir);
        const urls = [];
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
  integrations: [understorySitemap()],
});

