# Barry Rutherford Website SEO Improvement Plan

## Objective

Establish `barryrutherford.com` as an authoritative home for Barry Rutherford's writing and experience in:

- Leadership and global business
- Artificial intelligence and societal change
- Reinvention and the "Third Phase" of life

The site should clearly communicate who Barry is, make his original work easy for search engines to discover, and provide useful paths between related essays, projects, podcasts, and artwork.

## Current State

The site already has several strengths:

- Semantic HTML and a clear homepage heading
- Responsive presentation
- Unique titles and descriptions on photography pages
- Descriptive image alt text
- Crawlable static HTML pages
- A substantial personal biography and clear evidence of lived experience

The largest current gaps are:

- Most of Barry's substantive material is concentrated on one homepage
- No dedicated, indexable essay library
- No `sitemap.xml` or `robots.txt`
- No canonical URLs
- No structured data
- No Open Graph or social-card metadata
- No dedicated About/author page
- Sculpture works have no individual detail pages
- Photography pages contain very little supporting text
- Large image payloads and limited responsive-image support
- No documented Search Console or SEO measurement process

## Implementation Status — July 26, 2026

Completed in the repository:

- Added `robots.txt` with a production sitemap reference
- Added an automated `sitemap.xml` generator
- Added canonical URLs to every public, indexable page
- Added Open Graph and Twitter card metadata to the homepage, About page, sculpture pages, photography index, and every photography detail page
- Added `WebSite`, `ProfilePage`, `Person`, `CollectionPage`, and `ImageObject` JSON-LD where appropriate
- Improved the homepage title and description
- Created a dedicated `/about/` profile page
- Created three indexable sculpture detail pages
- Linked homepage sculpture cards to their detail pages
- Marked the utility business-card page `noindex`
- Added intrinsic image dimensions throughout the homepage and generated photography pages
- Added lazy loading and asynchronous decoding to below-the-fold homepage imagery
- Created reduced-size sculpture thumbnails for the homepage
- Updated the photography generator so metadata and image dimensions persist across rebuilds
- Updated the photography generator so its homepage preview stays synchronized
- Added a CLI SEO validator for metadata, JSON-LD, canonical uniqueness, and broken local references
- Added `npm run build` and `npm run check:seo` workflows

Still requires external access or original input:

- Google Search Console and Bing Webmaster Tools verification
- Sitemap submission to search platforms
- Analytics setup
- Authored cornerstone essays and topic hubs
- Missing artwork details such as dimensions, dates, materials, and Barry's commentary
- Confirmed additional social/profile URLs
- External mentions, interviews, and backlinks

## Target Positioning

Use a consistent description across the homepage, About page, structured data, and social profiles:

> Barry Rutherford writes about leadership, artificial intelligence, reinvention, and purposeful work after 50 years building businesses across four continents.

The homepage and primary navigation should make the site's three editorial pillars easy to understand:

1. Leadership and global business
2. AI strategy and societal change
3. Reinvention and the Third Phase of life

Art, photography, books, films, and recommendations should remain part of the site while supporting this primary identity.

---

## Phase 1: Technical SEO Foundation

### 1. Add `robots.txt`

- [ ] Allow crawling of all public content
- [ ] Reference the production sitemap
- [ ] Keep print-only and private utility pages out of search where appropriate
- [ ] Verify that no production content is unintentionally blocked

Example:

```text
User-agent: *
Allow: /

Sitemap: https://barryrutherford.com/sitemap.xml
```

### 2. Generate `sitemap.xml`

- [ ] Include the homepage
- [ ] Include the About page
- [ ] Include essay and topic-index pages
- [ ] Include the photography gallery and all photograph pages
- [ ] Include future sculpture detail pages
- [ ] Exclude print-only and intentionally non-indexed pages
- [ ] Add accurate `lastmod` values where maintainable
- [ ] Extend the existing build process to regenerate the sitemap automatically
- [ ] Consider image sitemap entries for important original artwork

### 3. Add canonical URLs

- [ ] Add a self-referencing canonical URL to every public page
- [ ] Ensure `/`, `/index.html`, query parameters, and deployment previews consolidate to production URLs
- [ ] Add canonical generation to the photography build script
- [ ] Decide whether the business-card page should be indexed, canonicalized, or marked `noindex`

Example:

```html
<link rel="canonical" href="https://barryrutherford.com/">
```

### 4. Add social-preview metadata

Add page-specific values for:

- [ ] `og:title`
- [ ] `og:description`
- [ ] `og:image`
- [ ] `og:url`
- [ ] `og:type`
- [ ] `twitter:card`
- [ ] `twitter:title`
- [ ] `twitter:description`
- [ ] `twitter:image`

Create a polished 1200 × 630 default social image for the site. Essays and artwork should use their own relevant images when available.

### 5. Add structured data

Use JSON-LD and only describe content visible on the associated page.

Homepage:

- [ ] `WebSite`
- [ ] `WebPage`
- [ ] `Person` for Barry

About page:

- [ ] `ProfilePage`
- [ ] Barry as `mainEntity`
- [ ] Accurate name, image, biography, location, role, URL, and verified `sameAs` links

Essay pages:

- [ ] `Article`
- [ ] Headline
- [ ] Description
- [ ] Author
- [ ] Publication and modification dates
- [ ] Canonical URL
- [ ] Representative image

Detail pages:

- [ ] `BreadcrumbList`
- [ ] `ImageObject` for important photography and sculpture pages

Validation:

- [ ] Validate markup with Google's Rich Results Test
- [ ] Validate URLs in Search Console after deployment
- [ ] Avoid adding unsupported, incomplete, or misleading fields

### 6. Improve page titles and descriptions

- [ ] Give every indexable page a unique, descriptive title
- [ ] Keep the most meaningful phrase near the beginning
- [ ] Replace copyright-only photography suffixes with useful context
- [ ] Write descriptions for people, not keyword lists
- [ ] Confirm each page has exactly one primary H1

Suggested homepage title:

```text
Barry Rutherford | Leadership, AI and Life's Third Phase
```

Suggested homepage description:

```text
Barry Rutherford writes about leadership, artificial intelligence, reinvention and purposeful work after 50 years building businesses across four continents.
```

Example photography title:

```text
Rainbow Over Desert Hills Photograph | Griffin Rutherford
```

### 7. Establish search measurement

- [ ] Verify the production domain in Google Search Console
- [ ] Configure Bing Webmaster Tools
- [ ] Submit the sitemap
- [ ] Inspect the homepage and several representative detail pages
- [ ] Track indexing errors and excluded pages
- [ ] Record baseline branded and non-branded queries
- [ ] Monitor Core Web Vitals
- [ ] Add privacy-conscious analytics if not already configured

---

## Phase 2: Site Architecture and Authority

### 1. Create a dedicated About page

Suggested URL:

```text
/about/
```

Include:

- [ ] Full professional biography
- [ ] Industries and leadership roles
- [ ] Countries and regions where Barry worked
- [ ] Current writing, podcasting, advisory, and artwork
- [ ] Professional headshot
- [ ] Selected accomplishments
- [ ] Press, speaking, or interview information if available
- [ ] Contact details
- [ ] Verified external profiles
- [ ] Links to Barry's strongest essays and projects

Use this as the canonical author/entity page referenced from every essay.

### 2. Create an Essays index

Suggested URL:

```text
/essays/
```

Features:

- [ ] Descriptive introduction explaining the editorial focus
- [ ] Cards for every published essay
- [ ] Topic filters or topic sections
- [ ] Publication dates and concise summaries
- [ ] Links to the three primary topic hubs
- [ ] Pagination only when needed

### 3. Create reusable essay pages

Suggested URL pattern:

```text
/essays/{descriptive-slug}/
```

Each page should contain:

- [ ] A specific, descriptive title
- [ ] One H1
- [ ] A useful opening summary
- [ ] Original essay content
- [ ] Publication and modification dates
- [ ] Barry's author byline linked to `/about/`
- [ ] Relevant hero image when appropriate
- [ ] Descriptive image alt text
- [ ] Two or three related essays
- [ ] Relevant podcast or project links
- [ ] Canonical URL
- [ ] Open Graph metadata
- [ ] `Article` structured data

Do not write toward an arbitrary word count. Cover each subject as completely as necessary without filler.

### 4. Build topic hubs

Suggested structure:

```text
/topics/leadership/
/topics/artificial-intelligence/
/topics/third-phase/
```

Each hub should:

- [ ] Explain the subject in Barry's own terms
- [ ] Feature cornerstone essays
- [ ] Link to related podcast episodes and projects
- [ ] Provide a clear path to newer and deeper material
- [ ] Avoid duplicating essay text

### 5. Improve internal linking

Every essay should link naturally to:

- [ ] Barry's About page
- [ ] Its primary topic hub
- [ ] Two or three closely related essays
- [ ] A relevant podcast episode or project when useful

Example cluster:

```text
Third Phase
├── Reinvention after 70
├── Purpose after executive life
├── What I'd do at 23
└── From CEO to writer
```

Use descriptive link text instead of repeated phrases such as "click here."

### 6. Create sculpture detail pages

The current sculpture images are only available through homepage lightboxes. Create an indexable page for each distinct work.

Include:

- [ ] Artwork title
- [ ] Multiple views where available
- [ ] Artist
- [ ] Medium and materials
- [ ] Dimensions if known
- [ ] Creation date if known
- [ ] Short story or artistic context
- [ ] Availability or purchasing information
- [ ] Related works
- [ ] Canonical and social metadata
- [ ] `ImageObject` structured data

### 7. Enrich important photography pages

Add useful, original information where available:

- [ ] Location or region
- [ ] Date and conditions
- [ ] Story behind the image
- [ ] Subject or technique
- [ ] Artist attribution
- [ ] Print and licensing information
- [ ] Related photographs

Do not generate repetitive descriptions simply to make pages longer.

---

## Phase 3: Performance and Image SEO

The image directory currently accounts for most of the site's payload, and several original photographs exceed 1 MB.

### 1. Generate responsive formats

- [ ] Create AVIF and WebP variants where practical
- [ ] Retain high-quality originals for lightboxes or downloads when needed
- [ ] Generate multiple widths for content images
- [ ] Use `srcset` and `sizes`
- [ ] Keep thumbnails appropriately small
- [ ] Automate derivative generation in the build process

Example:

```html
<img
  src="image-800.webp"
  srcset="image-480.webp 480w, image-800.webp 800w, image-1200.webp 1200w"
  sizes="(max-width: 768px) 100vw, 50vw"
  width="1200"
  height="800"
  alt="Descriptive alternative text"
  loading="lazy"
  decoding="async"
>
```

### 2. Prevent layout shifts

- [ ] Add explicit `width` and `height` attributes to images
- [ ] Preserve the intended aspect ratio in CSS
- [ ] Test the homepage, photography grid, and art detail pages

### 3. Improve loading behavior

- [ ] Preload only the hero/LCP image when beneficial
- [ ] Do not lazy-load the primary above-the-fold image
- [ ] Lazy-load below-the-fold images
- [ ] Add `decoding="async"` where appropriate
- [ ] Avoid loading full-resolution sculpture images as homepage thumbnails
- [ ] Add long-lived cache headers in production
- [ ] Compress CSS and JavaScript for deployment if the hosting pipeline supports it

### 4. Improve image naming and indexing

- [ ] Use descriptive filenames for new images
- [ ] Preserve concise, accurate alt text
- [ ] Place important images on dedicated content pages
- [ ] Include key images in sitemap data
- [ ] Keep image URLs stable

---

## Phase 4: Editorial Growth

Technical SEO will make the site easier to understand, but sustained search growth depends on Barry publishing original work grounded in his experience.

### Cornerstone essay ideas

- [ ] What Fifty Years in Global Business Taught Me About Reinvention
- [ ] What I Would Do If I Were 23 Today
- [ ] The Third Phase: Building a Purposeful Life After the Executive Years
- [ ] What Small Organizations Actually Need to Know About AI
- [ ] From CEO to Writer: Learning to Begin Again at 70
- [ ] Leadership Lessons Across Four Continents
- [ ] AI Strategy Without the Hype
- [ ] Why Curiosity Outlasts the Career Plan
- [ ] What Older and Younger Builders Can Teach Each Other

### Publishing standards

- [ ] Publish only material Barry can make genuinely distinctive
- [ ] Use concrete experiences, names, places, decisions, and lessons where appropriate
- [ ] Clearly identify Barry as the author
- [ ] Include sources when making factual or research-based claims
- [ ] Update material when the subject materially changes
- [ ] Do not change dates merely to create an appearance of freshness
- [ ] Avoid mass-produced or generic AI-written articles

### Suggested cadence

- [ ] Publish two substantial original essays per month
- [ ] Revisit cornerstone pages quarterly
- [ ] Link each new piece into an existing topic cluster
- [ ] Promote essays through the podcast and relevant external profiles

---

## Phase 5: Reputation and Discovery

### 1. Align Barry's profiles

- [ ] Use a consistent name, biography, headshot, and site URL
- [ ] Link verified profiles through the About page and `sameAs`
- [ ] Link external profiles back to Barry's canonical homepage or About page

### 2. Earn relevant mentions and links

Prioritize authentic sources:

- [ ] Podcast guest appearances
- [ ] Interviews about leadership, reinvention, or AI strategy
- [ ] Local Santa Fe and New Mexico organizations
- [ ] Professional associations
- [ ] Partner and project websites
- [ ] Author biographies on publications carrying Barry's work

Avoid paid-link schemes, bulk directory submissions, and low-quality guest-post networks.

### 3. Connect related properties

- [ ] Link Barry's site, Malestrum, and Breakwater Operations where contextually useful
- [ ] Give Barry a proper author biography on external publications
- [ ] Link podcast episode pages to the related canonical essay
- [ ] Avoid publishing identical full articles on multiple domains without a canonical strategy

---

## Implementation Sequence

### Sprint 1: Crawlability and metadata

- [ ] Add `robots.txt`
- [ ] Add generated `sitemap.xml`
- [ ] Add canonical URLs
- [ ] Add Open Graph and social-card metadata
- [ ] Improve homepage title and description
- [ ] Add homepage `WebSite`, `WebPage`, and `Person` JSON-LD
- [ ] Configure Search Console and submit the sitemap

### Sprint 2: Author and publishing foundation

- [ ] Build `/about/`
- [ ] Build `/essays/`
- [ ] Create the reusable essay template
- [ ] Add `ProfilePage`, `Article`, and breadcrumb structured data
- [ ] Publish the first three cornerstone essays

### Sprint 3: Content architecture

- [ ] Build the three topic hubs
- [ ] Add related-content navigation
- [ ] Improve internal links throughout the homepage and essays
- [ ] Create sculpture detail pages
- [ ] Enrich the most important photography pages

### Sprint 4: Performance

- [ ] Add explicit image dimensions
- [ ] Generate responsive image formats and sizes
- [ ] Optimize hero and above-the-fold imagery
- [ ] Improve caching and production asset delivery
- [ ] Test Core Web Vitals on mobile

### Ongoing

- [ ] Publish two original essays per month
- [ ] Review Search Console monthly
- [ ] Fix indexing and structured-data errors
- [ ] Refresh cornerstone pages when materially necessary
- [ ] Review internal linking after every new publication
- [ ] Track search impressions, clicks, click-through rate, and conversions

---

## Success Metrics

Record a baseline before implementation, then review monthly.

### Indexing

- Number of submitted URLs
- Number of indexed URLs
- Pages excluded because of errors or duplicate canonicalization
- Valid structured-data items

### Search visibility

- Branded impressions for Barry Rutherford
- Non-branded impressions across the three topic pillars
- Search clicks
- Organic click-through rate
- Average position for cornerstone topics

### Engagement

- Organic visits to essays
- Visits from essay pages to About, podcast, and contact pages
- Newsletter or contact conversions if introduced
- Print or artwork inquiries
- Returning visitors

### Performance

- Largest Contentful Paint
- Interaction to Next Paint
- Cumulative Layout Shift
- Homepage transfer size
- Image bytes delivered on mobile

SEO results should be assessed over months rather than days. The initial objective is correct crawling, clear entity understanding, and publication of high-quality indexable material; rankings and traffic should follow from sustained execution.

---

## Reference Guidance

- [Google: SEO Guide for Web Developers](https://developers.google.com/search/docs/fundamentals/get-started-developers)
- [Google: Creating Helpful, Reliable, People-First Content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google: Sitemap Guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [Google: Introduction to Structured Data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Google: Profile Page Structured Data](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- [Google: Article Structured Data](https://developers.google.com/search/docs/appearance/structured-data/article)
