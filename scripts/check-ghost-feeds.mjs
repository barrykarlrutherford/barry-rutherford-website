// Verifies both Ghost RSS feeds are reachable and still parseable. Needs no
// credentials, so it doubles as a canary after Ghost upgrades.
const sources = {
  malestrum: { feedUrl: 'https://malestrum.com/rss/', host: 'malestrum.com' },
  breakwater: { feedUrl: 'https://blog.breakwaterops.com/rss/', host: 'blog.breakwaterops.com' }
};

function elementText(itemXml, tagName) {
  const match = itemXml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, 'i'));
  if (!match) return '';

  const raw = match[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return (cdata ? cdata[1] : raw).trim();
}

for (const [name, source] of Object.entries(sources)) {
  try {
    const response = await fetch(source.feedUrl, {
      headers: { Accept: 'application/rss+xml, application/xml;q=0.9' },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      console.error(`${name}: ${source.feedUrl} returned HTTP ${response.status}.`);
      process.exitCode = 1;
      continue;
    }

    const feed = await response.text();
    const posts = (feed.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/g) || [])
      .map(item => ({
        title: elementText(item, 'title'),
        link: elementText(item, 'link'),
        pubDate: elementText(item, 'pubDate')
      }))
      .filter(post => post.title && post.link.includes(source.host))
      .slice(0, 3);

    if (!posts.length) {
      console.error(`${name}: feed parsed but produced no usable posts.`);
      process.exitCode = 1;
      continue;
    }

    console.log(`${name}: ${posts.length} post(s) from ${source.feedUrl}`);
    for (const post of posts) {
      console.log(`  - ${post.title} (${post.pubDate})`);
    }
  } catch (error) {
    console.error(`${name}: ${error.message}`);
    process.exitCode = 1;
  }
}
