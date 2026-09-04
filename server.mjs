import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 8080);
const beehiivApiKey = process.env.BEEHIIV_API_KEY;
const beehiivPublicationId = process.env.BEEHIIV_PUBLICATION_ID;
const cacheTtlMs = 15 * 60 * 1000;
const staleGraceMs = 5 * 60 * 1000;
const caches = new Map();

// Ghost publishes a public RSS feed per site, so previews need no credentials.
// Sources are a fixed allowlist: never derive a feed URL from request input.
const ghostSources = {
  malestrum: { feedUrl: 'https://malestrum.com/rss/', host: 'malestrum.com' },
  breakwater: { feedUrl: 'https://blog.breakwaterops.com/rss/', host: 'blog.breakwaterops.com' }
};
const postsPerSource = 2;

const mimeTypes = {
  '.css': 'text/css; charset=UTF-8',
  '.html': 'text/html; charset=UTF-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=UTF-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=UTF-8',
  '.vcf': 'text/vcard; charset=UTF-8',
  '.webp': 'image/webp'
};

function resolvePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const requestPath = normalizedPath === '/' ? '/index.html' : normalizedPath;
  return join(root, requestPath);
}

function isInsideRoot(filePath) {
  const fileRelativeToRoot = relative(root, filePath);
  return fileRelativeToRoot && !fileRelativeToRoot.startsWith('..') && !fileRelativeToRoot.startsWith('/');
}

function headersFor(filePath, contentLength) {
  return {
    'Content-Length': contentLength,
    'Content-Type': mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block'
  };
}

function publicUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function normalizeExcerpt(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  let excerpt = text;
  for (let length = 1; length <= Math.floor(text.length / 2); length += 1) {
    if (text.length % length === 0 && text === text.slice(0, length).repeat(text.length / length)) {
      excerpt = text.slice(0, length).trim();
      break;
    }
  }

  if (excerpt.length <= 240) return excerpt;
  const shortened = excerpt.slice(0, 240).replace(/\s+\S*$/, '').trim();
  return `${shortened || excerpt.slice(0, 240)}…`;
}

function normalizeBeehiivPost(post) {
  const publishDate = Number(post.publish_date || post.displayed_date || 0);
  const url = publicUrl(post.web_url);
  if (!post.title || !url || !publishDate || publishDate * 1000 > Date.now()) return null;

  return {
    id: String(post.id || ''),
    title: String(post.title),
    excerpt: normalizeExcerpt(post.subtitle || post.meta_default_description || post.preview_text),
    url,
    thumbnailUrl: publicUrl(post.thumbnail_url),
    authors: Array.isArray(post.authors) ? post.authors.map(String) : [],
    publishedAt: new Date(publishDate * 1000).toISOString()
  };
}

async function requestLatestWriting() {
  const endpoint = new URL(
    `https://api.beehiiv.com/v2/publications/${encodeURIComponent(beehiivPublicationId)}/posts`
  );
  endpoint.search = new URLSearchParams({
    status: 'confirmed',
    hidden_from_feed: 'false',
    limit: '10',
    order_by: 'publish_date',
    direction: 'desc'
  });

  const apiResponse = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${beehiivApiKey}` },
    signal: AbortSignal.timeout(8000)
  });

  if (!apiResponse.ok) {
    throw new Error(`Beehiiv returned ${apiResponse.status}`);
  }

  const payload = await apiResponse.json();
  return (Array.isArray(payload.data) ? payload.data : [])
    .filter(post => ['web', 'both'].includes(post.platform))
    .map(normalizeBeehiivPost)
    .filter(Boolean)
    .slice(0, 3);
}

// Serve fresh values, dedupe concurrent loads, and fall back to stale data for a
// short grace period when the upstream fails.
async function cached(key, loader) {
  let entry = caches.get(key);
  if (!entry) {
    entry = { value: null, expiresAt: 0, request: null };
    caches.set(key, entry);
  }

  if (entry.value && entry.expiresAt > Date.now()) {
    return entry.value;
  }

  if (!entry.request) {
    entry.request = loader()
      .then(value => {
        entry.value = value;
        entry.expiresAt = Date.now() + cacheTtlMs;
        return value;
      })
      .finally(() => {
        entry.request = null;
      });
  }

  try {
    return await entry.request;
  } catch (error) {
    if (entry.value) {
      entry.expiresAt = Date.now() + staleGraceMs;
      return entry.value;
    }
    throw error;
  }
}

function latestWriting() {
  return cached('beehiiv', requestLatestWriting);
}

const xmlEntities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeXml(value) {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity) => {
    if (entity.startsWith('#')) {
      const codePoint = entity[1].toLowerCase() === 'x'
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
      return String.fromCodePoint(codePoint);
    }
    return xmlEntities[entity.toLowerCase()] ?? match;
  });
}

// Ghost generates these feeds, so a targeted extractor is enough — this never
// needs to become a general XML parser.
function elementText(itemXml, tagName) {
  const match = itemXml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, 'i'));
  if (!match) return '';

  const raw = match[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeXml(cdata ? cdata[1] : raw).trim();
}

function elementAttribute(itemXml, tagName, attribute) {
  const element = itemXml.match(new RegExp(`<${tagName}(\\s[^>]*?)/?>`, 'i'));
  if (!element) return '';

  const value = element[1].match(new RegExp(`${attribute}="([^"]*)"`, 'i'));
  return value ? decodeXml(value[1]) : '';
}

function plainText(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeGhostPost(itemXml, source) {
  const title = elementText(itemXml, 'title');
  const url = publicUrl(elementText(itemXml, 'link'));
  const publishedAt = new Date(elementText(itemXml, 'pubDate'));

  if (!title || !url || Number.isNaN(publishedAt.getTime())) return null;
  // A post must live on the site it claims to, so a bad feed cannot place
  // third-party links on the homepage.
  if (new URL(url).hostname !== source.host) return null;
  if (publishedAt.getTime() > Date.now()) return null;

  return {
    title,
    excerpt: normalizeExcerpt(plainText(elementText(itemXml, 'description'))),
    url,
    thumbnailUrl: publicUrl(elementAttribute(itemXml, 'media:content', 'url')),
    publishedAt: publishedAt.toISOString()
  };
}

async function requestGhostPosts(source) {
  const feedResponse = await fetch(source.feedUrl, {
    headers: { Accept: 'application/rss+xml, application/xml;q=0.9' },
    signal: AbortSignal.timeout(8000)
  });

  if (!feedResponse.ok) {
    throw new Error(`${source.feedUrl} returned ${feedResponse.status}`);
  }

  const feed = await feedResponse.text();
  const posts = (feed.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/g) || [])
    .map(item => normalizeGhostPost(item, source))
    .filter(Boolean)
    .slice(0, postsPerSource);

  // Treat an unreadable feed as a failure so the static fallback survives.
  if (!posts.length) {
    throw new Error(`${source.feedUrl} returned no usable items`);
  }

  return posts;
}

// One dead feed must not blank the other, so each source resolves independently.
async function blogPreviews() {
  const names = Object.keys(ghostSources);
  const results = await Promise.allSettled(
    names.map(name => cached(`ghost:${name}`, () => requestGhostPosts(ghostSources[name])))
  );

  const data = {};
  let available = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      data[names[index]] = result.value;
      available += 1;
      return;
    }

    console.error(`Unable to load ${names[index]} posts:`, result.reason.message);
    data[names[index]] = [];
  });

  if (!available) {
    throw new Error('No blog feeds are available.');
  }

  return data;
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Cache-Control': status === 200 ? 'public, max-age=300, stale-while-revalidate=86400' : 'no-store',
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json; charset=UTF-8',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(body);
}

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method || '')) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }

    const requestUrl = new URL(request.url || '/', 'http://localhost');
    if (requestUrl.pathname === '/api/latest-writing') {
      if (!beehiivApiKey || !beehiivPublicationId) {
        sendJson(response, 503, { error: 'Latest writing is not configured.' });
        return;
      }

      try {
        const posts = await latestWriting();
        sendJson(response, 200, { data: posts });
      } catch (error) {
        console.error('Unable to load latest writing from Beehiiv:', error.message);
        sendJson(response, 502, { error: 'Latest writing is temporarily unavailable.' });
      }
      return;
    }

    if (requestUrl.pathname === '/api/blog-previews') {
      try {
        const data = await blogPreviews();
        sendJson(response, 200, { data });
      } catch (error) {
        console.error('Unable to load blog previews:', error.message);
        sendJson(response, 502, { error: 'Blog previews are temporarily unavailable.' });
      }
      return;
    }

    let filePath = resolvePath(request.url || '/');
    if (!isInsideRoot(filePath)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    let fileStats = await stat(filePath);
    if (fileStats.isDirectory()) {
      filePath = join(filePath, 'index.html');
      fileStats = await stat(filePath);
    }

    response.writeHead(200, headersFor(filePath, fileStats.size));
    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    response.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Serving static site on port ${port}`);
});
