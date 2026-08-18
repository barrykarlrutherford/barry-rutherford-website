import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = join(root, 'art', 'photography');
const PREVIEW_COUNT = 8;
const SITE_URL = 'https://barryrutherford.com';

const PHOTO_CREDIT = '© Griffin Rutherford';
const PHOTO_META = `Photography · ${PHOTO_CREDIT}`;
const GRIFFIN_EMAIL = 'griffinkrutherford@gmail.com';
const GRIFFIN_SITE = 'https://griffinrutherford.com';

const photos = JSON.parse(
  await readFile(join(root, 'art', 'photography-data.json'), 'utf8')
);

function jpegDimensions(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  const startOfFrame = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
  ]);

  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buffer[offset + 1];
    if (startOfFrame.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2) break;
    offset += segmentLength + 2;
  }

  return null;
}

for (const photo of photos) {
  const [fullBuffer, thumbBuffer] = await Promise.all([
    readFile(join(root, 'images', 'art', 'photography', photo.file)),
    readFile(join(root, 'images', 'art', 'photography', 'thumbs', photo.file))
  ]);
  photo.fullDimensions = jpegDimensions(fullBuffer);
  photo.thumbDimensions = jpegDimensions(thumbBuffer);
}

function formatDate(file) {
  const match = file.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function isoDate(file) {
  const match = file.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function purchaseBlock() {
  return `<p class="art-detail__purchase">Interested in a print? <a href="mailto:${GRIFFIN_EMAIL}">${GRIFFIN_EMAIL}</a> for purchasing inquiries.</p>`;
}

function photoCard(photo) {
  const thumb = `../images/art/photography/thumbs/${photo.file}`;
  const href = `photography/${photo.slug}.html`;
  const title = escapeHtml(photo.title);
  const alt = escapeHtml(photo.alt);
  const dimensions = photo.thumbDimensions
    ? ` width="${photo.thumbDimensions.width}" height="${photo.thumbDimensions.height}"`
    : '';

  return `                <figure class="art-item" data-category="photography">
                    <a class="art-item__link" href="${href}">
                        <img src="${thumb}" alt="${alt}"${dimensions} loading="lazy" decoding="async">
                    </a>
                    <figcaption>
                        <span class="art-item__title">${title}</span>
                        <span class="art-item__meta">${PHOTO_META}</span>
                    </figcaption>
                </figure>`;
}

function detailPage(photo, index) {
  const prev = photos[index + 1];
  const next = photos[index - 1];
  const date = formatDate(photo.file);
  const created = isoDate(photo.file);
  const dateLine = date ? `<p class="art-detail__date">${date}</p>` : '';
  const canonical = `${SITE_URL}/art/photography/${photo.slug}.html`;
  const image = `${SITE_URL}/images/art/photography/${encodeURIComponent(photo.file)}`;
  const title = `${photo.title} Photograph | Griffin Rutherford`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: photo.title,
    description: photo.alt,
    contentUrl: image,
    url: canonical,
    creator: {
      '@type': 'Person',
      name: 'Griffin Rutherford',
      url: GRIFFIN_SITE
    },
    copyrightHolder: {
      '@type': 'Person',
      name: 'Griffin Rutherford',
      url: GRIFFIN_SITE
    },
    creditText: PHOTO_CREDIT,
    ...(created ? { dateCreated: created } : {})
  };
  const dimensions = photo.fullDimensions
    ? ` width="${photo.fullDimensions.width}" height="${photo.fullDimensions.height}"`
    : '';

  const navLink = (target, label) => {
    if (!target) return `<span class="art-detail__nav-placeholder"></span>`;
    return `<a class="art-detail__nav-link" href="${target.slug}.html">${label}</a>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(photo.alt)}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(photo.alt)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:alt" content="${escapeHtml(photo.alt)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(photo.alt)}">
    <meta name="twitter:image" content="${image}">
    <script type="application/ld+json">${jsonLd(structuredData)}</script>
    <link rel="stylesheet" href="../../styles.css">
</head>
<body class="art-detail-page">
    <nav class="nav art-detail-nav">
        <div class="nav-container">
            <a href="../../index.html#art" class="nav-logo">Barry Rutherford</a>
            <ul class="nav-menu">
                <li><a href="../../index.html#art">← Back to Art</a></li>
                <li><a href="index.html">All Photography</a></li>
            </ul>
        </div>
    </nav>

    <main class="art-detail">
        <div class="container">
            <figure class="art-detail__figure">
                <img class="art-detail__img" src="../../images/art/photography/${photo.file}" alt="${escapeHtml(photo.alt)}"${dimensions} decoding="async">
            </figure>
            <div class="art-detail__info">
                <p class="art-detail__eyebrow">${PHOTO_META}</p>
                <h1 class="art-detail__title">${escapeHtml(photo.title)}</h1>
                ${dateLine}
                ${purchaseBlock()}
            </div>
            <nav class="art-detail__nav" aria-label="Photo navigation">
                ${navLink(prev, '← Previous')}
                <a class="art-detail__nav-link art-detail__nav-link--gallery" href="index.html">Gallery</a>
                ${navLink(next, 'Next →')}
            </nav>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <p>${PHOTO_CREDIT}. <a href="${GRIFFIN_SITE}" target="_blank" rel="noopener noreferrer">Griffin Rutherford</a>. <a href="mailto:${GRIFFIN_EMAIL}">${GRIFFIN_EMAIL}</a> for purchasing inquiries.</p>
        </div>
    </footer>
</body>
</html>
`;
}

function galleryIndex() {
  const cards = photos.map(photo => {
    const thumb = `../../images/art/photography/thumbs/${photo.file}`;
    const title = escapeHtml(photo.title);
    const alt = escapeHtml(photo.alt);
    const search = escapeHtml(`${photo.title} ${photo.alt}`.toLowerCase());
    const dimensions = photo.thumbDimensions
      ? ` width="${photo.thumbDimensions.width}" height="${photo.thumbDimensions.height}"`
      : '';
    return `                <figure class="art-item" data-search="${search}">
                    <a class="art-item__link" href="${photo.slug}.html">
                        <img src="${thumb}" alt="${alt}"${dimensions} loading="lazy" decoding="async">
                    </a>
                    <figcaption>
                        <span class="art-item__title">${title}</span>
                        <span class="art-item__meta">${PHOTO_META}</span>
                    </figcaption>
                </figure>`;
  }).join('\n\n');

  const canonical = `${SITE_URL}/art/photography/`;
  const title = 'Landscape Photography | Griffin Rutherford';
  const description = 'Landscape photography by Griffin Rutherford featuring sunsets, mountains, forests, weather, and the light of Santa Fe and the American West.';
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Photography by Griffin Rutherford',
    description,
    url: canonical,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: photos.length,
      itemListElement: photos.map((photo, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/art/photography/${photo.slug}.html`,
        name: photo.title
      }))
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${SITE_URL}/images/art/photography/20260708_200103.jpg">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${SITE_URL}/images/art/photography/20260708_200103.jpg">
    <script type="application/ld+json">${jsonLd(structuredData)}</script>
    <link rel="stylesheet" href="../../styles.css">
</head>
<body class="art-detail-page">
    <nav class="nav art-detail-nav">
        <div class="nav-container">
            <a href="../../index.html#art" class="nav-logo">Barry Rutherford</a>
            <ul class="nav-menu">
                <li><a href="../../index.html#art">← Back to Art</a></li>
            </ul>
        </div>
    </nav>

    <main class="art-gallery-page">
        <div class="container">
            <h1 class="section-title">Photography</h1>
            <p class="section-intro">Landscapes, light, and daily vistas by Griffin Rutherford. All photographs ${PHOTO_CREDIT}. <a href="mailto:${GRIFFIN_EMAIL}">${GRIFFIN_EMAIL}</a> for purchasing inquiries.</p>

            <div class="art-search">
                <label class="art-search__label" for="photo-search-input">Search photography</label>
                <input type="search" id="photo-search-input" class="art-search__input" placeholder="Try “sunset,” “mountains,” “snow,” “sculpture”…" autocomplete="off">
                <p class="art-search__meta" id="photo-search-meta" aria-live="polite"></p>
            </div>

            <div class="art-grid" id="photo-grid">
${cards}
            </div>

            <p class="art-empty" id="photo-empty" hidden>No photographs match your search. Try a different word, like “rainbow” or “forest.”</p>

            <nav class="art-pagination" id="photo-pagination" aria-label="Photography pagination"></nav>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <p>${PHOTO_CREDIT}. <a href="${GRIFFIN_SITE}" target="_blank" rel="noopener noreferrer">Griffin Rutherford</a>. <a href="mailto:${GRIFFIN_EMAIL}">${GRIFFIN_EMAIL}</a> for purchasing inquiries.</p>
        </div>
    </footer>

    <script src="gallery.js" defer></script>
</body>
</html>
`;
}

function previewBlock() {
  const previewCards = photos.slice(0, PREVIEW_COUNT).map(p => photoCard(p)).join('\n\n');
  return `                <!-- Photography preview — full gallery at art/photography/index.html -->
${previewCards}

                <div class="art-item art-item--cta" data-category="photography">
                    <a class="art-cta" href="photography/index.html">
                        <span class="art-cta__title">View all photography</span>
                        <span class="art-cta__meta">${photos.length} photographs →</span>
                    </a>
                </div>`;
}

await mkdir(outDir, { recursive: true });

const activeSlugs = new Set(photos.map(p => p.slug));
activeSlugs.add('index');

for (const file of await readdir(outDir)) {
  if (!file.endsWith('.html')) continue;
  const slug = file.replace(/\.html$/, '');
  if (!activeSlugs.has(slug)) {
    await unlink(join(outDir, file));
    console.log(`Removed orphaned page: ${file}`);
  }
}

for (let i = 0; i < photos.length; i++) {
  const page = detailPage(photos[i], i);
  await writeFile(join(outDir, `${photos[i].slug}.html`), page);
}

await writeFile(join(outDir, 'index.html'), galleryIndex());

const previewPath = join(root, 'art', 'photography-preview.html');
const preview = previewBlock();
await writeFile(previewPath, preview);

const hubPath = join(root, 'art', 'index.html');
const hub = await readFile(hubPath, 'utf8');
const previewStart = hub.indexOf('                <!-- Photography preview');
const sculptureStart = hub.indexOf('                <figure class="art-item" data-category="sculpture">', previewStart);
if (previewStart === -1 || sculptureStart === -1) {
  throw new Error('Could not locate the photography preview markers in art/index.html');
}
const updatedHub = `${hub.slice(0, previewStart)}${preview}\n\n${hub.slice(sculptureStart)}`;
await writeFile(hubPath, updatedHub);

console.log(`Generated ${photos.length} photo pages, gallery index, and art hub preview.`);
