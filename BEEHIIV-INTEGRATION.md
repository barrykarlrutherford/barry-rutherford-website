# Beehiiv homepage previews

The homepage requests `/api/latest-writing`, a server-side endpoint that returns
public metadata for the three latest published Beehiiv web posts. The API token
never reaches browser JavaScript.

## Railway variables

Add these variables to the Barry Rutherford website service in Railway:

```text
BEEHIIV_API_KEY=<Beehiiv API key with posts:read access>
BEEHIIV_PUBLICATION_ID=pub_...
```

Redeploy the service after adding or changing either variable. The server reads
them when it starts.

## Verification

With the variables set locally, test the credentials directly:

```sh
npm run check:beehiiv
```

After Railway redeploys, open:

```text
https://barryrutherford.com/api/latest-writing
```

It should return a JSON `data` array. The server caches successful Beehiiv
responses for 15 minutes and allows browsers/CDNs to cache them for 5 minutes.
If the variables are absent or Beehiiv is unavailable, the homepage retains its
static American Endgame fallback card.
