import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = join(root, 'art', 'photography');
const PREVIEW_COUNT = 8;

const PHOTO_CREDIT = '© Griffin Rutherford';
const PHOTO_META = `Photography · ${PHOTO_CREDIT}`;
const GRIFFIN_SITE = 'https://griffinrutherford.com';

const photos = JSON.parse(
  await readFile(join(root, 'art', 'photography-data.json'), 'utf8')
);

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

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function purchaseBlock() {
  return `<p class="art-detail__purchase">Interested in a print? <a href="${GRIFFIN_SITE}">Contact Griffin</a> for purchasing inquiries.</p>`;
}

function photoCard(photo) {
  const thumb = `images/art/photography/thumbs/${photo.file}`;
  const href = `art/photography/${photo.slug}.html`;
  const title = escapeHtml(photo.title);
  const alt = escapeHtml(photo.alt);

  return `                <figure class="art-item" data-category="photography">
                    <a class="art-item__link" href="${href}">
                        <img src="${thumb}" alt="${alt}" loading="lazy">
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
  const dateLine = date ? `<p class="art-detail__date">${date}</p>` : '';

  const navLink = (target, label) => {
    if (!target) return `<span class="art-detail__nav-placeholder"></span>`;
    return `<a class="art-detail__nav-link" href="${target.slug}.html">${label}</a>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(photo.title)} | ${PHOTO_CREDIT}</title>
    <meta name="description" content="${escapeHtml(photo.alt)}">
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
                <img class="art-detail__img" src="../../images/art/photography/${photo.file}" alt="${escapeHtml(photo.alt)}">
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
            <p>${PHOTO_CREDIT}. <a href="${GRIFFIN_SITE}" target="_blank" rel="noopener noreferrer">Griffin Rutherford</a>. <a href="${GRIFFIN_SITE}">Contact Griffin</a> for purchasing inquiries.</p>
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
    return `                <figure class="art-item">
                    <a class="art-item__link" href="${photo.slug}.html">
                        <img src="${thumb}" alt="${alt}" loading="lazy">
                    </a>
                    <figcaption>
                        <span class="art-item__title">${title}</span>
                        <span class="art-item__meta">${PHOTO_META}</span>
                    </figcaption>
                </figure>`;
  }).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Photography | ${PHOTO_CREDIT}</title>
    <meta name="description" content="Photography by Griffin Rutherford — landscapes, sunsets, and Santa Fe light.">
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
            <p class="section-intro">Landscapes, light, and daily vistas by Griffin Rutherford. All photographs ${PHOTO_CREDIT}. <a href="${GRIFFIN_SITE}">Contact Griffin</a> for purchasing inquiries.</p>
            <div class="art-grid">
${cards}
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <p>${PHOTO_CREDIT}. <a href="${GRIFFIN_SITE}" target="_blank" rel="noopener noreferrer">Griffin Rutherford</a>. <a href="${GRIFFIN_SITE}">Contact Griffin</a> for purchasing inquiries.</p>
        </div>
    </footer>
</body>
</html>
`;
}

function previewBlock() {
  const previewCards = photos.slice(0, PREVIEW_COUNT).map(p => photoCard(p)).join('\n\n');
  return `                <!-- Photography preview — full gallery at art/photography/index.html -->
${previewCards}

                <div class="art-item art-item--cta" data-category="photography">
                    <a class="art-cta" href="art/photography/index.html">
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
await writeFile(previewPath, previewBlock());

console.log(`Generated ${photos.length} photo pages, gallery index, and preview block.`);