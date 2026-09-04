# Plan: Ghost Blog Previews for Malestrum & Breakwater

Show the latest posts from the Malestrum and Breakwater Ghost blogs on
barryrutherford.com, the same way `/api/latest-writing` already surfaces the
three most recent Beehiiv posts in the Essays section.

**Status:** decisions settled 2026-09-04 ([§10](#10-decisions-settled)), ready to
build.

**Locked:** previews render as a compact "Latest posts" list **inside the
existing Malestrum and Breakwater project cards**, **2 posts each**, **with
publish dates**.

---

## 1. Where we are today

The Beehiiv integration is the template, and it is a good one:

- **`server.mjs`** exposes `GET /api/latest-writing`. It calls the Beehiiv API
  server-side, normalizes each post to a small flat shape, caches for 15
  minutes, dedupes in-flight requests, and serves stale data for an extra 5
  minutes if the upstream fails.
- **`script.js`** (the `[data-latest-writing]` block) fetches that endpoint and
  replaces a static fallback card with DOM-built `.essay-card` elements. Every
  field goes in via `textContent` — no HTML from the network is ever injected.
- **`index.html:116`** ships a hand-written American Endgame card as the no-JS /
  API-down fallback.
- **`scripts/check-beehiiv-config.mjs`** (`npm run check:beehiiv`) verifies
  credentials independently of the site.
- **`BEEHIIV-INTEGRATION.md`** documents the Railway variables.

Two properties of this codebase constrain the design:

- **Zero runtime dependencies.** `package.json` has no `dependencies` block at
  all; the server is plain `node:http`. Adding an XML library would be the first
  dependency the project has ever taken.
- **Static-first with graceful degradation.** Every dynamic surface has a
  server-rendered fallback that survives JS being off or the API being down.

---

## 2. What the two sites actually expose (verified 2026-09-04)

Both blogs are Ghost with public feeds. The one detail worth recording is that
the Breakwater blog lives on a subdomain — the apex `breakwaterops.com` has no
blog of its own.

| | Malestrum | Breakwater |
|---|---|---|
| Blog lives at | `https://malestrum.com/` | `https://blog.breakwaterops.com/` **(subdomain)** |
| Platform | Ghost 6.62 (Ghost Pro, `openresty`) | Ghost 6.62 (Ghost Pro, `openresty`) |
| Public RSS | `https://malestrum.com/rss/` → **200**, 15 items | `https://blog.breakwaterops.com/rss/` → **200**, 7 items |
| Feed title | "Malestrum: The Third Phase" | "Breakwater Blog" |
| Most recent post | 2026-07-26 | 2026-07-23 |

`breakwaterops.com` is a six-page marketing site on Railway (`railway-hikari`):
`/`, `/private-advisory`, `/workshops`, `/community`, `/nonprofits`,
`/ai-literacy-workshop`. It is **not** Ghost — `/rss`, `/feed`, `/feed.xml`,
`/atom.xml`, and `/ghost/api/content/posts/` all 404. Its homepage links out to
`https://blog.breakwaterops.com`, which is where the Ghost instance lives. **Any
preview for Breakwater must point at the blog subdomain**, not the apex domain.

Both feeds carry everything a preview card needs, per `<item>`:

| Field | RSS element | Example |
|---|---|---|
| Title | `<title>` (CDATA) | "Why Optimism Died" |
| URL | `<link>` | `https://malestrum.com/why-optimism-died/` |
| Date | `<pubDate>` (RFC 822) | `Wed, 01 Jul 2026 22:45:55 GMT` |
| Image | `<media:content url="…">` | Unsplash CDN URL |
| Excerpt | `<description>` (CDATA HTML) | 219–350 chars of real prose |
| Author | `<dc:creator>` | — |

Every item sampled had a feature image and a usable description, so cards will
not render ragged.

**Two content observations,** neither blocking:

- The Breakwater feed description is still Ghost's default *"Thoughts, stories
  and ideas."* If the feed title/description is ever surfaced, fix it in Ghost
  admin first.
- Both blogs' newest posts are from late July 2026. Previews show dates, so
  publishing a visible "Jul 26" card on the homepage advertises a ~6-week gap.
  Worth a fresh post around launch, or suppress the date (see §10).

---

## 3. Data source: RSS vs. Ghost Content API

| | Public RSS | Ghost Content API |
|---|---|---|
| Credentials | **None** | Content API key per site (created in Ghost admin) |
| Config surface | Zero — no Railway vars, no redeploy | 2 new env vars, documented + set in Railway |
| Response | XML, needs parsing | JSON, `JSON.parse` |
| Fields | Title, link, date, image, excerpt, author | All of the above plus `excerpt`, tags, reading time, `id` |
| Risk | Hand-rolled XML extraction | Key rotation / misconfiguration |

**Recommendation: ship on RSS.** It needs no credentials at all, which removes
the entire class of problems the Beehiiv integration has to document (missing
key → 503, rotation, redeploys). The cost is parsing XML without a library.

That cost is small and bounded here: Ghost generates the feed, the structure is
identical across both sites, and every text field is CDATA-wrapped, so a ~30-line
targeted extractor covers it. It never has to be a general XML parser. Keep the
fetch+parse behind one `fetchGhostPosts(source)` function so swapping to the
Content API later is a single-function change.

Do **not** add `fast-xml-parser` or similar — a first dependency is a real cost
for ~30 lines of matching, and it would need lockfile + install steps in the
Railway build.

---

## 4. Endpoint shape

One endpoint that returns both blogs, not two. It is a single round trip, both
cards populate together, and one dead feed cannot blank the other.

```
GET /api/blog-previews
200 {
  "data": {
    "malestrum":  [ { post }, { post } ],
    "breakwater": [ { post }, { post } ]
  }
}
```

The **server** truncates to 2 posts per source via a single `postsPerSource`
constant, and the client renders everything it receives — one source of truth for
the count, rather than a server limit and a client limit that can drift apart.

Post shape — deliberately the same field names `normalizeBeehiivPost` already
produces, so `script.js` card-building can be shared:

```json
{
  "title": "Why Optimism Died",
  "excerpt": "Generational divides aren't new — but this time…",
  "url": "https://malestrum.com/why-optimism-died/",
  "thumbnailUrl": "https://images.unsplash.com/photo-…",
  "publishedAt": "2026-07-01T22:45:55.000Z"
}
```

Sources are a hardcoded allowlist in `server.mjs` — never a query parameter, or
the endpoint becomes an open proxy:

```js
const ghostSources = {
  malestrum:  { feedUrl: 'https://malestrum.com/rss/',           host: 'malestrum.com' },
  breakwater: { feedUrl: 'https://blog.breakwaterops.com/rss/',  host: 'blog.breakwaterops.com' }
};
```

Fetch both with `Promise.allSettled` so a failure on one degrades to an empty
array for that blog only. Return `200` whenever at least one source resolves;
`502` only if both fail.

---

## 5. Server work (`server.mjs`)

1. **Generalize the cache.** The current `beehiivCache` is a single object with
   `posts` / `expiresAt` / `request`. Replace with a small `Map`-keyed helper
   (`cachedFetch(key, ttlMs, loader)`) holding the same three fields per entry,
   preserving the existing behavior: serve fresh, dedupe concurrent loads,
   extend expiry 5 minutes and serve stale on error. Then use it for
   `latest-writing` and both Ghost sources. **Same TTLs as Beehiiv** — 15 min
   server, `max-age=300, stale-while-revalidate=86400` to browsers.
2. **`fetchGhostPosts(source)`** — `fetch` the feed with
   `AbortSignal.timeout(8000)` (matching Beehiiv), throw on non-2xx, extract
   `<item>` blocks, map to the shape above, drop invalid entries, `slice(0, 3)`.
3. **`normalizeGhostPost`** — reuse the existing helpers:
   - `publicUrl()` for `<link>` and `<media:content url>`;
   - **additionally require `new URL(link).hostname === source.host`**, so a
     hijacked or mis-parsed feed cannot inject third-party links onto the
     homepage;
   - strip tags from `<description>`, decode the five XML entities, collapse
     whitespace, then run the existing `normalizeExcerpt()` for the 240-char cap;
   - `new Date(pubDate)` (RFC 822 parses natively), reject `NaN` and
     future-dated posts exactly as `normalizeBeehiivPost` does.
4. **Route** `/api/blog-previews` next to `/api/latest-writing`, reusing
   `sendJson`. No credential check — there are no credentials.

---

## 6. Client work (`script.js`)

With Option A locked, the preview is a **compact title + date list**, not the
full `.essay-card` (image + excerpt + read-link) used in Essays. That is
deliberate: the project cards already carry a cover image and two paragraphs of
copy, and stacking full essay cards inside them would bury the "Visit →" link.

So **do not refactor the Beehiiv card builder.** It stays as-is, and this gets
its own small renderer — less coupling, and no risk of regressing the Essays
section for a component that only shares a data shape.

1. Add one IIFE that bails unless `[data-blog-previews]` exists, fetches
   `/api/blog-previews`, and for each source replaces the contents of
   `[data-blog-previews="malestrum"]` / `[data-blog-previews="breakwater"]`,
   **skipping any source whose array is empty** so the static fallback survives.
2. Each item: a linked title plus a date rendered with the same
   `Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`
   the Essays list uses, so date formatting is consistent across the homepage.
3. Keep the `.catch()` that silently leaves the fallback in place, and
   `textContent` for every field. Feature images are not rendered in this
   layout, which also sidesteps the external-CDN image question entirely.

---

## 7. Placement (`index.html`) — decided: Option A

**Option A — inside the existing project cards. ← chosen.** Malestrum
(`index.html:164`) and Breakwater (`index.html:177`) already have cards with
copy and a "Visit →" link. Append a compact "Latest posts" list to each, above
the existing link. Previews appear exactly where a reader is already deciding
whether to click through, and no new nav entry or section title is needed.
Cost: the Projects grid gets taller, and the two cards grow asymmetrically if
one blog has fewer posts.

**Option B — one new "From the blogs" section** below Projects, with both feeds
side by side and source badges. Cleaner visual rhythm and a single place to
style; costs a new section, and duplicates the Projects section's job.

Either way, ship **one static fallback card per blog**, hand-written like the
American Endgame card, so no-JS and API-down states show something real. Use the
current top post of each feed:

- Malestrum — "Three Conversations About AI, Education, and the Future of Work"
- Breakwater — "AI Literacy Workshops for Boards & Staff in New Mexico"

Note `scripts/check-seo.mjs` walks every `.html` file and validates local link
targets; external preview links are unaffected, but run `npm run check:seo`
after editing markup.

---

## 8. Failure modes

| Failure | Behavior |
|---|---|
| One feed 404s / times out | That blog keeps its static card; the other renders normally |
| Both feeds fail, no cache | `502`, both static cards remain |
| Both fail, stale cache exists | Stale posts served 5 more minutes (existing Beehiiv behavior) |
| JS disabled | Static cards, always |
| Ghost changes feed markup | Extractor yields 0 valid items → treated as failure → static cards |
| Feed link points off-host | Item dropped by the hostname check (§5.3) |

The site never shows an empty or broken preview region — the worst case is the
hand-written card.

---

## 9. Verification

1. **`scripts/check-ghost-feeds.mjs`** (`npm run check:ghost`), mirroring
   `check:beehiiv`: fetch both feeds, parse, print the three titles and dates per
   source, non-zero exit if either yields nothing. Unlike the Beehiiv check this
   needs no environment setup, so it can run any time — including as a cheap
   canary after Ghost upgrades.
2. **Local:** `npm start`, then `curl -s localhost:8080/api/blog-previews | python3 -m json.tool`
   — expect 3 posts per source with absolute URLs on the right hosts.
3. **Fallback:** block the feed hosts (or point `ghostSources` at a bad URL) and
   confirm the static cards stay put and nothing throws in the console.
4. **Visual:** load `/` and confirm cards render in both light layouts and at
   mobile width, with the hamburger nav unaffected.
5. **`npm run check:seo`** after markup edits.
6. **Production:** after Railway deploys, `https://barryrutherford.com/api/blog-previews`
   should return both arrays.

---

## 10. Decisions settled

All resolved 2026-09-04:

1. **Placement — Option A**, inside the existing project cards (§7).
2. **2 posts per blog.**
3. **Show publish dates.** Both blogs' newest posts are from July 2026 (§2), so
   a fresh post on each around launch is the intended follow-up rather than
   hiding the gap in the UI.
4. **`blog.breakwaterops.com` confirmed** as the canonical Breakwater blog.

Still worth doing in Ghost admin, unblocked by this work: replace the Breakwater
feed's default description, *"Thoughts, stories and ideas."*

---

## 11. File-by-file checklist

| File | Change |
|---|---|
| `server.mjs` | Generalize cache helper; add `ghostSources`, `fetchGhostPosts`, `normalizeGhostPost`, `/api/blog-previews` route |
| `script.js` | Add `[data-blog-previews]` IIFE with a compact list renderer (Beehiiv builder untouched) |
| `index.html` | Preview list + one static fallback item per project card |
| `styles.css` | New `.project-posts` block (list, title link, date) |
| `scripts/check-ghost-feeds.mjs` | New feed checker |
| `package.json` | Add `check:ghost` script (no dependencies) |
| `GHOST-INTEGRATION.md` | New doc — note explicitly that **no credentials or Railway variables are required**, and record the subdomain gotcha from §2 |

**Estimated size:** ~150 lines of server code, ~60 of client, ~40 of markup, one
new script. No new dependencies, no new environment variables, no Railway
configuration.
