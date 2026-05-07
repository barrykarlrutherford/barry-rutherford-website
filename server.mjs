import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 8080);
const newsCacheMs = 15 * 60 * 1000;
let newsCache = null;

const newsFeeds = [
  {
    name: 'The New York Times',
    homepage: 'https://www.nytimes.com/',
    feedUrl: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'
  },
  {
    name: 'The Atlantic',
    homepage: 'https://www.theatlantic.com/',
    feedUrl: 'https://www.theatlantic.com/feed/all/'
  },
  {
    name: 'Stratechery',
    homepage: 'https://stratechery.com/',
    feedUrl: 'https://stratechery.com/feed/'
  }
];

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

function decodeEntities(value = '') {
  const entities = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
    rsquo: "'",
    lsquo: "'",
    rdquo: '"',
    ldquo: '"',
    ndash: '-',
    mdash: '-'
  };

  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => entities[name.toLowerCase()] || match)
    .trim();
}

function stripHtml(value = '') {
  return decodeEntities(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));
}

function tagContent(block, tagName) {
  const pattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = block.match(pattern);
  return match ? decodeEntities(match[1]) : '';
}

function attrContent(block, tagName, attrName, preferredRel = '') {
  const tags = block.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) || [];
  const preferred = preferredRel
    ? tags.find((tag) => new RegExp(`rel=["']${preferredRel}["']`, 'i').test(tag))
    : tags[0];
  const tag = preferred || tags[0] || '';
  const match = tag.match(new RegExp(`${attrName}=["']([^"']+)["']`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

function parseFeed(xml, source) {
  const isAtom = /<feed\b/i.test(xml);
  const blocks = isAtom
    ? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []
    : xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return blocks.slice(0, 4).map((block) => {
    const title = stripHtml(tagContent(block, 'title'));
    const link = isAtom ? attrContent(block, 'link', 'href', 'alternate') : tagContent(block, 'link');
    const summary = isAtom
      ? stripHtml(tagContent(block, 'summary') || tagContent(block, 'content')).slice(0, 180)
      : stripHtml(tagContent(block, 'description')).slice(0, 180);
    const published = isAtom
      ? tagContent(block, 'published') || tagContent(block, 'updated')
      : tagContent(block, 'pubDate');

    return {
      title,
      link,
      summary,
      published,
      source: source.name
    };
  }).filter((item) => item.title && item.link);
}

async function fetchFeed(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(source.feedUrl, {
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        'User-Agent': 'BarryRutherford.com RSS widget (+https://barryrutherford.com)'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Feed responded with ${response.status}`);
    }

    const xml = await response.text();
    const items = parseFeed(xml, source);

    if (!items.length) {
      throw new Error('No feed items found');
    }

    return {
      name: source.name,
      homepage: source.homepage,
      items
    };
  } catch (error) {
    return {
      name: source.name,
      homepage: source.homepage,
      error: error.name === 'AbortError' ? 'Feed request timed out' : error.message,
      items: []
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function newsResponse() {
  if (newsCache && Date.now() - newsCache.createdAt < newsCacheMs) {
    return newsCache.payload;
  }

  const sources = await Promise.all(newsFeeds.map(fetchFeed));
  const payload = {
    updatedAt: new Date().toISOString(),
    sources
  };

  newsCache = {
    createdAt: Date.now(),
    payload
  };

  return payload;
}

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

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method || '')) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }

    if ((request.url || '').split('?')[0] === '/api/news') {
      const payload = await newsResponse();
      const body = JSON.stringify(payload);
      response.writeHead(200, {
        'Cache-Control': 'public, max-age=300',
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'application/json; charset=UTF-8',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Content-Type-Options': 'nosniff'
      });
      if (request.method !== 'HEAD') {
        response.end(body);
      } else {
        response.end();
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
