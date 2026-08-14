import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 8080);
const beehiivApiKey = process.env.BEEHIIV_API_KEY;
const beehiivPublicationId = process.env.BEEHIIV_PUBLICATION_ID;
const beehiivCacheTtlMs = 15 * 60 * 1000;
const beehiivCache = {
  posts: null,
  expiresAt: 0,
  request: null
};

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

async function latestWriting() {
  if (beehiivCache.posts && beehiivCache.expiresAt > Date.now()) {
    return beehiivCache.posts;
  }

  if (!beehiivCache.request) {
    beehiivCache.request = requestLatestWriting()
      .then(posts => {
        beehiivCache.posts = posts;
        beehiivCache.expiresAt = Date.now() + beehiivCacheTtlMs;
        return posts;
      })
      .finally(() => {
        beehiivCache.request = null;
      });
  }

  try {
    return await beehiivCache.request;
  } catch (error) {
    if (beehiivCache.posts) {
      beehiivCache.expiresAt = Date.now() + 5 * 60 * 1000;
      return beehiivCache.posts;
    }
    throw error;
  }
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
