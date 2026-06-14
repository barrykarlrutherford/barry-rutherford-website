import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 8080);

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

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method || '')) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
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
