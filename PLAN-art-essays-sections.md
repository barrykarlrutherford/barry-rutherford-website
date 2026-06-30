# Plan: "Art" and "Essays" Sections

Adds two new sections to the single-page site (`index.html`):

- **Art** — a gallery of Griffin's photography and Barry's sketches, paintings, welding, and sculptures. Placed **after** the Writing section.
- **Essays** — a series of blog-style posts (key life events, time in Austin, passing of family friends, etc.) plus a space for screenplays. Placed **before** the Connect section.

This is a hand-authored static site (`index.html` + `styles.css` + `script.js`, served by `server.mjs`). There is no build step or CMS, so the plan keeps both sections in plain HTML and reuses patterns already in the codebase.

---

## 1. Resulting page / nav order

Current section order:
`home → about → projects → writing → exploring → connect`

New order:
`home → about → projects → writing → **art** → exploring → **essays** → connect`

> Note: "after Writing" puts **Art** before the existing **Exploring** section. "Before Connect" puts **Essays** after **Exploring**. Confirm this is the intended placement — see Open Questions.

**Nav update** (`index.html`, the `.nav-menu` list, lines ~16–20): add two links so the section count stays scannable:

```html
<li><a href="#writing">Writing</a></li>
<li><a href="#art">Art</a></li>
<li><a href="#exploring">Exploring</a></li>
<li><a href="#essays">Essays</a></li>
<li><a href="#connect">Connect</a></li>
```

Smooth-scroll and scroll-spy already work automatically for any `section[id]` + `a[href^="#"]` (see `script.js`), so no JS change is needed for navigation.

---

## 2. Art section

### 2.1 Markup
Insert a new `<section id="art" class="art">` between the close of `#writing` (line ~127) and the `<!-- What I'm Exploring Section -->` comment (line ~129). Reuse the established grid pattern from Exploring (`.explore-grid` / `.explore-item`) but with an art-specific class so styling can diverge.

```html
<!-- Art Section -->
<section id="art" class="art">
    <div class="container">
        <h2 class="section-title">Art</h2>
        <p class="section-intro">Photography by Griffin Rutherford alongside Barry's sketches, paintings, welded steel, and sculpture.</p>

        <!-- Optional category filter (see 2.3) -->
        <div class="art-filters" role="group" aria-label="Filter artwork">
            <button type="button" class="art-filter is-active" data-filter="all">All</button>
            <button type="button" class="art-filter" data-filter="photography">Photography</button>
            <button type="button" class="art-filter" data-filter="sketch">Sketches</button>
            <button type="button" class="art-filter" data-filter="painting">Paintings</button>
            <button type="button" class="art-filter" data-filter="welding">Welding</button>
            <button type="button" class="art-filter" data-filter="sculpture">Sculpture</button>
        </div>

        <div class="art-grid">
            <!-- Repeat per piece -->
            <figure class="art-item" data-category="sculpture">
                <button type="button" class="art-item__trigger" data-art-full="images/art/sunset-sculpture-full.jpg"
                        aria-haspopup="dialog" aria-label="View 'Sunset' (sculpture) larger">
                    <img src="images/art/sunset-sculpture-thumb.jpg" alt="Welded steel sculpture catching late sun" loading="lazy">
                </button>
                <figcaption>
                    <span class="art-item__title">Sunset</span>
                    <span class="art-item__meta">Sculpture · Barry Rutherford</span>
                </figcaption>
            </figure>
            <!-- ...more .art-item figures... -->
        </div>
    </div>
</section>
```

Notes:
- Each piece is a `<figure>` with a `<figcaption>` carrying title + medium + artist credit. This keeps Griffin's photos and Barry's pieces visually unified in one grid while still crediting each correctly.
- `data-category` powers the optional filter.
- `loading="lazy"` on every `<img>` so a large gallery doesn't slow first paint.
- The existing `sunset-sculpture.jpg` in `images/` is a ready first entry.

### 2.2 Lightbox (reuse existing modal pattern)
The site already has an accessible modal (the Adam's Night excerpt: `data-excerpt-target` / `[data-excerpt-close]` / Escape + focus handling in `script.js`). Add a **single reusable image lightbox** modeled on it rather than one modal per image:

- One `<div class="lightbox" ...>` near the bottom of `index.html` (next to the excerpt modal) containing an empty `<img>` and a `<figcaption>`.
- Clicking an `.art-item__trigger` sets the lightbox `<img src>` from `data-art-full`, copies the caption, and opens it.
- Reuse the open/close/Escape/focus-restore logic already written for the excerpt modal (factor the shared "open dialog / lock body scroll / restore focus" behavior so both features use it).

### 2.3 Optional filter behavior (`script.js`)
Small enhancement, fully degradable:
- Clicking an `.art-filter` toggles `is-active` and shows/hides `.art-item`s whose `data-category` matches (or all for `all`).
- Pure show/hide via a class; no layout library needed.
- If we want to ship faster, skip filters in v1 and add later — the grid works without them.

### 2.4 CSS (`styles.css`)
Add an Art block near the Writing/Exploring styles, using existing design tokens (`--accent-gold`, `--section-warm`, `--card-bg`, spacing vars):
- `.art-grid`: `display: grid; gap; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));` for a responsive masonry-ish gallery.
- `.art-item img`: `width: 100%; height: 100%; object-fit: cover;` with a fixed/auto aspect handling; hover lift/zoom consistent with `.explore-item` hover styles.
- `.art-item__trigger`: unstyled button (no border/background, `cursor: pointer`, `padding: 0`) wrapping the image, matching the `.excerpt-trigger` reset approach.
- `.art-filter`: pill buttons using gold accent; `.is-active` filled.
- `.lightbox` / `.lightbox__img`: full-viewport centered overlay like `.excerpt-modal`, image capped at `max-height: 85vh; max-width: 90vw`.
- Reuse `body.excerpt-open { overflow: hidden; }` (or rename to a shared `body.modal-open`).

### 2.5 Image assets needed
- Create `images/art/` to keep the gallery organized and separate from logos/covers.
- For each piece, provide a **thumbnail** (display, ~600–800px wide, compressed) and a **full** image (lightbox, ~1600–2000px). Keeps the grid light while the lightbox stays crisp.
- Naming: `images/art/<slug>-thumb.jpg` and `images/art/<slug>-full.jpg`.
- Every image needs descriptive **alt text** and a **credit** (Griffin for photography; Barry for sketches/painting/welding/sculpture).

---

## 3. Essays section

### 3.1 Markup
Insert a new `<section id="essays" class="essays">` after the close of `#exploring` (line ~327) and before `<!-- Connect Section -->` (line ~329).

```html
<!-- Essays Section -->
<section id="essays" class="essays">
    <div class="container">
        <h2 class="section-title">Essays</h2>
        <p class="section-intro">Short personal writing — life events, the Austin years, friends and family remembered — and a home for screenplays in progress.</p>

        <div class="essay-list">
            <article class="essay-card">
                <p class="essay-card__meta"><time datetime="YYYY-MM-DD">Month YYYY</time> · Memoir</p>
                <h3 class="essay-card__title">Essay title</h3>
                <p class="essay-card__excerpt">First paragraph or a one–two sentence teaser…</p>
                <button type="button" class="essay-card__more" data-excerpt-target="essay-slug" aria-haspopup="dialog">Read essay →</button>
            </article>
            <!-- ...more essay cards... -->
        </div>

        <!-- Screenplays subsection -->
        <div class="screenplays">
            <h3 class="category-title">Screenplays</h3>
            <p class="category-intro">Scripts and works for the screen, in progress.</p>
            <div class="screenplay-list">
                <article class="screenplay-card">
                    <h4 class="screenplay-card__title">Working title</h4>
                    <p class="screenplay-card__meta">Feature · Draft</p>
                    <p class="screenplay-card__logline">One-line logline.</p>
                    <button type="button" class="essay-card__more" data-excerpt-target="screenplay-slug" aria-haspopup="dialog">Read an excerpt →</button>
                </article>
            </div>
        </div>
    </div>
</section>
```

### 3.2 How essays are stored & displayed — decision

The site has no build step, so a true file-per-post blog would mean either hand-authoring separate HTML pages or adding a generator. Three options, in increasing effort:

| Option | What it is | Pros | Cons |
|---|---|---|---|
| **A. Inline + modal (recommended for v1)** | Each essay is a card; full text lives in a modal reusing the excerpt-modal pattern. | No new infra; consistent with Adam's Night; everything stays on one page. | `index.html` grows large with long essays; no per-essay URL/sharing. |
| **B. Separate static pages** | One `essays/<slug>.html` per post; cards link out. | Per-post URLs, shareable, keeps `index.html` lean; better for long pieces. | Each page needs its own header/footer scaffolding (or a shared partial); more files to maintain by hand. |
| **C. Markdown + lightweight generator** | Essays authored as `.md`, a small script renders to HTML. | Easiest authoring for Barry; clean separation of content/markup. | Introduces a build step + dependency to a currently buildless project. |

**Recommendation:** Start with **A** to match the existing pattern and ship quickly. If essays get long or Barry wants shareable links, graduate to **B** (a shared header/footer include via `server.mjs` or a tiny template). Revisit **C** only if Barry will be publishing frequently. Decision needed — see Open Questions.

### 3.3 Modal reuse
Options A and the screenplay excerpts reuse the **same modal mechanism** as Adam's Night (`data-excerpt-target` → modal `id`, `[data-excerpt-close]`, Escape, focus restore). Each essay/screenplay gets its own `<div class="excerpt-modal" id="essay-slug" ...>` block near the bottom of `index.html`. No new JS needed beyond what already exists.

### 3.4 CSS (`styles.css`)
- `.essay-list`: vertical stack (or 2-col grid on wide screens) of `.essay-card`s using `--section-warm`/gold left-border treatment consistent with `.writing-project`.
- `.essay-card__meta`: small caps / sans label (matches `.item-author` styling) for date + category.
- `.screenplays`: reuse `.category-title` / `.category-intro` styles from Exploring for visual consistency; `.screenplay-card` styled like essay cards but distinguishable (e.g., monospace accent on logline, or a "screen" tag).
- Reuse the `.excerpt-trigger` button styling for `.essay-card__more`.

### 3.5 Content needed
- Essay list: title, date, category/tag (Memoir, Austin, Remembrance, etc.), teaser, full text.
- Suggested starter categories from the brief: **Life Events**, **Austin Years**, **Remembrances** (passing of family friends).
- Screenplays: title, format (feature/short/series), status (draft/in progress), logline, and an excerpt to show in the modal.

---

## 4. Files to change

| File | Change |
|---|---|
| `index.html` | Add nav links; add `#art` section; add `#essays` section (with screenplays subsection); add lightbox container + per-essay/screenplay modal blocks. |
| `styles.css` | Add `.art*`, `.lightbox*`, `.essay*`, `.screenplay*` blocks using existing tokens; optionally rename `body.excerpt-open` → shared `body.modal-open`. |
| `script.js` | Add reveal-animation selectors for the new elements (see below); add lightbox open/close (refactor shared modal logic); optional art filter logic. |
| `images/art/` (new) | Thumbnail + full versions of each artwork/photo. |

**`script.js` reveal animation:** the scroll-in animation is driven by an explicit selector list (`script.js` lines ~20–38). Add the new classes so they animate in like the rest: `.art-filter`, `.art-item`, `.essay-card`, `.screenplay-card` (and any subsection titles already covered by `.category-title`).

---

## 5. Accessibility checklist
- All gallery images have meaningful `alt` text; decorative-only chrome is empty-alt.
- Lightbox and essay modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus moves in on open and restores on close, Escape closes, body scroll locked (pattern already implemented for the excerpt modal).
- Filter buttons are real `<button>`s grouped with `role="group"` + `aria-label`; active state conveyed beyond color.
- `prefers-reduced-motion` already respected by the reveal system and the modal animation — keep new animations behind the same guard.
- Triggers are `<button>`s (not clickable divs) for keyboard access.

---

## 6. Phased implementation
1. **Scaffold** — add both empty sections + nav links + section titles/intros; confirm placement and scroll-spy.
2. **Art v1** — grid markup with the existing `sunset-sculpture.jpg` plus placeholders; add CSS; wire the reusable lightbox.
3. **Art content** — drop in real photos/artwork (thumb + full), captions, credits; add filters if desired.
4. **Essays v1** — essay cards + one real essay via the modal pattern; add CSS.
5. **Screenplays** — screenplay subsection + one entry with excerpt modal.
6. **Polish** — reveal animations, responsive checks, accessibility pass, optional `body.modal-open` rename.

---

## 7. Open questions
1. **Placement:** "Art after Writing" lands it before Exploring; "Essays before Connect" lands it after Exploring. Is interleaving with Exploring intended, or should Art + Essays sit together? (e.g., `writing → art → essays → exploring → connect`?)
2. **Essay storage:** Option A (inline modals), B (separate pages), or C (markdown + generator)? Recommendation is A for v1.
3. **Art filters:** include the category filter in v1, or ship a single combined grid first?
4. **Assets:** who provides the artwork/photo files and at what sizes? Confirm credit lines (Griffin = photography; Barry = sketch/paint/weld/sculpture).
5. **Screenplays:** show full script excerpts in-modal (like Adam's Night), or just loglines + status for now?
