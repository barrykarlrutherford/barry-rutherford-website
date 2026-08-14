const apiKey = process.env.BEEHIIV_API_KEY;
const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

if (!apiKey || !publicationId) {
  console.error('Set BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID before running this check.');
  process.exitCode = 1;
} else if (!publicationId.startsWith('pub_')) {
  console.error('BEEHIIV_PUBLICATION_ID must start with pub_.');
  process.exitCode = 1;
} else {
  const endpoint = new URL(
    `https://api.beehiiv.com/v2/publications/${encodeURIComponent(publicationId)}/posts`
  );
  endpoint.search = new URLSearchParams({
    status: 'confirmed',
    hidden_from_feed: 'false',
    limit: '3',
    order_by: 'publish_date',
    direction: 'desc'
  });

  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    console.error(`Beehiiv configuration check failed with HTTP ${response.status}.`);
    process.exitCode = 1;
  } else {
    const payload = await response.json();
    const titles = (payload.data || []).map(post => post.title).filter(Boolean);
    console.log(`Beehiiv configuration works. Latest posts: ${titles.join(' | ') || 'none found'}`);
  }
}
