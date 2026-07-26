import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ignoredDirectories = new Set(['.git', 'node_modules']);
const errors = [];
const canonicals = new Map();

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || ignoredDirectories.has(entry.name)) continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

function label(filePath) {
  return relative(root, filePath).split(sep).join('/');
}

function localTarget(filePath, url) {
  const path = url.split(/[?#]/)[0];
  if (!path || /^(?:[a-z]+:|\/\/)/i.test(path)) return null;
  const absolute = path.startsWith('/')
    ? resolve(root, `.${path}`)
    : resolve(dirname(filePath), path);
  return absolute.endsWith('/') ? join(absolute, 'index.html') : absolute;
}

async function targetExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    if (!target.includes('.')) {
      try {
        await access(`${target}.html`);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

const htmlFiles = await filesIn(root);

for (const filePath of htmlFiles) {
  const file = label(filePath);
  const html = await readFile(filePath, 'utf8');
  const noindex = /<meta\s+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  const generatedFragment = file === 'art/photography-preview.html';
  if (generatedFragment) continue;

  if (!noindex) {
    if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${file}: missing title`);
    if (!/<meta\s+name=["']description["'][^>]*content=["'][^"']+/i.test(html)) {
      errors.push(`${file}: missing meta description`);
    }
    if (!/<h1(?:\s|>)/i.test(html)) errors.push(`${file}: missing H1`);

    const canonical = html.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
    if (!canonical) {
      errors.push(`${file}: missing canonical URL`);
    } else if (canonicals.has(canonical)) {
      errors.push(`${file}: duplicate canonical also used by ${canonicals.get(canonical)}`);
    } else {
      canonicals.set(canonical, file);
    }
  }

  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      errors.push(`${file}: invalid JSON-LD (${error.message})`);
    }
  }

  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const target = localTarget(filePath, match[1]);
    if (target && !await targetExists(target)) {
      errors.push(`${file}: broken local reference ${match[1]}`);
    }
  }
}

if (errors.length) {
  console.error(`SEO validation failed with ${errors.length} issue(s):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`SEO validation passed for ${htmlFiles.length} HTML files and ${canonicals.size} canonical pages.`);
}
