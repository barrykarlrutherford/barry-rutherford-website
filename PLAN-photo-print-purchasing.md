# Plan: Automated Photo Print Purchasing

Turn the photography gallery from "email Griffin to inquire" into a self-serve
storefront where a visitor can buy a print of any of Griffin's 33 photographs,
pay online, and have it printed and shipped — ideally with zero manual steps per
order.

**Status:** proposal / not yet started. Requires the pricing + provider
decisions in [§9](#9-decisions-needed-before-building) before any code lands.

---

## 1. Where we are today

- **Static site**, tiny Node server (`server.mjs`) that serves files and one JSON
  API (`/api/latest-writing`). Hosted on Railway, deploys from `main`.
- **33 photographs** described in `art/photography-data.json`. Current model is
  minimal — no price, size, or SKU:
  ```json
  { "file": "20260708_200103.jpg", "title": "Rainbow Over Desert Hills",
    "alt": "…", "slug": "rainbow-over-desert-hills" }
  ```
- **Detail pages are generated** by `scripts/build-photography.mjs` (run via
  `npm run build`). Each page ends in a `purchaseBlock()` that today is just a
  `mailto:` to Griffin. This is the natural place to inject a Buy button.
- **Purchasing is manual and unattributed:** photography → Griffin's email,
  sculpture → Barry's. Nothing captures the order, the size, or payment.

The good news: the generator + data-file architecture means we can drive
products, prices, and buy-buttons from `photography-data.json` at build time and
never hand-edit 33 pages.

---

## 2. The two hard problems (and why "automated" means both)

An automated print store is really two systems stitched together:

1. **Payment** — collect money securely without touching card data ourselves.
2. **Fulfillment** — get a physical, framed-or-unframed print produced and
   shipped to the buyer.

You can automate these independently. The cheapest first step automates payment
and leaves fulfillment manual; the end state automates both. The plan below is
phased so we can ship value in a weekend and grow into full automation.

---

## 3. Build vs. buy — the fulfillment decision

This is the biggest fork. Three realistic models:

| Model | How it works | Effort | Margin | Best when |
|---|---|---|---|---|
| **A. Manual fulfillment** | We take payment online; Griffin orders each print from a lab (e.g. WHCC, Bay Photo, a local Santa Fe printer) and ships it. | Lowest to launch | Highest per-print, but Griffin's time per order | Low volume, wants control over paper/quality, local pickup possible |
| **B. Print-on-demand (POD) API** | A provider (Prodigi/Pwinty, Gelato, Printful) prints & drop-ships automatically when our webhook sends them the order. | Medium | Lower (provider takes a cut) | Hands-off is the priority; volume unpredictable |
| **C. Marketplace** | List the catalog on SmugMug / Fine Art America / Pixieset and link out. They own checkout + fulfillment. | Lowest overall | Lowest | Willing to trade brand/UX and margin for zero engineering |

**Recommendation:** **Start with A (manual fulfillment behind an automated
checkout), architect for B.** Griffin controls print quality and paper, learns
real demand and sizing before committing to a POD provider's color profile, and
the *only* thing that changes when we graduate to B is the code inside one
webhook handler. Avoid C unless we decide the store isn't worth any eng time —
it fragments the brand and caps margin.

---

## 4. Payment: Stripe, in increasing order of effort

All three keep card data entirely on Stripe (no PCI burden on us). Pick the
lowest tier that meets the need and upgrade later.

### 4a. Stripe Payment Links (MVP — no server code)
- Create one Stripe **Product** per photograph, with a **Price** per size
  (e.g. 8×10, 16×20, 24×36). Stripe hosts the checkout page.
- Each price becomes a **Payment Link** URL. Store those URLs in
  `photography-data.json`; the generator renders them as Buy buttons.
- Turn on Stripe's built-in **shipping address collection**, **sales-tax
  (Stripe Tax)**, and **shipping rates**.
- On payment, Stripe emails Griffin; he fulfills manually (Model A).
- **Pro:** shippable in days, no `server.mjs` changes, no secrets in our app.
- **Con:** a product/price catalog maintained by hand in the Stripe dashboard;
  no cart (one photo per checkout).

### 4b. Stripe Checkout Sessions (one server endpoint)
- Add `POST /api/checkout` to `server.mjs` (mirrors the existing
  `/api/latest-writing` pattern) that creates a Checkout Session server-side from
  a `{ slug, size }` and returns the redirect URL.
- Lets us build prices/SKUs from `photography-data.json` instead of hand-copying
  Payment Links, add a **cart**, apply logic (discounts, bundles), and keep the
  Stripe secret key server-side (`STRIPE_SECRET_KEY` env var, same mechanism as
  `BEEHIIV_API_KEY`).
- **Pro:** catalog is code, supports multi-item cart. **Con:** real endpoint +
  the `stripe` npm dependency (first dependency in this repo — currently
  dependency-free).

### 4c. Full custom cart + Payment Element
- Only if we outgrow Checkout (custom cart UI on-site, saved carts, etc.).
  Overkill for launch; note it and move on.

**Recommendation:** **Launch on 4a (Payment Links).** Move to 4b when either the
manual catalog becomes annoying (~2–3 sizes × 33 photos = up to ~99 prices) or we
want a cart / automated fulfillment (the webhook lives most naturally alongside
4b's endpoint).

---

## 5. Fulfillment automation (Phase 2, Model B)

When ready to go hands-off:

1. Pick a POD provider with a **print/framed-print API** and giclée/fine-art
   paper options — **Prodigi** and **Gelato** are the usual fits for
   photographic fine-art prints; validate paper stock and color management with
   a test order first.
2. Add `POST /api/stripe-webhook` to `server.mjs`. On `checkout.session.completed`:
   verify the Stripe signature, map the purchased Price/SKU → provider product +
   our source image, and submit an order to the provider's API with the buyer's
   shipping address.
3. Store provider credentials as env vars (`PRODIGI_API_KEY`, etc.).
4. Email Griffin + buyer a confirmation; log the order.

**Image pipeline note:** POD printing needs **full-resolution source files**, not
the web JPEGs in `images/art/photography/`. Those originals must live somewhere
the fulfillment step can reach (private bucket / the provider's asset library),
mapped by `slug`. Decide this before Phase 2 — it's the main new moving part.

---

## 6. Data model changes

Extend each entry in `art/photography-data.json` so the generator can render
products without hand-editing pages. Example:

```json
{
  "file": "20260708_200103.jpg",
  "title": "Rainbow Over Desert Hills",
  "alt": "…",
  "slug": "rainbow-over-desert-hills",
  "forSale": true,
  "editions": [
    { "size": "8x10",  "price": 4500,  "paymentLink": "https://buy.stripe.com/…" },
    { "size": "16x20", "price": 12000, "paymentLink": "https://buy.stripe.com/…" },
    { "size": "24x36", "price": 24000, "paymentLink": "https://buy.stripe.com/…" }
  ]
}
```

- `price` in **integer cents** (Stripe's convention; avoids float bugs).
- `forSale` lets us exclude any image (e.g. one that's print-only on request).
- In Phase 4b/2, replace `paymentLink` with a stable `sku` and build the price
  server-side.

`scripts/build-photography.mjs` → rewrite `purchaseBlock(photo)` to render a size
picker + Buy buttons from `editions` when `forSale`, falling back to the current
`mailto:` otherwise. Add matching styles (`.art-detail__buy`, price chips) to
`styles.css`.

---

## 7. Phased rollout

- **Phase 0 — Decisions ([§9](#9-decisions-needed-before-building)).** Pricing,
  sizes, framing, provider direction. Blocks everything.
- **Phase 1 — Automated checkout, manual fulfillment (Model A + Stripe 4a).**
  - Stripe account, Products/Prices/Payment Links for a **pilot set of ~5
    photos**.
  - Extend `photography-data.json`; update the generator + styles to render Buy
    buttons; regenerate the 33 pages.
  - Enable Stripe Tax + shipping collection. Test purchase end-to-end.
  - *Outcome:* real sales, no per-order code, Griffin ships prints.
- **Phase 2 — Catalog as code (Stripe 4b).** Add `/api/checkout`, the `stripe`
  dependency, `STRIPE_SECRET_KEY`; drop hand-managed Payment Links; optional cart.
- **Phase 3 — Automated fulfillment (Model B).** POD provider + Stripe webhook +
  full-res image pipeline. This is the "fully automated" end state.
- **Phase 4 — Polish.** Order confirmation page, receipts, "my order" lookup,
  inventory/edition caps if prints are limited editions, analytics.

Ship Phase 1, then decide whether demand justifies Phase 2–3.

---

## 8. Concrete touchpoints in this repo

- `art/photography-data.json` — add `forSale` + `editions` (§6).
- `scripts/build-photography.mjs` — rewrite `purchaseBlock()`; regenerate pages.
- `styles.css` — Buy button / size-picker / price styles.
- `server.mjs` — **Phase 2+** only: `POST /api/checkout`, **Phase 3:**
  `POST /api/stripe-webhook`. Follows the existing `/api/latest-writing` +
  env-var pattern.
- `package.json` — **Phase 2+**: add `stripe` (first runtime dependency).
- `.env.example` — add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, POD keys.
- Railway — set the same env vars in the production service.
- `scripts/check-seo.mjs` — ensure new buy markup doesn't trip SEO checks.

---

## 9. Decisions needed before building

1. **Sizes & pricing** — which print sizes, and price each (cents). Framed,
   unframed, or both?
2. **Limited editions?** Numbered/capped runs (needs inventory tracking) or
   open edition (simpler)?
3. **Fulfillment model** — confirm **A → B** path; if leaning marketplace (C),
   this whole plan simplifies to "list on X."
4. **Who owns support & returns** — Griffin (photographer/copyright holder) is
   the natural owner; confirm the contact + a simple return/damage policy.
5. **Sales tax / business entity** — Stripe Tax handles calculation, but selling
   physical goods may need a NM registration / resale considerations. Flag for
   Griffin/Barry (and possibly an accountant).
6. **Full-resolution originals** — where do they live for POD (Phase 3)? Needed
   before automated fulfillment.
7. **Money flow** — which Stripe account receives payouts (Griffin's, since the
   photography is his)? Affects tax reporting.

---

## 10. Recommendation in one line

Stand up **Stripe Payment Links on ~5 pilot photos with manual fulfillment
(Phase 1)** to prove demand and pricing with near-zero engineering, having
designed `photography-data.json` and the generator so that graduating to
**server-side checkout (Phase 2)** and **automated print-on-demand fulfillment
(Phase 3)** changes code in one endpoint and one webhook — not 33 pages.
