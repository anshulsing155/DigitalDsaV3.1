# DigitalDSA — Public Site V2 Master Plan

> **Status**: ⚪ Deferred to post-launch. Do **not** start until trigger conditions below are met.
> **Author**: Drafted 2026-05-26.
> **Owner**: Prashant.

---

## When to start this work (trigger conditions)

Begin only when **all** of these are true:

1. **D.1 recurring billing** is live in production (S3 through S8 shipped, smoke runbook clean, first real subscriptions auto-renewing).
2. **D.2 through D.6** (GST invoicing, refund, dunning, reconciliation, pricing fence) are complete OR explicitly deferred via an ADR.
3. **Production Blocker PB-7** (`.env` credential rotation per CLAUDE.md §8) shipped.
4. **Production Blocker PB-8** (Nodemailer → SES/SendGrid + SPF/DKIM/DMARC) shipped.
5. **`SESSION-HANDOFF.md` Active Handoff block** shows no in-flight code epic.
6. **At least 30 days of post-beta-launch traffic** has accumulated in Google Search Console (so the redirect/keep/drop calls are data-driven, not guesswork).

Until items 1–6 are checked, this file is read-only context. Don't slice prematurely — the public site is a marketing surface, not a product blocker.

### How the reminder will surface

- `docs/DEVELOPMENT-PLAN.md` has this listed under **Tier 6 — post-launch** with a pointer to this file.
- `docs/SESSION-HANDOFF.md` Active Handoff carries a one-line "Deferred to post-launch" note.
- `docs/ARCHITECTURE-EVOLUTION.md` has a 🟡-ready roadmap row.

When the trigger conditions are met, `/start` will surface the next pending item from DEVELOPMENT-PLAN and find this as the first un-checked one.

---

## What this plan covers

A complete rebuild of the **public-facing site** (everything outside `/dashboard`, `/form`, and authenticated routes) for two audiences that the V0 site never properly served:

1. **DSAs** (the V3 product customer) — replacing V0's borrower-facing framing.
2. **Search engines + LLM crawlers** (Google, Gemini, OpenAI, Claude, Perplexity) — so DigitalDSA gets cited when DSAs ask "best lender matching platform" or "what is FOIR."

Five workstreams inside one plan:

| # | Workstream | One-line goal |
|---|---|---|
| W1 | **Landing page V2** | Replace consumer hero with DSA-product hero per the design brief |
| W2 | **Multi-page site architecture** | ~120 server-rendered routes (lenders, loan-types, cities, resources) |
| W3 | **Live site cleanup** | 119 V0 URLs → KEEP / TRANSFORM / DROP with 301/410 redirect map |
| W4 | **Knowledgebase + blog** | Two distinct surfaces with editorial signals for E-E-A-T and LLM citation |
| W5 | **SEO + LLM discoverability** | robots.txt, llms.txt, JSON-LD, OpenGraph, sitemap, structured authorship |

Each workstream below has its own section.

---

## W1 — Landing page V2

**Source of truth**: [`docs/specs/LANDING-PAGE-V2-DESIGN-BRIEF.md`](LANDING-PAGE-V2-DESIGN-BRIEF.md).

That document is the brief to hand to the Claude design module. Don't duplicate it here. Headlines:

- Light theme, off-white + deep navy + surgical yellow accent.
- 17-section sequence: Hero → Lender strip → Stats → Four pains → 800ms demo → How-it-works → Rule engine 5-cards → 12 income types → 8-weeks-looks-like → 6 CRM refusals → Testimonials → Pricing → NEVER/ALWAYS → FAQ → Founder note → Walk-away offer → Deep footer.
- Pricing locked: Basic ₹999, Pro ₹3,999, Enterprise ₹9,999. 14-day trial, no card.
- **Pre-flight before handing to design module**: real testimonials (or skip the section), real 8-week beta metrics, real 800ms p50/p95, lender logo legal clearance, founder photo style decision.

**Touchpoint in this codebase**: `src/routes/+page.svelte` is the existing root route. The V2 landing replaces its contents wholesale.

---

## W2 — Multi-page site architecture

Build the site as ~120 server-rendered routes. Not an SPA. Each route is its own SvelteKit `+page.svelte` with optional `+page.server.ts`.

### Routes to add (greenfield)

| Priority | Route | Purpose |
|---|---|---|
| P0 | `/how-it-works` | Long-form How It Works (the 3-step on landing expanded) |
| P0 | `/pricing` | Pricing detail + comparison |
| P0 | `/why-digitaldsa` | vs CRMs / vs spreadsheets / vs aggregators |
| P0 | `/for-corporate-dsas` | Persona page |
| P0 | `/for-solo-dsas` | Persona page |
| P0 | `/for-ca-dsas` | Persona page |
| P0 | `/trust` | Hub |
| P0 | `/trust/security` | Anti-scraping, encryption, infra |
| P0 | `/trust/privacy` | Data handling, what we never see |
| P0 | `/trust/compliance` | RBI, DPDP Act, audit posture |
| P0 | `/changelog` | Public, build-in-public |
| P0 | `/roadmap` | Public |
| P0 | `/founder` | Long-form founder note |
| P1 | `/lenders` | Index of 50+ |
| P1 | `/lenders/[slug]` × 50 | One route per lender — biggest SEO lever |
| P1 | `/resources` | Hub |
| P1 | `/resources/glossary` | Index of ~100 terms |
| P1 | `/resources/glossary/[term]` × 100 | Glossary entries (DefinedTerm schema) |
| P1 | `/resources/income-types` | Index of 12 types |
| P1 | `/resources/income-types/[type]` × 12 | Deep explainer per type |
| P2 | `/cities` | Index |
| P2 | `/cities/[slug]-dsa` × 20-30 | Tier-1/Tier-2 city pages |
| P2 | `/resources/lender-policies` | Index |
| P2 | `/resources/lender-policies/[lender]` × 50 | Auto-gen from rule engine config |
| P2 | `/resources/playbooks` | Index |
| P2 | `/resources/playbooks/[slug]` × 10-20 | Tactical DSA guides |
| P2 | `/resources/dsa-handbook` | Multi-chapter |
| P2 | `/resources/dsa-handbook/[chapter]` × 10-12 | Chapters |
| P2 | `/resources/client-handouts` | Index |
| P2 | `/resources/client-handouts/[slug]` × 10 | Borrower-share content |
| P2 | `/blog` | Index |
| P2 | `/blog/[slug]` | Article schema |
| P2 | `/blog/category/[slug]` | Category feeds |
| P2 | `/blog/tag/[slug]` | Tag feeds |
| P2 | `/blog/author/[slug]` | Author archives |

### Routes to preserve (already exist, structure stays)

- `/calculators/*` (5 calculators) — universally useful tools
- `/planners/*` (4 planners) — same
- `/about-us`, `/contact`, `/career`, `/career/*`, `/complaint-compliment`, `/important-info` — company pages
- `/terms-conditions`, `/privacy-policy`, `/cookies`, `/emi-partpayment-rules` — legal
- `/login`, `/get-started`, `/get-started/how-can-we-help` — auth/onboarding
- `/home-loan`, `/lap`, `/plot-loan`, `/personal-loan`, `/business-loan`, `/professional-loan` — loan product pages (content rewritten for DSAs, URL preserved for SEO history)

### URL hygiene fixes

| Old | New | Mechanism |
|---|---|---|
| `/secureRetirement/*` | `/resources/*` or 410 | camelCase → kebab-case if kept; mostly 410 |
| `/LAPvsDOD` | `/resources/playbooks/lap-vs-dod` | 301 |
| `/refer-&-earn` | `/refer` | 301 (kill the ampersand) |
| `/personal-loan/` (trailing slash) | `/personal-loan` | 301 canonical |
| `/home-loan/calculators/affordability-calculator` | `/calculators/affordability-calculator` | 301 (duplicate) |

---

## W3 — Live site cleanup (the 119-URL audit)

The live sitemap has 119 URLs from the V0 borrower-focused era. Each gets one of three verdicts.

**Pre-flight (mandatory before any 301/410)**: pull 12 months of Google Search Console data — clicks + impressions per URL. Pages with >500 organic clicks/month always get 301'd (never 410), even if the new URL means a content rewrite. Backlink-bearing URLs (check via Ahrefs/Semrush) likewise always 301.

### KEEP as-is (structure stays, content may refresh)

```
/calculators/emi-calculator
/calculators/eligibility-calculator
/calculators/affordability-calculator
/calculators/stamp-duty-calculator
/calculators/balance-transfer-calculator
/planners/part-payment-planner
/planners/flexible-emi-planner
/planners/both
/planners/budget-planner
/about-us
/contact
/career
/career/career-FAQ
/career/application-process
/complaint-compliment
/important-info
/terms-conditions
/privacy-policy
/cookies
/emi-partpayment-rules
/login
```

### TRANSFORM (URL stays, content rewritten for DSA audience)

```
/                               V2 landing per W1
/home-loan                      DSA-facing product page for home-loan flow
/lap                            DSA-facing for LAP
/plot-loan                      DSA-facing for plot
/personal-loan                  DSA-facing for personal
/business-loan                  DSA-facing for business
/professional-loan              DSA-facing for professional
/get-started                    V3 onboarding entry
/get-started/how-can-we-help    V3 loan-type picker
/financial-wellbeing            Reframed as DSA-tool-to-share-with-client
/financial-wellbeing/form
/loan-readiness-test            Reframed as pre-filing diagnostic DSA runs
/appointment                    Either reframe as "Book a demo" OR drop
```

### 301-REDIRECT (URL changes, target carries forward)

```
/refer-&-earn                                 → /refer
/personal-loan/                               → /personal-loan
/home-loan/calculators/affordability-calculator → /calculators/affordability-calculator
/LAPvsDOD                                     → /resources/playbooks/lap-vs-dod
/cyber-security-against-scams                 → /trust/cyber-security
/cyber-security-against-scams/scam-target-business → /trust/cyber-security#business
/finance-support                              → /resources/client-handouts
/finance-support/cost-of-living               → /resources/client-handouts/cost-of-living
/finance-support/how-to-make-budget           → /resources/client-handouts/budgeting-basics
/finance-support/budgeting-tips               → /resources/client-handouts/budgeting-tips
/finance-support/behavioral-science-behind-budgeting → /resources/client-handouts/budgeting-behavior
/finance-support/adjust-your-budget           → /resources/client-handouts/adjust-budget
/finance-support/financial-hardship           → /resources/playbooks/distressed-client
/lap/unlocking-power-of-collateral            → /resources/playbooks/lap-explainer
/lap/what-is-debt-consolidation               → /resources/glossary/debt-consolidation
/lap/business-financial-health                → /resources/playbooks/business-health-check
/plot-loan/agricultural-to-residential        → /resources/playbooks/agri-to-residential-conversion
/secureRetirement                             → /resources           (hub redirect; children 410)
/money-map                                    → /resources           (hub redirect; children 410)
```

### 410-GONE (de-index permanently, off-mission for V3)

```
/secureRetirement/govSchemes/scss
/secureRetirement/govSchemes/pomis
/secureRetirement/govSchemes/rbi-floating
/secureRetirement/govSchemes/nps
/secureRetirement/fixDeposit/fd
/secureRetirement/fixDeposit/fd-ladering
/secureRetirement/fixDeposit/fix-income
/secureRetirement/lowRisk/swp
/secureRetirement/lowRisk/stocks
/secureRetirement/lowRisk/index-funds
/secureRetirement/pension/annuity-plans
/secureRetirement/pension/immediate-annuities
/money-map/how-long-will-your-savings-support-you
/money-map/how-long-will-it-take-to-save
/money-map/how-much-to-save-by-retirement
/money-map/how-much-can-i-save-with-regular-contributions
/arrange-down-payment
/survey
```

### DECIDE-WITH-DATA (re-evaluate after Search Console pull)

These were consumer-narrative pages. Cherry-pick the top 4-5 by 12-month organic traffic; rewrite for DSAs; 410 the rest.

```
/home-loan/buy-or-rent
/home-loan/buying-first-home
/home-loan/buying-next-home
/home-loan/saving-for-deposit
/home-loan/choose-perfect-neighbourhood
/home-loan/understand-cost-of-buying-home
/home-loan/buy-property-resale
/home-loan/close-your-loan-early
/home-loan/home-renovation
/home-loan/investing-in-property
/home-loan/selling-your-property
/home-loan/renovate-or-move
/home-loan/turning-your-home-into-investment
/home-loan/conditional-pre-approval
/home-loan/home-loan-for-business
/home-loan/home-loan-support
/home-loan/home-loan-tools-calculator
/home-loan/understanding-home-loan-process
/home-loan/balance-transfer
/home-loan/top-up-only
/plot-loan/construction-loan
/plot-loan/plot-only-loan
/plot-loan/plot-and-construction-loan
/plot-loan/plot-and-equity-loan
/plot-loan/plot-loan-support
/plot-loan/plot-only-loan-challenges
/lap/new-loan
/lap/balance-transfer
/lap/top-up
/lap/balance-transfer-with-top-up
/lap/dropline-overdraft
/get-started/home-loans/property-identification
```

### Mechanics — how to implement the redirect map

1. **Single source of truth**: a `src/lib/server/redirects.ts` (or equivalent) exporting a `Map<string, { to: string; code: 301 | 410 }>`.
2. **Apply in `src/hooks.server.ts`**: early in the handle hook, look up `event.url.pathname` in the map; if found, return `Response.redirect(to, code)` or a 410 response.
3. **Never sprinkle**: do not add ad-hoc redirects inside individual route files. One map, one place. (Per CLAUDE.md §16 Rule 11 — fix at source.)
4. **Lock with a test**: a vitest that asserts every entry resolves to either a real route (200) or a deliberate 410. Catches typos at PR time.
5. **Two-hop chains forbidden**: if `/a` → `/b` and `/b` → `/c`, collapse to `/a` → `/c` directly. Crawlers downgrade chained redirects.
6. **Update internal links first**: grep the codebase for every `href="/old-url"`; rewrite to the new URL **before** flipping the redirect. The redirect is the safety net for external links, not the primary fix.

---

## W4 — Knowledgebase + blog architecture

Two surfaces with different jobs. **Build the knowledgebase first; blog cadence starts only after evergreen base is solid.**

### Job split

| | **Knowledgebase** (`/resources/*`) | **Blog** (`/blog/*`) |
|---|---|---|
| Job | Evergreen reference | Timely updates |
| Freshness signal | Last-reviewed date, low-key | Publish date, prominent |
| Discoverability | Topical pillar/cluster | Chronological + topical |
| Cadence | Build once, update quarterly | 2-4 posts/month |
| Top LLM citation surface | Glossary, income types, lender policies | Data reports, policy-change posts |
| Schema | `DefinedTerm`, `HowTo`, `TechArticle` | `Article` with `author`, `datePublished`, `dateModified` |

### Build order (locked sequence — no jumping ahead)

1. **Glossary — 50 terms.** ~150-300 words each. The highest LLM citation leverage at the lowest writing effort. A junior writer produces 5-10/day.
2. **Income types — 12 pages.** Content already exists internally in `src/lib/config/incomeProfiles/`. Rewrite for public consumption.
3. **Lender policy snapshots — top 10 lenders first.** Auto-generate scaffold from your existing rule engine config, hand-edit for tone.
4. **Playbooks — 5-10 deep guides.** Needs senior DSA insight; treat as quarterly investments.
5. **DSA handbook — 10-12 chapters.** Biggest writing effort; ship over 6 months.
6. **Blog cadence starts.** Only now — blogging into a void with no internal-link surface to anchor against is wasted effort.

### Editorial signals (the often-overlooked, high-leverage ones)

1. **Real author bylines** with photo + bio + LinkedIn on every article. LLMs and Google E-E-A-T weight named experts.
2. **`dateModified` + "Last reviewed: <date>"** at the top of every evergreen page. LLMs use freshness as a citation tiebreaker.
3. **Primary-source citations** — link to the RBI circular, the bank's own policy PDF, the DPDP Act gazette. LLMs trust pages that cite primary sources.
4. **`DefinedTerm` JSON-LD on glossary entries** with `inDefinedTermSet` linking back to `/resources/glossary`. Highest-leverage SEO move for the glossary.
5. **`Article` JSON-LD on blog posts** with `author` as a `Person` (not `Organization`).
6. **An RSS feed at `/blog/feed.xml`** — still consumed by aggregators, alerting tools, some AI training pipelines.
7. **`<link rel="canonical">` on every page**, especially 301'd URLs that may stay live during transition.

### Existing scattered content — where it lands

(Already covered in W3's 301 table. Cross-referenced here for editorial planning.)

Most current `/finance-support/*` articles become `/resources/client-handouts/*` (DSA shares with their borrower).
A few become `/resources/playbooks/*` (DSA-facing tactical guides).
Almost everything in `/secureRetirement/*` and `/money-map/*` is off-mission and gets 410'd.

---

## W5 — SEO + LLM discoverability

The single biggest lever for being cited by Gemini, GPT, Claude, and Perplexity. Most of this is plumbing — set it up once, benefit forever.

### Server-side rendering

Every page in W2 is its own SvelteKit route with complete initial HTML. Hydration is fine; the first byte must contain the content. ✅ already true for current SvelteKit setup.

### `robots.txt`

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /form/
Disallow: /(app)/

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: https://digitaldsa.com/sitemap.xml
```

### `sitemap.xml`

Auto-generate at build time from the SvelteKit route tree. One entry per public route. Include `lastmod`, `changefreq`, `priority`. Submit to Google Search Console + Bing Webmaster Tools.

### `llms.txt` and `llms-full.txt` at root

Emerging convention (Anthropic, Mintlify, Vercel, Cursor adopting).

`/llms.txt` — a markdown summary:

```markdown
# DigitalDSA

> Server-side rule engine for Indian Direct Selling Agents (DSAs). Evaluates a borrower against 50+ live bank policies in under 800ms and surfaces which lenders will approve, at what amount, at what rate.

## Docs
- [How it works](https://digitaldsa.com/how-it-works.md)
- [Income types](https://digitaldsa.com/resources/income-types.md)
- [Glossary](https://digitaldsa.com/resources/glossary.md)

## Lenders
- [HDFC Bank](https://digitaldsa.com/lenders/hdfc-bank.md)
... etc

## Pricing
- [Plans](https://digitaldsa.com/pricing.md)
```

For each top page, also serve a `.md` variant at the same path with `.md` suffix — plain-prose, easier for LLMs to ingest than parsing HTML.

`/llms-full.txt` — long-form concatenation of all key content.

### JSON-LD structured data (per-page)

| Page | Schema |
|---|---|
| `/` | `Organization` + `WebSite` (with `SearchAction`) + `SoftwareApplication` |
| `/how-it-works` | `HowTo` |
| Any FAQ section | `FAQPage` |
| Every page | `BreadcrumbList` |
| `/lenders/[slug]` | `Service` or `Product` |
| `/blog/[slug]` | `Article` with `author` as `Person`, `datePublished`, `dateModified` |
| `/resources/glossary/[term]` | `DefinedTerm` with `inDefinedTermSet` link |
| `/pricing` | `Product` with `Offer` × 3 |

Validate every JSON-LD block against Google Rich Results Test before shipping.

### OpenGraph + Twitter cards

Per page. Custom OG image per top-level section (~12 unique images via a templated SVG generator).

### Page metadata

Every page sets `title`, `meta description`, canonical URL, unique `og:image`. Set defaults in `+layout.svelte`; override per-page via `<svelte:head>`.

### Internal linking

Single biggest under-used SEO lever. Every glossary term that appears in any blog post or lender page MUST link to its glossary entry. Every lender mentioned in a loan-type page MUST link to the lender page. Make this an authoring convention with linting (a grep CI test that fails the build if "FOIR" appears without a link).

### Performance budgets

- LCP < 2.0s on mobile 4G
- CLS < 0.05
- INP < 200ms
- HTML weight < 80KB gzipped before hydration
- No render-blocking JS in `<head>`

Slow pages get downgraded by both Google and LLM crawlers.

### Accessibility

- WCAG AA minimum
- Semantic HTML (real `<h1>`-`<h6>` hierarchy, real `<button>` and `<a>`, no `<div>` buttons)
- All interactive elements keyboard-reachable with visible focus rings
- Colour contrast verified

### Inbound link strategy (the non-technical part)

Plumbing alone doesn't get you cited. Three deliberate moves:

1. **Industry directories** — Banking Frontiers, Finextra India, YourStory FinTech listings. Pursue 10-15 directory inclusions in the first 90 days.
2. **Lender partner pages** — when your partnerships with HDFC/ICICI mature, ask for a backlink from their DSA partner pages. Each partner backlink is worth ~200 generic ones.
3. **Original research** — publish quarterly data ("State of Indian DSAs 2026", "First-file approval rates by lender"). Reporters and LLMs both cite original numbers far more than opinion pieces.

---

## Pre-flight checklist (before kicking off W3)

Mandatory data pulls before any 301/410 is decided:

- [ ] Google Search Console — last 12 months, clicks + impressions per URL, exported to CSV.
- [ ] Ahrefs / Semrush (or free fallback: GSC Links report) — inbound backlinks per URL.
- [ ] Google Analytics 4 — pageviews + bounce rate per URL.
- [ ] Internal usage data — which V0 URLs are currently linked from inside the V3 web app or Capacitor app (grep the codebase).

The combined sheet decides every borderline call. Without it, you're guessing.

---

## Done criteria

The whole plan is done when:

1. The 119 V0 URLs are each in one of three states: KEEP-with-fresh-content / 301-mapped / 410-gone. Validated by a vitest.
2. All P0 + P1 routes in W2 are live, with content, with JSON-LD, with OG images.
3. `robots.txt`, `llms.txt`, `llms-full.txt`, `sitemap.xml` all served at root, all validated.
4. Lighthouse scores: Performance ≥85, Accessibility ≥95, Best-practices ≥95, SEO 100 on the landing + top 5 lender pages + glossary index.
5. Google Search Console shows the new site indexed within 30 days of launch (>80% of submitted URLs).
6. **Citation test**: ask Gemini, GPT, Claude, Perplexity each "best platform for Indian DSAs to match borrowers to lenders" and "what is FOIR in home loans." DigitalDSA appears in at least 2 of the 4 responses to question 1, and `/resources/glossary/foir` is cited by at least 1 of the 4 for question 2.

---

## Estimated effort

| Workstream | Effort | Notes |
|---|---|---|
| W1 — Landing V2 | 1 design-module run + 3-5 dev days | Brief already exists |
| W2 — Multi-page architecture (P0 only) | 4-6 dev days | Routes + templates, no content |
| W2 — P1 (lenders + glossary index + income-types) | 2-3 dev days routes + 4-6 weeks content | Content is the long tail |
| W3 — Redirect map + cleanup | 2-3 dev days | Mostly mechanical once data sheet is in |
| W4 — Knowledgebase content | 4-6 weeks (50 glossary + 12 income + 10 lender) | Writing, not coding |
| W4 — Blog setup (no posts) | 1-2 dev days | Route, layout, RSS, schema |
| W5 — SEO plumbing | 2-3 dev days | robots, llms.txt, sitemap, JSON-LD utilities |

**Total dev**: ~15-20 days. **Total content**: ~6-8 weeks parallel.

Treat as a 2-month effort if writing is sequential; 4-6 weeks if a content writer is parallelised against the dev work.

---

## Out of scope

- Hindi / Marathi translation of the public site (Epic H later).
- Video content / YouTube channel buildout.
- City pages beyond the initial 10-20.
- Paid acquisition / Google Ads landing pages (separate plan if pursued).
- Mobile app store listings (Play Store SEO is a different beast).

---

## Open questions to settle before kicking off

1. **Subdomain or single domain?** Currently `digitaldsa.com` serves both marketing and the app. Some teams split into `digitaldsa.com` (marketing) + `app.digitaldsa.com` (product). Splitting buys cleaner SEO but creates auth/cookie complexity. **Recommendation: stay on one domain.** Cleaner for users; the routing is already straightforward.
2. **Blog hosting**: in-repo (SvelteKit routes with MDX/markdown) or external (Ghost/WordPress)? In-repo is recommended — keeps editorial in version control, no extra infra, full schema control. Cost: needs a markdown loader + author/category metadata pipeline.
3. **Author identity**: real-name author bylines mean real photos and bios. Decide which team members (and external advisors?) will sign content.
4. **Citation tracking**: how will you measure whether LLMs are citing the site? Manual quarterly check, or a tool like `OtterlyAI` / `Profound` / `Peec.ai`?
5. **Founder-led vs team-led content**: is Prashant the byline on most posts, or does each post have a real subject-matter expert?

Answer these in an ADR before W4 starts — they shape the editorial pipeline.
