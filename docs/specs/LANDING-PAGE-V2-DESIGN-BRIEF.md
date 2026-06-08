# DigitalDSA — Landing Page V2 + Multi-Page Architecture Design Brief

**Audience for this document**: a senior product designer (Claude design module).
**Goal**: produce the final landing page + a multi-page site structure that is (a) instantly understandable to a Tier-3 city DSA, (b) credible to a corporate DSA, and (c) discoverable by Google + LLMs (Gemini, GPT, Claude, Perplexity).
**Constraint**: not an SPA. Each page is its own server-rendered route.

---

## 1. What DigitalDSA is (read this first)

DigitalDSA is a B2B SaaS for **Direct Selling Agents** (DSAs) in India — independent loan agents who source borrowers and route them to banks/NBFCs for a commission. There are roughly 80,000–120,000 active DSAs in India. They survive on knowing *which lender will approve which file*, and they lose money every time they file with the wrong one.

**The product, in one sentence**: a server-side rule engine that evaluates a borrower against 50+ live lender policies in under 800ms and tells the DSA exactly which banks will approve, at what amount, at what rate, and which RM to call.

**The moat** (do not let any design hide these):
- 50+ bank policies, written in JSON-Logic, **CSS-specificity-style resolution** — the most-specific policy wins.
- **12 income types** with **per-type haircuts** (salaried 0%, self-employed 30%, rental 30%, etc.).
- **Immutable case snapshots** — every edit creates a new SHA-256-versioned snapshot. Full audit trail.
- **Centralised RM database** — every DSA contributes RM contacts; everyone benefits.
- **8-layer anti-scraping** — silent fingerprinting, session trust scoring, encoded `showWhen` logic.
- **No PII in the v1 PDF**. Ever. System-enforced.
- **File Builder is derived** — DSA controls *presentation*, never *numbers*.

**Who they are**, in three personas:

| Persona | Location | Volume | Tech comfort | What they read in 5 seconds |
|---|---|---|---|---|
| Tier-3 solo DSA | Surat, Lucknow, Indore, Coimbatore | 4-12 files/mo | Low. WhatsApp-first. | "Pata chal jaayega kaun bank approve karega" — which bank will approve |
| Corporate DSA | Andheri, Gurgaon, Bangalore | 30-80 files/mo, 4-8 person team | Medium-high. | "Stop researching, start closing" — capacity unlock |
| CA-turned-DSA | Mumbai, Bangalore, Pune | 8-20 files/mo, premium clients | High. Technical. | "Server-side rule engine, immutable snapshots" — substance |

The landing must speak to all three in the first scroll without being generic.

---

## 2. Brand foundation (locked)

- **Name**: DigitalDSA
- **Domain**: digitaldsa.com
- **Promise**: Know the right lender before you file.
- **Voice**: Confident, specific, no jargon-for-jargon's sake. Plain English with one technical term per section, defined inline.
- **Anti-voice**: "Revolutionary AI-powered platform", "synergistic", "ecosystem", "unlock potential".
- **Tone calibration**: 60% craft (D3 editorial), 30% substance (D2 technical), 10% accessibility (D1 SaaS).
- **Pricing** (locked, do not improvise):
  - Basic ₹999/mo — 10 active cases, all 6 loan types, rule engine, CRM features, lender matching.
  - Pro ₹3,999/mo — 50 active cases, lender matching, priority support.
  - Enterprise ₹9,999/mo — unlimited cases, all loan types, dedicated account manager, priority support.
- **Trial**: 14-day, no credit card, cancel anytime. "If it doesn't earn its keep, walk away."

### Visual direction (locked)

- **Light mode primary**. Off-white background (`#FAFAF7` or similar). Dark navy or charcoal type (`#0F172A` / `#111111`).
- **One accent**: DigitalDSA yellow (`#FFB400` family) used surgically — CTAs, key-number highlights, the one word that anchors each headline. **Never** on backgrounds, surfaces, or large fills. (Reject Design 1's wall-to-wall yellow.)
- **One supporting tone**: a calm muted green for trust/approval indicators (`#0F7B5A` family).
- **Typography**: a clean modern sans (Inter, Geist, or Söhne) for UI; one serif (Source Serif Pro or Tiempos) for editorial moments — founder note, problem framing. **No italic display headlines** (reject Design 3's editorial italics — feels like a Substack, not a financial tool).
- **Imagery**: real product screenshots only. **One** photographed human (founder). Zero stock photography. Zero illustrations of "abstract people pointing at charts".
- **Density**: medium. White space generous but not luxurious. This is a working tool, not a lifestyle brand.
- **Dark mode**: not required for the landing. The web app supports it; landing stays light.

---

## 3. Landing page — section-by-section spec

The landing is one route (`/`) but it is **not the whole site**. It's the front door. Section sequence:

### Section 1 — Hero

**Headline (chosen from Design 2, sharpened):**
> DSAs don't lose deals to banks.
> They lose them to **guesswork**.

The word `guesswork` is the yellow highlight. The full headline is two lines, left-aligned, large (clamp 40–64px), tight leading.

**Sub-headline** (one sentence, replacing D1's bullet list which felt cluttered):
> DigitalDSA evaluates your borrower against 50+ live bank policies in under a second — so you know who will approve before you file.

**Primary CTA**: `Start free — 14 days` (yellow button)
**Secondary CTA**: `See a 90-second demo` (text link with arrow)

**Below CTAs**, micro-copy: `No credit card · 14-day trial · Cancel anytime`

**Right side of hero**: a **real product screenshot** of the case-results page showing 3-4 lender match cards with traffic-light approval indicators. Not a stock photo of a man with a phone (reject Design 1). Not an abstract dashboard mockup (reject Design 2). The actual product UI.

The hero must answer: *what does it do, who is it for, why now* — within the first viewport.

### Section 2 — Lender logo strip

A single horizontal strip of lender logos, monochrome, light grey. **HDFC, ICICI, Axis, Kotak, IDFC First, Yes Bank, Bajaj Finserv, Tata Capital, SBI, IIFL**. Caption above in small caps: `EVALUATING POLICIES FROM`.

This is from Design 3 and it's the single highest-credibility-per-pixel element on the page. Do not skip.

### Section 3 — Stats bar

Four cells, horizontal, equal weight, on a soft surface (not yellow — reject Design 1's loud bar):

| Metric | Number | Caption |
|---|---|---|
| Active DSAs | 1,247+ | on the platform |
| Loans matched | ₹647 Cr+ | in the last 12 months |
| Lender policies | 52 | live, version-controlled |
| First-file approval | 94% | vs ~60% industry baseline |

Numbers are bold; captions are small grey. The fourth cell carries the most weight — it's the only one comparing against a baseline.

> Note for the designer: every number here must be replaceable from a single config file. Do not hard-code into multiple places.

### Section 4 — The problem ("Four pains. One missing system.")

Direct steal from Design 3 (it's the best problem framing of the three). Four cards on a soft surface:

1. **Wrong lender, wrong file** — Rejection wrecks the borrower's bureau score. You lose the deal and the relationship.
2. **Knowledge stuck in seniors' heads** — One senior in your team knows the policies. When they leave, you start over.
3. **WhatsApp is the whole system** — RM contacts, borrower documents, follow-ups — all in one chat thread you can't search.
4. **You can't see what's happening** — Pipeline visibility is a screenshot you took yesterday.

Card visual: light background, dark headline, one-line body, small icon (line-art, not filled). No call-to-action per card.

### Section 5 — The product ("Run a case. Get matched in 800ms.")

This is the **proof section**. Steal from Design 2 — it's the single most persuasive visual asset.

Layout: two columns. Left: a simplified form with five fields (Applicant name, Loan type, Property cost, Loan amount, City). Right: a results list — 4 lender cards stacked, each showing `Lender name · Approval probability · Loan amount · Indicative ROI · Best DSA code · Nearest RM`.

Make this **interactive if possible** (not a static image). The user clicks "Evaluate" and after a 600ms shimmer the right side animates in. Caption underneath: `Median match time: 812ms. P95: 1.4s.` Honest numbers.

If interactive is too expensive for V1, an MP4/WebM autoplay loop is acceptable. **Never a static screenshot for this section.**

### Section 6 — How It Works (3 steps)

Three numbered cards, horizontal on desktop, stacked on mobile. Adapted from Design 1 (simplest, clearest):

1. **Enter the client profile** — income, employment, obligations, company directors. Everything the bank actually evaluates. *~15 minutes the first time, 5 minutes after.*
2. **See who will approve** — 50+ policies evaluated instantly. Approval probability, likely sanction amount, best DSA code, nearest RM. *Instant.*
3. **File & close** — Auto-generated file builder, document checklist, and verified RM contact. *Done.*

Below the three cards, a small caption: *Yes, it takes 15 minutes — because a real credit assessment isn't a 2-minute quiz.* (Adapted from D1.)

### Section 7 — Inside the rule engine (5 cards)

This is your moat. Show it. Adapted from Design 2 — **rename the section** away from "Like CSS, but for capital" (kills 70% of the audience). New title:

> **The most specific policy wins.**
> *Banks don't use rules of thumb. Neither do we.*

Five cards in a grid (2-3-2 on desktop, stacked on mobile):

1. **Eligibility gate** — Hard rules: age, citizenship, employment type, geography. Pass/fail.
2. **Income assessment** — 12 income types with per-type haircuts. Salaried 0%, self-employed 30%, rental 30%, family business 50%.
3. **EMI · FOIR · LTV** — Three independent calculations. The most restrictive wins.
4. **Deviation recovery** — A red flag isn't always a rejection. We surface the deviation path each lender accepts.
5. **Discomfort analysis** — Which lender will hesitate even if they say yes. Useful for ranking, not just qualifying.

Each card: short title, one-sentence body, no icon (let the type carry it).

### Section 8 — Twelve income types

Direct port from Design 2. A clean table or pill grid showing all 12 types with their haircut % visible. This is the "we did the work" section — the kind of detail that makes a CA-turned-DSA stop scrolling.

```
Salaried              0%      Self-employed Pro     0%
Self-employed Biz     30%     Family business       50%
Rental income         30%     Agricultural          40%
Director's salary     0%      Director's profit     30%
Pension               0%      Interest income       20%
Cash salary           50%     Variable pay (bonus)  varies
```

Caption: *Each type has its own documentation requirements, its own evaluation logic, and its own per-lender treatment.*

### Section 9 — "What 8 weeks actually looks like"

Steal wholesale from Design 3 — it's the best conversion section across all three designs.

Layout: two side-by-side panels. Left = "Before DigitalDSA". Right = "After 8 weeks on DigitalDSA". Same four metrics on each side:

| Metric | Before | After |
|---|---|---|
| First-file approval rate | 28% | 63% |
| Files filed per week | 4 | 6+ |
| Avg time per file | 22 days | 6 days |
| Calls to lock the right lender | 4 | 0–1 |

Caption beneath: *Data from 47 DSAs in the first beta cohort, March–May 2026.* (Replace with your real cohort once you have one.)

### Section 10 — "Six things your CRM refuses to do"

Direct port from Design 2. Six cards in a 2x3 or 3x2 grid:

1. **Snapshots, not edits** — every change is a new immutable version. Audit trail by default.
2. **File Builder is derived** — the document pack assembles itself from the profile. No re-typing.
3. **PII never in the v1 PDF** — name, PAN, Aadhaar always redacted. System-enforced, not a checkbox.
4. **RM database, crowdsourced** — 1,800+ verified RM contacts across 50+ lenders. Updated by the platform, shared by every DSA.
5. **8 layers of anti-scraping** — your client data, your RM contacts, your pipeline — protected.
6. **Offline-first on Android** — Capacitor app. Works in the field, syncs when you're back.

### Section 11 — Testimonials (3, with photos)

Three quotes. Real names, real photos, real cities, real loan-type focus. **If you don't have three real DSAs willing to be quoted with photo, leave this section out.** Stock-feel testimonials cost more credibility than they buy.

Format per card: photo (round, 56px) · name · "DSA since 20XX · City · Loan type focus" · 2-3 sentence quote.

### Section 12 — Pricing (3 tiers)

Clean three-tier layout, middle tier (Pro) highlighted as `Most popular`. Each tier shows:

- Tier name
- Price per month, INR
- 5 bullet points of what's included
- CTA button (`Start Free` for Basic/Pro, `Talk to us` for Enterprise)

Pricing values are locked above. Below the three cards, a single row of micro-copy: `14-day trial · No credit card · No commission cut · Cancel anytime`.

The phrase **"No commission cut"** is non-negotiable. Aggregator platforms (Andromeda, Lendingkart partner, etc.) take 10-30% of the DSA's payout. DigitalDSA never does. Make this explicit here and again in the next section.

### Section 13 — "Your business stays yours" (NEVER / ALWAYS)

Direct port from Design 1. Two columns:

**We will NEVER:**
- See your client's PAN, Aadhaar, or phone number.
- Take a cut from your payout — ever.
- Process files or compete with you.
- Share your data with any third party.

**We will ALWAYS:**
- Give you the intelligence to close faster.
- Let you pick the bank, code, and RM.
- Keep your clients, commissions, and business — yours.

Below: italicised single line: *Your clients. Your brokers. Your commissions. We just make you smarter.*

### Section 14 — "Honest answers" (FAQ)

Steal from Design 3. ~8 questions, accordion-style. Suggested questions:

1. Does this replace my judgment as a DSA?
2. How is this different from a bank's eligibility checker?
3. What about lender policies that change weekly?
4. Will you ever go direct-to-consumer?
5. Does it replace WhatsApp?
6. Who owns the data?
7. Is the free trial actually free?
8. What languages is the interface in?

Answers should be 2-4 sentences, written in plain English. Each answer is an opportunity to reinforce a moat element.

### Section 15 — Founder note

Direct port from Design 3 — humanises the entire page. One photograph (founder, real, professional but not stiff). One paragraph signed `— Prashant & Nishant, Co-founders`.

Suggested copy:
> Ten years ago we were both DSAs ourselves. Every Saturday morning was the same conversation — *which bank for this file?* — and the answer was usually wrong by Monday. DigitalDSA is the system we wish we'd had then. We built it because nobody else would: the aggregators want your commission, the banks want your client, the CRMs want your data. We just want you to close more files.

### Section 16 — Walk-away closing offer

Steal from Design 3 — the strongest closing of all three.

> **Try it for two weeks.**
> *If it doesn't earn its keep, walk away.*
>
> 14 days. No card. No "sales call". Full feature access.
>
> **[Start free →]**

Centred on a soft tinted background. This is the last thing on the page before the footer.

### Section 17 — Footer (deep sitemap)

The footer is **not decorative**. It's where Google and LLM crawlers find the rest of your site. Six columns, each with 6-12 links:

| Product | Lenders | Loan types | Resources | Tools | Company |
|---|---|---|---|---|---|
| How it works | HDFC Bank | Home loan | Glossary | EMI calculator | About |
| Pricing | ICICI Bank | LAP | Income types | Eligibility calc | Founder |
| For corporate DSAs | Axis Bank | Plot loan | Credit policy 101 | Affordability calc | Trust & security |
| For solo DSAs | Kotak | Personal loan | Lender policy updates | Balance transfer calc | Privacy |
| Roadmap | IDFC First | Business loan | DSA handbook | Stamp duty calc | Terms |
| Changelog | + 45 more | Professional loan | Blog | Part-payment planner | Contact |

Below the columns: copyright, address, RBI registration if any, social links.

---

## 4. Multi-page site architecture

This is the structural backbone. **The landing is one of ~120 server-rendered routes.** Build the landing knowing the rest exists, because most LLM and Google traffic will land on the deeper pages, not the home page.

### Top-level routes

```
/                                  Landing
/how-it-works                      Long-form How It Works
/pricing                           Pricing detail + comparison
/why-digitaldsa                    vs CRMs, vs spreadsheets, vs aggregators
/for-corporate-dsas                Persona page
/for-solo-dsas                     Persona page
/for-ca-dsas                       Persona page
/changelog                         Public — build-in-public
/roadmap                           Public — credibility
/trust                             Index → security, privacy, data handling
/about                             Company story
/founder                           Long-form founder note
/contact
```

### Lender directory (one of the biggest SEO opportunities)

```
/lenders                           Index of all 50+ lenders
/lenders/hdfc-bank
/lenders/icici-bank
/lenders/axis-bank
... etc, one route per lender
```

Each lender page contains: brief lender description, loan products they offer, current ROI bands (if publicly known), DSA code visibility, indicative eligibility, link to the platform CTA. **Updated quarterly** with date-stamped lastmod for crawler freshness.

Search queries like `HDFC home loan DSA code 2026` or `ICICI personal loan eligibility for self-employed` should land here.

### Loan-type pages

```
/loan-types                        Index
/loan-types/home-loan
/loan-types/loan-against-property
/loan-types/plot-loan
/loan-types/personal-loan
/loan-types/business-loan
/loan-types/professional-loan
/loan-types/balance-transfer
/loan-types/top-up-loan
```

Each: what the product is, who qualifies, typical documentation, typical ROI range, how DigitalDSA evaluates it, link to start a case.

### City pages (Tier-1 + Tier-2 + select Tier-3)

```
/cities                            Index
/cities/mumbai-dsa
/cities/delhi-dsa
/cities/bangalore-dsa
/cities/pune-dsa
... ~20-30 cities
```

Each: short city-specific context (which lenders are strong locally, typical property cost band, local DSA economics), CTA. Low effort per page, high collective SEO weight.

### Resource hub (the LLM-citation goldmine)

```
/resources                         Index
/resources/glossary                100+ DSA terms (FOIR, LTV, BT, deviation, etc.)
/resources/glossary/foir
/resources/glossary/ltv
... one route per term
/resources/income-types
/resources/income-types/salaried
/resources/income-types/self-employed
... one route per income type (12)
/resources/credit-policy-101
/resources/dsa-handbook            Multi-page guide
/resources/blog                    Original research, lender-policy updates
/resources/blog/[slug]
```

Glossary pages are where LLM citations actually happen. A DSA asks Gemini "what is FOIR" — the model cites whoever has the cleanest, most authoritative explainer. That should be you.

### Calculators (you already have these — surface them)

```
/calculators                       Index
/calculators/emi-calculator
/calculators/eligibility-calculator
/calculators/affordability-calculator
/calculators/balance-transfer-calculator
/calculators/stamp-duty-calculator
/planners
/planners/flexible-emi-planner
/planners/part-payment-planner
/planners/rate-ripple-planner
```

These are pre-existing assets. Link them prominently from the landing footer and from related loan-type / glossary pages. Each calculator's URL is a free SEO entry point.

### Trust pages

```
/trust                             Hub
/trust/security                    Anti-scraping, encryption, infrastructure
/trust/privacy                     Data handling, what we never see
/trust/compliance                  RBI, DPDP Act, audit posture
```

---

## 5. SEO + AI discoverability — non-negotiable requirements

### Server-side rendering

Every page in section 4 is its own SvelteKit route with `+page.svelte` and (where applicable) `+page.server.ts`. Nothing client-only. Hydration is fine; **initial HTML must be complete**.

### Structured data (JSON-LD on every page)

- **Root `/`**: `Organization` + `WebSite` (with `SearchAction`) + `Product` / `SoftwareApplication`
- **`/how-it-works`**: `HowTo`
- **FAQ section (any page)**: `FAQPage`
- **Every page**: `BreadcrumbList`
- **`/lenders/[slug]`**: `Service` or `Product`
- **`/resources/blog/[slug]`**: `Article` with `author`, `datePublished`, `dateModified`
- **`/resources/glossary/[term]`**: `DefinedTerm`

Validate every JSON-LD block against Google Rich Results Test before shipping.

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

Block bots from `/dashboard/`, `/form/`, `/api/` (private). Explicitly allow on marketing/resource/lender routes.

### `sitemap.xml`

Auto-generated at build time from the route list. One entry per public route. Include `lastmod`, `changefreq`, `priority`. Submit to Google Search Console and Bing Webmaster Tools.

### `llms.txt` and `llms-full.txt` at root

`llms.txt` is an emerging convention (Anthropic, Mintlify, Vercel, Cursor adopting). It's a markdown file at `/llms.txt` that summarises the site for LLMs.

Structure:

```markdown
# DigitalDSA

> Server-side rule engine for Indian Direct Selling Agents (DSAs). Evaluates a borrower against 50+ live bank policies in under 800ms and surfaces which lenders will approve, at what amount, at what rate.

## Docs
- [How it works](https://digitaldsa.com/how-it-works.md): the rule engine, income assessment, deviation handling
- [Income types](https://digitaldsa.com/resources/income-types.md): 12 types with per-type haircuts
- [Glossary](https://digitaldsa.com/resources/glossary.md): DSA terms — FOIR, LTV, BT, deviation

## Lenders
- [HDFC Bank](https://digitaldsa.com/lenders/hdfc-bank.md)
- [ICICI Bank](https://digitaldsa.com/lenders/icici-bank.md)
... etc

## Pricing
- [Plans](https://digitaldsa.com/pricing.md): Basic ₹999, Pro ₹3,999, Enterprise ₹9,999. 14-day trial. No commission cut.
```

For each page, also serve a `.md` variant (e.g. `/how-it-works.md`) that's the plain-prose version of the page — easier for LLMs to ingest than parsing HTML.

`llms-full.txt` is the long-form concatenation of all key content.

### OpenGraph + Twitter cards

Per page. Custom OG image per top-level section (~12 unique images). Use a templated generator if needed.

### Page metadata

Every page sets `title`, `meta description`, `meta keywords` (still helps for some crawlers), canonical URL, and a unique `og:image`.

### Internal linking

The single most under-used SEO lever. Every glossary term that appears in a blog post or lender page links to its glossary entry. Every lender mentioned in a loan-type page links to the lender page. Build this as an authoring convention, not as a manual chore.

### Performance budgets

- LCP < 2.0s on mobile 4G
- CLS < 0.05
- INP < 200ms
- HTML weight < 80KB gzipped before hydration
- No render-blocking JS in `<head>`

LLM and Google crawlers downgrade slow pages.

### Accessibility

- WCAG AA minimum
- Semantic HTML (real `<h1>`-`<h6>` hierarchy, real `<button>` and `<a>`, no `<div>` buttons)
- All interactive elements keyboard-reachable with visible focus rings
- Color contrast verified — pastel/peach Design 3 would fail here; the off-white + navy direction in §2 passes

---

## 6. What to do BEFORE handing this brief to the design module

1. **Pick 3 real DSA quotes with permission** + photos. If not possible, skip the testimonials section in V1.
2. **Confirm the four "8 weeks looks like" metrics** from your real beta cohort. Don't invent.
3. **Confirm the 800ms claim** with current p50/p95 numbers from telemetry. If it's 1.2s today, say 1.2s — credibility costs more than the half-second.
4. **Confirm the 52 lender count** and which logos you have legal clearance to show on the strip.
5. **Decide the founder photograph approach** — solo, both co-founders, formal vs candid.
6. **Lock pricing**: ₹999 / ₹3,999 / ₹9,999 — but confirm this matches the in-app billing system before publishing.

---

## 7. Out of scope for V1

- Animations beyond the one in Section 5 (Run a case in 800ms demo).
- Video content. (Plan for V2.)
- A blog with content. (Plan for V2 — set up the route, leave it stubbed.)
- City pages (Plan for V2 — set up route patterns, leave each city stubbed with a CTA.)
- Hindi / Marathi versions of the landing. (Plan for V2.)

---

## 8. Deliverables from the design module

1. **Final landing page** as a self-contained `.tsx` or Svelte component, mobile-first, responsive.
2. **Visual system** (tokens for color, type, spacing) as either Tailwind config or CSS variables.
3. **Component inventory** — every reusable block from §3 as its own component, so loan-type / lender / city pages can compose from the same vocabulary.
4. **OG image template** — a single SVG/Figma template that produces per-page social cards.
5. **Footer component** — the deep sitemap from §3.17, designed to scale to ~120 routes without becoming a wall.
6. **Mobile spec for every section** — not desktop-first then squeezed. 70% of Indian DSAs will read this on a phone.

---

## 9. What "done" looks like

- A Tier-3 solo DSA on a Vivo phone, on 4G in Lucknow, sees the hero + lender strip + stats bar within 2 seconds and understands the product without scrolling.
- A corporate DSA opens it on a laptop, scrolls to "Inside the rule engine" + "8 weeks looks like", and forwards it to their ops head.
- A CA-turned-DSA opens it, scrolls to "12 income types" + "6 things your CRM refuses to do", and books a demo.
- Gemini, asked "best platform for Indian DSAs to match borrowers to lenders", lists DigitalDSA in the top three with a citation to either `/` or `/how-it-works` or `/lenders`.
- Google, indexing 100+ pages within 60 days of launch, ranks `/resources/glossary/foir` on page 1 for `what is FOIR`.

That's the bar.
