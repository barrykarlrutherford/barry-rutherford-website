# Ghost blog previews on the homepage

The Malestrum and Breakwater project cards each show the two latest posts from
their Ghost blog. The homepage requests `/api/blog-previews`, a server-side
endpoint that reads each blog's public RSS feed.

## No configuration required

**There are no API keys, environment variables, or Railway settings for this
feature.** Ghost publishes a public RSS feed per site, so the server reads them
directly. Nothing to rotate, nothing to set before a deploy.

Feeds are a fixed allowlist in `server.mjs` (`ghostSources`):

```text
malestrum  → https://malestrum.com/rss/
breakwater → https://blog.breakwaterops.com/rss/
```

Note the Breakwater blog lives on the **`blog.` subdomain**. The apex
`breakwaterops.com` is a separate marketing site with no blog and no feed — do
not point the source at it.

Each post's link must resolve to its source's own hostname, so a hijacked or
malformed feed cannot place third-party links on the homepage.

## Verification

Check both feeds directly, any time — no setup needed:

```sh
npm run check:ghost
```

With the server running, exercise the endpoint:

```sh
npm start
curl -s localhost:8080/api/blog-previews | python3 -m json.tool
```

After Railway redeploys, open:

```text
https://barryrutherford.com/api/blog-previews
```

It should return a JSON `data` object with a `malestrum` and a `breakwater`
array.

## Caching and failure behavior

Successful responses are cached for 15 minutes server-side, and browsers/CDNs
may cache them for 5 minutes. If a feed fails, the server serves the previous
posts for an extra 5 minutes.

Each feed is fetched independently, so one blog being down does not affect the
other. A blog with no usable posts keeps the static card written into
`index.html`, which is also what no-JS visitors see. The homepage never shows an
empty preview list.

## Changing how many posts appear

Set `postsPerSource` in `server.mjs`. The client renders whatever it receives,
so this is the only place the count is defined.
