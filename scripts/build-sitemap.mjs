import { readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const siteUrl = 'https://barryrutherford.com';
const excludedDirectories = new Set(['.git', 'business-card', 'node_modules']);
const excludedFiles = new Set(['art/photography-preview.html']);

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || excludedDirectories.has(entry.name)) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await htmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

function publicPath(filePath) {
  const localPath = relative(root, filePath).split(sep).join('/');
  if (excludedFiles.has(localPath)) return null;
  if (localPath === 'index.html') return '/';
  if (localPath.endsWith('/index.html')) {
    return `/${localPath.slice(0, -'index.html'.length)}`;
  }
  return `/${localPath}`;
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const urls = [];
for (const filePath of await htmlFiles(root)) {
  const path = publicPath(filePath);
  if (!path) continue;
  const fileStats = await stat(filePath);
  urls.push({
    loc: `${siteUrl}${path}`,
    lastmod: fileStats.mtime.toISOString().slice(0, 10)
  });
}

urls.sort((a, b) => a.loc.localeCompare(b.loc));

const body = urls
  .map(({ loc, lastmod }) => `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

await writeFile(join(root, 'sitemap.xml'), sitemap);
console.log(`Generated sitemap.xml with ${urls.length} public URLs.`);
