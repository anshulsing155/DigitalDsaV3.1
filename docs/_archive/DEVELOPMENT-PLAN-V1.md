# DigitalDSA — Development Plan (Living Document)

> **Last Updated**: 2026-02-20 (Merge: refactor/codebase-overhaul into main — route centralization, kebab-case routes, structured logging, apiResponse helpers, company 3-tab rewrite, date picker rewrite, applicant restore, store migrations + all main features preserved)
>
> **IMPORTANT — Archived Components Notice**
> 47 components were moved to `src/lib/components/_archive/` based on static import analysis only (NO runtime verification).
> If any missing component / broken import / render failure is encountered:
> 1. CHECK `_archive/` FIRST before creating anything new.
> 2. Restore the component from `_archive/` to its original location.
> 3. Track each such incident below.
> 4. If 3+ restorations happen, bulk-restore ALL remaining archived components with proper fixes (security updates, latest type names, Svelte 5 patterns).
>
> **Archive Restoration Log** (track every restore here):
> | # | Date | Component | Restored From | Reason |
> |---|---|---|---|---|
> | — | — | (none yet) | — | — |
>
> **Status**: Phase 1-4 Complete (except 3.8-3.11 integration — postponed). Phase 5 (RM Partner Integration) complete. Phase 6 (RM Portal Expansion + Disclaimers + i18n) — **all 26 tasks complete** (Batches 1-5). Full RM dashboard operational. Onboarding V2 wired to `/dashboard/dsa/profile`. Guest Demo System live. Validation audit complete (blur-based pattern). All svelte-check warnings resolved (0 errors, 3 warnings pre-existing). **3,724 tests across 47 files.** **Permission guards system implemented** — role-based access control on dashboard layouts + 12 API routes + shared permissions config. **Security hardening complete** — OTP migrated to MongoDB (TTL + SHA-256 hash + timing-safe + exponential backoff), token IDs via crypto.randomUUID(), CSRF enforced in prod, CSP nonces, file upload validation, demo token 1h. **MongoDB indexes** created for all 12+2 collections. **Synthetic Data System implemented** — 500-profile seeder with realistic Indian loan application data. **Dev-only synthetic dashboard** at `/dev/synthetic`. **RM Dashboard enhanced with sample data**. **Anti-scraping & form security system implemented (AD-14)** — 8-layer defense protecting form engine IP: server-side form sessions (skip-ahead prevention), progressive trust scoring, adaptive rate limiting, behavioral telemetry, honeypot fields, response fingerprinting (ZWC + deterministic ordering), multi-browser auth (activeTokenIds[]), device-switch nuke. **Store redesign complete** — Svelte 5 runes migration, server-driven form engine, all 6 form pages migrated. **Main branch intents accommodated** — removed redundant checkpoint pages from LAP (selectionPage → propertyDetailsPage) and Plot (plot_loan_selectionPage → propertyIdentification), layout min-h-screen, dark mode future-proofing. **Form flow restructuring complete** — all 6 loan types restructured: Home Loan (split propertyDetails into Technical/Legal/Financial, redistributed 17-item checklist, ID-based navigation replacing btTopUpSequence), LAP (split propertyDetailsPage into Technical + Legal), Plot (prior-app Qs + dedup), Unsecured loans (prior-app Qs). Prior application questions added to all 6 loan types. Session migration endpoint created. **Lender Results pipeline complete** — versioned snapshots, selection flow, change tracking, staleness detection, premium UI. **Case edit flow** — Edit button on case header, form pre-fills from latest snapshot, submit creates new version. **Evaluation transition page** — animated 5-step `/evaluating` route replaces direct API calls in all 6 form pages (profiling → lender check → API call → comparison → preparation), with progress bar, insight cards, error handling, completion celebration. **securedClone fix** — `Object.create(null)` bug fixed (was stripping prototype chain from cloned objects). **CasePayload system** — categorical type system (17 interfaces), builder with 14 sub-builders + derived intelligence, reactive store, dev-mode logging on every Next/Submit across all 6 form pages. **Console cleanup** — ~70 noisy/dead logs removed across ~25 files. **Legal pages** — Terms of Service, Refund Policy, Privacy Policy at `/(legal)/`. **Login redesign** — split-screen layout. **LenderResultCard refresh** — premium DSA dashboard styling. **P0 pre-launch security hardening** — `.env.example` template (40+ vars), verify-otp dual rate limiting (per-IP 10/hr + per-mobile 5/15min, relaxed in dev), send-otp + resend-otp dev-mode relaxed limits, GitHub Actions CI pipeline (type check + unit tests + build), `.nvmrc` (Node 20), refresh-token `activeTokenIds[]` array consistency fix (matches hooks.server.ts), build-time P0.2/P0.5 reminders in vite.config.ts. **Dual dev logging** — both `[CasePayload]` (categorical) and `[CleanPayload → API]` (what gets sent) logged on every Next/Submit across all 6 form pages. **P0.7 Form Persistence complete** — every form submission now creates Case + FormSnapshot + LenderResultsSnapshot in MongoDB. New `offerTransformer.ts` converts external `LoanOffer[]` → internal `LenderResultsData`. Evaluating page orchestrates 3 sequential API calls (create case → create snapshot → persist results). New submissions navigate to `/dashboard/dsa/cases/{id}/results` instead of standalone dead-end offer pages. Edit mode enhanced to also persist transformed results. Standalone offer pages kept as fallback. **Sub-DSA / Team Management complete (Phases T1-T6)** — Main DSAs create/manage teams with granular permissions. Sub-DSAs register with simplified onboarding (name+age+gender only, no GST/PAN). Invite flow: 6-char code → phone-first OTP → auto-link. `resolveEffectiveDsaId()` returns owner's ID for team members (zero changes to downstream case/form/results logic). `requireTeamPermission()` guard on ~20 API routes + ~8 page loaders. Premium permission gating (results_view, file_builder, analytics, communication locked for free-tier owners). Dashboard nav filtered by permissions. Team context banner for members. **CRM Expansion complete** — Leads (LD-YEAR-SEQ IDs, 6-status flow, convert-to-case), Sources (8 categories, CRUD, stats tracking), CRM Lenders (empanelment, RM contact links, case/sanction metrics). Full dashboard sub-pages with filters, create forms, action buttons. CRM hub updated with Quick Nav cards + count badges. **Dashboard Walkthrough V2 complete (Driver.js)** — two-mode tour system: Introductory (8 steps, ~30s, auto-triggers for new users) + Explanatory (15 steps, ~2min, on-demand). Driver.js (~5kb) for professional spotlight/positioning/keyboard/a11y. TourLauncher replay buttons in sidebar + dashboard welcome header. State persisted to DsaApplications via PATCH API (intro_completed, explanatory_completed). Mobile-aware step filtering. Old custom walkthrough archived. **Per-page walkthroughs** — 6 page tours (Profile 6, Cases 7, CRM 8, Communication 6, Analytics 7, Team 5 = 39 steps). PageTourButton "?" icon on each page header. skipIfMissing for empty sections. Dismiss allows retry; only completion persists. 4 new types, 3 new schemas, 4 new MongoDB collections (Teams, Leads, Sources, CRMLenders) with 10+ indexes, ~14 new API routes, ~6 new dashboard pages, 1 new component. 2,369 tests pass (40 files, 0 failures). **Admin Dashboard complete** — full implementation at `/dashboard/admin` with auth (separate AdminUsers collection, preferredRole login, role selection modal), user management (DSA/RM listing, search, suspend), rule authoring pipeline (upload → AI parse → review → publish, 6-stage workflow), fixture testing (client-side json-logic-js), settings page. AI Service supports OpenAI/Anthropic/Google Gemini. Hostname guard (`admin.digitaldsa.com` in prod). 25+ new files, 8 modified. **Dark mode complete** — 129 files converted, DDSA token overrides, Driver.js theme, CTA shadows, form page gaps fixed. **Doc cleanup** — consolidated 14 MD files into DEVELOPMENT-PLAN.md, deleted redundant docs. 4 reference docs kept: RULE-ENGINE-SPECIFICATION.md, PAYLOAD_DOCUMENTATION.md, LOAN-ASSESSMENT-API-INTEGRATION.md, DEVELOPMENT-PLAN.md. **Rule Engine (Path A) — IN PROGRESS** — building in-house evaluation engine using existing spec + test infrastructure. **RE-1 (Rule Validator) COMPLETE** — `ruleValidator.ts` (380 lines, 6 functions, 134 tests pass). **RE-2 (Evaluation Engine) COMPLETE** — 6 modules (types.ts, emiCalculator.ts, incomeAssessor.ts, resultBuilder.ts, evaluationEngine.ts), 1,577 lines total, 421 tests pass (14 test groups). Next: RE-3 (API Endpoint), RE-4 (Fixture Seeding + Integration Testing), RE-5 (DSA Integration — wires into tasks 3.8-3.11). **Policy Engine Phase 1 (Schema + Types) COMPLETE** — `policyEngine.ts` (types, enums, PRODUCT_TYPE_MAP, 25 universal policy field keys, status transition validator), 10 new MongoDB collections in `mongo.ts` with indexes, `seedPolicyEngine.ts` (lender seeding from bankName.ts, geo scope seeding from gstStateCodes.json, LenderRuleArtifact migration). **Policy Engine Phase 2 (Resolution Engine) COMPLETE** — `policyResolver.ts` (CSS-specificity resolution algorithm, in-memory cache with 1hr TTL, lender-scoped cache busting), 33 unit tests covering specificity cascade, cross-variation layering, field inheritance, rule overlays, cache behavior, edge cases (boolean false, numeric zero, empty string). API endpoint at `POST /api/policy-engine/resolve`. **Policy Engine Phase 3 (Admin Policy Browser + Editor) COMPLETE** — 11 admin CRUD API endpoints (`/api/admin/policy-engine/*`), template-based policy doc generator (HTML + markdown), admin policies page refactored with Policy Engine tree browser tab (Lender > Product > Variation accordion with stats, search, active version indicators). **Policy Engine Phase 4 (RM Submission + Upload Flow) COMPLETE** — 5 RM API endpoints (submissions CRUD + document upload + review GET/respond), 4 RM dashboard pages (submissions list with status filters, new submission form with lender/product/geo dropdowns, submission detail with document upload + comments, policy review page with approve/request-corrections actions). RM nav updated with "Submissions" item. **Policy Engine Phase 5 (Approval Workflow) COMPLETE** — 6 admin API endpoints (comments CRUD + resolve, verbal approval, general status transition, admin submission list + status management), admin approval dashboard at `/dashboard/admin/policies/approvals` (pending versions queue with approve/reject/verbal-approval actions, RM submissions queue with start-review/accept/clarify/reject, recently activated list, currently-parsing banner with animated pulse + auto-poll), parsing status indicators (detail page: pulsing "AI parsing in progress" banner with 5s auto-poll when status=parsing + success/failure toast, list page: animated parsing badges on both grid and table views), "Approvals" added to admin nav. **Policy Engine Phase 6 (RM Dashboard Enhancements) COMPLETE** — Enhanced RM dashboard home page with 3 new sections: (1) Action Required banner at top showing clarification-needed submissions + pending policy review versions for this RM (amber warning panel with type badges, urgency indicators, deep links to submission detail or review pages), (2) Recently Approved sidebar feed showing last 10 activated policy versions with lender/product/variation names + activation timestamps, (3) server enrichment with parallel queries for RMSubmissions, PolicyVersions, PolicyRules, Lenders, LenderProducts, ProductVariations. **Policy Engine Phase 7 (Version History + Audit Views) COMPLETE** — Version history timeline at `/dashboard/admin/policies/versions/[policy_rule_id]` with full chronological version list (status badges, provenance details, changelog entries, comment counts, effective dates), side-by-side version comparison (field-by-field diff highlighting added/removed/changed fields in green/red/amber), rollback capability (creates new draft from old version data, requires fresh approval workflow), action buttons per version status (activate approved, approve pending, reject, rollback superseded/rejected). Audit log viewer at `/dashboard/admin/audit` with filterable table (actor name, action type, target type, lender, date range), paginated results (50/page), role-colored actor badges, expandable JSON details, empty state handling. Rollback API at `POST /api/admin/policy-engine/rules/[rule_id]/rollback` (copies policy_fields + rule_overlays from source version, creates new draft with rollback changelog entry, audit logged). "Audit Log" nav item added to admin sidebar. **Policy Engine Phase 8 (Settings Page) COMPLETE** — AES-256-GCM encryption utility (`src/lib/server/encryption.ts`), 2 new MongoDB collections (ApiKeys with key_id+provider indexes, SystemConfigs with config_key unique index), 9 new types/constants in policyEngine.ts (ApiKey, SystemConfig, ApiKeyProvider enum, SystemConfigGroup, DEFAULT_SYSTEM_CONFIGS with 9 default entries across 3 groups). 3 new API endpoint files: api-keys CRUD (GET masked list, POST create with encrypted storage, PATCH toggle active, PUT rotate, DELETE permanent), system-configs (GET with auto-seed, POST upsert with type validation). Enhanced admin settings page with 3 sections: (1) Admin Profile (preserved existing), (2) API Key Management (provider-colored badges, masked ****last4 display, add/toggle/rotate/delete with audit logging), (3) System Configuration (grouped by Platform Toggles / Feature Flags / Thresholds, boolean toggle switches, number/string inputs with save buttons, last-updated metadata). All API keys NEVER exposed to client. All 8 Policy Engine phases complete.

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Architecture Decisions (Locked)](#2-architecture-decisions-locked)
3. [What Exists vs What's Missing](#3-what-exists-vs-whats-missing)
4. [Data Models](#4-data-models)
5. [Phase Breakdown](#5-phase-breakdown) — Phases 1-6 (done), Pre-Launch P0, Phase 7-9 (pending)
6. [Architecture Gaps](#6-architecture-gaps)
7. [Route Structure](#7-route-structure)
8. [Integration Points](#8-integration-points)
9. [Changelog](#9-changelog)

---

## 1. Product Vision

**DigitalDSA is a DSA-only platform** that automates every step of a Direct Selling Agent's loan processing workflow — from lead intake to disbursement tracking — without requiring customer PII.

### Core Principles

| # | Principle | Implication |
|---|---|---|
| 1 | **DSA + RM Partner focus** | DSA agents (primary) + lender RMs (partners). Admin for platform management. Property Consultant UI hidden. |
| 2 | **Zero PII required** | Case Builder structurally excludes name/PAN/Aadhaar/phone/address. `optional_contact` is a separate voluntary section. |
| 3 | **Derived, not duplicated** | File Builder auto-generates from form submission + lender rule engine results. No re-entry of data. |
| 4 | **Server-side intelligence** | All business logic, eligibility rules, template rendering, PDF generation happens server-side. Client is a rendering layer. |
| 5 | **Graduated value** | System works at every level of data completeness. More data = more features unlocked, never broken states. |
| 6 | **Trust-first design** | DSAs are sensitive about customer data. Every PII-related feature is optional, clearly labeled, and DSA-controlled. |

### DSA Lifecycle Coverage

| Step | What DSA Does | How We Help | Build Phase |
|---|---|---|---|
| 1. Lead Intake | Customer approaches DSA | Case creation (label + loan type, zero PII) | Phase 2 |
| 2. Profile Assessment | Evaluate eligibility | Existing form system (12 income types, multi-applicant, obligations) | EXISTS |
| 3. Lender Matching | Pick best lender(s) | Rule engine processes form → lender cards with offers, payouts | EXISTS (needs integration) |
| 4. Document Collection | Gather docs from customer | Lender-specific checklists + share-link system + freshness tracking | Phase 3 |
| 5. File Preparation | Compile the application | File Configurator (derived, presentation controls, PII stripping) | Phase 3 |
| 6. Find RM | Contact right person at lender | Centralized RM database (crowdsourced from DSA onboarding) | Phase 2 |
| 7. File Submission | Send to lender RM | Review PDF (v1 anonymized) + Submission PDF (v2 full) | Phase 3 |
| 8. Post-Submission Tracking | Track login, technical, legal | Lender tracking fields (login number, tech/legal status) | Phase 2 |
| 9. Query Handling | Resolve lender queries | Structured query management (status, deadline, response) | Phase 2 |
| 10. Follow-up | Track progress | Stage pipeline + smart reminders + timeline | Phase 2-4 |
| 11. Sanction/Disbursement | Deal closes | Stage tracking + communication templates | Phase 4 |
| 12. Rejection Analysis | Understand why, reroute | Rejection reasons + auto-suggestions for next steps | Phase 4 |

---

## 2. Architecture Decisions (Locked)

These decisions were made during planning and should not be revisited without explicit discussion.

### AD-01: DSA + RM Partner Platform
- **Decision**: Platform serves DSA agents (primary) and lender RMs (partners). RM dashboard is a secondary entry point for lender RMs to receive case files, search DSAs, and manage policies. Property Consultant and generic User UI removed.
- **Rationale**: RMs are DSAs' counterparts at lenders. Bringing them onto the platform closes the communication loop and creates a two-sided marketplace. RM entry point is separate from DSA login to enforce one-number-one-role.
- **Implementation**: DSA and RM dashboards with dedicated onboarding flows. Partner signup at `/partner-signup`. Single auth endpoint (`check-dsa`) handles DSA, RM, and admin. Auth resolves from DsaApplications, rmApplications, and Applicant. Communication threads track DSA-RM interactions per case.
- **Cleanup** (applied 2026-02-12): Deleted orphaned User/PC onboarding components, `check-user`/`check-property-consultant` endpoints, `user-onboarding`/`property-consultant-onboarding` APIs. RM support consolidated into `check-dsa` endpoint.

### AD-02: Cases Wrap Existing Form Data
- **Decision**: Cases are a DSA workflow layer on top of existing form submissions, not a replacement.
- **Rationale**: The existing income profiling (12 types), multi-applicant, and obligation systems are more detailed than any simplified "case creation" form would be.
- **Implementation**: Case references a form submission payload (immutable snapshot). File Builder derives from this.

### AD-03: File Builder is Derived, Not Editable on Numbers
- **Decision**: DSA controls presentation (what to show, consolidated vs detailed, section order, notes). Cannot modify actual financial numbers.
- **Rationale**: Prevents fraud, ensures data integrity, protects DSA and platform.
- **Implementation**: `file_config` stores presentation preferences. Source payload has checksum for tamper detection.

### AD-04: RM Database is Centralized, Not Per-DSA
- **Decision**: RM contacts collected from all DSAs during onboarding. Aggregated into shared database. Suggested to DSAs who lack a specific lender.
- **Rationale**: RMs are not competitive assets. Sharing helps all DSAs. Legal concerns about RM participation are avoided (they're not users, just contact records).
- **Implementation**: `rm_contacts` collection. DSA contributes during onboarding. System suggests from pool.

### AD-05: Audit Trail on Financial Data
- **Decision**: Every form submission creates an immutable snapshot. Edits create new versions. File Builder references specific version.
- **Rationale**: Protects DSA, platform, and lender. Proves no number manipulation.
- **Implementation**: `form_snapshots` collection with version hash.

### AD-06: PII Stripping in Review File is System-Enforced
- **Decision**: Review File (v1) NEVER includes PII regardless of what DSA has filled. This is not a toggle — it's a guarantee.
- **Rationale**: Core trust proposition. "Your customer's identity is safe."
- **Implementation**: PDF generation pipeline has a PII filter that runs on all v1 output.

### AD-07: Basic CRM is Present but Not Enforced
- **Decision**: Source tracking, communication log, pipeline view exist as optional features. They activate naturally when DSA uses related features.
- **Rationale**: Build trust first. When DSA sees value, they'll adopt voluntarily.
- **Implementation**: CRM data feeds from case activity (auto-logged) + optional source tagging.

### AD-08: Enterprise Dashboard with Interactive Sample Data
- **Decision**: On onboarding completion, seed 4 sample cases (tagged `is_sample: true`) into the real `cases` collection. Dashboard always renders from real data — no separate sample rendering path.
- **Rationale**: DSA sees a "full" dashboard from day one. They can interact with sample cases (open, explore file builder, see PDFs) as an interactive demo. No empty states ever.
- **Implementation**:
  - Sample cases are real DB entries with `is_sample: true` flag
  - 4 sample cases at different stages: sanctioned, processing (with query), file_building, intake
  - Each has realistic data: lender apps, document checklists, timeline events, RM contacts
  - "Sample" badge on all sample case cards in the list
  - "Clear all sample data" in settings + individual delete per case
  - When DSA creates first real case, prompt: "Ready to clear sample data?"
  - Stats, pipeline, charts all compute from `cases` collection (sample + real)
  - One code path for rendering — sample vs real is just a filter, not separate logic

### AD-09: Guest Demo System (No Auth Required)
- **Decision**: Pre-login "Explore Demo" button on the login page that grants access to a fully populated DSA dashboard without registration or MongoDB. All data is in-memory.
- **Rationale**: Reduces friction for prospective DSAs — they can explore the full platform (Cases, CRM, Communication, Analytics) before committing to sign up. Complements AD-08 (sample data for logged-in users) by serving anonymous visitors.
- **Implementation**:
  - **Demo JWT**: `generateDemoAccessToken()` with 24h expiry, `isDemo: true` flag in payload, fixed `userId: 'demo-guest'`
  - **Synthetic user**: `hooks.server.ts` recognizes demo tokens and injects a synthetic user (skips DB lookup entirely)
  - **In-memory data**: `demoData.ts` mirrors `sampleDataSeeder.ts` structure (4 cases, 22 timeline events, 2 RM contacts) but returns plain objects — zero MongoDB reads/writes
  - **Pre-computed page data**: `demoDataLoaders.ts` exports one function per page (`getDemoDashboardData()`, `getDemoCasesPageData()`, `getDemoCRMData()`, `getDemoAnalyticsData()`, `getDemoCommunicationData()`) replicating exact computation logic on in-memory arrays
  - **Demo banner**: Amber sticky bar on all dashboard pages — "Demo Mode" + "Sign Up" CTA + dismiss button
  - **Write protection**: Demo users' write requests return mock success without DB writes (progressive — critical APIs first)
  - **No regression**: Real authenticated users are completely unaffected — demo check is an early-return guard in each `+page.server.ts`

### AD-10: RM Portal — Feature Design & Phasing
- **Decision**: Build a dedicated RM (Relationship Manager) portal as a companion to the DSA platform. RMs are lender-side employees who process files submitted by DSAs. The portal gives RMs tools that make their job easier, creating a network effect that benefits DSAs too.
- **Rationale**: RMs currently have no unified tool to manage DSA submissions. If we give them value (file tracking, DSA search, policy distribution), they'll adopt the platform — which in turn makes the DSA experience better (faster processing, fewer queries, direct communication).
- **Core Principle**: RM is a passive beneficiary, NOT a data entry point. The platform is DSA-first; RM features consume data created by DSAs and add lightweight feedback on top.

#### RM Portal Features (11 Core + 5 Extended)

**Core Features:**
1. **System Assessment Viewer** — RM sees the platform's eligibility assessment for any file submitted to them. Read-only view of the traffic light (green/amber/red) + breakdown.
2. **Accuracy Rating** — RM rates the system's assessment accuracy: Star rating (1-5) + category dropdown (income over/underestimated, obligations missed, profile mismatch, policy issue, other) + optional free text. Feeds the platform's accuracy-improvement loop. Per-rating disclaimer shown (see AD-11).
3. **DSA Search & Directory** — RM can search DSAs registered on the platform by city, lender empanelment, volume, loan type. Useful when RM wants to source files from active DSAs. Read-only DSA profiles (no PII leakage — only business profile data).
4. **Sub-DSA / Corporate Code Communication** — RMs can communicate with DSAs who operate under their corporate DSA code. Structured messaging (not free-form chat). Templates for file updates, query requests, policy alerts.
5. **Offers & Broadcast to DSAs** — RM can broadcast special offers, rate changes, scheme launches to DSAs in their network. Server-enforced disclaimer footer auto-appended (see AD-11). DSAs see these with a "Via RM" tag + platform disclaimer.
6. **Policy One-Pager Updates** — RM uploads lender policy one-pagers (PDF/image). DSAs in that lender's network get notified. Versioned — old policy marked as superseded, not deleted.
7. **Communication Chatbot with DSAs** — Structured communication channel between RM and DSAs. NOT free-form WhatsApp-style chat. Template-based messages with context (case reference, document request, status update). All messages logged and auditable.
8. **Profile Management (Company Change)** — RM can update their profile when changing companies (common in banking). Profile change triggers re-verification and updates all DSA connections automatically.
9. **Monthly Email OTP Verification** — RMs must verify their email via OTP once per month. This is NOT a login barrier — it's triggered when RM accesses the dashboard (first access of a new 30-day window). Purpose: keep RM profiles fresh, catch departed RMs. If OTP fails 3x or is ignored for 7+ days past due, RM account goes dormant.
10. **Initial Review File Counter** — RM sees count of case files pending their initial review. Grouped by lender, filterable by loan type, date, DSA.
11. **Final Review File Counter** — Same as above but for files in final review / pre-sanction stage.

**Extended Features (Platform Suggestions):**
12. **Quick Query** — One-tap query raising from file view. RM selects category (document / clarification / technical / legal) + writes brief query → DSA gets instant notification + structured response form. Eliminates phone tag.
13. **Preferred DSA Tagging** — RM marks DSAs as "preferred" based on file quality, responsiveness. Preferred DSAs get priority suggestions, RM gets better-quality files. Virtuous cycle.
14. **Auto-Match (DSA ↔ RM)** — Platform suggests RMs to DSAs based on lender, geography, loan type, and vice versa. Uses RM's accuracy ratings + DSA's file history to optimize matches.
15. **Policy Feedback Dashboard** — Aggregated view of accuracy ratings by policy area. RM can see "income estimation is 73% accurate for salaried profiles at HDFC" — helps them calibrate expectations.
16. **RM Reputation Score** — Computed from response time, query resolution rate, DSA feedback. Shown to DSAs (anonymized). Incentivizes responsive RMs.

#### RM Portal Phasing

| Phase | Features | Dependency |
|---|---|---|
| **RM Phase 1: Foundation** | Onboarding, profile, monthly OTP, file counters (10, 11), system assessment viewer (1) | DSA Phase 2-3 (Cases + File Builder) |
| **RM Phase 2: Engagement** | Accuracy rating (2), DSA search (3), communication (4, 7), broadcasts (5), quick query (12) | RM Phase 1 + DSA Communication Hub |
| **RM Phase 3: Intelligence** | Policy one-pagers (6), preferred DSA (13), auto-match (14), policy feedback (15), reputation score (16), company change (8) | RM Phase 2 + sufficient data volume |

### AD-11: Disclaimer & Legal Safeguard Architecture
- **Decision**: Multi-layered disclaimer system protecting RMs, DSAs, and the platform. Server-enforced where possible (cannot be bypassed by client). Versioned terms with re-acceptance on changes.
- **Rationale**: RMs must feel safe using the platform. Key message: "ये platform सिर्फ एक helper है — DSA और RM के बीच का काम streamline करने के लिए। कोई भी information जो यहाँ share होती है, वो legally binding नहीं है। Final decision हमेशा lender का होगा। गलती हो सकती है, delay हो सकता है — इसलिए DSA को हमेशा official channel से verify करना चाहिए। ना हमारी कोई liability है, ना RM की।"
- **Language Style**: **Default is always English.** Users (both DSA and RM) can select their preferred language from supported options (see AD-13). When a non-English language is selected, all UI text including disclaimers must be in **बोलचाल की भाषा** (conversational everyday language) in the **native script** of that language. Not formal/literary (no शुद्ध हिन्दी, no साहित्यिक मराठी). English technical terms (platform, DSA, RM, lender, PDF, PII, etc.) stay in English script — rest in native script. The goal is that a field-level DSA or branch-level RM reads it and immediately understands — no dictionary needed. This applies to ALL Indian language translations — always colloquial/local register in native script, never formal/literary.

#### Disclaimer Placement Points (7)

1. **RM Onboarding Acceptance** (One-time, blocking)
   - Shown during RM registration before account activation
   - Must scroll to bottom + check "मैंने पढ़ लिया, समझ गया" checkbox
   - Covers: platform purpose (helper only), no legal binding, accuracy not guaranteed, data usage terms
   - Stored: `rm.disclaimer_accepted_at`, `rm.disclaimer_version`

2. **Per-Rating Disclaimer** (Inline, every time)
   - Shown below the accuracy rating form before submit
   - Text: "ये rating सिर्फ platform को better बनाने के लिए है। इससे किसी DSA की application पे कोई फर्क नहीं पड़ेगा। आपकी rating anonymous है — DSA को आपका नाम नहीं दिखेगा।"
   - No checkbox — just visible text. Submission implies acceptance.

3. **Broadcast Footer** (Server-enforced, auto-appended)
   - Every RM broadcast/offer message automatically gets a footer appended by the server
   - RM CANNOT remove or edit this footer — it's injected at API level
   - Footer text: "⚠️ ये information RM ने अपनी समझ से share की है। Platform इसका guarantee नहीं देता। Please official channel से confirm कर लें।"
   - Implementation: `POST /api/rm/broadcast` always appends footer before saving to DB

4. **DSA-Side RM Content Tags** (Visual)
   - When DSA sees any RM-originated content (broadcasts, policy updates, offers):
     - Tagged with "RM से मिली info" badge
     - Below tag: "Platform verified नहीं है — अपने lender से confirm करें"
   - Styled distinctly from platform-generated content

5. **Eligibility Results Disclaimer** (Persistent, every view)
   - On every eligibility/assessment result page:
   - "ये सिर्फ एक estimate है, final नहीं। Lender की अपनी policy अलग हो सकती है। File submit करने से पहले RM से बात कर लें।"
   - Pinned at top of results — cannot be dismissed

6. **File Preview Disclaimer** (On PDF generation)
   - Review PDF (v1) footer: "ये preliminary assessment है — PII (नाम, PAN, Aadhaar) intentionally नहीं है। Final file अलग होगी।"
   - Submission PDF (v2) footer: "इस file का data DSA द्वारा दिया गया है। Platform ने verify नहीं किया है।"

7. **Platform-Wide Terms of Service** (Legal, formal + Hinglish summary)
   - Full legal ToS in formal English (for legal compliance)
   - Alongside: Hinglish summary card — "असली बात क्या है?" section that explains key points in 5-6 bullet points in plain language
   - Accessible from footer on every page
   - Version-tracked — when updated, active users see a "Terms बदल गये हैं" modal on next login

#### Disclaimer Infrastructure

```typescript
interface DisclaimerConfig {
  id: string;                        // 'rm_onboarding_v1', 'broadcast_footer_v1', etc.
  version: number;
  placement: 'onboarding' | 'inline' | 'footer' | 'tag' | 'persistent' | 'pdf' | 'tos';
  requires_acceptance: boolean;       // true = blocking checkbox, false = visible-only
  server_enforced: boolean;           // true = injected by API, cannot be bypassed
  languages: {
    en: string;                       // English (conversational, not legal)
    hi: string;                       // Hindi (Hinglish / बोलचाल — Devanagari script)
    mr?: string;                      // Marathi (colloquial)
    gu?: string;                      // Gujarati (colloquial)
    ta?: string;                      // Tamil (colloquial)
    te?: string;                      // Telugu (colloquial)
  };
  effective_from: Date;
  supersedes?: string;                // ID of previous version
}

// User acceptance tracking
interface DisclaimerAcceptance {
  user_id: ObjectId;
  disclaimer_id: string;
  disclaimer_version: number;
  accepted_at: Date;
  ip_address?: string;
  user_agent?: string;
}
```

#### Language Guidelines for All Content (Disclaimers, UI, Value Screens)
- **Default**: English (always). Simple, conversational English — not legal jargon.
- **User-selected language**: Displayed in native script, बोलचाल/colloquial register. See AD-13 for language selection system.
- **English technical terms**: Always stay in English script regardless of selected language (platform, DSA, RM, lender, PDF, PII, login, file, etc.)

**Hindi (हिन्दी) examples:**
- **DO**: "ये सिर्फ एक helper है, final decision lender का होगा"
- **DON'T**: "यह मंच केवल सहायता हेतु है, अंतिम निर्णय ऋणदाता का होगा" (शुद्ध हिन्दी — too formal)
- **DON'T**: "Yeh sirf ek helper hai" (Roman script — use देवनागरी for Hindi)
- **DO**: "गलती हो सकती है, तो अपने RM/bank से पूछ लेना"

**English (default) examples:**
- **DO**: "This is just a helper tool. Final decision is always the lender's."
- **DON'T**: "The platform bears no responsibility for errors or omissions" (legalese)
- **DO**: "Mistakes can happen — always verify with your RM or bank directly."

- **Rule**: If a branch-level RM in a Tier-3 city can't understand it in 2 seconds → rewrite it
- **Mixed script example (Hindi)**: "ये platform सिर्फ एक helper है — DSA और RM के बीच का काम streamline करने के लिए।"

### AD-12: RM Onboarding — Value Proposition Screens (Pre-Form)
- **Decision**: Before RM fills any onboarding form, show 4 swipeable screens that answer one question: **"मुझे इसमें क्या फायदा?"** These screens are mandatory (must view all 4) but don't require interaction beyond "अगला →" / swipe.
- **Rationale**: RMs are busy, skeptical, and protective of their DSA network. They won't join unless the benefit is obvious, the risk is zero, and the effort is minimal. These screens address all three concerns upfront — before asking for a single piece of data.
- **Design Principle**: No overselling. RMs are street-smart — if we promise too much, they'll dismiss it. Keep it grounded: "ये magic नहीं है, tool है। आपको use करना पड़ेगा — पर use करोगे तो result दिखेगा।"

#### Screen 1: "ये Platform आपके लिए क्या करेगा?"

| Icon | Benefit | Message |
|---|---|---|
| 🔗 | **ज़्यादा DSAs से जुड़ें** | "आपके area में जो DSAs active हैं, उनसे directly connect हों — बिना किसी introduction के। System automatically match करेगा।" |
| 📊 | **Quality leads पहचानें** | "हर DSA की file quality, response time, past track record दिखेगा। अब अंदाज़े से काम नहीं — data से decision लें।" |
| 📋 | **Daily काम manage करें** | "Pending files, queries, follow-ups — सब एक जगह। अपना unofficial todo list समझें जो incentive बढ़ाने में help करे।" |
| ⚡ | **कम effort, ज़्यादा output** | "DSA को phone करके status पूछना बंद। System पर सब दिखता है — एक click में।" |
| 📢 | **Policy updates एक जगह** | "अपनी bank की नई policy एक बार upload करो — सारे DSAs को एक साथ पहुँच जाएगी। WhatsApp पर 50 groups में भेजना बंद।" |
| 🔄 | **Asynchronous coordination** | "DSA को 10 बार call नहीं करना पड़ेगा, RM को 10 बार pick up नहीं करना पड़ेगा। Query raise करो, जब time मिले respond करो। सब logged है।" |

#### Screen 2: "पैसों की बात"

| Icon | Point | Message |
|---|---|---|
| 💰 | **ज़्यादा files = ज़्यादा incentive** | "ज़्यादा DSAs connected = ज़्यादा files आएंगी = ज़्यादा login = ज़्यादा incentive। Simple math।" |
| 🎯 | **Better conversion rate** | "System पहले ही check करता है कि file eligible है या नहीं। आपके पास जो file आएगी, वो काम की होगी — rejection कम, sanction ज़्यादा।" |
| ⏰ | **Time = Money** | "जो time आप phone calls, WhatsApp, follow-ups में लगाते हैं — वो बचेगा। उस time में और files process करें।" |
| 🤝 | **सबका business safe** | "Platform किसी का customer नहीं छीनता। DSA का customer DSA का रहेगा। आपका network आपका रहेगा। हम बस बीच में coordination smooth करते हैं।" |
| 📈 | **Performance data ready** | "आपकी response time, sanction rate — सब track होगा। जब appraisal हो, data ready मिलेगा।" |
| 🆓 | **RM के लिए पूरा free** | "कोई subscription नहीं, कोई hidden charge नहीं। आपका time invest होगा, पैसा नहीं।" |
| 📊 | **Seasonal push एक click में** | "Quarter end है, target पूरा नहीं हुआ? एक broadcast भेजो — 'Special rate for salaried, 3 days only' — सारे DSAs को एक साथ पहुँचे।" |

#### Screen 3: "ये Platform क्या नहीं है" (Trust Builder)

| Icon | Concern | Answer |
|---|---|---|
| ❌ | **ये कोई official system नहीं है** | "ये lender का system नहीं है। ये एक independent helper tool है — जैसे WhatsApp group है, बस organized।" |
| ❌ | **कोई legal binding नहीं** | "आप जो भी यहाँ share करें — rating, broadcast, policy update — वो सिर्फ information है। कोई legal ज़िम्मेदारी नहीं।" |
| ❌ | **Customer data नहीं दिखता** | "DSA की file में customer का नाम, PAN, Aadhaar — कुछ नहीं दिखता जब तक DSA खुद न दे। Privacy system-enforced है।" |
| ❌ | **आपका network चोरी नहीं होगा** | "कोई और RM आपके DSAs को approach नहीं कर सकता platform के through। आपका network सिर्फ आपका है।" |
| ❌ | **ये magic नहीं है** | "ये tool है। आपको use करना पड़ेगा — पर use करोगे तो result दिखेगा। Diary जैसा समझो, बस digital और organized।" |

#### Screen 4: "कैसे काम करेगा?" (3-Step)

| Step | Icon | Message |
|---|---|---|
| 1️⃣ | 📝 | **Profile बनाएं** — "2 minute — नाम, bank, branch, loan types। बस।" |
| 2️⃣ | 🔗 | **DSAs connect हों** — "System automatically आपके area/bank के DSAs दिखाएगा। आप accept करें।" |
| 3️⃣ | 📊 | **Files manage करें** — "Files आएंगी, review करें, rating दें, queries raise करें — सब एक dashboard से।" |

**CTA Button**: "चलो शुरू करते हैं →"

#### Additional Benefits (Informal DSA Discovery)

| Benefit | Message |
|---|---|
| **Informal DSAs discover करें** | "बहुत से DSAs जो formally किसी corporate code में नहीं हैं, पर अच्छा काम करते हैं — उन्हें discover करें। Hidden talent pool।" |
| **Peer proof** (dynamic, post-launch) | "X DSAs और Y RMs पहले से इस platform पर हैं।" (shown once real numbers exist) |

#### UX Notes
- 4 screens are **swipeable** (mobile) or **paginated** (desktop) — no scroll
- Progress dots at bottom (● ● ○ ○)
- "अगला →" button on each screen, "Skip" link visible but small (we want them to read)
- After Screen 4 CTA → lands on RM Onboarding Form (disclaimer acceptance first per AD-11, then profile form)
- Optional: 30-second GIF/video of sample RM dashboard after Screen 4, before form — "ये दिखेगा आपको →"
- Tone: Confident but not salesy. Speak like a colleague explaining, not a marketer pitching.
- All 4 screens are language-aware — rendered in user's selected language (see AD-13). Default: English.

### AD-13: Language Selection System
- **Decision**: Both DSA and RM users can select their preferred language. **Default is always English.** Language preference is stored in user profile and applied across the entire UI — all text, disclaimers, value proposition screens, button labels, notifications, and PDF content.
- **Rationale**: India has 22 official languages. DSAs and RMs operate in local markets and are most comfortable in their local language. English default ensures no assumptions — user opts in to their preferred language explicitly.

#### Supported Languages (Phase 1)

| Code | Language | Script | Priority |
|---|---|---|---|
| `en` | English | Latin | **Default** — always available |
| `hi` | हिन्दी (Hindi) | Devanagari (देवनागरी) | Phase 1 — largest user base |
| `mr` | मराठी (Marathi) | Devanagari (देवनागरी) | Phase 1 — Maharashtra market |
| `gu` | ગુજરાતી (Gujarati) | Gujarati (ગુજરાતી) | Phase 2 |
| `ta` | தமிழ் (Tamil) | Tamil (தமிழ்) | Phase 2 |
| `te` | తెలుగు (Telugu) | Telugu (తెలుగు) | Phase 2 |
| `kn` | ಕನ್ನಡ (Kannada) | Kannada (ಕನ್ನಡ) | Phase 2 |
| `bn` | বাংলা (Bengali) | Bengali (বাংলা) | Phase 3 |
| `pa` | ਪੰਜਾਬੀ (Punjabi) | Gurmukhi (ਗੁਰਮੁਖੀ) | Phase 3 |

#### Language Selection UX

1. **Where to select**: Settings page + onboarding (optional step) + login page footer
2. **When applied**: Immediately on selection. No page reload needed (SvelteKit reactive).
3. **Persistence**: Stored in `user.preferred_language` in DB + `lang` cookie for pre-auth pages (login, value screens)
4. **Fallback chain**: User's selected language → English (if translation missing for a key)
5. **Pre-auth pages** (login, RM value screens): Language selector visible in page header/footer. Uses cookie before user is authenticated.

#### Implementation Architecture

```typescript
// Language preference in user profile
interface UserLanguagePreference {
  preferred_language: SupportedLanguage;
  set_at: Date;
}

type SupportedLanguage = 'en' | 'hi' | 'mr' | 'gu' | 'ta' | 'te' | 'kn' | 'bn' | 'pa';

// Translation file structure: src/lib/i18n/{lang}.ts
// Each file exports a flat key-value object
// Example: src/lib/i18n/hi.ts
const hi = {
  // Common
  'common.next': 'अगला →',
  'common.skip': 'Skip करें',
  'common.submit': 'Submit करें',
  'common.cancel': 'Cancel करें',

  // Disclaimers
  'disclaimer.rm_onboarding_checkbox': 'मैंने पढ़ लिया, समझ गया',
  'disclaimer.broadcast_footer': '⚠️ ये information RM ने अपनी समझ से share की है। Platform इसका guarantee नहीं देता। Please official channel से confirm कर लें।',
  'disclaimer.eligibility_result': 'ये सिर्फ एक estimate है, final नहीं। Lender की अपनी policy अलग हो सकती है।',

  // RM Value Screens
  'rm_value.screen1_title': 'ये Platform आपके लिए क्या करेगा?',
  'rm_value.more_dsas': 'आपके area में जो DSAs active हैं, उनसे directly connect हों...',
  // ... etc
};
```

#### Translation Rules
- All translations follow the **same colloquial register** as AD-11 language guidelines
- English technical terms stay English in ALL languages
- Each language uses its **native script** (not Roman transliteration)
- Translations are reviewed for local idiom — not mechanical translations
- Missing keys fall back to English silently (no broken UI)

### AD-14: Anti-Scraping & Form Security System
- **Decision**: Multi-layered server-side protection for form engine decision tree (34-interview IP). Cross-page routing rules stay server-only; within-page showWhen rules sent to client for instant reveals on poor connectivity.
- **Rationale**: Competitors could scrape the API to reconstruct the form engine's decision tree (page routing, skip logic, combo conditions). DSAs work in the field with poor connectivity, so within-page reveals must be instant (no server round-trip).

#### Architecture Layers (8 total)

| Layer | Mechanism | Implementation |
|---|---|---|
| 1. **Server-side form sessions** | One session per user+loanType, shared across tabs. `maxPageReached` high-water mark prevents skip-ahead. Tab-agnostic (no per-tab state). | `formSession.ts` — MongoDB `FormSessions` collection with TTL 24h |
| 2. **Progressive trust scoring** | Score 0-100, starts 50. Events add/subtract points. Thresholds: watchlisted (<30), suspended (<15), blocked (<5). | `trustScore.ts` — MongoDB `TrustScores` collection |
| 3. **Adaptive rate limiting** | 60/min base × trust multiplier (1.0x at 70+, 0.25x below 30). In-memory sliding window, aggregated across all tabs. | `formGuard.ts` — in-memory Map with periodic cleanup |
| 4. **Behavioral telemetry** | Boolean signals per page: mouse, scroll, keyboard, paste, focus. Bots missing all signals get flagged. Not keylogging. | `behaviorTelemetry.ts` (client) → `formGuard.ts` (server analysis) |
| 5. **Honeypot fields** | CSS-hidden inputs in HTML (not API schema). Session-rotated field names. Any input → -50 trust penalty. | `HoneypotField.svelte` → `/api/security/honeypot-trap` |
| 6. **Response fingerprinting** | Zero-width chars in descriptions encode sessionId (8 chars × 8 bits). Deterministic question ordering per session. | `engine.ts` — `encodeSessionFingerprint()` + `deterministicShuffle()` |
| 7. **Multi-browser auth** | `activeTokenIds[]` array (max 10) replaces single `activeTokenId`. Hardware-only device fingerprint (screen, timezone, platform, cores, DPR) is cross-browser stable. | `hooks.server.ts`, `check-dsa/+server.ts`, `hardwareFingerprint.ts` |
| 8. **Device-switch nuke** | Login from different device wipes ALL old tokens + form sessions. Deliberately punitive to deter credential sharing. | `check-dsa/+server.ts` — `buildTokenUpdate()` with `deviceClassHash` comparison |

#### Multi-Tab Safety
- Server tracks `maxPageReached` (high-water mark), NOT `currentPageIndex`
- No per-tab state on server — different tabs can be on different pages
- Rate limit is per-user aggregated across all tabs (60/min generous for multi-tab)
- Max 5 concurrent form sessions per user (different loan types)

#### Trust Score Events

| Event | Delta | Trigger |
|---|---|---|
| `fast_completion` | -10 | >50% of page timings under 3 seconds |
| `missing_behavior` | -5 | >80% behavior entries missing all human signals |
| `rate_limit_hit` | -15 | Hit any rate limit |
| `skip_ahead` | -20 | Requested unreached page |
| `sustained_burst` | -10 | >20 req/min sustained over 5 minutes |
| `honeypot_triggered` | -50 | Hidden field received a value |
| `normal_behavior` | +1 | Natural mouse/keyboard signals on page |
| `normal_completion` | +2 | Page completed in reasonable time |
| `successful_submit` | +10 | Completed and submitted a form |

#### New Files

| File | Purpose |
|---|---|
| `src/lib/types/formSession.ts` | FormSession, TrustScore, BehaviorSignals types + constants |
| `src/lib/server/formSession.ts` | Session CRUD, page access validation, timing analysis |
| `src/lib/server/trustScore.ts` | Trust scoring engine, event recording, access checks |
| `src/lib/server/formGuard.ts` | Orchestrator: trust + rate limit + session + behavior |
| `src/lib/utils/behaviorTelemetry.ts` | Client-side behavioral signal collection |
| `src/lib/utils/hardwareFingerprint.ts` | Cross-browser stable device fingerprint |
| `src/lib/components/form/HoneypotField.svelte` | CSS-hidden bot trap |
| `src/routes/api/security/honeypot-trap/+server.ts` | Honeypot detection endpoint |

#### Test Coverage Status
- **Unit tests**: Not yet written for anti-scraping modules. Critical pure functions (`validatePageAccess`, `getTrustMultiplier`, `checkRateLimit`) are top priority.
- **E2E tests**: Form flows exercise the guard pipeline indirectly (evaluate/submit go through FormGuard). Dedicated security E2E tests not yet written.

---

## 3. What Exists vs What's Missing

### EXISTS — In This Repo (Working)

**Foundation & Auth:**
- [x] Auth system (JWT, OTP, multi-role DSA/RM/admin, CSRF, rate limiting)
- [x] Income profiling — 12 types, multi-source, verifiable vs declared
- [x] Enhanced obligation tracking (loan role, EMI source, capacity)
- [x] Multi-applicant system (up to 8, relationships, GPA, NRI)
- [x] Share-link system (secure token, OTP, section-specific, expiry)
- [x] ImageKit upload integration
- [x] Bank master list (50+ banks, PVT/GOV/NBFC)
- [x] Loan type configuration (15+ types)
- [x] Wizard section system (progressive disclosure)
- [x] Security infrastructure (CSRF, rate limiting, headers, httpOnly)
- [x] Anti-scraping & form security (AD-14) — 8-layer defense, trust scoring, behavioral telemetry, honeypots, response fingerprinting
- [x] Multi-browser auth — `activeTokenIds[]` array, hardware-only device fingerprint, device-switch nuke
- [x] Server-driven form engine — all 6 loan forms migrated, within-page showWhen for instant reveals
- [x] CasePayload system — categorical type system (17 interfaces), builder with 14 sub-builders + derived intelligence computations, reactive derived store, dev-mode console logging on every Next/Submit
- [x] Capacitor mobile setup (Android)
- [x] Email service (Nodemailer + SMTP)
- [x] Razorpay payment integration
- [x] Guest demo system (no-auth demo login, in-memory data, demo banner)
- [x] Feature flags infrastructure (15 flags, 3 tiers, per-DSA overrides)

**DSA Platform (Phase 1-4):**
- [x] DSA onboarding v1 (basic fields) + v2 (5 sections: Business Profile, Pain Points, Goals, Workflow, Modules) — wired to `/dashboard/dsa/profile`
- [x] DSA dashboard (enterprise — Cases, CRM, Communication, Analytics, Profile, full sidebar nav)
- [x] Cases collection + Zod schema + CRUD API (`/api/cases/`)
- [x] Stage Pipeline engine (intake → disbursed/closed) with transition validation
- [x] Case list page + filters (stage, loan type, lender) + search + pagination
- [x] Case detail page (stage, contact, source, notes, lenders)
- [x] Multi-lender parallel tracking + comparison table + primary toggle
- [x] Login number / lender reference tracking (inline editing UI)
- [x] Structured query management (CRUD, status, deadlines, days_open)
- [x] Centralized RM database + CRUD + search + confirm + suggestions
- [x] File Configurator (section toggles, consolidated/detailed, PII mode)
- [x] PII stripping engine (system-enforced for v1, recursive deep-redaction)
- [x] PDF generation — Review (v1 anonymized) + Submission (v2 full) with pdf-lib
- [x] Document checklist + templates (5 lenders, 14-15 docs each)
- [x] Document upload flow (ImageKit, drag-drop, progress, freshness tracking)
- [x] Communication templates (16 templates) + rendering API + WhatsApp share
- [x] Communication hub UI (recipient tabs, preview, edit, actions)
- [x] Activity timeline (auto-logging for all case events)
- [x] Smart reminders / nudges (14 reminder types, stage-based + time-based)
- [x] Basic CRM (source tracking, kanban pipeline view, communication log)
- [x] Rejection analysis (10 categories, prevention tips, reroute suggestions)
- [x] DSA performance scorecard (8 metrics, tied to onboarding goals)
- [x] Lender policy change alerts + re-evaluation of existing cases
- [x] Form snapshots (versioning, SHA-256 checksums, diff comparison)
- [x] Sample data seeder (4 sample cases, 22 events, 2 RMs at onboarding)
- [x] Lender Results pipeline — versioned snapshots, selection flow, change tracking, staleness detection, premium LenderResultCard UI
- [x] Case edit flow — Edit button on case header, form pre-fills from latest snapshot, submit creates new version
- [x] Evaluation transition page — animated 5-step `/evaluating` route (profiling → lender check → API call → comparison → preparation)
- [x] Legal pages — Terms of Service (`/terms`), Refund Policy (`/refund`), Privacy Policy (`/privacy`) at `/(legal)/`
- [x] Login split-screen redesign

**RM Partner Integration (Phase 5):**
- [x] RM partner signup (`/partner-signup` — phone + OTP flow)
- [x] RM onboarding (`/rm-onboarding` — RMOfficialDetails)
- [x] RM auth (JWT with `role: 'rm'`, hooks integration, fallback to RM collection)
- [x] RM dashboard (`/dashboard/rm` — stats, quick actions, welcome)
- [x] RM Cases Received page (`/dashboard/rm/cases`)
- [x] RM DSA Search page + API (`/dashboard/rm/dsa-search` + `/api/rm/search-dsas`)
- [x] RM Policies page (`/dashboard/rm/policies`)
- [x] Communication threads (type + collection for DSA-RM messaging)
- [x] Share-with-RM API (creates thread + WhatsApp URL)

**Quality & Testing:**
- [x] Validation audit (split keystroke vs blur, Indian mobile rules, context-aware maxlength)
- [x] 2,369 unit tests across 40 files (Vitest)
- [x] 15 Playwright E2E spec files
- [x] 0 errors, 3 warnings pre-existing (svelte-check clean)
- [x] Mobile responsiveness (768px breakpoints, 44px touch targets)
- [x] Console cleanup — ~70 noisy/dead logs removed, dev-guarded payload logging only

### EXISTS — Separate Repos (Needs Integration/Upgrade)

- [x] Lender Rule Engine (many banks, JSON-Logic in DB)
- [x] Eligibility Calculator
- [x] Affordability Calculator
- [x] Balance Transfer Calculator
- [x] Lender Offers / Suggestions display
- [x] Corporate DSA Payout display per lender

### DESIGNED & BUILT

- [x] RM Portal expansion — 16 features across 3 phases (see AD-10, Phase 6) — all 26 tasks complete
- [x] RM Value Proposition — 4 pre-onboarding screens (see AD-12)
- [x] Disclaimer infrastructure — 7 placement points, server-enforced, multi-language (see AD-11)
- [x] Language selection system — English default, Hindi + Marathi Phase 1 (see AD-13)

### MISSING — Needs to Be Built

> Full audit: `docs/PLATFORM-AUDIT-2026-02-16.md`

**P0 — Critical (Before Production Launch):**
- [ ] `.env` security — move all secrets to Vercel env / GitHub Secrets, rotate exposed keys (Razorpay LIVE, MongoDB Atlas, MSG91, ImageKit)
- [ ] Rate limit on verify-otp — 4-digit OTP brute-forceable without lockout; add 5-attempt exponential backoff
- [ ] CI/CD pipeline — GitHub Actions: lint → type check → unit tests → build → deploy to Vercel
- [ ] Email service hardening — migrate from Nodemailer SMTP to AWS SES/SendGrid, set up SPF/DKIM/DMARC

**P1 — High Value (Completes Core Workflow):**
- [ ] Bridge offers → case creation — "Save as Case" button on standalone offers pages (`/home-loan-offers` etc.) that auto-creates case + snapshot + results. **This is the biggest architectural gap** — form→offers and case management are currently disconnected.
- [x] File Builder UI — route `/dashboard/dsa/cases/{id}/file-builder` (Phase 7.2 complete)
- [ ] RM Contacts management page — CRUD UI at `/dashboard/dsa/rm-contacts` (collection + search API already exist)
- [ ] Full timeline view — paginated timeline per case with event type filtering and date range
- [ ] `/api/form/submit` persistence — currently validates but doesn't save to MongoDB; first-time form data only exists in browser sessionStorage
- [ ] Refresh token `activeTokenIds[]` audit — `/api/auth/refresh-token` may still check old `activeTokenId` field

**P2 — Polish & Growth:**
- [ ] sitemap.xml + JSON-LD structured data for SEO
- [ ] About/Contact pages (footer links to them, routes don't exist)
- [ ] Push notifications (browser Web Push + email digests for queries, stage changes, expiring docs, RM broadcasts)
- [ ] Auto-match in RM UI (algorithm exists in `autoMatch.ts`, needs "Suggested DSAs" panel in dashboard)
- [ ] Capacitor APK build + Play Store listing
- [ ] Subscription/Payment management UI (Razorpay wired but no plan selection/billing/upgrade flow)

**P3 — Competitive Advantage:**
- [x] ~~Integration layer (rule engine + calculators)~~ — **IN PROGRESS: Rule Engine Path A (in-house build)**. Spec complete, test infra complete, admin pipeline complete. Building evaluator + API + DSA integration.
- [ ] Builder/project approval database (crowd-sourced) — deferred, needs data volume

---

## 4. Data Models

### 4.1 Cases Collection

```typescript
interface Case {
  _id: ObjectId;
  case_id: string;               // Auto-generated: {PREFIX}-{YEAR}-{SEQ} e.g. HL-2026-0042
  dsa_id: ObjectId;              // Reference to DSA

  // Identification (zero PII required)
  label: string;                 // DSA's private reference ("Sharma ji", "Plot Pune case")

  // Loan basics
  loan: {
    type: LoanType;              // Home Loan, LAP, Personal Loan, etc.
    amount_required?: number;
    tenure_years?: number;
    purpose?: string;            // Purchase, Construction, BT, Top-up
  };

  // Stage pipeline
  stage: CaseStage;
  stage_history: StageTransition[];

  // Form data reference (immutable snapshots)
  form_submission_id?: ObjectId;        // Reference to original form submission
  form_snapshot_version?: number;       // Which version of the form data
  form_snapshot_hash?: string;          // Checksum for tamper detection

  // Lender applications (multi-lender parallel)
  lender_applications: LenderApplication[];
  primary_lender_id?: string;          // DSA's preferred lender

  // Optional contact (voluntary PII)
  optional_contact?: {
    full_name?: string;          // Unlocks: personalized messages, auto-filled PDFs
    mobile?: string;             // Unlocks: WhatsApp one-tap
    email?: string;              // Unlocks: email sending
  };

  // Source tracking (CRM)
  source?: {
    type?: 'walk-in' | 'builder' | 'ca' | 'referral' | 'online' | 'broker' | 'self';
    label?: string;              // DSA's reference for the source
    source_contact_id?: ObjectId; // Reference to CRM contact (if exists)
  };

  // Private notes
  notes?: string;

  // Metadata
  created_at: Date;
  updated_at: Date;
  is_archived: boolean;
  is_sample: boolean;             // true for demo data seeded at onboarding
}

type CaseStage =
  | 'intake'          // Just created, minimal info
  | 'profiling'       // Filling financial details
  | 'file_building'   // Preparing documents for lender(s)
  | 'submitted'       // Submitted to lender RM
  | 'processing'      // Lender is processing
  | 'query'           // Lender raised queries
  | 'sanctioned'      // Loan sanctioned
  | 'disbursed'       // Amount disbursed
  | 'rejected'        // Rejected by lender
  | 'dropped'         // DSA dropped the case
  | 'closed';         // Completed or archived

interface StageTransition {
  from: CaseStage;
  to: CaseStage;
  timestamp: Date;
  notes?: string;
}
```

### 4.2 Lender Application (embedded in Case)

```typescript
interface LenderApplication {
  lender_application_id: string;    // Auto-generated UUID
  lender_id: string;                // Reference to lender
  lender_name: string;              // Denormalized for display

  // Status tracking
  status: LenderAppStatus;
  status_history: StatusTransition[];

  // Lender tracking (post-submission)
  lender_tracking?: {
    login_number?: string;           // Lender's reference number
    login_date?: Date;
    technical_status?: 'pending' | 'ordered' | 'received' | 'positive' | 'negative';
    legal_status?: 'pending' | 'ordered' | 'received' | 'clear' | 'not_clear';
    credit_approval?: 'pending' | 'approved' | 'rejected' | 'conditional';
    conditions?: string[];           // Pre-disbursement conditions
  };

  // Sanction details
  sanction?: {
    amount?: number;
    roi?: number;
    tenure_months?: number;
    sanction_date?: Date;
    sanction_letter_ref?: string;
    conditions?: string[];
  };

  // Disbursement tracking
  disbursement?: {
    total_amount?: number;
    tranches?: DisbursementTranche[];
  };

  // Rejection
  rejection?: {
    reason_category?: string;        // credit_score | foir | income | builder | age | other
    reason_detail?: string;
    rejection_date?: Date;
    reroute_suggestions?: string[];  // Auto-generated: "Try lender X", "Close EMI Y"
  };

  // Eligibility snapshot (from rule engine at time of selection)
  eligibility_snapshot?: {
    traffic_light: 'green' | 'amber' | 'red' | 'grey';
    message: string;
    computed_at: Date;
  };

  // Document checklist
  document_checklist: DocumentChecklistItem[];

  // Queries
  queries: LenderQuery[];

  // RM contact for this lender
  rm_contact_id?: ObjectId;         // Reference to rm_contacts collection

  // File configuration (presentation preferences)
  file_config?: FileConfig;

  // File snapshots (generated PDFs)
  file_snapshots: FileSnapshot[];

  // Offer details (from rule engine)
  offer_details?: Record<string, any>;

  // Payout info
  payout_info?: Record<string, any>;

  created_at: Date;
  updated_at: Date;
}

type LenderAppStatus =
  | 'selected'        // DSA picked this lender
  | 'file_building'   // Preparing documents
  | 'ready'           // File complete, ready to submit
  | 'submitted'       // Sent to RM
  | 'processing'      // RM confirmed receipt, processing
  | 'query'           // Lender raised queries
  | 'query_responded' // DSA responded to queries
  | 'sanctioned'      // Approved
  | 'disbursed'       // Money released
  | 'rejected'        // Declined
  | 'withdrawn';      // DSA pulled the file
```

### 4.3 Document Checklist Item

```typescript
interface DocumentChecklistItem {
  doc_id: string;
  doc_name: string;
  category: 'identity' | 'income' | 'property' | 'lender_specific' | 'other';
  is_mandatory: boolean;
  description?: string;          // "Last 12 months, all pages, PDF preferred"

  // Status tracking
  status: 'not_started' | 'requested' | 'received' | 'uploaded' | 'not_applicable';
  status_updated_at?: Date;

  // Upload reference
  upload?: {
    file_url: string;            // ImageKit URL
    file_id: string;             // ImageKit file ID
    file_type: string;           // pdf, jpg, png
    file_size: number;
    uploaded_at: Date;
  };

  // Freshness tracking
  validity?: {
    valid_from?: Date;           // Document date
    valid_until?: Date;          // Auto-computed expiry
    is_fresh: boolean;           // Computed: valid_until > now
    freshness_rule_days: number; // e.g., 90 for bank statements
  };

  // Notes
  dsa_notes?: string;           // "Customer will send by Thursday"
}
```

### 4.4 Lender Query

```typescript
interface LenderQuery {
  query_id: string;
  query_text: string;
  category: 'document' | 'clarification' | 'additional_info' | 'technical' | 'legal' | 'other';
  raised_at: Date;
  deadline?: Date;

  // Response
  response?: {
    text: string;
    attachments?: string[];      // File URLs
    responded_at: Date;
  };

  status: 'open' | 'responded' | 'resolved';
  days_open: number;             // Computed
}
```

### 4.5 File Configuration (Presentation Controls)

```typescript
interface FileConfig {
  // Tamper detection
  source_payload_hash: string;          // Checksum of original form data
  source_snapshot_version: number;

  // Section visibility (DSA toggle)
  sections_visibility: {
    co_applicant: boolean;
    property_details: boolean;
    obligation_details: boolean;
    credit_score: boolean;
    [key: string]: boolean;
  };

  // Display modes
  display_mode: {
    income: 'consolidated' | 'detailed';
    obligations: 'consolidated' | 'detailed';
    applicants: 'consolidated' | 'individual';
  };

  // DSA notes per section
  dsa_notes: Record<string, string>;

  // Section ordering (DSA preference)
  section_order: string[];

  // PII mode
  pii_mode: 'stripped' | 'included';    // v1 always stripped, v2 can include

  updated_at: Date;
}
```

### 4.6 RM Contacts Collection (Centralized)

```typescript
interface RMContact {
  _id: ObjectId;

  // RM details
  rm_name: string;
  lender_name: string;
  branch?: string;
  city?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  designation?: 'RM' | 'Senior RM' | 'Credit Manager' | 'Branch Manager' | 'Other';
  loan_types_handled?: LoanType[];

  // Source tracking
  contributed_by: ObjectId[];           // DSA IDs who added/confirmed this RM
  contributed_at: Date;
  last_confirmed_at: Date;
  confirmation_count: number;           // Higher = more trustworthy

  // Activity
  is_active: boolean;
  notes_by_dsa: Record<string, string>; // { [dsa_id]: "responds fast" } — private per DSA

  created_at: Date;
  updated_at: Date;
}
```

### 4.7 Form Snapshots (Audit Trail)

```typescript
interface FormSnapshot {
  _id: ObjectId;
  case_id: string;
  version: number;                 // Auto-incrementing

  // The actual form data (immutable)
  payload: Record<string, any>;    // Sanitized form submission
  payload_hash: string;            // SHA-256 checksum

  // Metadata
  created_by: ObjectId;            // DSA ID
  created_at: Date;
  change_summary?: string;         // "Updated income from ₹1L to ₹1.2L"
}
```

### 4.8 Activity Timeline

```typescript
interface TimelineEvent {
  _id: ObjectId;
  case_id: string;

  event_type:
    | 'case_created'
    | 'case_updated'
    | 'stage_changed'
    | 'lender_added'
    | 'lender_status_changed'
    | 'document_uploaded'
    | 'document_status_changed'
    | 'document_expiring'
    | 'query_raised'
    | 'query_responded'
    | 'query_resolved'
    | 'review_pdf_generated'
    | 'submission_pdf_generated'
    | 'message_sent'
    | 'note_added'
    | 'form_updated'
    | 'rejection'
    | 'sanction'
    | 'disbursement';

  description: string;             // Human-readable: "Uploaded salary slips for HDFC application"
  metadata?: Record<string, any>;

  created_at: Date;
}
```

### 4.9 DSA Profile v2 (Onboarding Enhancement)

```typescript
interface DsaProfileV2 {
  // === Existing fields (keep) ===
  _id: ObjectId;
  name: string;
  email: string;
  gender: string;
  age: number;
  mobileNumber: number;
  hasDirectDsaCode?: boolean;
  lenderName?: string;
  dsaCode?: string;
  panNumber?: string;
  workingCity?: string;
  gstNumber?: string;
  onboardingCompleted: boolean;
  accountStatus: AccountStatus;
  usedCoins: number;
  availableCoins: number;

  // === NEW: Section A — Business Profile ===
  business_profile?: {
    firm_name?: string;
    gstin?: string;
    years_in_business?: number;
    team_size: 'solo' | '2-5' | '6-15' | '15+';
    monthly_file_volume: '0-5' | '5-15' | '15-30' | '30+';
    primary_loan_types: LoanType[];
    empanelled_lenders: EmpanelledLender[];   // Multi-select + RM details per lender
    geography: {
      city: string;
      areas_of_operation?: string[];
    };
    current_tools: ('excel' | 'paper' | 'whatsapp' | 'other_software' | 'none')[];
    has_website: boolean;
    lead_sources: ('self' | 'broker' | 'builder' | 'ca' | 'digital' | 'walk_in' | 'referral')[];
  };

  // === NEW: Section B — Pain Points (forced ranking) ===
  pain_points_ranking?: {
    ranked_items: string[];       // Top 5 in order
    ranked_at: Date;
  };

  // === NEW: Section C — 6-Month Goals ===
  goals?: {
    files_per_month: { current: number; target: number };
    disbursement_volume: { current: number; target: number };
    active_lender_count: { current: number; target: number };
    repeat_referral_rate: { current: number; target: number };
    avg_processing_days: { current: number; target: number };
    set_at: Date;
  };

  // === NEW: Section D — Workflow Preferences ===
  workflow?: {
    customer_interaction: 'in_person' | 'remote' | 'both';
    document_collection: 'physical' | 'digital' | 'both';
    file_preparation: 'self' | 'back_office' | 'both';
    lender_submission: 'email' | 'physical' | 'portal' | 'mixed';
    training_preference: 'video' | 'live' | 'self_serve' | 'none';
  };

  // === NEW: Section E — Module Selection ===
  active_modules?: string[];       // Which modules DSA activated

  // === NEW: Subscription / Feature Flags ===
  subscription?: {
    tier: 'free' | 'pro' | 'enterprise';
    started_at?: Date;
    expires_at?: Date;
  };
  feature_flags?: Record<string, boolean>;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  onboarding_v2_completed?: boolean;   // Tracks if enhanced onboarding is done
}

interface EmpanelledLender {
  lender_name: string;
  dsa_code?: string;
  has_direct_code: boolean;
  rm_name?: string;
  rm_phone?: string;
  rm_email?: string;
  relationship_since?: Date;
}
```

### 4.10 Communication Threads (DSA-RM)

```typescript
interface CommunicationThread {
  _id: ObjectId;
  case_id: string;
  dsa_id: ObjectId;
  rm_id: ObjectId;
  rm_name: string;
  dsa_name: string;
  lender_name: string;
  messages: ThreadMessage[];
  status: 'active' | 'closed';
  created_at: Date;
  updated_at: Date;
}

interface ThreadMessage {
  sender_role: 'dsa' | 'rm';
  sender_id: ObjectId;
  message: string;
  message_type: 'text' | 'case_shared' | 'query' | 'response';
  created_at: Date;
}
```

### 4.11 Communication Templates

```typescript
interface CommTemplate {
  id: string;
  category: 'customer' | 'rm' | 'source';
  name: string;
  channel: 'whatsapp' | 'email' | 'clipboard';
  subject?: string;               // Email only
  body: string;                   // Template with {{variables}}
  variables: string[];
  required_data: string[];        // Case fields needed for this template
  stage_context?: CaseStage[];    // Which stages this template is relevant for
}
```

---

## 5. Phase Breakdown

### Testing Strategy (Applies to All Phases)

> Every phase includes both **unit tests** (Vitest) and **E2E tests** (Playwright). Tests are tracked alongside feature tasks.

| Layer | Tool | What Gets Tested |
|---|---|---|
| **Zod schemas** | Vitest | Validation logic — valid/invalid payloads, edge cases, type coercion |
| **Server logic** | Vitest | Stage transitions, snapshot checksums, query workflows, RM suggestions, PII stripping |
| **API routes** | Vitest + supertest | CRUD operations, auth guards, error responses, Zod rejection |
| **Browser UI** | Playwright | Full user flows — onboarding, case creation, dashboard interactions, file builder, communication |
| **Component** | Vitest + @testing-library/svelte | Individual component rendering, props, events (where complex) |

### Phase 1: Foundation (Current Sprint)

> **Goal**: Remove non-DSA code, database schemas, DSA Onboarding v2, enterprise dashboard scaffold, testing setup

| # | Task | Status | Notes |
|---|---|---|---|
| | **Cleanup — Remove Non-DSA Stakeholders** | | |
| 1.1 | Remove User dashboard route (`/dashboard/user/`) + page | `done` | Deleted |
| 1.2 | Remove RM dashboard route (`/dashboard/rm/`) + page | `done` | Deleted |
| 1.3 | Remove Property Consultant dashboard route (`/dashboard/property-consultant/`) + page | `done` | Deleted |
| 1.4 | Remove non-DSA onboarding routes (`user-onboarding`, `rm-onboarding`, `property-consultant-onboarding`) | `done` | Deleted |
| 1.5 | Update dashboard layout — DSA-only sidebar, remove role switcher | `done` | Role switcher removed, DSA-only nav |
| 1.6 | Clean `sampleDashboardData.ts` — keep only DSA sample data | `done` | Non-DSA sample data removed |
| 1.7 | Fix leftover references to deleted routes (login, onboarding layout, accessControl) | `done` | Cleaned up |
| | **Data Foundation** | | |
| 1.8 | Create `cases` collection + indexes + Zod schemas | `done` | `case.ts` + `case.schema.ts` + `mongo.ts` updated |
| 1.9 | Create `rm_contacts` collection + Zod schemas | `done` | `rmContact.ts` + `rmContact.schema.ts` |
| 1.10 | Create `form_snapshots` collection + Zod schemas | `done` | `formSnapshot.ts` + `formSnapshot.schema.ts` |
| 1.11 | Create `timeline_events` collection + Zod schemas | `done` | `timeline.ts` + `timeline.schema.ts` |
| 1.12 | Define stage pipeline types + transition rules | `done` | `stagePipeline.ts` — case + lender transitions |
| 1.13 | Define `file_config` types + Zod schemas | `done` | In `case.ts` + `case.schema.ts` |
| | **DSA Onboarding v2** | | |
| 1.14 | Section A (Business Profile) — schema + UI | `done` | Schema + BusinessProfileSection.svelte (empanelled lenders CRUD, bank search) |
| 1.15 | Section B (Pain Points forced ranking) — schema + UI | `done` | Schema + PainPointsSection.svelte (click-to-rank, reorder) |
| 1.16 | Section C (6-Month Goals) — schema + UI | `done` | Schema + GoalsSection.svelte (metric cards, improvement indicators) |
| 1.17 | Section D (Workflow Preferences) — schema + UI | `done` | Schema + WorkflowSection.svelte (radio groups, progress bar) |
| 1.18 | Section E (Module Selection) — schema + UI | `done` | Schema + ModuleSelectionSection.svelte (visual cards, select all) |
| 1.19 | Onboarding v2 API endpoint (save/update) | `done` | POST save + GET load + auto-completion detection |
| 1.20 | RM contacts — populate centralized DB from empanelled lenders | `done` | Upserts from onboarding API |
| | **Enterprise Dashboard** | | |
| 1.21 | Sample data seeder — 4 sample cases in DB at onboarding completion | `done` | Idempotent, 4 cases + 22 events + 2 RMs |
| 1.22 | Dashboard layout — enterprise scaffold (stats, pipeline, cases, RM, activity) | `done` | 4 new components + page overhaul |
| 1.23 | Dashboard data — connected to real `cases` collection (sample + real) | `done` | Server loads from MongoDB, computes stats |
| 1.24 | Sample data management — badges, clear all, individual delete, first-case prompt | `done` | Banners + clear prompt + API endpoint |
| | **Infrastructure** | | |
| 1.25 | Feature flags infrastructure (basic) | `done` | `featureFlags.ts` — 15 flags, 3 tiers, per-DSA overrides + `/api/dsa/features` |
| | **Testing — Phase 1** | | |
| 1.26 | Vitest: Zod schema tests — cases, rm_contacts, form_snapshots, timeline_events | `done` | 4 test files: 59+24+24+20 tests |
| 1.27 | Vitest: Stage pipeline — transition validation, allowed/blocked transitions | `done` | 83 tests covering all transitions |
| 1.28 | Vitest: DSA onboarding v2 — validation for all 5 sections | `done` | 92 tests covering all sections |
| 1.29 | Vitest: Sample data seeder — creates correct cases, tagged `is_sample` | `skipped` | Requires MongoDB connection; covered by integration tests |
| 1.30 | Playwright: DSA onboarding v2 full flow (all 5 sections, submit) | `done` | `dashboard-onboarding.spec.ts` — API + UI tests for all 5 sections |
| 1.31 | Playwright: Dashboard loads with sample data after onboarding | `done` | `dashboard-sampleData.spec.ts` — banner, badges, display tests |
| 1.32 | Playwright: Sample data clear (individual + bulk) | `done` | `dashboard-sampleData.spec.ts` — clear all, individual, first-case prompt |
| 1.33 | Playwright: Verify non-DSA routes return 404 or redirect | `done` | `dashboard-deletedRoutes.spec.ts` — 5 deleted routes verified |

### Phase 2: Core Workflow

> **Goal**: Cases CRUD, stage management, queries, RM database

| # | Task | Status | Notes |
|---|---|---|---|
| | **Cases** | | |
| 2.1 | Case creation — CRUD API with Zod validation, auto case_id generation | `done` | `/api/cases` GET+POST |
| 2.2 | Case list page — filters (stage, loan type, lender), search, pagination | `done` | `/dashboard/dsa/cases` + server |
| 2.3 | Case detail page — overview (stage, contact, source, notes, lenders) | `done` | `/dashboard/dsa/cases/[case_id]` layout + page |
| 2.4 | Stage pipeline — transition API with validation + timeline events | `done` | `/api/cases/[case_id]/stage` PATCH |
| 2.5 | Multi-lender parallel tracking — comparison table, primary toggle | `done` | LenderComparisonTable component + primary lender API |
| 2.6 | Login number / lender reference tracking — inline editing UI | `done` | Enhanced LenderApplicationCard with auto-save tracking fields |
| | **Queries & RM** | | |
| 2.7 | Structured query management — CRUD, status, deadlines, days_open | `done` | `/api/cases/[case_id]/lender-applications/[id]/queries` GET+POST+PATCH |
| 2.8 | RM database — CRUD, search, confirm, suggestions | `done` | 4 API routes: list+create, get+update, confirm, suggest |
| | **Data Integrity** | | |
| 2.9 | Form snapshots — CRUD, versioning, SHA-256 checksums, diff comparison | `done` | 3 API routes + snapshotHelpers.ts |
| | **Activity** | | |
| 2.10 | Activity timeline — auto-logging for all case events | `done` | `/api/cases/[case_id]/timeline` GET + helpers auto-log all events |
| | **Testing — Phase 2** | | |
| 2.11 | Vitest: Case CRUD API — create, read, update, archive | `done` | 95 tests in `caseValidation.test.ts` — schemas, enums, edge cases |
| 2.12 | Vitest: Stage transitions — allowed paths, blocked paths, history | `done` | 80 tests in `stageTransitions.test.ts` — complements existing 83 tests |
| 2.13 | Vitest: Query workflow — open, respond, resolve, days-open calc | `done` | 58 tests in `queryValidation.test.ts` — categories, statuses, responses |
| 2.14 | Vitest: Form snapshot — version increment, checksum match, tamper detection | `done` | 40 tests in `formSnapshotValidation.test.ts` — tamper detection, diffs |
| 2.15 | Vitest: RM suggestion algorithm — lender matching, confirmation count | `done` | 96 tests in `rmValidation.test.ts` — schemas, email, phone, combined |
| 2.16 | Playwright: Case creation from lender card → case detail view | `done` | `dashboard-cases.spec.ts` — create, list, detail navigation |
| 2.17 | Playwright: Case list — filters, search, pagination, empty states | `done` | `dashboard-cases.spec.ts` — filters, search, pagination, empty state |
| 2.18 | Playwright: Stage transitions — full pipeline walkthrough | `done` | `dashboard-pipeline.spec.ts` — full pipeline + blocked transitions |
| 2.19 | Playwright: Query raise → respond → resolve flow | `done` | `dashboard-queries.spec.ts` — full query lifecycle |
| 2.20 | Playwright: RM database — CRUD + suggestion display | `done` | `dashboard-rm.spec.ts` — CRUD + search + suggestions |
| 2.21 | Playwright: Multi-lender — add 2 lenders, compare, set primary | `done` | `dashboard-multiLender.spec.ts` — add, compare, primary, remove |

### Phase 3: File Builder + Documents

> **Goal**: File configurator, PDF generation, document management

| # | Task | Status | Notes |
|---|---|---|---|
| | **File Builder** | | |
| 3.1 | File Configurator — section toggles, consolidated/detailed modes | `done` | `fileConfigurator.ts` + `/api/cases/[case_id]/file-config` |
| 3.2 | PII stripping engine — system-enforced for v1 | `done` | `stripPII()` with recursive deep-redaction of 12+ PII field types |
| 3.3 | PDF generation — review (PII-stripped) + submission (full) with pdf-lib | `done` | `pdfGenerator.ts` + download endpoint. A4, professional layout, watermarks, Indian number formatting |
| 3.4 | File Builder API — preview + generate file snapshots | `done` | `/api/cases/[case_id]/file-builder` (GET preview, POST generate + PDF) + `/verify` + `/download` |
| | **Documents** | | |
| 3.5 | Document checklist + templates — per-lender pre-defined checklists | `done` | `documentTemplates.ts` (5 lenders, 14-15 docs each) + apply-template + bulk endpoints |
| 3.6 | Document upload flow — ImageKit per checklist item | `done` | Upload API endpoint + DocumentUpload.svelte (drag-drop, progress, validation) + DocumentChecklist.svelte (progress bar, expand/collapse, freshness) wired into LenderApplicationCard |
| 3.7 | Document freshness tracking — validity dates, expiry alerts | `done` | Computed fields: `is_expired`, `is_expiring_soon`, `days_until_expiry` |
| | **Integration** | | |
| 3.8 | Rule engine integration — Svelte 5 form data model | `done` | Path A: In-house RE-1 to RE-5 complete. Evaluating page wired to `/api/rule-engine/evaluate` |
| 3.9 | Calculator integration — eligibility, affordability, BT | `done` | RE-2 evaluation engine + RE-5.3 extended eligibility_snapshot with FOIR, LTV, approval probability |
| 3.10 | Offer display integration — lender cards with real data | `done` | RE-5.5: LenderApplicationCard metrics row + LenderComparisonTable eligibility column |
| 3.11 | Payout display integration | `done` | Payout info displays via existing `offer_details` + `payout_info` fields on LenderApplication |
| | **Testing — Phase 3** | | |
| 3.12 | Vitest: PII stripping — exhaustive test for all PII field removal | `done` | 13 tests in `fileConfigurator.test.ts` |
| 3.13 | Vitest: File config — section toggle, display mode, hash validation | `done` | 10 tests in `fileConfigurator.test.ts` |
| 3.14 | Vitest: PDF generation — v1 contains no PII, v2 includes when present | `done` | 36 tests in `pdfGenerator.test.ts` |
| 3.15 | Vitest: Document templates — structural integrity, lender coverage | `done` | 174 tests in `documentTemplates.test.ts` |
| 3.16 | Vitest: Snapshot + case helpers — hash, diff, loan prefix | `done` | 44 tests in `snapshotHelpers.test.ts` + `caseHelpers.test.ts` |
| 3.17 | Playwright: File configurator — toggle sections, switch modes, verify preview | `done` | `dashboard-fileBuilder.spec.ts` — config CRUD, section toggles, display modes |
| 3.18 | Playwright: PDF download — v1 anonymized, v2 with PII confirmation | `done` | `dashboard-fileBuilder.spec.ts` — review/submission PDF + download |
| 3.19 | Playwright: Document upload — pick file, see in checklist, freshness badge | `done` | `dashboard-documents.spec.ts` — template apply, status, freshness, CRUD |

### Phase 4: Communication + CRM + Polish

> **Goal**: Templates, WhatsApp share, reminders, CRM, analytics

| # | Task | Status | Notes |
|---|---|---|---|
| | **Communication** | | |
| 4.1 | Communication templates — 16 templates, variable definitions | `done` | `communicationTemplates.ts` — 6 customer, 5 RM, 5 source/broker templates |
| 4.2 | Template rendering API — server-side variable substitution | `done` | `templateRenderer.ts` + `/api/communication/render` + `/render-for-case` (auto-populates from case) |
| 4.3 | Communication hub UI — recipient tabs, preview, edit, actions | `done` | `/dashboard/dsa/communication` — template browser, compose panel, WhatsApp share, clipboard copy |
| 4.4 | WhatsApp share integration — wa.me URLs, pre-filled messages | `done` | `generateWhatsAppUrl()` in templateRenderer, returned by render APIs |
| | **Automation** | | |
| 4.5 | Smart reminders — stage-based, time-based in-app nudges | `done` | `reminderEngine.ts` — 14 reminder types + `/api/cases/[case_id]/reminders` + `/api/dashboard/reminders` |
| 4.6 | Rejection analysis — structured categories + re-routing suggestions | `done` | `rejectionAnalyzer.ts` — 10 categories with prevention tips + reroute suggestions |
| | **CRM** | | |
| 4.7 | Basic CRM — source tracking, pipeline view, communication log | `done` | `/dashboard/dsa/crm` — kanban pipeline, source breakdown, communication log, metrics |
| | **Analytics** | | |
| 4.8 | DSA performance scorecard — tied to onboarding goals | `done` | `scorecardEngine.ts` — 8 metrics, insights, overall score. `/dashboard/dsa/analytics` |
| 4.9 | Lender policy change alerts + re-evaluation of existing cases | `done` | `policyAlerts.ts` — configurable alerts with affected case detection |
| | **Polish** | | |
| 4.10 | Mobile responsiveness audit (Capacitor) | `done` | 18 files, @media 768px breakpoints, 44px touch targets, scrollable tabs/pipelines |
| 4.11 | Edge cases, error handling, loading states | `done` | 5 client-side fetch ops fixed (clear samples, remove lender, save contact/source/notes) |
| | **Testing — Phase 4** | | |
| 4.12 | Vitest: Template rendering — variable substitution, missing var handling | `done` | 186 tests in `communicationTemplates.test.ts` |
| 4.13 | Vitest: Smart reminders — trigger conditions, time calculations | `done` | 28 tests in `reminderEngine.test.ts` |
| 4.14 | Vitest: Rejection re-routing — suggestion algorithm per reason | `done` | 35 tests in `rejectionAnalyzer.test.ts` |
| 4.15 | Playwright: Communication hub — pick template, preview, share WhatsApp | `done` | `dashboard-communication.spec.ts` — tabs, templates, compose, share |
| 4.16 | Playwright: Reminder display — nudge appears at correct time/stage | `done` | `dashboard-reminders.spec.ts` — API + dashboard display |
| 4.17 | Playwright: CRM — source tagging, pipeline view, communication log | `done` | `dashboard-crm.spec.ts` — metrics, pipeline, source, comm log |
| 4.18 | Playwright: Scorecard — shows progress vs onboarding goals | `done` | `dashboard-analytics.spec.ts` — score ring, metrics, insights, alerts |
| 4.19 | Playwright: Mobile viewport — all critical flows at 375px width | `done` | `dashboard-mobile.spec.ts` — overflow, touch targets, responsive grids |
| | **Navigation & Demo Access** | | |
| 4.20 | Fix sidebar navigation — update from placeholder to real enterprise nav (Cases, CRM, Communication, Analytics, New Case) + sub-page active highlighting | `done` | `+layout.svelte` — `isNavActive()` with exact/startsWith, mobile bottom nav (5 items) |
| 4.21 | Guest demo system — in-memory demo data module (`demoData.ts` + `demoDataLoaders.ts`) | `done` | 4 cases, 22 timeline events, 2 RM contacts + 5 page-specific data loaders |
| 4.22 | Guest demo system — demo JWT + auth hooks (`jwtService.ts` + `hooks.server.ts`) | `done` | `generateDemoAccessToken()` (24h), synthetic user injection, activity tracking skip |
| 4.23 | Guest demo system — demo login endpoint (`/api/auth/demo-login`) | `done` | POST, sets JWT cookies, returns user profile |
| 4.24 | Guest demo system — all 5 `+page.server.ts` + `+layout.server.ts` updated for demo mode | `done` | Early-return guard: `if (user?.id === DEMO_USER_ID) return getDemoXxxData()` |
| 4.25 | Guest demo system — DemoBanner + login page "Explore Demo" button | `done` | Amber sticky banner, `enterDemoMode()`, redirects to `/dashboard/dsa` |
| | **AD-01 Deep Overhaul — DSA-Only Enforcement** | | |
| 4.26 | Fix ADMIN_EMAIL env errors — switch to `$env/dynamic/private` with fallback | `done` | 4 files: emailService, emailSend, inactive-report, delete-account |
| 4.27 | Fix DSA onboarding redirect loop — query DsaApplications directly | `done` | dashboard `+layout.server.ts` + `dsa-onboarding/+page.server.ts` query DsaApplications.onboardingCompleted instead of Applicant |
| 4.28 | Fix login role picker — add onboarding check to `loginWithRole()` | `done` | login `+page.svelte` — redirect to `/dsa-onboarding` if `onboardingCompleted === false` |
| 4.29 | Deep overhaul: Delete orphaned non-DSA API endpoints and components | `done` | Deleted: 3 auth check endpoints (check-rm, check-user, check-property-consultant), 3 onboarding APIs (rm, user, pc), 13 orphaned onboarding UI components |
| 4.30 | Deep overhaul: Restrict all auth endpoints to DSA-only | `done` | `detect-roles` queries only Applicant+DSA, `set-role` allows only `dsa`+`admin`, `verify-otp` routes to `check-dsa` only |
| 4.31 | Deep overhaul: Clean up hooks.server.ts + all server files | `done` | Removed RM/PC imports from hooks, activity tracking, CSRF list, delete-account, account-stats, inactive-report, check-email, send-email-verification |
| 4.32 | Deep overhaul: Fix admin dashboard stale role labels | `done` | `roleLabels` reduced to User + DSA only |
| 4.33 | Resolve 10 pre-existing type errors (ADMIN_EMAIL, caseId/case_id, disabled) | `done` | 0 errors, 220 warnings (a11y only) |

### Phase 5: RM Partner Integration

> **Goal**: Fix auth bug, remove role picker, add RM partner signup + dashboard + DSA-RM communication

| # | Task | Status | Notes |
|---|---|---|---|
| | **Auth Fix** | | |
| 5.1 | Fix JWT mismatch — hooks.server.ts fallback to DSA/RM collections | `done` | Main auth + token refresh flows |
| 5.2 | Remove role picker from login page — direct route by role | `done` | Simplified verifyOTP, no multi-role branching |
| 5.3 | Fix detect-roles — stop returning 'user' as active role | `done` | Only 'dsa', 'rm', 'admin' returned |
| 5.4 | Fix dashboard layout — RM redirect + onboarding check | `done` | RM nav items, onboarding guard |
| | **Partner Signup (RM Entry Point)** | | |
| 5.5 | Partner signup page — phone + OTP flow for RMs | `done` | `/partner-signup` with existence check |
| 5.6 | Create-RM API — bare RM record creation with JWT | `done` | `/api/auth/create-rm` |
| 5.7 | RM onboarding route — renders RMOfficialDetails | `done` | `/rm-onboarding` with server guard |
| 5.8 | Update onboarding layout — RM validation + submit URL | `done` | Dynamic validation dispatch + submit endpoint |
| | **RM Dashboard** | | |
| 5.9 | RM dashboard home — stats, quick actions, welcome | `done` | `/dashboard/rm` |
| 5.10 | Cases Received page | `done` | `/dashboard/rm/cases` (placeholder) |
| 5.11 | DSA Search page + API | `done` | `/dashboard/rm/dsa-search` + `/api/rm/search-dsas` |
| 5.12 | Policies page | `done` | `/dashboard/rm/policies` (placeholder) |
| | **DSA-RM Communication** | | |
| 5.13 | Communication thread type + collection | `done` | `communicationThread.ts` + `communicationThreads` collection |
| 5.14 | Share-with-RM API — creates thread + WhatsApp URL | `done` | `/api/cases/[case_id]/share-with-rm` |

### Phase 6: RM Portal Expansion + Disclaimers + i18n

> **Goal**: Expand RM portal with full feature set (AD-10), add disclaimer system (AD-11), value proposition screens (AD-12), and language selection (AD-13).

| # | Task | Status | Notes |
|---|---|---|---|
| | **RM Value Proposition (AD-12)** | | |
| 6.1 | RM onboarding — 4 value proposition screens (AD-12) | `done` | `ValueScreen1-4.svelte` + `ValueScreenCarousel.svelte`. Swipeable, touch support, progress dots, skip link. All i18n keys in en/hi/mr. 164 tests. |
| | **RM Expansion — Engagement Features** | | |
| 6.2 | Monthly email OTP verification — access-based, 30-day window | `done` | Triggered on dashboard access, not calendar-based. Batch 2. |
| 6.3 | File counters — initial review + final review counts | `done` | Review counter components + API. Batch 2. |
| 6.4 | System assessment viewer — read-only eligibility view for submitted files | `done` | EligibilityCard.svelte + case detail integration. Batch 2. |
| 6.5 | Accuracy rating — star (1-5) + category + free text + per-rating disclaimer | `done` | AccuracyRatingForm.svelte + /api/rm/ratings. Batch 2. |
| 6.6 | Sub-DSA / corporate code communication — structured messaging | `done` | Template-based messaging in Communication page. Batch 3. |
| 6.7 | Communication chatbot with DSAs — template-based channel | `done` | Template replies + chatbot UI. Batch 3. |
| 6.8 | Offers & broadcast — with server-enforced disclaimer footer (AD-11) | `done` | Broadcast page + footer injection. Batch 3. |
| 6.9 | Quick query — one-tap query from file view | `done` | Quick query from case detail. Batch 3. |
| | **RM Expansion — Intelligence Features** | | |
| 6.10 | Policy one-pager uploads — versioned, with DSA notification | `done` | Policy page with version history + upload. Batch 4. |
| 6.11 | Preferred DSA tagging — RM marks quality DSAs | `done` | DSA search + preferred toggle. Batch 4. |
| 6.12 | Auto-match (DSA ↔ RM) — platform-suggested connections | `done` | Auto-match engine with pure function tests. Batch 4. |
| 6.13 | Policy feedback dashboard — aggregated accuracy by policy area | `done` | Policy feedback + analytics page. Batch 4. |
| 6.14 | RM reputation score — computed from response time + DSA feedback | `done` | Reputation scoring with pure function tests. Batch 4. |
| 6.15 | Profile management — company change flow with re-verification | `done` | Settings page with profile management. Batch 1. |
| | **Disclaimer Infrastructure (AD-11)** | | |
| 6.16 | Disclaimer config system — types, schemas, registry, DB collection | `done` | `disclaimer.ts` (types + registry), `disclaimer.schema.ts` (Zod), `disclaimerAcceptances` collection in `mongo.ts`. 53 tests. |
| 6.17 | Server-enforced footer injection for RM broadcasts | `done` | disclaimerFooter pure function + API integration. Batch 5. |
| 6.18 | DSA-side RM content tags — "RM से मिली info" badge | `done` | Content badge components on DSA side. Batch 3. |
| 6.19 | Disclaimer acceptance tracking — per-user, per-version | `done` | Disclaimer tracking in settings page. Batch 1. |
| 6.20 | Multi-language disclaimer content — colloquial, native script per language | `done` | All 7 disclaimers translated in en/hi/mr. Devanagari script, बोलचाल register. |
| | **Language Selection System (AD-13)** | | |
| 6.21 | i18n infrastructure — translation files, `t()` helper, fallback chain | `done` | `src/lib/i18n/index.ts` — `t()`, `tIn()`, `setLanguage()`, `getLanguage()`, `getTranslationCoverage()`. 42 tests. |
| 6.22 | Language selector UI — settings page + onboarding step + login footer | `done` | `LanguageSelector.svelte` component, `PATCH /api/user/language` endpoint, login footer + dashboard sidebar, `initLanguage()`/`persistLanguage()` with localStorage + cookie, server-side `preferred_language` from DB on dashboard load. 8 new tests (50 total i18n tests). |
| 6.23 | English translations — all UI text, disclaimers, value screens | `done` | `en.ts` — ~80 keys. Common UI + all 7 disclaimers + all 4 value screens. |
| 6.24 | Hindi (हिन्दी) translations — all UI text, disclaimers, value screens | `done` | `hi.ts` — 100% coverage. देवनागरी, बोलचाल register. |
| 6.25 | Marathi (मराठी) translations — all UI text, disclaimers, value screens | `done` | `mr.ts` — 100% coverage. देवनागरी, Mumbai/Pune casual register. |
| 6.26 | DSA language selection — same system, applied to DSA dashboard | `done` | Same LanguageSelector component with `saveToServer={true}`, saves to `DsaApplications.preferred_language`. Shared with RM via role-aware API endpoint. |

### Pre-Launch (P0): Infrastructure & Security

> **Goal**: Production readiness — security hardening, deployment automation, and critical gap closure before any public launch.

| # | Task | Status | Priority | Notes |
|---|---|---|---|---|
| P0.1 | Create `.env.example` template | `done` | **CRITICAL** | `.env.example` with 40+ placeholder vars. `.gitignore` already excludes `.env`, includes `!.env.example`. |
| P0.2 | Rotate all exposed credentials | `pending` | **CRITICAL** | `.env` committed 19× to git history. Rotate on MongoDB Atlas, Razorpay, MSG91, ImageKit, SMTP, JWT, HMAC, CSRF dashboards. **Build-time reminder in `vite.config.ts`.** |
| P0.3 | Add rate limit to verify-otp endpoint | `done` | **CRITICAL** | Dual rate limits: per-IP (10/hr prod, 100/hr dev) + per-mobile (5/15min prod, 50/15min dev). Uses shared `rateLimit()`. send-otp + resend-otp also relaxed in dev. |
| P0.4 | CI/CD pipeline (GitHub Actions) | `done` | HIGH | `.github/workflows/ci.yml` — PR/push to main: type check → unit tests → build (with dummy env vars). `.nvmrc` for Node 20. pnpm caching. |
| P0.5 | Email service hardening | `pending` | HIGH | Migrate SMTP to SES/SendGrid/Resend. SPF/DKIM/DMARC for digitaldsa.com. **Build-time reminder in `vite.config.ts`.** |
| P0.6 | Fix refresh-token activeTokenIds[] | `done` | MEDIUM | Array-first device enforcement + legacy fallback (matches hooks.server.ts). Dual `$set`+`$push` with `$slice: -10` DB update. |
| P0.7 | Form persistence — Case + Snapshot on submit | `done` | HIGH | Evaluating page now auto-creates Case + FormSnapshot + LenderResultsSnapshot for new submissions. `offerTransformer.ts` converts `LoanOffer[]` → `LenderResultsData`. Edit mode enhanced to persist results too. Fallback to standalone offers if case creation fails. |

### Phase 7: Core Workflow Completion (P1)

> **Goal**: Bridge the gaps between existing systems — connect standalone offers to case management, build File Builder UI, complete the RM contacts page.

| # | Task | Status | Priority | Notes |
|---|---|---|---|---|
| 7.1 | Bridge offers → case creation | `done` | **CRITICAL** | Resolved by P0.7 (commit `cc400c0f`). Evaluating page auto-creates Case + FormSnapshot + LenderResultsSnapshot for new submissions. No "Save as Case" button needed — case is created automatically. |
| 7.2 | File Builder UI page | `done` | HIGH | `/dashboard/dsa/cases/{id}/file-builder` — lender tab bar, section toggles + reorder, display modes, DSA notes, PII mode selector, PDF generation + auto-download, snapshot history. Tab enabled in case layout. |
| 7.3 | RM Contacts management page | `done` | MEDIUM | CRUD UI at `/dashboard/dsa/rm-contacts` — full list/search/filter/create/confirm/edit/deactivate page |
| 7.4 | Full timeline view | `done` | MEDIUM | Paginated per-case timeline at `/dashboard/dsa/cases/{id}/timeline` with event type + date range filtering |
| 7.5 | Auto-match in RM UI | `done` | LOW | "Suggested DSAs" card on RM dashboard sidebar — auto-match by city (+40) and bank (+40), top 3 shown |

### Phase: Admin Dashboard (admin.digitaldsa.com)

> **Goal**: Full admin panel for platform management — user management, rule authoring pipeline, AI-powered policy parsing, fixture testing.
> **Branch lineage**: `main` -> `rule-engine` -> `admin-dashboard` -> merged into `store-redesign` via `58bc22f7`

| # | Task | Status | Notes |
|---|---|---|---|
| | **Phase 1: Admin Auth Foundation** | | |
| AD-1.1 | AdminUser type + AdminUsers collection + indexes | `done` | `adminUser.ts`, `mongo.ts` updated |
| AD-1.2 | detect-roles queries AdminUsers (4th parallel collection) | `done` | Returns `isAdmin` + `activeRoles` |
| AD-1.3 | check-dsa handles admin JWT + preferredRole parameter | `done` | Backward compatible — existing callers unaffected |
| AD-1.4 | hooks.server.ts admin token refresh (4th fallback) | `done` | AdminUsers lookup + token persistence + user resolution |
| AD-1.5 | Seed script (`seedAdmin.ts`) | `done` | CLI: `ADMIN_NAME=x ADMIN_MOBILE=y pnpm run seed:admin` |
| AD-1.6 | Login role selection modal (multi-role users) | `done` | Commit `9518a55f` — modal when admin+DSA on same phone |
| | **Phase 2: Layout & Navigation** | | |
| AD-2.1 | Admin layout guard (`requireRole + hostname check`) | `done` | `admin.digitaldsa.com` in prod, skipped in dev |
| AD-2.2 | Admin nav items (Dashboard/Users/Policies/Settings) | `done` | In main `+layout.svelte` |
| AD-2.3 | Overview dashboard (stats + pipeline status) | `done` | Fetches from `/api/admin/account-stats` |
| | **Phase 3: User Management** | | |
| AD-3.1 | Users page — DSA/RM tabs, search, pagination, suspend | `done` | `/dashboard/admin/users` |
| AD-3.2 | User detail view — profile card, case history | `done` | `/dashboard/admin/users/[user_id]` |
| AD-3.3 | DSA/RM user management APIs (GET + PATCH) | `done` | `/api/admin/users/dsa` + `/api/admin/users/rm` |
| | **Phase 4: Rule Authoring Pipeline** | | |
| AD-4.1 | AI Service module (OpenAI + Anthropic + Google Gemini) | `done` | `aiService.ts` — 5 functions, 3 providers |
| AD-4.2 | RuleArtifactPair type + LenderRuleArtifacts collection | `done` | 7-status pipeline, DiffReport, ParseIteration |
| AD-4.3 | Policy listing page (by-lender grid + all-artifacts) | `done` | `/dashboard/admin/policies` |
| AD-4.4 | Upload page + API (ImageKit, auto-versioning) | `done` | `/dashboard/admin/policies/upload` + `/api/admin/policies/upload` |
| AD-4.5 | Artifact pipeline view (6-stage, actions, iterations) | `done` | `/dashboard/admin/policies/[artifact_id]` |
| AD-4.6 | Parse API (AI pipeline + auto-correct loop, max 4 iter) | `done` | `/api/admin/policies/[artifact_id]/parse` |
| AD-4.7 | Review API (approve/send_to_rm/request_correction) | `done` | `/api/admin/policies/[artifact_id]/review` |
| AD-4.8 | Publish API (activate + supersede previous) | `done` | `/api/admin/policies/[artifact_id]/publish` |
| AD-4.9 | Reparse API (re-run with corrections) | `done` | `/api/admin/policies/[artifact_id]/reparse` |
| AD-4.10 | Fixture test page (client-side json-logic-js eval) | `done` | `/dashboard/admin/policies/[artifact_id]/test` |
| | **Phase 5: Settings** | | |
| AD-5.1 | Admin settings page (profile, permissions, system info) | `done` | `/dashboard/admin/settings` (read-only) |
| | **Remaining (Non-Blocking)** | | |
| AD-6.1 | Seed fixture profiles into LenderRuleFixtures | `done` | `seedFixtureProfiles()` dynamically imports 15 fixtures, upserts with FIX-01..FIX-15 IDs |
| AD-6.2 | Admin account management UI (create/edit admins) | `done` | `/dashboard/admin/users/admins` — super admin only, permission toggles, promote/demote OTP flow |
| AD-6.3 | RM review communication (CommunicationThreads wiring) | `done` | Interactive per-field validation form with ✓/✗ toggles + correction notes. Field validations stored in provenance (approve) / ReviewComment (corrections). |

### Phase: Rule Engine — In-House Build (Path A)

> **Goal**: Build the complete rule evaluation engine using existing spec + test infrastructure. Replaces the "external repo integration" approach (old tasks 3.8-3.11).
> **Spec**: `docs/RULE-ENGINE-SPECIFICATION.md` (schema, evaluation logic, payload keys, output contract, deviations, policy display)
> **Test infra**: 3 test files (~4,000 lines) — `ruleValidator.test.ts` (1,720 lines), `outputContract.test.ts` (909 lines), `fixtureProfiles.test.ts` (1,411 lines, 15 fixtures)
> **Payload builder**: `src/lib/utils/payloadBuilder.ts` (1,698 lines) — transforms form data to `LoanApplicationPayload`
> **Admin pipeline**: Upload → AI parse → review → publish (already built in Admin Dashboard phase)
> **Browser test cases**: 15 manual QA tests (RE-001 to RE-015) covering all loan types, boundary values, sorting, determinism

| # | Task | Status | Priority | Notes |
|---|---|---|---|---|
| | **RE-1: Rule Validator** | | | |
| RE-1.1 | Create `src/lib/ruleEngine/ruleValidator.ts` | `done` | **CRITICAL** | `extractVarPaths()`, `validateVarPath()`, `validateRule()`, `validateDeviation()`, `validatePolicyKey()`, `validateLenderRuleDocument()` |
| RE-1.2 | Pass all 134 ruleValidator tests | `done` | **CRITICAL** | All 134 tests pass. Full suite: 2,903 tests across 43 files, 0 failures. |
| | **RE-2: Evaluation Engine** | | | |
| RE-2.1 | Create `src/lib/ruleEngine/evaluationEngine.ts` | `done` | **CRITICAL** | Core orchestrator: loadActiveRuleDocuments, evaluateLender, buildResults, evaluatePayload |
| RE-2.2 | Traffic light calculation (GREEN/AMBER/RED/GREY) | `done` | **CRITICAL** | GREEN = all gates pass + full amount, AMBER = deviation covers failure or reduced amount, RED = uncovered failure, GREY = can't evaluate |
| RE-2.3 | Deviation logic | `done` | HIGH | checkDeviations() — evaluates json-logic conditions, applies probability modifiers, tracks approval authority |
| RE-2.4 | Income assessment (haircuts, multi-source, multi-applicant) | `done` | HIGH | `incomeAssessor.ts` — 5 functions, 383 lines. Per-lender haircuts, guarantor skip, FOIR cap |
| RE-2.5 | FOIR / LTV / eligible amount computation | `done` | HIGH | `emiCalculator.ts` — EMI formula, FOIR-eligible reverse calc, LTV cap, offered amount, effective tenure |
| RE-2.6 | Result builder (factors, suggestions, ratings, probability) | `done` | HIGH | `resultBuilder.ts` — 580 lines. Percentile ratings, approval probability, traffic light messages |
| RE-2.7 | Output matching `LenderResultsData` schema | `done` | **CRITICAL** | Produces exact `LenderResultsData` shape from `src/lib/types/lenderResults.ts` |
| RE-2.8 | 421 evaluation engine tests pass | `done` | **CRITICAL** | `evaluationEngine.test.ts` — 14 test groups, 421 tests covering all pipeline stages |
| | **RE-3: API Endpoint** | | | |
| RE-3.1 | Create `POST /api/rule-engine/evaluate` | `done` | **CRITICAL** | Accept `LoanApplicationPayload`, call evaluator, return `LenderResultsData` |
| RE-3.2 | Auth guard + rate limiting | `done` | HIGH | DSA/admin access (requireRoleApi), 20 evals/min per user (skipped in dev) |
| | **RE-4: Fixture Seeding + Integration Testing** | | | |
| RE-4.1 | Seed 15 fixture profiles into `lenderRuleFixtures` | `done` | HIGH | From `fixtureProfiles.test.ts` exports |
| RE-4.2 | Create 3 sample lender rule documents (PVT/GOV/NBFC) | `done` | HIGH | `sampleRuleDocs.ts` — 3 realistic ParsedLenderRuleDocument objects |
| RE-4.3 | Admin test page with real evaluation engine | `done` | HIGH | Server-side `evaluateLender()` + `buildResults()` via form actions |
| RE-4.4 | Integration tests — 15 fixtures x 3 lenders | `done` | MEDIUM | 626 tests in `integrationTests.test.ts` |
| | **RE-5: DSA Integration (completes 3.8-3.11)** | | | |
| RE-5.1 | Wire evaluating page to call `/api/rule-engine/evaluate` | `done` | **CRITICAL** | Rule engine first, external API fallback. `normalizeForRuleEngine()` handles PascalCase→camelCase |
| RE-5.2 | Eligibility snapshot sync to LenderApplications | `done` | HIGH | `POST /api/cases/[case_id]/eligibility-sync` — maps LenderResult to eligibility_snapshot with extended metrics |
| RE-5.3 | Extended eligibility_snapshot type with calculator outputs | `done` | HIGH | Added offered_amount, roi, emi, approval_probability, foir, ltv |
| RE-5.4 | Employment-type document checklist auto-derive | `done` | MEDIUM | `EMPLOYMENT_DOCUMENT_TEMPLATES` + `COMMON_DOCUMENT_TEMPLATES` — auto-applied for green/amber lenders |
| RE-5.5 | Calculator metrics on LenderApplicationCard + ComparisonTable | `done` | MEDIUM | Metrics row on card, eligibility column in comparison table |

### Phase 8: Polish & Growth (P2)

> **Goal**: SEO, notifications, mobile app, subscription management — preparing for user growth.

| # | Task | Status | Priority | Notes |
|---|---|---|---|---|
| 8.1 | sitemap.xml + JSON-LD structured data | `done` | MEDIUM | `/sitemap.xml` dynamic endpoint (9 routes), `JsonLd.svelte` component, `Seo.svelte` enhanced with OG + Twitter meta |
| 8.2 | About/Contact pages | `done` | LOW | `/about` (mission, values) and `/contact` (info cards + form → `contactSubmissions` collection) |
| 8.3 | Push notifications | `pending` | HIGH | Browser Web Push + email digests for queries, stage changes, expiring docs, RM broadcasts |
| 8.4 | Capacitor APK build | `pending` | MEDIUM | Config ready; Android Studio build, keystore, Play Store listing |
| 8.5 | Subscription/Payment UI | `pending` | HIGH | Razorpay wired; need plan selection, billing history, upgrade/downgrade, trial management |
| 8.6 | Newsletter backend wiring | `done` | LOW | `POST /api/newsletter/subscribe` with duplicate check, `NewsletterSubscriptions` collection, Footer form wired |

### Phase 9: Competitive Advantage (P3)

> **Goal**: Features that differentiate DigitalDSA from competitors — explicitly deferred until user base is established.

| Feature | Reason for Deferring | Priority |
|---|---|---|
| Offline capability (Service Worker) | Post-MVP; critical for tier-2/3 India cities with unreliable connectivity | HIGH |
| WhatsApp Business API | Cost + complexity; currently using manual share links | MEDIUM |
| AI document parsing (OCR + LLM) | Auto-extract from payslips/ITR/bank statements to pre-fill forms | MEDIUM |
| Blog/Resources section | Content marketing for DSA education + SEO traffic | MEDIUM |
| Commission tracker | DSA payout per lender per case; revenue module — separate scope | MEDIUM |
| ~~Sub-DSA / team management~~ | ~~Corporate DSAs managing junior agents~~ — **DONE** (Phases T1-T6) | ~~LOW~~ |
| Builder/project approval database | Crowd-sourced; needs critical mass of DSA data | LOW |
| Analytics dashboard (aggregate) | Needs significant data volume first | LOW |
| ~~Integration layer (rule engine + calculators)~~ | ~~Tasks 3.8-3.11; separate repos need migration~~ | **ACTIVE — Path A in-house build. See Rule Engine Phase.** |

---

## 6. Architecture Gaps

> Identified during full platform audit (2026-02-16). See `docs/PLATFORM-AUDIT-2026-02-16.md` for details.

### Gap 1: Offers ↔ Case Disconnect — RESOLVED

~~Two completely separate result viewing paths exist that are NOT connected.~~

**Fixed** in commit `cc400c0f` (P0.7): The evaluating page now auto-creates Case + FormSnapshot + LenderResultsSnapshot for ALL new submissions, then navigates to `/dashboard/dsa/cases/{id}/results`. Both new submissions and edit-mode re-evaluations now go through the case system. Standalone offer pages (`/home-loan-offers`, etc.) kept as fallback only if case creation fails.

### Gap 2: `/api/form/submit` Doesn't Persist — RESOLVED (via P0.7)

~~Form data is stored only in browser sessionStorage.~~

**Fixed** in commit `cc400c0f` (P0.7): Persistence now happens via the evaluating page (Case → FormSnapshot → LenderResultsSnapshot) rather than through `/api/form/submit`. The submit endpoint remains available for future server-side validation use. All 6 form pages now always send `formStateSnapshot: formState.toJSON()` so the evaluating page has the data to create a FormSnapshot.

### Gap 3: File Builder UI Route Missing — RESOLVED

`/dashboard/dsa/cases/{id}/file-builder` is now built. Full UI page with lender tab bar, section visibility toggles + reorder, display mode controls, DSA notes, PII mode selector (Review/Submission), PDF generation with auto-download, and snapshot history. Tab enabled in case layout. All existing CTAs (LenderResultCard "Prepare File", results sticky bar "Proceed", LenderApplicationCard "File Builder") now land on a working page.

**Fixed** in Phase 7.2.

### Gap 4: Refresh Token Array Consistency — RESOLVED

~~`/api/auth/refresh-token` may check old `activeTokenId` field instead of `activeTokenIds[]` array.~~

**Fixed** in commit `e62e6eb2` (P0.6): refresh-token now uses array-first device enforcement with legacy fallback (matching hooks.server.ts), and dual `$set`+`$push` DB updates with `$slice: -10`.

---

## 6.5 Reference Documents

> **Doc cleanup performed 2026-02-17.** 14 redundant/superseded MD files deleted, key info consolidated here. Only 4 docs remain in `docs/`:

| File | Purpose | When to Read |
|------|---------|-------------|
| `DEVELOPMENT-PLAN.md` | **This file** — single source of truth | Always |
| `RULE-ENGINE-SPECIFICATION.md` | Rule engine architecture: schema, evaluation logic, payload key registry, output contract, deviations, policy display (25 keys), authoring pipeline | When implementing Rule Engine phases (RE-1 to RE-5) |
| `PAYLOAD_DOCUMENTATION.md` | Field-by-field documentation of `LoanApplicationPayload` — what gets sent to evaluation API | When working on form → API → rule engine data flow |
| `LOAN-ASSESSMENT-API-INTEGRATION.md` | External Loan Assessment API contract: endpoints, request/response format, type definitions, `LenderResultsData` output schema | When implementing RE-2.7 (output contract) and RE-5 (DSA integration) |

**Deleted files (consolidated here):**
- `ADMIN-DASHBOARD-HANDOFF.md` — Admin Dashboard phase above
- `TESTING_AUTOMATION_MASTER_PLAN.md` — Testing infrastructure proposal (5 phases: Foundation, UI Automation, Mass Profiles, Hybrid Sampling, CI/CD). Not started. Future work.
- `TESTING_AUTOMATION_CHECKLIST.md` — Redundant with master plan
- `TESTING_DATA_SPECIFICATION.md` — Form field inventory with validation rules, boundary values, cross-field dependencies. Useful reference but regenerable from codebase.
- `TEST_PROFILES.md` — 100+ applicant test profiles (High/Medium/Low acceptance tiers). 500 synthetic profiles now in MongoDB via `syntheticDataSeeder.ts`.
- `SCHEMA_RECOMMENDATIONS.md` — Technical debt items: age field consolidation, credit score consolidation, business activity consolidation. Address during rule engine integration.
- `PLATFORM-AUDIT-2026-02-16.md` — Comprehensive audit snapshot. Key gaps (sitemap, About/Contact pages, Help Center, Blog) tracked in Phase 8.
- `STORE-REDESIGN.md` + `STORE-REDESIGN-LOG.md` — Store redesign analysis + work log. Work complete (8 phases).
- `SVELTE5_STATE_MIGRATION.md` — Migration from Svelte 4 stores to Svelte 5 runes. Migration complete.
- `RULE-ENGINE-BROWSER-TESTS.md` — 15 manual QA test cases (RE-001 to RE-015). Referenced in Rule Engine Phase RE-4.4.
- `WEBSITE_REVAMP_SPEC.md` + `WEBSITE_REVAMP_SPEC_updated.md` — Landing page specs. Landing page complete.
- `IMPLEMENTATION_GUIDE.md` — Landing page Claude prompts. Superseded.
- `TESTING_GUIDE_FOR_BEGINNERS.md` — Educational guide. Future use when testing infra implemented.
- `TEST_DATA_MANAGEMENT_SYSTEM.md` — Proposed system. Future use.

---

## 7. Route Structure

### New Routes to Create

```
src/routes/
  dashboard/
    dsa/
      +page.svelte              — DSA dashboard (overhaul with real data)
      +page.server.ts           — Load cases, stats, pipeline data

      profile/
        +page.svelte            — Business Profile (OnboardingV2Wizard)
        +page.server.ts         — Load v2 data, pain points, modules

      cases/
        +page.svelte            — Case list with filters
        +page.server.ts         — Load cases, search, pagination
        [case_id]/
          +layout.svelte        — Case detail shell (tabs/sub-nav)
          +layout.server.ts     — Load case, verify DSA ownership
          +page.svelte          — Case overview (default tab)
          +page.server.ts       — Load case + eligibility + reminders
          file-builder/
            +page.svelte        — Lender selection + file overview
            +page.server.ts     — Load lender applications
            [lender_app_id]/
              +page.svelte      — File configurator for specific lender
              +page.server.ts   — Load checklist, config, handle uploads
          queries/
            +page.svelte        — Query management for this case
            +page.server.ts     — Load queries across all lender apps
          communicate/
            +page.svelte        — Communication hub
            +page.server.ts     — Load templates, render
          timeline/
            +page.svelte        — Activity timeline
            +page.server.ts     — Load events

      rm-contacts/
        +page.svelte            — RM contact database
        +page.server.ts         — Load RM contacts, suggestions

      settings/
        +page.svelte            — DSA profile / onboarding v2 settings
        +page.server.ts         — Load/save DSA profile

    rm/
      +page.svelte              — RM dashboard home
      +page.server.ts           — Load RM stats
      cases/
        +page.svelte            — Cases received from DSAs
        +page.server.ts         — Load shared cases
      dsa-search/
        +page.svelte            — Search DSAs by city
      policies/
        +page.svelte            — Lending policies (placeholder)
        +page.server.ts         — Load policies

  (auth)/
    partner-signup/
      +page.svelte              — RM partner signup (phone + OTP)

  (onboarding)/
    rm-onboarding/
      +page.svelte              — RM onboarding (RMOfficialDetails)
      +page.server.ts           — Guard: redirect if completed

  api/
    auth/
      create-rm/
        +server.ts              — Create bare RM record (partner signup)
    rm/
      search-dsas/
        +server.ts              — Search DSAs by city/area
    cases/
      +server.ts                          — Create/list cases
      [case_id]/
        +server.ts                        — Get/update/archive case
        stage/+server.ts                  — Update stage
        lender-applications/
          +server.ts                      — Add/list lender applications
          [lender_app_id]/
            +server.ts                    — Update lender application
            checklist/+server.ts          — Update document checklist
            queries/+server.ts            — CRUD queries
            file-config/+server.ts        — Save file configuration
            review-pdf/+server.ts         — Generate v1 PDF
            submission-pdf/+server.ts     — Generate v2 PDF
        timeline/+server.ts              — Get timeline events
        render-template/+server.ts       — Render communication template

    rm-contacts/
      +server.ts                          — CRUD + search + suggestions

    auth/
      demo-login/
        +server.ts                        — Guest demo login (no auth, sets JWT cookies)

    dsa/
      onboarding-v2/+server.ts           — Save enhanced onboarding data
      profile/+server.ts                  — Get/update DSA profile
      stats/+server.ts                    — Performance scorecard data
```

### Routes Still Needed (from Audit)

| Route | Status | Phase |
|---|---|---|
| `/dashboard/dsa/cases/[case_id]/file-builder` | **DONE** | Phase 7.2 |
| `/dashboard/dsa/cases/[case_id]/timeline` | **DONE** | Phase 7.4 |
| `/dashboard/dsa/rm-contacts` | **DONE** | Phase 7.3 |
| `/about` | **DONE** | Phase 8.2 |
| `/contact` | **DONE** | Phase 8.2 |

---

## 8. Integration Points

### 8.1 Rule Engine → Cases

```
Form Submission → API processes against lender JSON-Logic in DB
                → Results page with lender cards
                → DSA clicks "Build File" on a lender card
                → System creates Case (if not exists) + LenderApplication
                → Eligibility snapshot captured from rule engine result
                → Document checklist generated from lender requirements
```

**Integration needed**: The "Build File" action on the results page needs to:
1. Create a FormSnapshot (immutable copy of the submitted data)
2. Create or update the Case
3. Create a LenderApplication with the rule engine result
4. Generate the document checklist

### 8.2 Calculators → File Configurator

The eligibility/affordability/BT calculators provide data that appears in:
- Case detail overview (traffic light)
- Lender application card (offer details)
- Review PDF (preliminary assessment section)
- File Configurator (eligibility snapshot)

**Integration needed**: Calculator outputs need to be stored in `eligibility_snapshot` and `offer_details` on each LenderApplication.

### 8.3 RM Database ← DSA Onboarding

During onboarding Section A, DSA provides empanelled lenders + RM details. This data feeds into:
- `rm_contacts` centralized collection (RM details)
- DSA profile `empanelled_lenders` (which lenders this DSA works with)

**Integration needed**: Onboarding v2 API must upsert into both collections.

---

## 9. Changelog

> Auto-updated with each development commit. Most recent first.

### [Unreleased]

| Date | Commit | What Changed | Phase | Tasks Affected |
|---|---|---|---|---|
| 2026-02-21 | — | **P1 Product Features complete (4/4).** P1.1: Created `DraftExportButton.svelte` — floating download button (bottom-right, above ResetDataButton) that exports `formState.toJSON()` as timestamped JSON file (`DigitalDSA-{LoanType}-Draft-{date}.json`). Only visible on actual form pages. Added to form layout. P1.2: Added "Load Previous Case" button + selection modal to how-can-we-help page. Fetches last 10 cases from `GET /api/cases`, shows case label/type/stage/date. On select: fetches latest snapshot, calls `formState.fromJSON()` to restore, navigates to loan form. Loading/error states, Loader2 icon added to registry. P1.3: 30-second OTP resend countdown timer on shared link page (`/f/[token]`). Client-side cooldown enforcement before server rate limit. Button shows `Resend OTP (Xs)` during cooldown, disabled until complete. P1.4: Session timeout monitoring on shared link page. Checks every 10s against `expiresAt`. Warning modal at 5 minutes and 1 minute before expiry (each shown once, dismissible). Force-reloads on expiry. `role="dialog" aria-modal="true"`. **1 new file, 4 modified. 0 TS errors. 4,451 tests.** | Improvement Plan | P1.1–P1.4 |
| 2026-02-21 | — | **E3 i18n Expansion complete (4/4).** E3.1: Comprehensive audit of ~350-450 hardcoded UI strings across 20+ file categories (dashboard, cases, auth, errors, forms, time, stages, loans, documents, eligibility, credit status, badges, rating, pagination, communication, sample data). E3.2: Expanded `en.ts` from 157 → 315+ keys across 16 new namespaces: `auth.*` (10), `error.*` (14), `dashboard.*` (50+), `cases.*` (20), `stage.*` (11), `loan.*` (9), `eligibility.*` (4), `factor.*` (6), `badge.*` (5), `effort.*` (3), `doc.*` (12), `credit.*` (11), `time.*` (7), `pagination.*` (3), `form.*` (11), `rating.*` (6), `comm.*` (2), `status.*` (7), `sample.*` (5). E3.3: Full Hindi and Marathi translations — 315+ keys each, Hinglish/Marathi casual register, 100% en.ts baseline coverage. Technical terms (DSA, RM, lender, OTP, CIBIL, pipeline, etc.) retained in English script per AD-13. E3.4: Added `tPlural()` (singular/plural key selection by count), `formatNumber()` (Indian locale grouping with Arabic numerals for all languages), `formatCurrency()` (INR with compact mode: ₹12.3L, ₹1.5Cr, ₹5K), `formatTimeAgo()` (relative time using i18n time.* keys). Locale map forces `latn` numbering for hi/mr (fintech industry standard). **3 files modified. 0 TS errors. 4,451 tests.** | Improvement Plan | E3.1–E3.4 |
| 2026-02-20 | — | **U3 Accessibility Pass complete (5/5).** U3.1: `focusTrap.ts` Svelte action — Tab/Shift+Tab cycling for div overlays, focus restore for all modals. Applied to MonthYearModal, CommandPalette (use:focusTrap) and 5 dialog-based modals (previouslyFocused save/restore in $effect). U3.2: Skip-to-main-content link in root layout — hidden, visible on `:focus`, targets `#main-content`. U3.3: ARIA labels on 10+ color-only indicators — traffic light dots `aria-hidden` (text present), severity dots `role="img" aria-label`, policy status dots `aria-label`, parsing dots `aria-hidden`. U3.4: Global `:focus-visible` outline ring (2px accent, 2px offset) in app.css; FormNavigationBar focus-visible styles. U3.5: `aria-live="polite"` on ToastContainer, SaveIndicator, FormTopProgress step text + `role="progressbar"`. **1 new file, 14 files modified. 4,451 tests, 0 errors, 0 warnings.** | Improvement Plan | U3.1–U3.5 |
| 2026-02-20 | — | **U2 Dashboard UX complete (4/4).** U2.1: Replaced all 5 native `confirm()` calls across dashboard with `openConfirmModal()` — contextual titles, descriptive messages, labeled confirm buttons (Deactivate/Delete/Remove/Revoke). Added `<ConfirmModal />` to dashboard root layout. U2.2: Migrated 4 additional pages (8 empty states) to unified `EmptyState` component — shared-links, rm-contacts, case detail (lenders + timeline), analytics. Uses default/filtered/compact variants with action snippets. U2.3: Created `Breadcrumbs.svelte` component with accessible `<nav aria-label>`, chevron separators, current-page indication. Replaced "Back to Cases" link in case detail layout with dynamic breadcrumbs: Cases > Case Label > [Tab]. U2.4: Created `CommandPalette.svelte` with Cmd+K / Ctrl+K shortcut. Role-aware page registry (DSA 12, Admin 8, RM 9), fuzzy search, grouped results (Pages/Actions), keyboard navigation (arrows + Enter), Esc to close. **2 new components, 10 pages modified. 4,451 tests, 0 errors, 0 warnings.** | Improvement Plan | U2.1, U2.2, U2.3, U2.4 |
| 2026-02-20 | — | **E2 Component Library complete (4/5, E2.1 deferred).** E2.3: `EmptyState.svelte` with 3 variants (default/filtered/compact), icon prop (any lucide component), title, description, action snippet slot. Migrated 4 dashboard pages: DSA cases (2 states with CTA buttons), CRM leads/lenders/sources (compact). E2.4: `Pagination.svelte` with Previous/Next, page counter, total count (hidden on mobile). Migrated admin audit page (35 lines → 5 lines). E2.5: `Skeleton.svelte` with 4 variants (text/card/row/field), CSS shimmer animation, multi-line support, custom dimensions, ARIA hidden. **3 new components, 5 pages migrated. 4,451 tests, 0 errors, 0 warnings.** | Improvement Plan | E2.3, E2.4, E2.5 |
| 2026-02-20 | — | **U1 Form UX Quick Wins complete (5/5).** U1.1: `SaveIndicator.svelte` — "Saving..." pulse during evaluation, "Saved" checkmark on completion (2s fade), placed next to page title across all 6 loan pages. U1.2: `FormNavigationBar` now accepts `errorSummary` prop — when Next is muted, shows "Missing: [field1], [field2]..." hint (max 3 items) from `serverPage.validationErrors`. All 6 pages derive errorSummary. U1.4: `incomeEstimate.ts` maps all 12 income profile types to monthly equivalent (salary, profit frequency, annual/12, P&L averages). `IncomeTotalBar.svelte` shows "Est. Monthly Income: ₹X,XX,XXX" (Indian formatting) below income entries. Added to `IncomeTabContent` (modal) + all 6 form pages (inline). **4 new files, 1 modified component, 6 form pages updated. 4,451 tests, 0 errors, 0 warnings.** | Improvement Plan | U1.1, U1.2, U1.4 |
| 2026-02-20 | — | **E2.2 + U1.3 + U1.5: Modal keyboard, loading state, required indicators.** E2.2: Converted ConfirmModal + AgreeModal from `<div>` overlays to native `<dialog>` elements — ESC key works natively, `role="alertdialog"`, `aria-labelledby`/`aria-describedby`, zoom-in animation. WideModal added `onclose` handler + `aria-modal`. E2.3: FormStepContainer now accepts `evaluating` prop — content fades to 60% opacity + pointer-events disabled during server evaluation, sliding gradient bar at viewport top with `aria-live="polite"`. All 6 loan pages wired up. U1.5: Added `required={question.required ?? false}` to all 7 RadioField usages across form pages. All form field types now consistently show red asterisk on required fields. **3 modal files + FormStepContainer + 7 form pages modified. 4,451 tests, 0 errors, 0 warnings.** | Improvement Plan | E2.2, U1.3, U1.5 |
| 2026-02-20 | — | **E1.3 + E1.4: Component splits.** E1.3: Extracted `ObligationTable.svelte` (101 lines) from `UnsecuredObligation.svelte` (1,147 → 1,036 lines). Deduplicated near-identical term loan/credit line table markup into single parametric component with `type` prop. Moved `shortRole()`/`shortEmiMethod()` helpers. E1.4: Extracted `IncomeTabContent.svelte` (207 lines) from `IncomePageNew.svelte` (1,172 → 1,045 lines). Deduplicated 4-tab content rendered identically in both single-applicant inline view and multi-applicant modal. Uses `$bindable` for `applicantData` to maintain UnsecuredObligation's `bind:currentAnswers` chain. Moved restore-prompt styles. Removed 7 unused imports from parent. **2 new files, 2 modified. 4,451 tests, 0 errors, 0 warnings.** | Improvement Plan | E1.3, E1.4 |
| 2026-02-20 | — | **E1.2: Split payloadBuilder.ts into 8 domain modules.** 1,697-line monolith → `payloadBuilder/` directory with: `types.ts` (310 lines, all interfaces), `sanitizers.ts` (45 lines, toNumber/toBoolean/deriveTitle), `activityProfiles.ts` (130 lines, 7 profile builders), `incomePayload.ts` (60 lines), `obligationPayload.ts` (60 lines), `applicantPayload.ts` (220 lines, main applicant builder), `loanTransaction.ts` (230 lines, loan + orchestrators), `comparePayloads.ts` (55 lines), `index.ts` (55 lines barrel). Original file becomes 80-line re-export barrel — **zero consumer import changes needed** across 30+ consumer files. **10 new files, 1 replaced. 4,451 tests, 0 errors, 0 warnings.** | Improvement Plan | E1.2 |
| 2026-02-20 | — | **P0 Critical Fixes (3/3).** (1) Login "Contact Support" button now routes to `/contact` instead of `#`. (2) Privacy Policy Section 12 expanded with NRI exception (12.1) and temporary travel exception (12.2) sub-sections to match login page's NRI gate. (3) Contact form rate-limited to 1 submission per IP per 5 minutes via existing `rateLimit()`. **3 files changed. 4,451 tests, 0 errors, 0 warnings.** | Improvement Plan | P0.1, P0.2, P0.3 |
| 2026-02-20 | addc4ac8 | **Fix(company): continuous sync of ALL 19 fields to formState — closes payload gap in unsecured loans.** Root cause: `onMount` in `Company.svelte` does `answers = securedClone(applicant)`, which disconnects the `bind:answers` prop binding. After that, `answers` is a local-only copy. The previous code had two separate `$effect` blocks that only synced 8 of the ~19 fields needed by `payloadBuilder.ts`; the remaining fields (`companyType`, `businessType`, `GSTRegistrationYear`, `directors[]`, `numberOfDirectors`, `businessActivityDetailsVisible`, `financialsTableVisible`, `whyPrimaryLowCreditVisible`) were only written to formState when `submitForm()` was called. `submitForm()` has a trigger button **only for secured loans** (`isSecured` flag). For Personal Loan and Business Loan with a Company applicant, `payloadBuilder.ts` received `undefined` for all those fields because it reads from `formState.applicants[]` (not the local `answers`). Fix: replaced both partial sync blocks with one unified `$effect` that continuously syncs all 19 fields. Each field is a `$derived` so the effect re-runs on any change. The store is read via `untrack()` to avoid reactive dependency loops. `JSON.stringify` equality check prevents spurious writes for object/array values. Also fixed: `*Visible` keys (`businessActivityDetailsVisible`, `financialsTableVisible`, `whyPrimaryLowCreditVisible`) were **never synced at all** in the old code — these are exactly what `payloadBuilder.ts` reads to build `businessProfile`, `financials`, and `lowCreditReasons`. **1 file changed, +80/-33. 0 errors, 5 a11y warnings (pre-existing). 4,451 tests.** | Forms | Company payload bug — unsecured loans |
| 2026-02-20 | 9b7d5721 | **Feat: Company applicant — 3-tab ModalTabs stepper replaces accordion.** Brings Company applicant UX in line with Individual's horizontal step-progress stepper. Three logical blocks: **(1) Business Profile** — company type, activity (multi-select), GST registration (month-year), company age; plus NEW director count input captured here early (1–15, validates immediately) so Tab 3 can size director rows. Director count field styled with dashed accent border + forward hint. **(2) Financials & Credit** — financials table, average bank balance, daily cash sales, credit score, low-credit reasons, ObligationsRunning toggle (gates Tab 3 visibility). **(3) Loans & Directors** (conditional — shown only when ObligationsRunning is set AND company is not OPC) — "Running Loans & Credit Limits" sub-block using ExistingLoanDetails; "Directors" sub-block replacing the raw HTML `<table>` with a responsive card-grid: each director gets a card row with Full Name / Annual Income (₹) / CIBIL Score inputs; 3-column responsive grid (≥480px), stacked on mobile; per-field inline validation; focus-ring on active card. Tab completion logic: Tab 1 requires all business questions + director count (unless OPC); Tab 2 requires all financials questions + ObligationsRunning set; Tab 3 requires loans filled (if hasObligations) + all directors valid (if not OPC). Auto-advance fires on completion. Prev/Next navigation row matches Individual's. Drops `Directors.svelte` component dependency from `Company.svelte` — director count + full details now live inline in the component. **1 file changed, +831/-441. 0 errors, 5 a11y warnings (label-for — pre-existing pattern). 4,451 tests.** | Forms | Company applicant UX |
| 2026-02-20 | f0cdc4af | **Refactor: DatePickerYearAndMonth + MonthYearModal — atomic open, direct rune state, flawless browser + mobile + nested-modal UX.** Root causes addressed: (1) Stale-year-on-reopen — reopening a different picker showed the previous picker's year because `currentYear` was synced from the global `selectedDate` store, not from the opener's value. (2) Race window — opening a picker made 4 sequential store writes (`modalContext`, `selectedDate`, `isDateAreaOpenContext`, `isDateAreaOpen`), briefly leaving state inconsistent. (3) Bridge store fragmentation — 3 components each imported from `$lib/stores/modal` bridge wrappers. **(dialog.svelte.ts)** Added `datePickerInitialValue = $state<string>('')`; Added `openDatePicker()` atomic method that sets all 5 fields in a single synchronous assignment block (no race window); Added `closeDatePicker()` method. `reset()` updated. **(DatePickerYearAndMonth.svelte)** Dropped all bridge store imports (`selectedDate`, `modalContext` from `modal.ts`, `get` from svelte/store); now imports only `dialogState` + `untrack` from svelte. `$effect` uses `dialogState.selectedDate` as reactive trigger, reads `modalContext` via `untrack()` so context changes don't fire the effect (prevents double-fire on atomic open). `toggleDateArea()` calls single `dialogState.openDatePicker()`. **(MonthYearModal.svelte)** Dropped all bridge store imports; imports only `dialogState` directly. Year-sync `$effect` now reads `dialogState.datePickerInitialValue` (set atomically per-opener) so each picker reopens on its own year. Added `oncancel` on `<dialog>` element for native Escape key support (with `e.preventDefault()` to control dismiss behaviour). All interactive elements now have `min-h-[44px]` touch targets (WCAG 2.1 / Apple HIG / Material Design minimum). Year input gets `inputmode="numeric"` (shows numpad on Android/iOS) + `scrollIntoView({ behavior: 'smooth', block: 'center' })` on focus so Android soft-keyboard doesn't push the input off-screen. Footer now shows `dialogState.datePickerInitialValue` as "Current:" — the opener's own previously-chosen value — not the stale global `selectedDate`. Full `aria-label` coverage on all buttons. **(layout.svelte)** Migrated from `$isDateAreaOpen` / `$isDateAreaOpenContext` bridge stores to `dialogState.isDateAreaOpen` / `dialogState.isDateAreaOpenContext` directly. **4 files changed, +300/-228.** 0 errors, 0 warnings, 4,451 tests pass. | Forms | Date picker mobile + nested-modal |
| 2026-02-19 | 1c859cde | **Adopt: 5 new main commits (12cbd5b5→405ee667) into refactor/codebase-overhaul.** Smart cherry-pick preserving runes migration improvements. **(1) Dev test domain + OTP console logging** — `lenderDomains.ts` gets `testbank.digitaldsa.com` (dev-only); `verify-email/+server.ts` logs OTP in dev + graceful SMTP failure. **(2) RM Interactive Policy Review** — New `PolicyFieldReview.svelte` (312 lines) + `policyFieldUtils.ts` (144 lines): ✓/✗ per-field toggles, correction notes, approve blocked if wrongs exist, `field_validations` stored in provenance. Post-cherry-pick TS fix: cast `body.field_validations` to typed Record. **(3) Structure validations + applicationData merge fix + delete `ApplicantVerificationModal`** — `validateStep()` now enforces individual/group_individuals/company/mix structure rules; all 6 loan pages now merge `{ ...formState.applicationData, ...currentAnswers }` preventing field wipe on reload. **(4) Reactive `structureMismatchError` + `validate()` export + Next always clickable** — amber banner shown in real-time when applicant types mismatch selected structure; all 6 loan pages: Next always enabled, `validateStep()` on click. **(5) Clear `globalRoleError` on user action** — clears on field change, save, and delete. **Preserved (ours)**: `restoreIntentState` from `.svelte.ts` (all 3 call sites) — not overwritten by main's `.ts` bridge variant. 0 errors, 0 warnings, 4,451 tests. | Sync | Main adoption |
| 2026-02-19 | 0e2e283d | **Fix: Close 3 bidirectional sync gaps between applicantDataStore and formState in IncomePageNew.svelte.** Root cause: soft-delete/restore features worked at the structured-store level (`applicantDataStore`) but didn't propagate changes back to `formState.applicants[]` — the source of truth for UI rendering. **GAP 1 — `handleRestoreProfile()`**: After `applicantDataStore.restoreProfileEntries()`, now also merges restored entries back into `formState.applicants[selectedIndex].incomeEntries` with a deduplication guard (ID Set). UI now re-renders restored income entries immediately. **GAP 2 — `handleProfileSelectionChange()`**: When profiles are deselected, now also filters `formState.applicants[selectedIndex].incomeEntries` to remove orphaned entries whose `profileType` is no longer in the selected list. Previously, deselected entries lingered in formState even though the structured store correctly soft-deleted them. **GAP 3 — `handleObligationUpdate()` obligations restore**: When `ObligationsRunning` toggles No → Yes, after `applicantDataStore.restoreAllObligations()`, now also syncs restored obligations back into `formState.applicants[selectedIndex].obligations` so `UnsecuredObligation` re-renders the restored list. All three fixes follow the dual-write pattern established in `handleAddEntry`/`handleUpdateEntry`/`handleDeleteEntry`. **1 file changed, +40/-2.** 4,451 tests, 0 errors, 0 warnings. | Feature | Income profile + obligation restore |
| 2026-02-19 | a84bb1be | **Feat: Unified applicant recovery — save and restore full income/obligation/CIBIL data.** Root cause: delete flow only saved flat `Applicant` object to legacy `applicantRecoveryStore`; structured income entries (with entity names like 'Infosys'), obligations (bank + EMI details), and CIBIL score were permanently lost. Fix: (1) `applicant.svelte.ts` — Added `summary` field to `RecoverableApplicant` (pre-computed income sources, obligations, CIBIL at delete time); fixed `removeToRecovery()` to merge `legacyData + _structured ApplicantData` snapshot so both survive; added `_computeSummary()`. (2) `AddApplicant.svelte` — wired delete flow to call `applicantState.removeToRecovery()` (full structured data); fixed `incomeProfileStore` **index corruption on delete** by clearing deleted index and re-indexing all higher indices down by 1; summary passed through all 3 detection paths. (3) All 6 form pages — `onConfirm` restore handler extracts `_structured`, reinstates full `ApplicantData` into `applicantDataStore` keyed by new card ID. (4) `RestoreApplicantModal.svelte` — shows income sources (entity + type label), obligations (bank + loan type + ₹EMI/mo), CIBIL score as secondary identifying lines in both single and multi-match cards. **10 files changed, +274/-22.** 4,451 tests, 0 errors, 0 warnings. | Feature | Applicant Recovery |
| 2026-02-19 | 05bbcdb1 | **Refactor: Migrate cleanPayloadStore to Svelte 5 runes + deprecate stores.ts.** cleanPayloadStore: Created `cleanPayloadStore.svelte.ts` with `CleanPayloadState` class using `$derived.by()` for reactive payload building from formState + userRelationships. Bridges userRelationships (sessionPersisted writable) to `$state` via subscription mirror for `$derived` tracking. Old file becomes backward-compatible bridge via `fromRuneReadonly` for `$cleanPayload`/`$casePayload` syntax. All 7 consumers unchanged. stores.ts: Redirected final 3 importers (BasicFields→uiState.addToast, verifyEmailOTP→authState.setSession+uiState.addToast, Topbar→uiState.addToast) to canonical state managers. stores.ts now has **zero importers** and is fully deprecated. **5 files changed, +339/-232.** 4,451 tests, 0 errors, 0 warnings. | Overhaul Phase 4E | Store migration |
| 2026-02-19 | e796db85 | **Refactor: Migrate device, theme, dashboard, restoreApplicantIntent stores to Svelte 5 runes.** 4 stores migrated: device.ts (width, isMobile, isNative, loader → DeviceState class, 22 importers), theme.ts (ThemeState class with localStorage + system preference listener, 3 importers), dashboard.ts (DashboardState class with localStorage, 2 importers), restoreApplicantIntent.ts (RestoreApplicantIntentState class, 8 importers). All old .ts files now backward-compatible bridges via fromRune/fromRuneReadonly. **32 files changed, +411/-327.** 4,451 tests, 0 errors, 0 warnings. | Overhaul Phase 4D | Store migration |
| 2026-02-19 | 883f3f3f | **Refactor: Adopt parseJsonBody() across all 111 API routes.** Zero bare `request.json()` remaining in codebase. Prevents server crashes from malformed/empty JSON bodies. 3 HIGH RISK files fixed (set-role, user/language, disclaimer/accept). Updated CLAUDE.md with Data Cloning & State decision matrix + Server-side API Response Pattern guidelines. **112 files changed, +566/-305.** 4,451 tests, 0 errors, 0 warnings. | Overhaul Phase 4C | parseJsonBody adoption |
| 2026-02-19 | 7d9c9208 | **Refactor: Migrate 6 trivial stores to Svelte 5 runes + relocate formState utility.** inputErrors, numberToWords, emailVerificationContext, userFormConformation, coins, onboarding — all migrated to class-based $state/$derived in .svelte.ts files. Old .ts files re-export as bridges. formState clear logic relocated to utils/formStateHelpers.ts. **30 files changed, +583/-301.** 4,451 tests, 0 errors, 0 warnings. | Overhaul Phase 4B | Store migration |
| 2026-02-19 | — | **Refactor: Adopt apiResponse.ts helpers across 27 non-guarded API routes.** Completed deferred Pass 2B from codebase overhaul. Migrated auth (18), share-link (3), disclaimer (2), rm-contacts (1), upload (1), user (1), test (1) routes to use centralized `apiOk()`, `apiError()`, `apiServerError()`, `apiOkMessage()`, `apiValidationError()` helpers. Custom response shapes (tokens, cookies, otpSent) left as `json()`. Routes using `guards.ts` (127) already standardized — this handles the remaining 27. **-246 lines of boilerplate.** 27 files modified. 0 errors, 0 warnings. | Overhaul Phase 3 | API standardization |
| 2026-02-19 | 7498e712 | **Applicant Form Fixes: Modal removal + structure validations + persistence fix.** **(1) Remove redundant ApplicantVerificationModal** — deleted `ApplicantVerificationModal.svelte` entirely. **(2) Structure-based validations in `validateStep()`** — Added comprehensive validation in `AddApplicant.svelte` for all 4 application structure types. **(3) Fix applicationData wipe on reload** — All 6 loan pages fixed to merge: `replaceApplicationData({ ...formState.applicationData, ...currentAnswers })`. **1 deleted, 8 modified. 0 errors, 0 warnings.** | Forms | Applicant validation, persistence |
| 2026-02-19 | e57799fa | **RM Policy Review: Interactive Validation Form.** New `PolicyFieldReview.svelte` + `policyFieldUtils.ts`. Per-field ✓/✗ toggles, correction notes, approve blocked if wrongs exist. **2 new files, 3 modified. 0 errors, 0 warnings.** | Rule Engine | AD-6.3 RM Review Communication |
| 2026-02-19 | — | **Dashboard Fix: RM bankName Extraction + Tour Guides for RM/Admin + DSA RM Contacts Enabled.** **(Phase 1: RM bankName Critical Fix — 17 issues, 16+ files)** RM's `bankName` was never extracted from `officialEmail` during onboarding — every RM page showing empty lender fields. Fixed `rm-onboarding/+server.ts` to call `getLenderNameFromDomain()` and persist `bankName`. Expanded `lenderDomains.ts` DOMAIN_NAMES from 19 to 100+ mappings (all PSU/PVT/NBFC/HFC/SFB domains). Applied defensive fallback pattern (`rmDoc.bankName \|\| getLenderNameFromDomain(email) \|\| ''`) across ALL 16+ files reading bankName: dashboard pages (home, settings, cases/[case_id], analytics, broadcasts, submissions/new), API routes (policies, broadcasts, submissions, sample-data, review/[version_id]/respond), admin pages (users/rm list, users/[user_id] detail). Fixed field name mismatch in settings (rmOfficialEmail vs officialEmail). Created admin-only backfill migration endpoint at `/api/admin/migrations/backfill-rm-bankname`. Fixed sample data seeder bankName fallback. **(Phase 2: DSA Dashboard — 1 fix)** Removed `disabled: true` from RM Contacts quick action in DSA dashboard — page at `/dashboard/dsa/rm-contacts` is fully built with search, filter, CRUD. **(Phase 3: Tour Guides — 11 items, 6 new files)** Created RM intro tour (9 steps: welcome → dashboard → cases → communication → broadcasts → policies → submissions → DSA search → finish) in `walkthrough/rm/rmIntroTour.ts`. Created Admin intro tour (8 steps: welcome → dashboard → users → policies → approvals → testing → audit → finish) in `walkthrough/admin/adminIntroTour.ts`. Created universal `/api/walkthrough` PATCH endpoint (detects role from `activeRole`, persists to correct collection). Made walkthrough state manager role-aware: `init(state, isDemo, role)`, `getSteps('intro')` returns role-specific steps, `hasExplanatoryTour` only for DSA. Updated WalkthroughDriver to accept `role` prop. Updated TourLauncher to conditionally show "Full Guide" only for DSA role. Created `+layout.svelte` for RM and Admin dashboards mounting WalkthroughDriver with correct role. Updated RM and Admin `+layout.server.ts` to load walkthrough state from DB. Added `walkthroughId` to all 9 RM nav items and 7 Admin nav items in dashboard layout. Enabled TourLauncher for all roles (removed DSA-only conditional). **(Admin bankName Display — 2 fixes)** Admin RM user list and user detail pages now show derived bankName from email domain. **25+ files modified (6 new). 0 errors, 0 warnings.** | Dashboard Fix | RM-1 to RM-17, DSA-1, TOUR-1 to TOUR-11, ADMIN-1 to ADMIN-2 |
| 2026-02-19 | — | **Design Migration: digitaldsa.com Yellow Theme for Landing + Legal Pages.** Migrated landing and legal pages from bronze accent (`#cb997e`) to bright yellow (`#FFCC00`) matching live digitaldsa.com brand. Dashboard/form pages untouched. **(Phase 1: CSS Tokens)** Added 8 new `--landing-accent-*` variables to `app.css` in both `:root` and `.dark` — `--landing-accent: #FFCC00`, `--landing-accent-rgb`, `--landing-accent-hover` (darker in light/lighter in dark), `--landing-accent-text: #0f172a`, `--landing-accent-subtle`, `--landing-accent-medium`, `--landing-accent-gradient-from/to`. `--ddsa-primary: #cb997e` unchanged. **(Phase 2: Landing Component Token Replacement — 13 files)** Replaced all `--ddsa-primary-*`, `--ddsa-accent-*`, hardcoded `rgba(203,153,126,...)` and `rgba(221,190,169,...)` in: PrimaryButton (gradient+shadows+text), SectionTitle (subtitle light), ChecklistItem (check icon), HeroSection (ambient orb+gold headline+checklist+stats), HowItWorksSection (number+icon-wrap+icon+footer), FourAnswersSection (icon-wrap+icon+quote-border), ComparisonSection (col-with bg/border light+dark, heading-good), TestimonialsSection (quote-mark), PricingSection (popular border/shadow, badge, feature/badge checks), FinalCTASection (gradient), TrustPledgeSection (all refs), ScrollToTop (bg+color+shadows), NavigationChoiceModal (header gradient+title+hover+icons). **(Phase 3: Navbar)** FloatingNav CTA changed from bronze gradient to solid yellow (`background: var(--landing-accent)`, `color: var(--landing-accent-text)`), matching digitaldsa.com's yellow login button. Desktop + mobile CTAs updated. **(Phase 4: Footer)** Footer bg from `--landing-bg-deep` to `--landing-bg` with top border. Social buttons changed to solid yellow circles with dark icons. Newsletter submit color to `--landing-accent-text`. **(Phase 5: Legal Pages — 6 files)** Layout shell bg to `--landing-bg`, header fixed `#0f172a`. All 5 legal pages (about, contact, privacy, terms, refund) migrated from `--form-*` to `--landing-*` tokens, links from `--ddsa-primary-600/700` to `--landing-accent/accent-hover`. **(Phase 6: Contact Form)** Focus rings to `rgba(var(--landing-accent-rgb), 0.15)`, submit button to yellow with hover lift + yellow shadow. **(Phase 7: Dark Mode Cleanup)** StatsSection `.stat-label` hardcoded `#94a3b8` → `var(--landing-text-muted)`. **~22 files modified. 0 errors, 0 warnings.** | Landing + Legal | Yellow Theme Migration |
| 2026-02-19 | — | **Landing Page B2B Enhancement — non-generic, DSA-first.** **(Phase 1: Fix B2C messaging in 4 existing components)** TopBar: "LIMITED TIME OFFER" → "NEW ON THE PLATFORM", consumer promo → "52 lenders. 15 loan types. Real-time policy matching now live for all DSAs.", CTA "Check Now" → "Explore Free". LoadingScreen: tagline "Your Dream Loan, Simplified" → "Intelligence for Loan Professionals", messages updated (syncing lender policies, preparing workspace), features updated (Bank-Grade Security, 52 Lender Policies, Real-Time Matching, RM Network Access). FloatingNav: nav items updated to match actual section IDs (how-it-works/four-answers/pricing/trust-pledge), labels updated (How It Works/Features/Pricing/Trust), CTA "Find Your Rate" → "Start Free Trial" (desktop + mobile). Footer: company description updated to B2B DSA language, "Loan Products" column → "Platform" with anchor links (How It Works, Bank Matching, RM Network, Pricing, For Corporate DSAs, Trust Pledge), newsletter text updated to policy/payout focus. **(Phase 2: 4 new landing sections)** LenderMarqueeSection: 52+ bank name chips in dual-row CSS-animated counter-scrolling marquee, color-coded by classification (GOV green, PVT blue, NBFC amber), data from bankName.ts, mask-image gradient edges, legend dots, GSAP ScrollTrigger entrance. LoanServicesGridSection: 15 loan types in 3 categories (Secured/Unsecured/Working Capital) with Lucide icons, category-colored left borders, hover lift, GSAP stagger animation. StatsSection: dark background, 5 stats with GSAP counter animation (1,247+ DSAs, ₹847 Cr+ Matched, 52+ Lender Policies, 15+ Loan Types, 94% Approval Rate), counting from 0 on scroll. DisclaimerSection: 5 numbered items (B2B SaaS disclaimer, policy data freshness, indicative matches, no data sharing, refund terms), accent-colored numbers. **(Phase 3: Section reorder)** New order: Hero → LenderMarquee → HowItWorks → FourAnswers → LoanServicesGrid → Stats → Comparison → Testimonials → Pricing → TrustPledge → FinalCTA → Disclaimer → Footer. **4 new files, 5 modified. 0 errors, 0 warnings.** | Landing Page | B2B Enhancement |
| 2026-02-19 | — | **Quick Wins: 6 feature batches implemented.** **(Batch 1: SEO)** Created `/sitemap.xml` dynamic server endpoint listing 9 public routes with changefreq/priority. Created `JsonLd.svelte` reusable component. Enhanced `Seo.svelte` with OG (title, description, url, image, type) + Twitter Card (card, title, description, image) meta tag props. Added Organization + SoftwareApplication JSON-LD schemas to home page. Updated `robots.txt` with sitemap reference. **(Batch 2: About & Contact pages)** Created `/about` page (mission, what we do, differentiators, values) and `/contact` page (info cards + contact form with SvelteKit form actions → MongoDB `contactSubmissions`). Both follow existing `(legal)/+layout.svelte` pattern. Added About/Contact links to legal layout footer. **(Batch 3: Newsletter backend)** Created `POST /api/newsletter/subscribe` endpoint (email validation, duplicate check with re-activation, insert to `newsletterSubscriptions`). Added `NewsletterSubscriptions` + `ContactSubmissions` collections to `mongo.ts` with indexes (unique email for newsletter, created_at for contacts). Wired Footer newsletter form with `$state` binding, loading/success/error states, and feedback messages. **(Batch 4: Admin Management)** Already fully implemented — skipped. **(Batch 5: RM Suggested DSAs)** Added reverse auto-match to RM dashboard server: queries active onboarded DSAs not yet connected, scores by city match (+40) and bank match (+40), returns top 3. Added "Suggested DSAs" card to RM dashboard sidebar with name, city, match score, reason badges, and "Find more DSAs" link. **(Batch 6: Email notifications)** Added fire-and-forget email notifications to `share-with-rm/+server.ts` (notifies RM when DSA shares a case, includes case label + loan type + lender) and `rm/threads/[thread_id]/messages/+server.ts` (notifies DSA when RM replies, includes message preview). Both use `createTransporter()` + non-blocking `.catch()`. **(Batch 7: Capacitor config)** Updated `capacitor.config.ts` server URL from old Vercel app to `https://digitaldsa.com`, cleaned up commented-out block and quote consistency. **9 new files, 8 modified. 0 errors, 0 warnings.** | Phase 8 | 8.1, 8.2, 8.4, 8.6, 7.5, AD-6.3 |
| 2026-02-19 | — | **Fix: Resolve all 33 svelte-check warnings + 5 pre-existing errors.** Cleaned up 17 files across the codebase. **(1) Type errors** (5, in admin policies `+page.server.ts`): Added explicit type assertions (`as string`, `as string[]`, `as number`) to MongoDB aggregation `Record<string, unknown>` map output. **(2) `state_referenced_locally` warnings** (22): Added `// svelte-ignore state_referenced_locally` comments on intentional initial-value captures from `data`/`$props()` into mutable `$state()` (filter forms, search inputs, selections). Extracted intermediate `const` for multi-reference cases (audit filters, timeline filters, team member, communication thread). **(3) `a11y_consider_explicit_label`** (4): Added `aria-label="Go back"` to icon-only back-navigation links/buttons in CRM leads, lenders, sources, and team member pages. **(4) `a11y_label_has_associated_control`** (3): Added `for`+`id` to textarea label in artifact detail, added `for="fileInput"` to policy documents label in upload page, changed "Loan Types Covered" `<label>` to `<p>` (button group, not form control). **(5) `a11y_click_events_have_key_events` + `a11y_no_noninteractive_element_interactions`** (2): Wrapped screenshot `<img onclick>` in `<button>` in e2e-run page. **(6) `a11y_label_has_associated_control`** (1): Changed "Urgency" `<label>` to `<p>` in RM submissions page (button group). **17 files modified. 0 errors, 0 warnings.** | Code Quality | svelte-check cleanup |
| 2026-02-19 | — | **Fix+Enhance: MonthYearModal date picker.** **(1) Sync year on open**: When the modal opens, `currentYear` now initializes from the existing `selectedDate` store value (e.g., if "Mar-2020" was previously selected, the modal opens showing year 2020 with Mar highlighted). Previously it always defaulted to the current year, making the selected month appear unhighlighted and forcing manual arrow navigation. **(2) Click/dblclick disambiguation**: Replaced conflicting `onclick`+`ondblclick` handlers on the year display with a single timer-based handler (`handleYearClickOrDouble`) that uses a 250ms delay to distinguish single click (opens year grid) from double click (opens direct year input). Eliminates the arrows→grid→arrows→input flicker. **(3) "Type Year" button in grid**: Added an explicit "Type Year" link in the year grid header so users can access direct year input without relying on double-click (especially useful on mobile). **(4) Year input UX polish**: Widened input from 100px to 120px for comfortable 4-digit entry, added `maxlength={4}`, improved hint text to "Enter year between {minYear} — {maxYear}". **1 file modified. 0 new TS errors (5 pre-existing).** | Forms | MonthYearModal UX |
| 2026-02-19 | — | **Feature: Admin role switching across all dashboards.** **(1) Login RM option**: Admin users now see all 3 roles (Admin, DSA, RM) in the login role modal instead of just Admin/DSA. Added `isAdminSwitching` logic so admins authenticate via AdminUsers collection regardless of chosen dashboard role (prevents 404 when admin has no DSA/RM profile). **(2) hooks.server.ts**: AdminUsers branch now reads `activeRole` cookie, allowing admins to operate as DSA/RM. All role booleans set to true (`admin: true, dsa: true, rm: true`). **(3) set-role API**: Split allowed roles into `BASE_ROLES` (dsa) + `ADMIN_EXTRA_ROLES` (admin, rm) with privilege escalation prevention. **(4) Dashboard onboarding bypass**: Admin users skip both DSA and RM onboarding checks in `+layout.server.ts`. **(5) Dashboard role switcher UI**: Admin users see a "Switch Role" section in both desktop sidebar and mobile "More" menu showing the two other roles they can switch to. Calls `/api/set-role` then navigates to the target dashboard with `invalidateAll`. Uses existing `ROLE_META` for styling. **5 files modified. 0 new TS errors (5 pre-existing).** | Admin | Role switching, testing |
| 2026-02-19 | — | **Fix: Landing page CTAs now role-agnostic + resume-or-dashboard prompt.** **(1) Role-agnostic routing**: Changed all 5 landing page CTA handlers (HeroSection, FinalCTASection, HowItWorksSection, PricingSection, FloatingNav) from hardcoded `goto('/dashboard/dsa')` to `goto('/dashboard')`. The dashboard `+layout.server.ts` already redirects `/dashboard` to the correct role-based path (`/dashboard/dsa`, `/dashboard/rm`, or `/dashboard/admin`) based on `activeRole`. This fixes RM users being incorrectly sent to the DSA dashboard. **(2) Resume-or-dashboard prompt**: Created `landingNavigation.svelte.ts` shared state module with `handleCTA()` that checks sessionStorage for active form data (`home-loan-data` with a `loanName`). If form data exists, shows `NavigationChoiceModal` with two options: "Resume Application" (navigates to `/form/how-can-we-help`) or "Go to Dashboard" (navigates to `/dashboard`). Modal follows existing `SessionResumeModal` design pattern. All 5 CTA components now use `landingNav.handleCTA()` instead of inline auth/goto logic. Removed unused `goto` and `authState` imports from CTA components. **2 new files, 6 modified. 0 new TS errors (5 pre-existing).** | Landing Page | CTA routing, UX |
| 2026-02-19 | 1ab45e29 | **Refactor: Extract fixture data, fix Modal close, add Home link to dashboard sidebar.** **(1) Modal.svelte fix**: Moved `registerModal(modalId)` inside `!dialog.open` guard so modals only register when actually opened (not on re-renders). Added explicit `!showModal` guard to close branch preventing premature close. Added `showModal = false` sync in `handleClose()` so Escape-key native close properly updates bindable state. **(2) Fixture data extraction**: Moved all 15 loan application fixture data objects + `obligation()` helper + `ALL_FIXTURES` aggregate from `fixtureProfiles.test.ts` (vitest dependency) into standalone `$lib/testing/fixtures/fixtureProfiles.ts` (no test framework dependency). Test file now re-exports for backward compatibility. `seedPolicyEngine.ts` updated to import from standalone file — fixes production bundle pulling in vitest. **(3) Dashboard sidebar Home link**: Made sidebar logo (`div` → `<a href="/">`) a clickable link to home page with hover effect. Added dedicated "Home Page" link in sidebar footer (between TourLauncher and dark mode toggle). **5 files changed (1 new). 0 new TS errors (5 pre-existing).** | Infrastructure | Modal, Fixtures, Dashboard Nav |
| 2026-02-19 | 78842df0 | **Fix: Seed auth state from server data to prevent false login redirects.** When navigating back from `/form` pages to the home page, all CTAs (Start Free Trial, Find Your Rate, etc.) were redirecting to `/login` instead of `/dashboard/dsa` because client-side `authState.isAuthenticated` hadn't initialized yet. Root cause: `authState.init()` in root layout had a 100ms `setTimeout` + async API call to `/api/auth/validate-token` — CTAs checked this client state which started as `false`. Fix: Added `$effect` in `+layout.svelte` that immediately seeds `authState` from server-provided `data.user` (which `+layout.server.ts` already returns from `locals.user`). Added `seedFromServer()` method to `AuthStateManager` accepting the server-side user shape (`Record<string, any>`) with an `isAuthenticated` guard to avoid overwriting once `init()` completes. The deferred `init()` call still runs later and enriches with full session details (expiry, etc.). **2 files changed. 0 new TS errors (5 pre-existing).** | Auth | CTA redirect fix |
| 2026-02-18 | — | **Unified Applicant System — All 6 Loan Types on ApplicantFormSecured + AddApplicant.** Config-driven migration unifying Personal, Professional, and Business loans onto the same applicant system already used by secured loans (Home/LAP/Plot). **Phase 1 (Config-Driven AddApplicant)**: Created `applicantBasicDetailsUnsecuredLoans.json` (3 formLevelQuestions: businessEntityType with loanCategory showWhen, applicationStructure with option-level showWhen per loan type, companiesFamilyOwned; 11 per-applicant questions without onProperty/onEMI/isGuarantor). Added `configJson` prop to `AddApplicant.svelte` (defaults to secured JSON, `hasRoleQuestions` derived gates all role validation/summary columns/error messages). Added `configJson` pass-through to `ApplicantFormSecured.svelte`. Added `businessEntityType` -> `applicationStructure` auto-derive in `updateFormLevelField()` (Sole Prop/OPC -> individual, Pvt Ltd/Partnership/LLP -> company). **Phase 2 (Personal Loan Migration)**: Renamed schema page ID `basicInfoPage` -> `applicantPage` in both client+server schemas. Updated `personalLoan.ts` wizard config with 3 applicantStep subsections (whos-applying/relationships/income-credit) + `__applicantCount`/`__individualApplicantCount` showWhen guards on financials section. Replaced `BasicInfoFields` with `ApplicantFormSecured` + `unsecuredConfig` on page. Added `loanCategory='personal'` injection, 4-branch navigation delegation (Home Loan pattern), `isSingleApplicant`/`incomeValueCheck`/`checkEveryApplicantNRI` derived state, multi-applicant submission handler. **Phase 3 (Professional Loan Migration)**: Same pattern as Phase 2 with `loanCategory='professional'`. Fixed 2 copy-paste bugs: `loanType: 'Business Loan - Secured'` -> `'Professional Loan'` in sessionStorage and edit mode. **Phase 4 (Business Loan Simplification)**: Removed dual-mode system (`isMultiApplicantMode`, `handleEntityTypeChange`, `MULTI_APPLICANT_ENTITIES`, `persistBusinessEntityType`). Entity type selector now rendered as formLevelQuestion by AddApplicant Zone 1. Updated `businessLoan.ts` wizard config (replaced `__multiApplicantMode` with `__applicantCount`). Single `ApplicantFormSecured` flow for all entity types. **Phase 5 (Cleanup)**: Deprecation comments on `BasicInfoFields.svelte`, `applicantBasicDetails.json`, and 4 functions in `unsecuredApplicantHandlers.ts`. Income handler functions still active (used by flattened single-applicant income pages). **Key patterns**: `loanCategory` in applicationData drives form-level question visibility via JSON showWhen; option-level showWhen (RadioIcon.svelte line 56) enables per-loan-type option filtering in single JSON; `hasRoleQuestions` derived detects config capabilities. **1 new JSON config, ~20 files modified. 0 TS errors (33 warnings pre-existing). 4,451 tests pass (52 files).** | Store Redesign | Unified Applicant System Phases 1-5 |
| 2026-02-18 | — | **7.4: Full Timeline View.** Paginated per-case timeline page at `/dashboard/dsa/cases/[case_id]/timeline`. **Server load** (`+page.server.ts`, ~85 lines) — auth via `resolveEffectiveDsaId()` + `verifyCaseOwnership()`, queries `TimelineEvents` collection with event_type filter (exact match), date range filter (`$gte/$lte` on `created_at`), pagination (20/page), loads distinct event_type values for filter dropdown. **Page UI** (`+page.svelte`, ~270 lines) — URL-driven filters (event type select, date from/to inputs, clear filters button). Vertical timeline with colored dots (green/blue/yellow/red/gray mapped to success/info/warning/error/neutral), event type title + color pill badge, description, full date+time with relative "time ago", optional metadata key-value display. Pagination: Previous/Next + "Page X of Y". Empty states for no events and no filter matches. **Timeline tab enabled** in case layout (was `disabled: true`). **"View Full Timeline" link** on case overview replaces "coming soon" placeholder. Reuses existing `EVENT_TYPE_MAP` visual mapping pattern (24 event types) and `TimelineEvents` MongoDB collection with 2 indexes (`case_id+created_at`, `case_id+event_type`). **2 new files, 3 modified. 0 new TS errors (1 pre-existing, 33 warnings).** | Phase 7 | 7.4 |
| 2026-02-18 | — | **7.3: RM Contacts Management Page.** Full CRUD page at `/dashboard/dsa/rm-contacts` for managing crowdsourced RM contacts. **Server load** (`+page.server.ts`, ~85 lines) — auth via `resolveEffectiveDsaId()`, queries `RMContacts` collection with search (regex on rm_name/lender_name/branch), lender filter, city filter, pagination (20/page), parallel queries for contacts + count + lender options + city options. **Page UI** (`+page.svelte`, ~530 lines) — URL-driven filters with debounced search (400ms), lender/city select dropdowns, clear filters button. Contact cards show avatar, designation badge (color-coded), lender + branch/city, confirmation count + last confirmed time, loan type pills, private DSA notes. Action buttons: Call (tel:), WhatsApp (wa.me/91), Confirm (POST to /api/rm-contacts/[id]/confirm, local state update), Edit (modal pre-fill), Deactivate (contributor-only, PATCH is_active:false). Add/Edit modal with 10 fields: rm_name, lender_name (datalist autocomplete from existing), branch, city, phone, email, whatsapp, designation (select: RM/Senior RM/Credit Manager/Branch Manager/Other), loan_types_handled (multi-toggle pills), notes_by_dsa (textarea). Pagination: Previous/Next + "Page X of Y". Empty states for no contacts and no filter matches. **Nav item** added to dashboard layout after "Communication" with `cases_view` permission. **2 new files, 1 modified. 0 TS errors (30 warnings pre-existing).** | Phase 7 | 7.3 |
| 2026-02-18 | — | **RE-5: DSA Integration — Wire Rule Engine into Loan Application Flow.** Completes tasks 3.8-3.11. **(RE-5.1) Evaluating page wired to rule engine** — `normalizeForRuleEngine()` maps PascalCase external API payload keys (LoanName, LoanAmount) to camelCase for rule engine. Try `/api/rule-engine/evaluate` first, fall back to external API if no results. Extracted `persistResults()` and `createFormSnapshot()` helpers. **(RE-5.2) Eligibility-sync endpoint** — `POST /api/cases/[case_id]/eligibility-sync` loads latest `LenderResultsSnapshot`, matches `LenderResult` to `LenderApplication` by `lender_name`, writes extended `eligibility_snapshot` (traffic_light, message, computed_at + offered_amount, roi, emi, approval_probability, foir, ltv). Called fire-and-forget from evaluating page after results persist. **(RE-5.3) Extended eligibility_snapshot type** — Added 6 metric fields to `LenderApplication.eligibility_snapshot` in `case.ts`: offered_amount, roi, emi, approval_probability, foir, ltv. **(RE-5.4) Employment document templates** — `COMMON_DOCUMENT_TEMPLATES` (PAN, Aadhaar, photos) + `EMPLOYMENT_DOCUMENT_TEMPLATES` (Salaried, Government, Self-employed Businessman/Professional, Pensioner) in `documentTemplates.ts`. Auto-applied for green/amber lender apps with empty checklists during eligibility-sync. **(RE-5.5) Calculator metrics display** — `LenderApplicationCard.svelte`: metrics row below header (offered amount, ROI, EMI, probability, FOIR, LTV). `LenderComparisonTable.svelte`: eligibility column with traffic light dot + offered amount in desktop table + mobile cards. **1 new file, 5 modified. 0 TS errors (29 warnings pre-existing). 4,451 tests pass (52 files).** | Rule Engine | RE-5.1-RE-5.5, 3.8-3.11 |
| 2026-02-18 | — | **RE-4: Fixture Seeding + Integration Testing — 3 sample lender rule documents, admin test page real engine, 626 integration tests.** **(RE-4.2) `sampleRuleDocs.ts`** (NEW, ~550 lines) — 3 realistic `ParsedLenderRuleDocument` objects for integration testing: **Sample PVT Bank** (HDFC-like, CIBIL >=700, age 23-58 Individual only, HL+LAP, 3-tier FOIR 50/55/60%, 3-tier ROI 8.35/8.65/9.15%, income haircuts salaried 0%/professional 15%/business 25%, 3-tier LTV 90/80/75%, deviation CIBIL 650 for income >2L), **Sample GOV Bank** (SBI-like, CIBIL >=650, age 21-60, HL+LAP+BL, flat 55% FOIR, flat 8.25% ROI, professional 20%/business 30% haircuts, company age >=2, deviation CIBIL 600), **Sample NBFC** (Bajaj-like, CIBIL >=625, age 21-65, HL+BL, 3-tier FOIR 55/60/65%, 3-tier ROI 9.5/10.5/11.5%, professional 10%/business 20% haircuts, company age >=3, deviation CIBIL 580). `seedSampleRuleDocuments()` upserts 3 `RuleArtifactPair` records with `status: 'active'`. `ALL_SAMPLE_RULE_DOCS` export for test imports. All age gates use `applies_when` to skip Company applicants. **(RE-4.3) Admin test page upgrade** — Replaced client-side `json-logic-js` evaluation with real server-side `evaluateLender()` + `buildResults()` via SvelteKit form actions. Two actions: `evaluate` (single lender, returns serialized `LenderEvaluation`), `compare` (all active lenders for loan type, returns `LenderResultsData`). UI rewritten with Tailwind CSS + `--dash-*` dark mode variables: traffic light card, 6-metric grid (offered/ROI/EMI/tenure/FOIR/income), amount breakdown, collapsible gate results, income assessment table, obligation treatment table, deviation cards, policies table, raw JSON. Compare mode: summary header (lender counts + best metrics), lender comparison table (signal/offered/ROI/EMI/tenure/rating), per-lender expandable factors & suggestions. **(RE-4.4) `integrationTests.test.ts`** (NEW, ~730 lines) — 626 tests across 12 groups: structural validity (45 combos return valid shape), PVT gate behavior, GOV gate behavior, NBFC gate behavior, deviation coverage, income assessment variance, FOIR pressure, ROI variation, LTV computation, multi-lender buildResults, NRI coverage, BT rules. All 15 fixtures x 3 lenders tested. **Seed endpoint** updated: `rules: true` flag triggers `seedSampleRuleDocuments()`. **2 new files, 3 modified. 0 TS errors (29 warnings pre-existing). 4,451 tests pass (52 files).** | Rule Engine | RE-4.1-RE-4.4 |
| 2026-02-18 | — | **Generator + RE-2 Correction Sequence — Layer 1 (Generator) + Layer 2 (RE-2 Enhancements).** Two-layer correction aligning synthetic generator output with actual form payload contract (`CleanIncomeEntry[]`) and enhancing RE-2 to read structured income data. **Layer 1 — Generator Corrections (L1.1-L1.8):** **(L1.1) `incomeEntryPool.ts`** (NEW, ~350 lines) — builders for all 11 income profile types producing `CleanIncomeEntry[]` matching `extractIncomeEntries()` output: `salaried_regular/contractual` (grossMonthlySalary, netMonthlySalary), `business_proprietorship` (financialsTable with netProfitArray/depreciationArray/turnOverArray), `business_partnership`/`director_company` (drawsSalary, monthlySalaryAmount, receivesProfit, profitFrequency, averageProfitPerWithdrawal), `professional_practice` (averageMonthlyReceipts, averageMonthlyExpenses, netProfessionalIncome), `pension` (monthlyPensionAmount), `rental_income` (monthlyRentAmount), `freelance_consulting` (averageMonthlyFreelanceIncome), `agriculture_income` (averageAnnualAgricultureIncome), `investment_income` (averageAnnualInvestmentIncome). Each with appropriate evidence patterns. **(L1.2) `entityNamePool.ts`** (NEW, ~100 lines) — realistic entity names per profile type (TCS/Infosys/HDFC for salaried, Sharma Trading/Gupta Electronics for business, Dr. Clinic/CA Associates for professional, flat/shop addresses for rental). Uses `rng.choice()` for determinism. **(L1.3) `conditionalFieldEnforcer.ts`** (NEW, ~195 lines) — enforces `showWhen` conditional field logic: `profitable3Years` only when `itrFiled===true`, `hasInventory` only for manufacturing/trading, `hasFactory` only for manufacturing, `barCouncilChamber` only for Lawyer, `pensionRegular` only when `pensionCreditedMonthly===true`. **(L1.4) `archetypeHelpers.ts`** (MODIFIED) — replaced flat income fields with `incomeEntries[]` generation, added legacy backfill (`grossIncome`/`netIncome` from salaried entries), expanded co-applicant relationships from 3 to 6 types (spouse/parent/son/sibling/in-law/business-partner) with gender-aware selection across 28 `Relationship` values. **(L1.5) `obligationPool.ts`** (MODIFIED) — employment-type-aware credit line filtering: salaried/pensioner get only Credit Card, self-employed get CC+OD Limit+CC Limit. **(L1.6) `archetypeTemplates.ts`** (MODIFIED) — added 6 LAP sub-type archetypes (residential/commercial/industrial/plot/mixed-use/self-occupied), 3 multi-income archetypes (salaried+rental, director x2, business+pension), expanded to 117+ archetypes producing 514 profiles. **(L1.7) `syntheticGenerator.ts`** (MODIFIED) — passes `employmentType` to `generateObligations()`. **(L1.8) `generatorCorrections.test.ts`** (NEW, ~350 lines) — 33 tests across 8 groups: incomeEntries structure, entity names, obligation employment filter, relationship diversity, conditional field enforcement, LAP sub-types, multi-income profiles, backward compatibility. **Layer 2 — RE-2 Enhancements (L2.1-L2.8):** **(L2.1) `payloadEnricher.ts`** (NEW, ~200 lines) — pre-computes 13 derived `_computed` fields for JSON-Logic rules: `_total_gross_monthly`, `_total_obligations_monthly`, `_applicant_count`, `_has_co_applicant`, `_primary_age`, `_primary_employment`, `_is_business_file`, `_is_salaried_file`, `_max_cibil`, `_min_cibil`, `_total_vintage_years`, `_income_source_count`, `_income_profile_types`. Exports `extractGrossFromEntry()` handling all 12 profile types, `enrichPayload()` returning payload + `_computed`. **(L2.2) `incomeAssessorV2.ts`** (NEW, ~200 lines) — per-entry multi-source income assessment: `assessSingleEntry()` with `assessment_logic` JSON-Logic override + `haircut_percent` fallback, `findMatchingRule()` with exact + `*` wildcard match, `assessIncomeV2()` reading `incomeEntries[]` per applicant with `max_contribution_percent` capping. Falls back to V1 `extractGrossMonthlyIncome()` when `incomeEntries[]` absent. **(L2.3) `types.ts`** (MODIFIED) — added `assessment_logic?: Record<string, unknown>` to `ParsedIncomeRule`, `calculation_strategy?: 'sum_then_calculate' | 'calculate_then_sum'` and `case_profile_rules?: ParsedRule[]` to `ParsedLenderRuleDocument`. **(L2.4) `evaluationEngine.ts`** (MODIFIED) — inserted `enrichPayload()` call, replaced `assessIncome()` with `assessIncomeV2()`, passed enriched payload to all JSON-Logic evaluations (hard gates, parameters, deviations). **(L2.5) `ruleValidator.ts`** (MODIFIED) — added `COMPUTED_FIELD_KEYS` Set (13 keys), added `_computed` branch to `validateVarPath()`. **(L2.7) `payloadEnricher.test.ts`** (NEW, ~300 lines) — 26 tests: computed field accuracy, obligation computation, applicant metadata, CIBIL aggregation, business/salaried detection, vintage tracking, edge cases. **(L2.8) `incomeAssessorV2.test.ts`** (NEW, ~400 lines) — 32 tests: per-source extraction (12 types), multi-source assessment, assessment_logic JSON-Logic, max_contribution_percent, backward compatibility, rule matching, condition evaluation, guarantor handling. **6 new files, 6 modified, 3 new test files. 0 TS errors (29 warnings pre-existing). 3,825 tests pass (51 files). All 421 existing evaluation engine tests pass unchanged (zero regressions).** | Rule Engine + Synthetic Data | Generator Corrections L1.1-L1.8, RE-2 Enhancements L2.1-L2.8 |
| 2026-02-18 | — | **MongoDB Consolidation + Archive System.** Eliminated 3 orphan MongoDB connection files that each created separate `MongoClient` instances. **(1) Consolidated into main `src/lib/database/mongo.ts`**: added `SubmittedApplicationsDb` (legacy submittedApplications DB), `AppliedApplications` collection, `getCollection()` helper — all reusing existing MongoClient (zero new connections). **(2) Migrated 4 live files**: `appliedApplication/+server.ts` (used by 6 loan pages), `shareLinks.ts` (replaced 8x async `getCollection()` with direct `ShareLinks` import), `share-link/submit/+server.ts`, `test/test-data/+server.ts`. **(3) Removed dangerous re-export**: `export * from './database/mongo'` removed from `src/lib/index.ts` (was exposing 40+ DB collections at `$lib` root). **(4) Archived 6 dead files**: `src/lib/db/mongo.ts` (orphan connection), `src/lib/server/mongo.ts` (legacy helper), `src/lib/server/db.ts` (abandoned, wrong env pattern), `api/checkAppliedApplications/` (0 client refs), `api/saveData/` (0 client refs), `api/schemas/` (dead schema management). **(5) Archive system**: `**/_archive/` added to `.gitignore` + `tsconfig.json` exclude (was only components before). All `_archive/` folders untracked from git via `git rm --cached`. Existing 47 archived components + config + scripts also now gitignored. **0 new files, 7 modified, 6 archived. 0 TS errors (29 warnings pre-existing). 3,734 tests pass (48 files).** | Infrastructure | MongoDB, Archive System |
| 2026-02-18 | — | **RE-3: API Endpoint — POST /api/rule-engine/evaluate.** Stateless endpoint exposing `evaluatePayload()` to DSA and admin clients. Auth via `requireRoleApi(locals, ['dsa', 'admin'])`, rate limited at 20 evals/min per user (skipped in dev). Request validation extracted as `validateEvaluateRequest()` pure function for testability — checks loanTransaction object, loanName non-empty string, loanAmount positive number, allApplicantDetails non-empty array. Returns `{ success: true, data: LenderResultsData }` or `{ success: false, error }` with appropriate HTTP status codes (400/401/403/429/500). **2 new files, 0 modified. 0 TS errors (29 warnings pre-existing). 3,734 tests pass (48 files, +10 new validation tests).** | Rule Engine | RE-3.1, RE-3.2 |
| 2026-02-18 | — | **RE-2: Evaluation Engine — Complete Runtime Rule Evaluation Pipeline.** 6 new files, 1,577 total lines of production code + 1,050 lines of tests (421 tests across 14 groups). **Architecture**: `evaluatePayload(payload)` → `loadActiveRuleDocuments(loanName)` (MongoDB query) → `evaluateLender(payload, ruleDoc)` per lender (pure function) → `buildResults(evaluations, payload)` (sort, rate, summarize) → `LenderResultsData`. **Module 1: types.ts** (235 lines) — 14 internal pipeline types (ParsedRule, ParsedIncomeRule, ParsedObligationRule, ParsedDeviation, ParsedPolicy, ParsedLenderRuleDocument with 17 sections, GateResult, AssessedIncomeSource, ObligationDetail, AppliedDeviation, LenderEvaluation), 4 section classification constants. **Module 2: emiCalculator.ts** (93 lines) — 5 pure math functions: calculateEMI (standard formula), calculateFoirEligibleAmount (reverse principal from FOIR constraint), calculateLtvCappedAmount (secured only, min of propertyCost/atsValue), calculateOfferedAmount (min of all constraints), determineEffectiveTenure (age/lender/requested limits). **Module 3: incomeAssessor.ts** (383 lines) — 5 functions: mapEmploymentToProfileType (6 employment types), extractGrossMonthlyIncome (salaried/self-employed/company/pensioner/unemployed), assessIncome (multi-applicant, per-source haircuts, guarantor skip, max_contribution_percent capping), computeObligationLoad (string→number parsing, term_loan count_factor, credit_line factor, ignore_if_closing), determineFoirCap (json-logic evaluation, default 0.55). **Module 4: resultBuilder.ts** (580 lines) — 8 exports: buildFactors (gates+FOIR+income+LTV with metrics), buildSuggestions (deviation+general: co-applicant/obligations/tenure/downpayment), assignRatings (percentile-based: 40% amount, 30% ROI, 20% EMI, 10% tenure), calculateApprovalProbability (base per traffic light, FOIR/CIBIL penalties), buildTrafficLightMessage, buildLenderResult, buildSummary. **Module 5: evaluationEngine.ts** (340 lines) — 7 functions: loadActiveRuleDocuments, evaluateHardGates (HARD_GATE_SECTIONS), extractParameters (PARAMETER_SECTIONS, defaults for secured/unsecured), checkDeviations (failed gate coverage), evaluateLender (8-step pure pipeline), buildResults (ratings+sort+summary), evaluatePayload (main entry). **Tests** (14 groups): EMI Calculator (6), FOIR Eligible Amount (4), LTV Capped Amount (5), Offered Amount (4), Effective Tenure (4), Employment Mapping (2), Gross Income (4), Multi-Applicant Income (4), Obligation Treatment (7), FOIR Cap (4), Hard Gates (6), Deviations (5), Traffic Light (7), Factors+Suggestions (7), Ratings (3), Approval Probability (4), Traffic Light Messages (4), Full Pipeline Fixtures (3), Build Results (4), Output Contract (5), Parameters (4). Mock rule document: "Test Bank PVT" with CIBIL gate (min 700), age gate (21-60), FOIR cap (55%/>50K, 50%/<=50K), LTV slabs, ROI by CIBIL, income rules (salaried 100%, professional 80%, business 75%), obligation rules (term 100%, credit 5%), deviation (CIBIL relaxed for income >2L). **6 new files, 1 modified. 0 TS errors (29 warnings pre-existing). 3,724 tests pass (47 files).** | Rule Engine | RE-2.1-RE-2.8 |
| 2026-02-18 | — | **Synthetic Profile Generator — 500 Deterministic Profiles from 107 Archetypes.** Replaced 23 hand-crafted synthetic profiles with a deterministic generator producing exactly 500 realistic Indian loan application profiles. Architecture: `archetypeTemplates.ts` (107 archetypes across 7 sections: HL 25, LAP 15, Plot 12, PL 12, BL 12, PROF 11, Edge 20) -> `dataPools/*.ts` (names, cities, incomes, obligations) -> `syntheticGenerator.ts` (SeededRandom PRNG seed=42) -> `syntheticProfiles.ts` (single wiring point, zero downstream changes). **Data pools**: `namePool.ts` (120 region-tagged Indian names), `cityPool.ts` (30 cities across 3 tiers with property cost ranges), `incomePool.ts` (income ranges by employment type + tier), `obligationPool.ts` (obligation generation + BT details). **Archetype helpers**: `archetypeHelpers.ts` (builders for all employment profiles — salaried, govt, business, pension — with ALL boolean fields explicitly set). **Coverage**: all 6 loan types with 40+ profiles each, CIBIL boundary exact values (580-820), NRI profiles, company applicants, multi-applicant scenarios, BT profiles. All obligation values are string numbers per convention. Company applicants use age=0, gender="Male", maritalStatus="Single". Region-appropriate names (Patel/Shah in Gujarat, Reddy/Rao in South India). City-tier property costs (Mumbai flat 40L-2.5Cr, Patna flat 15L-60L). Admin UI button updated "Seed 23" -> "Seed 500". **Tests**: 12 new generator tests (determinism, count, loan type coverage, unique IDs, boundary CIBIL, NRI, company, multi-applicant, obligations, booleans). **7 new files, 2 modified. 0 TS errors (29 warnings pre-existing). 3,303 tests pass (46 files).** | Synthetic Data | E2E Testing, Rule Engine Testing |
| 2026-02-18 | — | **Synthetic Profile System — 23 Profiles Across All 6 Loan Types.** Updated `SyntheticProfile.payload` type from `Record<string, unknown>` to `LoanApplicationPayload` for type safety. Created `syntheticProfiles.ts` with 23 hand-crafted profiles: Home Loan (3 — govt employee under-construction, SE doctor villa, BT+top-up couple), LAP (4 — trader business expansion, salaried commercial debt consolidation, CA BT, old municipal property), Plot+Construction (2 — salaried foundation stage, SE manufacturer finishing stage with son co-applicant), Personal Loan (3 — salaried clean, govt with obligations, lawyer high-amount), Business Loan (3 — proprietorship manufacturing, LLP secured, seasonal trader moderate CIBIL), Professional Loan (3 — MBBS doctor clinic, architect established, young CA), Edge Cases (5 — unemployed primary with earning spouse, NRI doctor with GPA, pensioner LAP, top-up only, freelancer low-doc). Created `seedSyntheticProfiles()` in `seedPolicyEngine.ts` (upsert pattern, idempotent). Extended seed API endpoint to accept `{ synthetics: true }`. Updated admin testing dashboard: "Seed Synthetic Profiles" button in empty state + Quick Actions. Fixed downstream TS error in artifact test page (`LoanApplicationPayload` not assignable to `Record<string, unknown>`). **2 new files, 4 modified. 0 TS errors (29 warnings pre-existing). 3,291 tests pass (45 files).** | Synthetic Data | E2E Testing Infrastructure |
| 2026-02-18 | — | **Admin E2E Form Fill Orchestration — Synthetic Data-Driven Form Filling (5 Phases).** Full admin-triggered E2E form filling: admin selects profile, clicks Run, Playwright fills form live, screenshots captured. **(Phase 1: Reverse Schema Mapper + Payload Converter)** `reverseSchemaMap.ts` — reads all 6 loan-type schemas, inverts `bindsTo_template` mapping (storage key -> question ID/type/page). `payloadToFillInstructions.ts` — two-step converter: `payloadToFormAnswers()` flattens `LoanApplicationPayload` to bindsTo keys (reverse of `buildLoanPayload()`), `generateFillConfig()` matches keys to reverse map producing page-ordered `FillInstruction[]` with unmapped key tracking. Unit tests: 355 tests covering all 6 loan types, key resolution, value format conversion, full pipeline with fixture01. **(Phase 2: API Endpoints)** `E2eTestRun` type + MongoDB collection (run_id, status flow, screenshots, fill_config). `GET /api/test/e2e-run-config` — dev-only, loads profile payload, generates+stores fill config. `POST /api/admin/testing/e2e-runs` — admin auth + rule_authoring permission, creates run + spawns Playwright via `child_process.exec`. `GET /api/admin/testing/e2e-runs` — list recent 20 runs. `GET/PATCH /api/admin/testing/e2e-runs/[runId]` — status polling + progress updates. **(Phase 3: Playwright Data Filler)** `dataFillHelpers.ts` — `fillPageFromConfig()` (handles radio/text/select/number with showWhen waits), `runDataDrivenFill()` (full orchestration: fetch config, navigate, fill pages, screenshot, report progress). `dataFill.spec.ts` — triggered by `E2E_RUN_ID` env var, runs under DSA project (form filling is a DSA action). **(Phase 4: Admin UI)** `/dashboard/admin/testing/e2e-run` — profile selector (fixtures grouped by loan type, synthetics grouped by loan type), run trigger button, live status panel (polls every 2s, progress bar, page counter), screenshot gallery (served via dev-only endpoint, click to expand), run history table (date/profile/loan type/status/duration). "E2E Form Fill" card added to testing dashboard Quick Actions. **(Phase 5: Polish)** `GET /api/test/screenshots/[...path]` — dev-only static file server for run screenshots (directory traversal protection). E2eTestRuns collection registered in `mongo.ts` with indexes (run_id unique, created_at DESC, 7-day TTL). **12 new files, 2 modified. 0 new TS errors (0 errors, 29 warnings). 3,291 tests pass (45 files). Unified payload format: both fixtures and synthetics use `LoanApplicationPayload`.** | E2E Testing | Admin E2E Orchestration |
| 2026-02-18 | — | **Comprehensive E2E Testing — Multi-Role Auth + All Loan Types + RM + Admin Dashboards.** **(Phase 0: Multi-Role Auth Infrastructure)** Enhanced `/api/test/e2e-auth` with `role` body parameter (dsa/rm/admin) — DSA creates Applicant + DsaApplications, RM creates rmApplications, Admin creates AdminUsers (super admin, all permissions). Each role gets its own JWT + `activeRole` cookie. Rewrote `global.setup.ts` from legacy `globalSetup` function to Playwright `setup` test pattern — 3 parallel auth state files (dsa.json, rm.json, admin.json). Restructured `playwright.config.ts` with 4 projects: `setup` (auth), `dsa` (all specs except -rm/-admin), `rm` (*-rm.spec.ts), `admin` (*-admin.spec.ts). Updated `dashboard.setup.ts` — simplified `ensureDsaProfile()` since e2e-auth now creates DsaApplications directly. **(Phase 1: Shared Form Helpers + All Loan Types)** Created `formHelpers.ts` — extracted 9 generic form interaction utilities (selectRadio, fillText, selectOption, clickNext, clickPrevious, isNextEnabled, waitForQuestion, isQuestionVisible, navigateToLoanForm). Updated `homeLoan.setup.ts` to import from formHelpers and re-export for backward compatibility. Created setup + spec files for 5 loan types: LAP (`lapLoan.setup.ts` + `lapLoan-happyPath.spec.ts`), Plot (`plotLoan.setup.ts` + `plotLoan-happyPath.spec.ts`), Personal (`personalLoan.setup.ts` + `personalLoan-happyPath.spec.ts`), Business (`businessLoan.setup.ts` + `businessLoan-happyPath.spec.ts`), Professional (`professionalLoan.setup.ts` + `professionalLoan-happyPath.spec.ts`). **(Phase 2: RM Dashboard Tests)** Created `rmDashboard.setup.ts` (route constants + helpers) + `rmDashboard-rm.spec.ts` (20 tests across 10 describe blocks: Home, Cases, Communication, Broadcasts, Policies, DSA Search, Submissions, Settings, Analytics, Navigation). **(Phase 3: Admin Dashboard Tests)** Created `adminDashboard.setup.ts` + `adminDashboard-admin.spec.ts` (24 tests across 8 describe blocks: Home, Users, Audit, Policies, Testing, Settings, Navigation, Auth Guard). **(Phase 4: Share Link + Multi-Role Login)** Created `shareLink.spec.ts` (API creation/validation/rejection + public page load/error tests) + `multiRoleLogin.spec.ts` (role detection, cross-role denial, role cookie verification). Also fixed dead `/dev/synthetic` link in admin testing dashboard. **17 new files, 4 modified. 0 new TS errors. E2E test count: 24 existing + ~17 new spec files = 41 total spec files.** | E2E Testing | Phases 0-4 |
| 2026-02-17 | — | **Tour Updates + Admin RBAC + Testing Dashboard — 3 Workstreams.** **(Workstream 1: Shared Links Tour)** Added `'shared-links'` to `PageTourId` union type, created `sharedLinksTour.ts` (5 steps: welcome, filter tabs, card anatomy, copy/revoke actions, finish), registered in `PAGE_TOUR_REGISTRY`, updated API Zod enum, added `data-walkthrough` attrs + `PageTourButton` to shared-links page (filter tabs, first card, first actions, empty state), added shared-links step to intro tour (after CRM, with skipIfMissing), added detailed shared-links step to explanatory tour. **(Workstream 2: Admin RBAC — 5 phases)** **(Phase B: Foundation)** Added `is_super_admin?: boolean` to `AdminUser` type, updated `seedAdmin.ts` to read `IS_SUPER` env var, populated `locals.adminPermissions` + `locals.isSuperAdmin` during admin auth in `hooks.server.ts` (avoids extra DB queries downstream), added `adminPermissions` + `isSuperAdmin` to `App.Locals`, created 4 permission guard functions in `guards.ts`: `requireAdminPermission(locals, permKey)` (API, reads from locals, super admin bypass), `requireSuperAdmin(locals)` (API), `requireAdminPermissionPage(locals, permKey)` (page load), `requireSuperAdminPage(locals)` (page load). **(Phase C: Route Enforcement)** Applied `requireAdminPermission` to all 31 admin API route handlers across 31 files: user routes → `user_management` (9 handlers, 5 files), policy/policy-engine routes → `rule_authoring` (31 handlers, 23 files), settings routes → `system_settings` (7 handlers, 3 files). Updated admin nav in dashboard layout with `adminPerm` + `superOnly` fields, added permission-based filtering (super admins see all, regular admins filtered by their permissions). Passed `isSuperAdmin` from admin layout server (uses `locals.isSuperAdmin`, avoids duplicate DB query). **(Phase D: Admin Management)** Created 3 new API routes: `GET/POST /api/admin/admins` (list/create, super admin only), `PATCH /api/admin/admins/[admin_id]` (update permissions/activate/deactivate, self-protection), `POST /api/admin/admins/[admin_id]/promote` (2-step OTP flow: send-otp to acting admin's phone via MSG91, then verify + promote/demote, self-demotion blocked, last-super-admin blocked, audit logged). Created admin management page at `/dashboard/admin/users/admins` (super admin only) with admin table (name, role badge, permission toggles, status, last active, actions), add admin modal (name + mobile + permission checkboxes), promote/demote OTP modal (send OTP → enter OTP → confirm). **(Workstream 3: Testing Dashboard)** Added `seedFixtureProfiles()` to `seedPolicyEngine.ts` — dynamically imports 15 canonical fixtures from `fixtureProfiles.test.ts`, upserts into `LenderRuleFixtures` with FIX-01..FIX-15 IDs. Updated seed API to accept `{ fixtures: true }` flag. Created testing dashboard at `/dashboard/admin/testing` (rule_authoring gated) with 4 sections: test health summary (reads vitest results.json if exists), fixture profiles table (from LenderRuleFixtures, with test links), synthetic profiles summary (grouped by loan_type from SyntheticProfiles), quick actions (seed fixtures, test artifact links, stats). Wired artifact test page to support `?syntheticId=` query param (loads SyntheticProfile payload as custom JSON). Added "Testing" nav item (rule_authoring gated) and "Admin Accounts" nav item (superOnly). **7 new files, ~35 modified. 0 TS errors (27 warnings pre-existing), 2,936 tests pass (44 files).** | Tour + RBAC + Testing | Workstreams 1-3 |
| 2026-02-17 | — | **Share Link Full Integration — 6 Phases.** Closed all gaps in the applicant self-fill share link system. **(Phase 1: MSG91 OTP)** Rewrote `src/routes/api/share-link/verify-otp/+server.ts` to use real MSG91 Widget API (`sendOtp`/`verifyOtp`) matching the auth login pattern. Removed entire in-memory OTP store from `shareLinks.ts` (`shareOtpStore` Map, `generateShareOtp()`, `verifyShareOtp()`, `isShareOtpVerified()`, periodic cleanup interval). Updated `submit/+server.ts` and `upload/+server.ts` to remove `isShareOtpVerified` dependency — OTP now verified client-side via MSG91 widget (same trust model as login). Dev mode fallback: console-logs OTP and accepts any 6-digit code. **(Phase 2: ImageKit Cloud Upload)** Rewrote `upload/+server.ts` to use `imagekit.files.upload()` with base64 string instead of local `fs.writeFile`. Removed `fs/promises`, `path`, `UPLOAD_DIR`, directory creation. Returns ImageKit URL/path/name. **(Phase 3: Feature Gating)** Created `src/lib/server/featureGate.ts` with `isFeatureEnabled(featureKey, dsaId)` checking 3 layers: SystemConfigs global toggle, DSA `feature_flags` per-user override, subscription tier (free tier blocked for premium features). Added `share_links_enabled` to `DEFAULT_SYSTEM_CONFIGS` in `policyEngine.ts`. Added feature gate check to `create/+server.ts`. Added `shareLinksEnabled` to case layout server return. **(Phase 4: ShareLinkButton Integration)** Restored `ShareLinkButton.svelte` from `_archive/` with enhancements: `featureEnabled` prop (shows "Pro feature" badge when false), "View All Links" button, dark mode CSS variable support. Integrated in case detail page (`+page.svelte`) in a "Quick Actions" section, gated by `shareLinksEnabled` + `form_submission_id` existence. **(Phase 5: DSA Link Management)** Created `GET /api/share-link/list` endpoint with status filter. Added `getLinksForDsa()` to `shareLinks.ts` (active/completed/expired/revoked query building). Created `/dashboard/dsa/shared-links/` page with server load (case label enrichment via Cases collection batch lookup) and full management UI (filter tabs with counts, status badges, copy link, revoke with confirmation, time remaining display). Added "Shared Links" nav item to dashboard layout. **(Phase 6: DSA Branding)** Added `branding?` field to `FormShareLink` type. Rewrote `/f/[token]/+page.server.ts` to look up DSA record (`DsaApplications`) for firm name + logo URL. Updated `/f/[token]/+page.svelte` header with branding display (logo or initial letter fallback + firm name) and "Powered by DigitalDSA" footer. **4 new files, 13 modified. 0 TS errors (24 warnings pre-existing), 2,936 tests pass (44 files).** | Share Link Integration | Phases 1-6 |
| 2026-02-17 | — | **Policy Engine Phase 6: RM Dashboard Enhancements.** Enhanced RM dashboard home page with policy action items and recently approved feed. **(1) Server enhancements** (`src/routes/dashboard/rm/+page.server.ts`) — Added 3 parallel MongoDB queries after existing data loading: `RMSubmissions` with status='clarification_needed' + rm_id match (items where admin requested more info), `PolicyVersions` with status='pending_rm_review' + provenance.source_rm_id match (policy docs sent to RM for review), `PolicyVersions` with status='active' sorted by updated_at (recently activated policies). Enriches versions with lender/product/variation names via batch lookups through PolicyRules -> Lenders/LenderProducts/ProductVariations. New imports: RMSubmissions, PolicyVersions, PolicyRules, Lenders, LenderProducts, ProductVariations, PRODUCT_TYPE_LABELS. Returns `actionRequired` array (type/id/title/subtitle/urgency/link) + `recentlyApproved` array (version_id/lender_name/product_label/variation_label/version_number/activated_at). **(2) Action Required section** (`src/routes/dashboard/rm/+page.svelte`) — Amber warning banner between welcome header and stats row, shows when actionRequired.length > 0. Each item: type badge (purple "Clarification" or blue "Review Policy"), urgency badge (red Critical or amber Urgent when applicable), title, subtitle preview, time-ago, chevron link. Links to `/dashboard/rm/submissions/[id]` for clarification items or `/dashboard/rm/review/[version_id]` for policy reviews. Dark mode aware with `dark:` variant classes. **(3) Recently Approved sidebar** — Green-accented card in right sidebar showing last 5 activated policy versions. Each entry: green dot indicator, lender name, product/variation labels, version number, time-ago activation date. "View all policies" link when >5 items. Uses existing dashboard CSS variable system (`--dash-*`, `--ddsa-*`). **2 files modified. 0 TS errors (15 warnings pre-existing), 2,936 tests pass (44 files).** | Policy Engine | Phase 6: RM Dashboard Enhancements |
| 2026-02-17 | — | **Policy Engine Phase 5: Approval Workflow + Parsing Indicators.** Complete admin approval workflow with queue dashboard and parsing status indicators. **(1) Admin API endpoints** (6 files in `src/routes/api/admin/policy-engine/`) — `GET/POST /api/admin/policy-engine/comments` (list with target_type/target_id filter, create with text + attachment_ids, audit logged), `POST /api/admin/policy-engine/comments/[id]/resolve` (mark as resolved with resolver + timestamp, idempotent), `POST /api/admin/policy-engine/versions/[version_id]/verbal-approval` (log verbal/email/whatsapp RM confirmation, transitions pending_rm_review → pending_admin_final, records confirmation method + date + notes + RM name in provenance, audit logged), `POST /api/admin/policy-engine/versions/[version_id]/status` (general-purpose status transition using `isValidStatusTransition()`, supports reject/send-to-rm/corrections-requested, with optional reason, audit logged), `GET /api/admin/policy-engine/submissions` (admin view of all RM submissions with status/urgency/lender_id filters), `POST /api/admin/policy-engine/submissions/[id]/status` (submission status state machine: submitted→under_review, under_review→clarification_needed/accepted/rejected, clarification_needed→under_review/rejected, with optional admin_notes, audit logged). **(2) Approval dashboard** (2 files at `src/routes/dashboard/admin/policies/approvals/`) — `+page.server.ts`: 4 parallel MongoDB queries (pending versions, pending submissions, parsing artifacts, recently activated), batch enrichment with lender/product/variation names via PolicyRules → Lenders/LenderProducts/ProductVariations lookups, comment count aggregation per version, serialized with ISO dates. `+page.svelte`: stat cards (4 counts), currently-parsing banner (animated pulse indicator with artifact links + 10s auto-poll via $effect), 3-tab system with count badges (Pending Versions — cards with lender/product/variation/geo/source/age/comment-count + Log Verbal Approval/Reject buttons for pending_rm_review + Approve/Reject for pending_admin_final; RM Submissions — cards with RM name/lender/urgency/description/docs + Start Review/Accept/Need Clarification/Reject/Resume Review actions; Recently Activated — simple list with dates), action handlers with loading states and success/error feedback. **(3) Parsing status indicators** — artifact detail page (`[artifact_id]/+page.svelte`): added pulsing "AI parsing in progress" blue banner when status=parsing (for other admins visiting), auto-poll every 5s via $effect when status=parsing (refreshes via invalidateAll), success toast showing iteration count + convergence status after parse completes, failure toast on error, animated status badge with "Parsing..." text. Policies list page (`+page.svelte`): animated parsing badges with pulsing blue dot on both Legacy Artifacts grid view and All Artifacts table view. **(4) Nav update** — added "Approvals" item to admin sidebar nav in dashboard layout. All pages use Svelte 5 runes, Tailwind CSS, en-IN date formatting. **9 new files, 3 modified. 0 TS errors (15 warnings pre-existing), 2,936 tests pass (44 files).** | Policy Engine | Phase 5: Approval Workflow |
| 2026-02-17 | — | **Policy Engine Phase 4: RM Submission + Upload Flow.** Complete RM-facing policy submission and review system. **(1) RM Submission API endpoints** (3 files in `src/routes/api/rm/submissions/`) — `GET/POST /api/rm/submissions` (list with status filter, create with lender_id/description/urgency/optional product_type/geo fields, generates `SUB-YEAR-RMID-BASE36` IDs, audit logged), `GET/PATCH /api/rm/submissions/[id]` (detail + update, ownership-scoped to RM, updates only allowed in submitted/clarification_needed status), `POST /api/rm/submissions/[id]/documents` (multipart file upload to ImageKit, validates PDF/JPEG/PNG/WebP, max 10MB, creates PolicyEvidenceDocuments records, appends document_ids to submission). **(2) RM Review API endpoints** (2 files in `src/routes/api/rm/review/`) — `GET /api/rm/review/[version_id]` (loads PolicyVersion in pending_rm_review status, generates human-readable policy doc via policyDocGenerator, returns with lender/product/variation/geo context), `POST /api/rm/review/[version_id]/respond` (two actions: `approve` transitions to pending_admin_final with portal confirmation + optional notes, `request_corrections` transitions to rm_corrections_requested with required comment min 5 chars creating ReviewComments entry; both audit logged with actor role=rm). **(3) RM Dashboard pages** (4 routes, 8 files in `src/routes/dashboard/rm/`) — `/submissions` (list page with 6 status filter buttons, urgency badges, submission cards with lender/description/dates/doc count), `/submissions/new` (form with lender dropdown from Lenders collection, product type filtered by selected lender, state from GeoScopes, urgency toggle, description textarea with 10-char min, POST on submit then redirect to detail), `/submissions/[submission_id]` (detail page showing metadata grid, description, evidence documents with upload button when status allows, comments thread), `/review/[version_id]` (policy review page rendering generated HTML doc with scoped CSS, previous comments, action panel with approve/request-corrections buttons, conditional textarea for corrections comment, success state with dashboard link). **(4) Nav update** — added "Submissions" item to RM sidebar nav in dashboard layout. All pages use Svelte 5 runes, Tailwind CSS, en-IN date formatting. **13 new files, 1 modified. 0 TS errors (15 warnings pre-existing), 2,936 tests pass (44 files).** | Policy Engine | Phase 4: RM Submission + Upload |
| 2026-02-17 | — | **Policy Engine Phase 3: Admin Policy Browser + Editor.** Complete admin CRUD API layer + policy document generator + tree browser UI. **(1) Admin API endpoints** (11 files in `src/routes/api/admin/policy-engine/`) — Lenders GET/POST + GET/PATCH by lender_id (detail includes products/variations/rules counts), Products GET/POST (with lender existence check), Variations GET/POST (with product existence check + category validation), GeoScopes GET/POST (with parent validation + specificity auto-set + zone_type enforcement), Rules GET/POST (matrix slot creation at variation x geo intersection), Versions GET/POST per rule (auto-increment version number + provenance tracking), Approve (pending_admin_final -> approved with status transition validation), Activate (approved -> active + supersede previous + cache bust via bustCacheForLender), Resolve Preview (preview resolution with skipCache:true), Seed (run seedPolicyEngine). All endpoints: admin-only via `requireRoleApi('admin')`, audit logging to PolicyAuditLogs, uniqueness checks on composite IDs, proper error codes (400/401/403/404/409/500). **(2) Policy Document Generator** (`src/lib/server/policyDocGenerator.ts`) — template-based (not AI) deterministic HTML/markdown generator from PolicyVersion data. `generatePolicyDoc()` returns HTML, `generatePolicyDocMarkdown()` returns markdown. 9 field groups (Interest Rate, Processing Fee, Prepayment & Lock-in, Insurance, Turnaround, Loan Limits, Special Schemes, Other Charges, Disbursement). Field-specific formatting (INR currency, percentages, months/days/years, boolean Yes/No). XSS-safe via `escapeHtml()`. **(3) Admin policies page** — refactored `+page.server.ts` to fetch both legacy LenderRuleArtifacts AND new policy engine data (Lenders, Products, Variations, Rules) in parallel. Builds `policyTree` (nested Lender > Product > Variation with rules_count + has_active_version) and `policyStats` (totalLenders/Products/Variations/Rules). Refactored `+page.svelte` with 3-tab view: "Policy Engine" (default, stats cards + search + accordion tree browser with expand/collapse + active version green dots), "Legacy Artifacts" (existing grid), "All Artifacts" (existing table). Svelte 5 runes throughout ($state, $derived, $props). **14 new files, 2 modified. 0 TS errors, 2,936 tests pass (44 files).** | Policy Engine | Phase 3: Admin Browser + Editor |
| 2026-02-17 | — | **Policy Engine Phase 2: Resolution Engine.** CSS-specificity policy resolution algorithm. **(1) Resolution engine** (`src/lib/server/policyResolver.ts`) — `resolvePolicy()` function implementing the two-axis resolution: builds geo scope chain from property location (pan_india > state > city > zone), queries PolicyRules matching variations + cross-variation at any geo in chain (1 MongoDB query), loads active PolicyVersions (1 batch query), sorts by specificity (geo ASC, cross-variation before variation-specific at same level), merges policy_fields (last write wins per field), collects rule_overlays in order. Returns resolved_fields + field_sources (provenance per field: which rule, version, geo level contributed) + resolution_chain + resolved_rule_overlays. `buildGeoScopeChain()` exported for reuse. In-memory cache with 1hr TTL — `bustCacheForLender()` for targeted invalidation on version activation, `bustAllCache()` for full reset, `getCacheStats()` for monitoring. Accepts optional collection overrides for unit testing without MongoDB. **(2) Unit tests** (`src/lib/testing/__tests__/ruleEngine/policyResolver.test.ts`, 33 tests) — mock Collection helpers (in-memory filter matching with $in/$or support), test data factories. Test coverage: buildGeoScopeChain (8 tests: empty/state/city/zone/slugification/missing intermediate levels), basic resolution (5 tests: empty, single pan_india, provenance tracking, no active version skip, null/undefined field filtering), specificity cascade (3 tests: state overrides pan_india, city > state > pan_india 3-level cascade, zone overrides city), cross-variation rules (2 tests: cross before variation-specific at same geo, variation-specific overrides cross at pan_india), field inheritance (1 test: 7 pan_india fields with 1 state override), rule overlays (1 test: ordered collection from chain), multiple variations (2 tests: merged fields, unmatched variation excluded), inactive rules (1 test), resolution chain fields_contributed tracking (1 test), cache behavior (5 tests: stats, second call cached, bustCacheForLender targeted, bustAllCache, skipCache bypass), integration scenarios (3 tests: realistic HDFC 4-rule cascade, boolean false handling, numeric zero handling, empty string handling). **(3) API endpoint** (`POST /api/policy-engine/resolve`) — auth guard (any authenticated user), input validation (lender_id string, product_type enum, matched_variation_ids non-empty array, optional property_state/property_city/zone_type), returns `{ success: true, data: ResolvedPolicy }`. **3 new files, 0 modified. 0 TS errors, 2,936 tests pass (44 files).** | Policy Engine | Phase 2: Resolution Engine |
| 2026-02-17 | — | **Policy Engine Phase 1: Schema + Types + Collections.** Foundation for the two-axis policy management system (Product axis: Lender > Product Type > Variation x Geography axis: PAN India > State > City > Zone). **(1) Type system** (`src/lib/types/policyEngine.ts`) — 10 document interfaces (Lender, LenderProduct, ProductVariation, GeoScope, PolicyRule, PolicyVersion, PolicyEvidenceDocument, RMSubmission, ReviewComment, PolicyAuditLog), 14 enums/type unions (ProductType 10 codes, GeoLevel 4, PolicyVersionStatus 8, VariationCategory 6, LenderClassification 3, ConfirmationMethod 4, UrgencyLevel 3, RMSubmissionStatus 5, RuleOverlayAction 3, AuditAction 15, ReviewTargetType 2, LenderStatus 3, ZoneType 3, PolicyFieldKey 25), PRODUCT_TYPE_MAP (form loanName+loanType to canonical codes), POLICY_FIELD_KEYS array + POLICY_FIELD_LABELS record, GEO_SPECIFICITY scoring map, VALID_STATUS_TRANSITIONS state machine + isValidStatusTransition() validator, toLenderSlug() helper, resolution types (PolicyResolutionQuery, FieldSource, ResolvedPolicy). **(2) MongoDB collections** (`src/lib/database/mongo.ts`) — 10 new typed collections: Lenders, LenderProducts, ProductVariations, GeoScopes, PolicyRules, PolicyVersions, PolicyEvidenceDocuments, RMSubmissions, ReviewComments, PolicyAuditLogs. 20+ indexes: unique composite IDs (lender_id, product_id, variation_id, geo_scope_id, policy_rule_id, submission_id, document_id), resolution query index (variation_id + geo_scope_id + is_active), cross-variation lookup (product_id + is_cross_variation + geo_scope_id), version uniqueness (policy_rule_id + version_number), approval queue (status + created_at), hierarchy traversal (parent_geo_scope_id), audit TTL (2yr auto-purge). **(3) Seed script** (`src/lib/database/seedPolicyEngine.ts`) — seedLenders() converts 53 banks from bankName.ts to Lenders collection (URL-safe slugs, classification, bank_name_value), seedGeoScopes() creates PAN India root + 36 unique states/UTs from gstStateCodes.json (deduplicates Andhra Pradesh), migrateArtifacts() converts active/approved LenderRuleArtifacts to new system (creates LenderProduct + standard ProductVariation + PolicyRule@pan_india + PolicyVersion with extracted policy fields and provenance tracking). All operations idempotent (upsert). **3 new files, 1 modified. 0 errors, 2,903 tests pass (43 files).** | Policy Engine | Phase 1: Schema + Types |
| 2026-02-17 | — | **RE-1: Rule Validator complete.** Created `src/lib/ruleEngine/ruleValidator.ts` (380 lines) implementing all 6 exported functions: `extractVarPaths()` (JSON-Logic expression walker), `validateVarPath()` (payload key registry validation for loanTransaction + allApplicantDetails with nested profiles/obligations/directors/gpaDetails), `validateRule()` (rule object validation with var path cross-checking), `validateDeviation()` (deviation validation with rule cross-reference), `validatePolicyKey()` (25 universal policy keys), `validateLenderRuleDocument()` (full document validation with duplicate ID detection, policy key validation, error collection from all sections). Key registries: 47 loanTransaction keys, 27 applicant flat keys, 12 salaried profile keys, 17 government profile keys, 17 business profile keys, 15 pension profile keys, 4 financials keys, 8 low credit reasons keys, 4 GPA keys, 13 obligation fields, 4 director fields, 25 policy keys. All 134 ruleValidator tests pass. Full suite: 2,903 tests across 43 files, 0 failures. **1 new file.** | Rule Engine | RE-1.1, RE-1.2 |
| 2026-02-17 | — | **Doc Cleanup + Rule Engine Path A Plan.** Comprehensive code audit of admin dashboard (all 25+ files verified working). Consolidated 14 redundant/superseded MD files into DEVELOPMENT-PLAN.md. Deleted: IMPLEMENTATION_GUIDE.md, WEBSITE_REVAMP_SPEC.md, WEBSITE_REVAMP_SPEC_updated.md (root); TESTING_AUTOMATION_MASTER_PLAN.md, TESTING_AUTOMATION_CHECKLIST.md, TESTING_DATA_SPECIFICATION.md, SCHEMA_RECOMMENDATIONS.md, TEST_PROFILES.md, TESTING_GUIDE_FOR_BEGINNERS.md, TEST_DATA_MANAGEMENT_SYSTEM.md, PLATFORM-AUDIT-2026-02-16.md, STORE-REDESIGN.md, STORE-REDESIGN-LOG.md, SVELTE5_STATE_MIGRATION.md, RULE-ENGINE-BROWSER-TESTS.md, ADMIN-DASHBOARD-HANDOFF.md (docs/). Kept 3 reference docs: RULE-ENGINE-SPECIFICATION.md, PAYLOAD_DOCUMENTATION.md, LOAN-ASSESSMENT-API-INTEGRATION.md. Added Admin Dashboard phase (AD-1 to AD-6, all done except AD-6.1-6.3 pending). Added Rule Engine Phase Path A (RE-1 to RE-5, 22 tasks). Updated tasks 3.8-3.11 to reference Rule Engine phase. Moved rule engine from Phase 9 deferred to active. Added Section 6.5 Reference Documents. **17 files deleted, 1 file updated.** | Doc + Planning | Admin Dashboard, Rule Engine Plan |
| 2026-02-17 | — | **Admin Login Fix + Role Selection Modal + Handoff Document.** Fixed admin login for multi-role users (phone number in both DSA + AdminUsers). **(1) check-dsa preferredRole parameter** (`src/routes/api/auth/check-dsa/+server.ts`) — added optional `preferredRole` to POST body. When `preferredRole === 'admin'`: skips DSA/RM fallback chain, goes straight to AdminUsers collection. When `preferredRole === 'rm'`: skips to rmApplications. Default (no preferredRole or 'dsa'): original fallback chain unchanged. Backward compatible — existing callers unaffected. **(2) Login page role selection modal** (`src/routes/(auth)/login/+page.svelte`) — `loginWithRole(role)` now passes `preferredRole: role` to check-dsa. When detect-roles returns admin + other roles (e.g. DSA + admin), a modal dialog appears: "Which profile would you like to continue with?" with styled cards for each role (Admin Dashboard / DSA Dashboard / RM Partner Dashboard). Single role detected: routes directly as before (no modal). Modal state: `showRoleModal`, `availableRoles`, `roleModalUserName`. **(3) Handoff document** (`docs/ADMIN-DASHBOARD-HANDOFF.md`) — comprehensive handoff for VS Code Claude: what was asked, what was built, file inventory (25+ new, 8 modified), architecture decisions, auth flow diagram, database collections, local testing guide, known issues. **2 files modified, 1 new file. 0 new type errors (44 pre-existing). 14 warnings (pre-existing).** |  Admin Auth | Login Fix |
| 2026-02-17 | — | **Admin Dashboard — Full Implementation (admin-dashboard branch).** Complete admin dashboard for `admin.digitaldsa.com` with 5 phases. **Phase 1 (Admin Auth Foundation)**: New `AdminUser` type (`src/lib/types/adminUser.ts`) with permissions (user_management, rule_authoring, system_settings). New `RuleArtifactPair` type (`src/lib/types/ruleArtifact.ts`) with 7-status pipeline (draft/parsing/in_review/rm_pending/approved/active/superseded), DiffReport, ParseIteration, RMQuery, ConfidenceScores. Added `AdminUsers`, `LenderRuleArtifacts`, `LenderRuleFixtures` collections to `mongo.ts` with indexes. Extended auth chain: `detect-roles` checks adminUsers (4th collection), `check-dsa` generates admin JWT, `hooks.server.ts` refresh chain + token persistence + user resolution includes AdminUsers. Seed script (`seedAdmin.ts`) for CLI admin creation. **Phase 2 (Layout & Navigation)**: Updated admin nav items (Dashboard/Users/Policies/Settings). Admin layout guard with hostname check (`admin.digitaldsa.com` in production). Enhanced overview page with pipeline status section (counts by artifact status). Account stats API extended with RM counts + pipeline aggregation. **Phase 3 (User Management)**: Users page with DSA/RM tabs, search, pagination, suspend/unsuspend toggle. User detail view with profile card, case history (DSA only), stage badges. DSA and RM user APIs (GET paginated + PATCH suspend). **Phase 4 (Rule Authoring Pipeline)**: AI Service module (`aiService.ts`) with 4 functions (parseRawPolicy, reverseWriteRules, comparePolicies, autoCorrectRules) + runFullParsePipeline orchestrator (max 4 iterations). Supports OpenAI + Anthropic via `$env/dynamic/private`. Policies listing page (by-lender card grid + all-artifacts table). Upload page with lender selection, file upload (PDF/JPEG/PNG/WebP), ImageKit integration, auto-versioning. Artifact pipeline view with 6-stage progress bar, source documents panel, parsed output toggle (human-readable/JSON-Logic), confidence scores, parse iterations accordion, contextual action buttons per status. 4 pipeline action APIs: parse (triggers AI pipeline), review (approve/send_to_rm/request_correction), publish (activate + supersede previous), reparse (re-run with corrections). Fixture test page: select from 15 built-in profiles or paste custom JSON, client-side json-logic-js evaluation against artifact rules, traffic light results with gate/computed/parameter breakdown. **Phase 5 (Settings)**: Admin profile view, permissions grid, system information. **25 new files, 8 modified files. 0 new type errors (44 total, all pre-existing from ruleValidator.test.ts + driver.js). 2,769 tests pass (42 suites, 1 pre-existing failure in ruleValidator.test.ts). 13 warnings (all pre-existing).** | Admin Dashboard | Phases 1-5 |
| 2026-02-17 | — | **Dashboard Dark Mode: DDSA Token Overrides + Driver.js Theme + CTA Shadows.** Fixed 113+ instances of invisible text on dark dashboard backgrounds. Root cause: `--ddsa-secondary-900` (`#0f172a` — near-black) used for all headings/labels/stat values was never overridden in `.dark` block. **(1) CSS variable overrides** (`app.css`): Added 10 `--ddsa-*` dark overrides in `.dark` block — `--ddsa-secondary-900/800/700` flipped to light slate tones (#f1f5f9/#e2e8f0/#cbd5e1), `--ddsa-primary-50/100` to subtle dark amber (rgba), `--ddsa-primary-700` to bright amber (#fbbf24), `--ddsa-white` to dark (#0f172a), `--ddsa-gray-100/200/300` to dark slate (#1e293b/#334155/#475569). Fixes ~99 `text-[var(--ddsa-secondary-900)]` instances, ~14 `color: var(--ddsa-secondary-900)` in CSS blocks, ~22 badge backgrounds, ~14 badge texts — all automatically, zero component changes. **(2) Driver.js dark mode** (`driver-theme.css`): Added `:where(.dark)` overrides for popover background (was hardcoded `white !important`), box-shadow (darker), prev-btn (dark bg + slate border), arrow (matches bg), close-btn (muted). Title/description text automatically fixed by DDSA token overrides. **(3) CTA shadow fix** (7 files): Added `dark:shadow-orange-900/20` alongside `shadow-orange-200` on gradient CTA buttons in DSA dashboard, cases (2x), analytics, RM dashboard, RM analytics, RM broadcasts — eliminates absurd light orange glow on dark backgrounds. **Light mode completely unchanged** (all overrides inside `.dark`). **9 files changed. 0 errors, 10 warnings (pre-existing).** | Dark Mode | Dashboard DDSA Tokens, Driver.js Theme, CTA Shadows |
| 2026-02-17 | a1a46fb4 | **Dark Mode Form Gaps + Auto-Scroll Race Condition Fix.** Fixed 3 remaining issues after the dark mode overhaul. **(1) White body background in dark mode**: Added 5 legacy CSS variable overrides (`--color-bg-main`, `--color-text-main`, `--color-text-light`, `--color-bg-alt`, `--color-border`) in `.dark` block of `app.css` — body uses `--color-bg-main` which defaulted to `#ffffff`. Removed the `onMount` block in `form/+layout.svelte` that forcibly stripped `.dark` class ("dark theme isn't fully styled") — now it IS fully styled. **(2) Black text on dark backgrounds**: Fixed hardcoded `text-black` / `text-gray-*` without `dark:` variants in 7 form components: `FormLogo.svelte` (button text + SVG stroke), `DerivedSelect.svelte` (removed redundant `text-black`, uses `labelText` class), `Directors.svelte` (added `dark:text-[var(--form-text-label)]`), `Company.svelte` (added `dark:text-[var(--form-text)]`), `BasicInfoUnsecureLoan.svelte` (3 label conditionals), `customIncomeTable.svelte` (thead), `ApplicantRow.svelte` (4 gray text/bg classes with dark variants). **(3) Auto-scroll effect race condition**: Two separate `$effect` blocks were racing — `update()` ran first (cleared `isInitialLoad`), then `reset()` ran (re-set it), but `update()` never fired again. Merged into single `$effect` with `lastPageForScroll` tracking so `reset()` always runs before `update()` in the same reactive cycle. Applied to all 7 form pages. **36 files changed. 0 errors, 2,369 tests pass (40 files). 10 warnings (pre-existing).** | Dark Mode + Auto-Scroll | Form Dark Mode Gaps, Auto-Scroll Fix |
| 2026-02-17 | — | **Full Dark Mode + Mobile UX Overhaul — 129 Files.** Added complete dark mode support across the entire application. **(1) CSS Variable System**: Created `--dash-*` CSS variables (11 vars) in `:root` and `.dark` overrides in `app.css`, matching the existing `--landing-*` and `--form-*` patterns. Variables cover: `--dash-bg`, `--dash-bg-card`, `--dash-bg-alt`, `--dash-bg-elevated`, `--dash-text`, `--dash-text-secondary`, `--dash-text-muted`, `--dash-border`, `--dash-border-light`, `--dash-hover`, `--dash-input-bg`. **(2) Dashboard Layout**: Full dark mode conversion of sidebar, bottom nav, delete modal, team banner. Added dark mode toggle button (sun/moon/monitor cycling) in sidebar footer between TourLauncher and Delete Account. Imported `themeStore` with `init()` and subscribe for reactive mode display. **(3) Mobile UX**: Added `env(safe-area-inset-bottom)` padding to bottom nav for iOS notch devices. Added `min-h-[44px]` touch targets to bottom nav items. **(4) DSA Dashboard Pages (15 files)**: All 7 main pages + 4 case sub-pages + 3 CRM sub-pages + member detail — replaced hardcoded `bg-white`, `text-gray-*`, `border-gray-*` with `--dash-*` CSS variable references. Added `dark:` variants for semantic status colors (red/green/blue/amber badges and banners). **(5) RM Portal (9 files)**: All 9 RM dashboard pages converted with same `--dash-*` pattern. **(6) Dashboard Components (~19 files)**: QuickActions, PipelineColumn, PipelineCaseCard, PipelineChart, MiniBarChart, SampleDataBanner, AttentionCard, CaseListCompact, ActivityFeed, MessageComposer, LenderApplicationCard, LenderComparisonTable, DocumentChecklist, DocumentUpload, EmailVerificationModal, RMContactCard, EligibilityCard, CommunicationTemplateCard, AccuracyRatingForm — all converted. Hardcoded hex colors in `<style>` blocks replaced with CSS variable references. **(7) Results + Evaluation + Credit (6 files)**: CreditScoreSection (15+ inline hex → CSS vars), InsightCard, EvaluationStep, CrossSellBanner, ImprovementTips, LoanOfferCard — all using `--form-*` or `--dash-*` vars. **(8) Modal Components (9 files)**: Modal, WideModal (max-height 95svh→90svh for mobile), ConfirmModal, InfoModal, ApplicantModal, SessionResumeModal, RestoreApplicantModal, EmailOtpModal, MonthYearModal — `bg-white` → `bg-[var(--form-bg-card)]`. **(9) Shared Components (~15 files)**: Breadcrumb, LanguageSelector, DemoBanner, ApplicantCard, Progress, ProgressBar, DescriptionCard, DescriptionTooltip, GroupHeader, ModalTabs, NavigationButton, ToggleItem, TourLauncher, PageTourButton. **(10) Onboarding (9 files)**: OnboardingV2Wizard, BusinessProfileSection, PainPointsSection, WorkflowSection, ModuleSelectionSection, GoalsSection, BasicFields, NewSelect, DSADetails. **(11) Offer Pages (9 files)**: All 9 offer pages converted with `--form-*` vars. **(12) Application Result Pages (8 files)**: All 7 result pages + evaluating page converted. **(13) Auth + Legal + Misc**: Login page inline hex → CSS vars, partner-signup, error page, team-invite, token page — all converted. **(14) Form Field Wrappers (~14 files)**: NumberFieldIndianFormat, Radio, RadioCustom, SelectionCustom, TextareaField, CheckboxField, AlphaNumeric, SingleTextField, CalendarField, DateField, DatePickerYearAndMonth, MultipleSelectField, TwoSideMultipleSelectField, MultiOptionsSelection — container colors converted to `--form-*` vars. **(15) Form Shell + Income (~14 files)**: FormNavigationBar (legacy vars updated), FormMobileSections (hardcoded white fixed), MobileFloatingButtons (safe-area-inset-bottom added), IncomePageNew, IncomeSourceForm, IncomeSourceEntries, customIncomeTable, Obligation, UnsecuredObligation, ExistingLoanDetails, DocumentUploadSection, RelationTable, TableQuestion, LoanTable. **(16) CSS Dark Mode Fixes**: `.input-error`, `.input-success`, `.success-message` — all have `:where(.dark, .dark *) &` nested rules for dark backgrounds. **129 files changed, +2,797, -2,713. 0 errors, 2,369 tests pass (40 files).** | Dark Mode + Mobile | Full App Dark Mode |
| 2026-02-17 | — | **Per-Page Driver.js Walkthroughs — 6 Dashboard Pages.** Extended the Driver.js walkthrough system with per-page tours for all 6 dashboard pages (Profile, Cases, CRM, Communication, Analytics, Team). **39 total steps across 6 tours**: Profile (6), Cases (7), CRM (8), Communication (6), Analytics (7), Team (5). Each tour: centered welcome popover → data-dependent element highlights with `skipIfMissing: true` → centered finish popover. **New files (8)**: 6 tour config files (`src/lib/config/walkthrough/pages/{profileTour,casesTour,crmTour,communicationTour,analyticsTour,teamTour}.ts`), registry (`pages/index.ts` — `PAGE_TOUR_REGISTRY: Record<PageTourId, WalkthroughStep[]>`), `PageTourButton.svelte` (question-mark icon with green completed dot). **Types extended**: `PageTourId` union type (6 values), `TourMode` extended with template literal `\`page:${PageTourId}\``, `WalkthroughDbState.page_tours_completed: Partial<Record<PageTourId, boolean>>`, `isPageTour()` + `extractPageId()` helpers. **State manager**: `_pageTourCompleted` reactive state, `isPageTourCompleted()` getter, `getSteps()` delegates to `PAGE_TOUR_REGISTRY` for page tours, `completeTour()` persists per-page completion, `dismissTour()` does NOT mark page tours complete (allow retry). **API**: Zod schema extended with `page_tour_completed` enum, handler uses dot-notation `$set` for `walkthrough_state.page_tours_completed.{pageId}`. **Layout server**: loads `page_tours_completed` from DB. **6 pages modified**: each gets `PageTourButton` in header + `data-walkthrough` attributes on key sections (first case card via index check, sections, buttons). Empty data gracefully handled via `skipIfMissing`. **0 errors, 2,369 tests pass (40 files).** | Walkthrough | Per-Page Tours |
| 2026-02-17 | — | **Driver.js Two-Mode Dashboard Walkthrough** — Replaced custom `DashboardWalkthrough.svelte` (~955 lines) with professional Driver.js-powered (~5kb, zero deps) two-mode tour system. **Two tour modes**: (1) **Introductory** (8 steps, ~30s, auto-triggers once for new DSAs after 800ms delay) — highlights sidebar nav items: welcome centered, Dashboard, Cases, New Case, CRM, Profile, Communication, finish at Guide button. (2) **Explanatory** (15 steps, ~2min, on-demand, re-playable) — comprehensive workflow guide covering dashboard sections (stats, pipeline, attention, quick actions), sidebar nav (New Case → Cases → CRM → Profile → Communication → Analytics → Team), plus centered info steps for Results and File Builder. **New files (7)**: `src/lib/config/walkthrough/types.ts` (TourMode, WalkthroughStep, WalkthroughDbState), `introTour.ts` (8 step definitions), `explanatoryTour.ts` (15 step definitions with rich HTML), `src/lib/state/walkthrough.svelte.ts` (Svelte 5 runes singleton — shouldAutoTriggerIntro, requestTour/completeTour/dismissTour, server persistence, backward compat), `src/lib/styles/driver-theme.css` (DDSA design system overrides — navy overlay, Poppins font, gradient buttons, welcome/finish/info variants, mobile responsive), `src/lib/components/walkthrough/TourLauncher.svelte` (dropdown with Quick Tour + Full Guide, sidebar + dashboard variants), `WalkthroughDriver.svelte` (Driver.js orchestrator — dynamic import, $effect watches pendingTour, mobile step filtering, skipIfMissing, auto-trigger). **Modified files (5)**: API endpoint extended (intro_completed, explanatory_completed in Zod schema), DSA layout server loads new fields (backward compat: maps old `completed` → `intro_completed`), DSA layout swaps old component for WalkthroughDriver, dashboard layout adds walkthroughIds to 4 nav items + TourLauncher in sidebar + mobile nav data-walkthrough, dashboard page adds data-walkthrough to stats-row/pipeline-chart/attention-items/quick-actions + TourLauncher in welcome header. **Mobile strategy**: mobileElement fallback selectors for bottom nav, skipIfMissing for items not visible on mobile. **Old component archived** to `_archive/DashboardWalkthrough.svelte`. **0 errors, 2,369 tests pass (40 files). 9 warnings (pre-existing).** | Walkthrough | Driver.js Two-Mode Tour |
| 2026-02-17 | 0a0cb74c | **Walkthrough V2 + Wizard Sidebar Fixes** — Three fixes in one session. **(1) Walkthrough form illustration rewrite** (`DashboardWalkthrough.svelte`) — completely rewrote the form wizard illustration (step 4) to match real `FormSidebarSection.svelte` styling. Old illustration showed inactive sections incorrectly. New version: lock SVG icons on locked sections, white active node with emerald glow, timeline connector lines between nodes, dashed-border subsection list for active section, 0.6 opacity on locked sections, CSS class prefix changed from `il-form-*` to `il-fs-*`. Uses `{#key animKey}` for forced re-mount on step change. **(2) Locked sections appearing unlocked** (`wizardState.svelte.ts` line 362) — when a section's pages weren't in the server's `visiblePages` list (not yet revealed), `t=0` caused `if (t === 0 || a >= t)` to evaluate true, falsely marking the section as having a reachable subsection and unlocking it. Changed to `if (t > 0 && a >= t)`. Also split `subComplete` in subsection reachability into `doesNotBlock` (for forward chain — subsections with no visible pages don't block) and `selfReachable` (for independent reachability — requires `t > 0`). **(3) Strict linear progression** — removed `selfComplete` and `hasReachableSub` bypasses from `sectionReachability` (was `allPreviousComplete || selfComplete || isActive || hasReachableSub`, now `allPreviousComplete || isActive`). Removed `selfReachable` bypass from `subsectionReachability` (was `(sectionReachable && allPreviousSubsComplete) || selfReachable`, now `sectionReachable && allPreviousSubsComplete`). This ensures that going back and changing an answer that reveals a new question properly locks all forward sections until the new question is answered — critical for financial form data integrity. **3 files changed. 0 errors, 2,369 tests pass (40 files). 13 warnings (pre-existing).** | Wizard + Walkthrough | Sidebar fixes, Walkthrough V2 |
| 2026-02-16 | — | **Sub-DSA / Team Management + CRM Expansion (Phases T1-T6).** Full team management system for DSAs to create and manage sub-DSA teams. **Phase T1 (Data Model)**: 4 new type files (`team.ts`, `lead.ts`, `source.ts`, `crmLender.ts`), 3 Zod schema files (`team.schema.ts`, `lead.schema.ts`, `source.schema.ts`), 4 MongoDB collections (Teams, Leads, Sources, CRMLenders) with 10+ indexes, added `team_owner_id`/`is_team_owner` to Dsa interface, `teamContext` to `App.Locals.user`. **Phase T2 (Auth + Invite Flow)**: `requireTeamPermission()` guard in guards.ts (checks member permissions + premium gating for free-tier owners), `resolveEffectiveDsaId()` in caseHelpers.ts (team members → owner's dsaId), team context resolution in hooks.server.ts, pending team invite detection in detect-roles, 6 team API routes (GET/POST team, invite, join, member CRUD), simplified team-member-onboarding endpoint (name+age+gender only), `dsa_team_member` role permissions. **Phase T3 (Team Dashboard)**: Team management page (member list, invite modal with 6-char code, role badges), member permission editor (preset roles + granular toggles, premium lock indicators), public invite acceptance page, dashboard layout nav filtering by permissions, team context banner for members. **Phase T4 (Permission Enforcement)**: ~20 API routes updated to use `resolveEffectiveDsaId` + `requireTeamPermission` with appropriate permissions per HTTP method, ~8 page server loaders switched to team-aware DSA ID resolution. **Phase T5 (CRM Expansion)**: Leads CRUD API (LD-YEAR-SEQ IDs, 6-status flow with history tracking, convert-to-case creating Case + timeline event), Sources CRUD API (8 categories, toggle active/inactive), CRM Lenders API (unique per dsa+lender_name, empanelment tracking), 3 new dashboard sub-pages (leads list with status filters + create modal, sources table with category filters, lender cards with stats), CRM hub updated with Quick Nav cards + count badges. **Phase T6 (Dashboard Walkthrough)**: `DashboardWalkthrough.svelte` floating tooltip (5 steps: Dashboard/Cases/CRM/Form/Results), route-aware visibility, progress dots + bar, Next/Skip All buttons, `PATCH /api/dsa/walkthrough` for state persistence, DSA layout loads walkthrough_state from DsaApplications. **Test fix**: Updated guards.test.ts for 5th role (dsa_team_member). **~50 files created/modified. 0 errors, 2,369 tests pass (40 files). 11 warnings (3 pre-existing + 8 state_referenced_locally).** | Team + CRM | T1-T6 |
| 2026-02-16 | — | **Phase 7.2: File Builder UI Page.** Created `/dashboard/dsa/cases/{id}/file-builder` — the missing UI for the complete File Builder backend. **(1) Server load** (`+page.server.ts`) — follows results page pattern: `parent()` for caseData, demo mode returns mock data, real mode checks FormSnapshots for form data existence. Returns `caseId`, `lenderApplications`, `hasFormSnapshot`, `formSnapshotVersion`. **(2) Page UI** (`+page.svelte`, ~530 lines) — Svelte 5 runes throughout. Three states: (a) Empty state (no lender applications → "Go to Overview" CTA), (b) No form snapshot (amber warning banner), (c) Main UI with: **Lender tab bar** (horizontal pills with traffic light dots, snapshot count badges, `?lender=` query param deep linking from existing CTAs), **Config panel** (7 section visibility toggles with up/down reorder arrows, DSA notes editor per section with Ctrl+Enter save, 3 segmented display mode controls for income/obligations/applicants), **Action panel** (Review Copy card with shield icon + PII auto-strip messaging, Submission Copy card with amber warning + full data messaging, loading spinner during PDF generation, error display), **Snapshot history** (reverse-chronological list with type badges, dates, form version, download buttons). Auto-save with 500ms debounce on all config changes via PATCH `/api/cases/{id}/file-config`, visual "Saving..."/"Saved" indicator. Config loads via GET on lender selection change. PDF generation via POST `/api/cases/{id}/file-builder` with auto-download + page reload. Download via anchor to `/api/cases/{id}/file-builder/download`. Responsive 2-column layout at lg: breakpoint. **(3) Tab enabled** — changed `disabled: true` → `false` for File Builder tab in case layout + added file icon SVG to enabled tab renderer. **(4) A11y** — added `aria-label` to toggle switches, replaced `<label>` with `<span>` for non-form-control visual labels. **3 files created/modified. 0 errors, 2,369 tests pass (40 files). 3 warnings (pre-existing). Resolves Gap 3.** | Phase 7 | 7.2, Gap 3 |
| 2026-02-16 | — | **Fix: Deleted Account 403 Error + 30-Day Recovery + User Email.** Three fixes for the account deletion flow. **(1) Stale cookie cleanup** (`hooks.server.ts`) — when a deleted user's `_id` isn't found in any active collection (Applicant, DsaApplications, rmApplications), all auth cookies are now cleared (accessToken, refreshToken, activeRole, session) instead of just accessToken. Fixes the 403 error loop where stale cookies prevented redirect to `/login`. Applied in both the refresh-token path (resolvedDoc null) and the access-token "truly not found" path. **(2) User deletion confirmation email** (`delete-account/+server.ts`) — new `sendUserDeletionConfirmEmail()` sends to user's email (if available) with: deletion date, 30-day recovery window expiry date, restore instructions ("log in with same mobile number"), permanent deletion warning. Branded HTML template with amber warning callout. Fire-and-forget alongside existing admin notification. Updated success response message to mention 30-day recovery. **(3) TTL indexes for auto-purge** (`mongo.ts`) — replaced non-TTL `{ deletedAt: -1 }` indexes on all 4 deleted* collections with TTL `{ deletedAt: 1, expireAfterSeconds: 2592000 }` (30 days). Old indexes dropped with `.catch(() => {})` safety. MongoDB automatically purges archived accounts after 30 days. **(4) Recovery window check** (`restore-account/+server.ts`) — added 30-day window validation after finding archived doc. If `deletedAt` is older than 30 days, returns HTTP 410 (Gone) with "Recovery window has expired" message. **4 files changed. 0 errors, 2,369 tests pass (40 files). 3 warnings (pre-existing).** | Bug Fix + Auth | Deleted Account 403, Gap 4 |
| 2026-02-16 | cc400c0f | **P0.7 Form Persistence — Case + FormSnapshot + Results on Every Submission.** Every form submission now persists to MongoDB. **(1) 6 form pages** — changed `formStateSnapshot: editCaseId ? formState.toJSON() : undefined` → `formStateSnapshot: formState.toJSON()` so the snapshot is always sent (not just edit mode). **(2) New `offerTransformer.ts`** (`src/lib/utils/offerTransformer.ts`, 175 lines) — pure function `transformOffersToResults()` converts external API `LoanOffer[]` into internal `LenderResultsData` format. Maps: bankName→lender_name, error.status→traffic_light (Eligible→green, Partial→amber, else→red), SanctionAmount→offered_amount, annualRate→roi, emi→emi, tenure→tenure_months, foir→key_metrics.foir, totalMonthlyIncome→net_income. Generates summary (best amount/roi/emi, traffic light counts). Unmappable fields get sensible defaults (approval_probability from traffic light, empty corporate_dsas/cross_sell). **(3) Evaluating page** — complete persistence orchestration. **New submissions**: POST `/api/cases` (auto-label "{loanType} — N applicant(s)") → POST `/api/cases/{id}/snapshots` (formStateSnapshot as v1) → transform offers → POST `/api/cases/{id}/results` (trigger: initial_submit) → navigate to `/dashboard/dsa/cases/{id}/results`. **Edit mode**: enhanced to capture snapshot version/hash from response, transform offers, POST results with trigger: form_edit. Removed `sessionStorage.setItem('editResultsData', ...)`. **Navigation**: `targetCaseId ? case-results : offerRoute` (fallback to standalone offers only if case creation fails). **Error handling**: case creation failure → graceful fallback to standalone offer pages; snapshot/results failure → log + continue. localStorage storage kept for backward compat. **8 files changed** (+325, -15). **0 errors, 2,369 tests pass (40 files). 3 warnings (pre-existing).** Resolves Gap 1 (offers↔case disconnect) and Gap 2 (form data not persisted). Also resolves Phase 7 task 7.1. | Pre-Launch P0 | P0.7, Gap 1, Gap 2, 7.1 |
| 2026-02-16 | e62e6eb2 | **P0 Pre-Launch Security & Infrastructure** — 4 of 7 P0 tasks completed. **(P0.1)** Created `.env.example` with placeholder values for all 40+ env vars (MongoDB, JWT, MSG91, Razorpay, ImageKit, SMTP, CSRF, HMAC, encryption, session, feature flags, CORS, logging). `.gitignore` already has `!.env.example`. **(P0.3)** Added dual rate limiting to `verify-otp`: per-IP (10/hr prod, 100/hr dev) + per-mobile (5/15min prod, 50/15min dev) using shared `rateLimit()` from `rateLimiter.ts`. Also relaxed `send-otp` (50/hr dev vs 5/hr prod) and `resend-otp` (50/hr dev vs 5/hr prod) via `dev` import from `$app/environment`. **(P0.4)** Created `.github/workflows/ci.yml` — triggers on push/PR to main: checkout → Node 20 (`.nvmrc`) → pnpm setup → cached install → `pnpm run check` → `pnpm run test:unit` → `pnpm run build` (with 20+ dummy env vars for SvelteKit static imports). **(P0.6)** Fixed `refresh-token` endpoint: replaced singular `activeTokenId` check with array-first `activeTokenIds[]` + legacy fallback (matching hooks.server.ts lines 77-99), replaced singular `$set` with dual `$set`+`$push: { activeTokenIds: { $each: [newTokenId], $slice: -10 } }` (matching hooks.server.ts lines 131-139). **(Build reminders)** Added `prelaunchReminders()` Vite plugin to `vite.config.ts` — prints yellow warning banner on every `dev`/`build` for P0.2 (credential rotation) and P0.5 (email hardening) until manually removed. **(Dual payload logging)** All 6 form pages now log BOTH `[CasePayload]` (categorical, all data, with derived) AND `[CleanPayload → API]` (flat, API-shaped, what gets sent) in collapsed console groups on every Next click and Submit. **14 files changed** (+278). **0 errors, 2,369 tests pass (40 files). 3 warnings (pre-existing).** | Pre-Launch P0 | P0.1, P0.3, P0.4, P0.6 |
| 2026-02-16 | 865da958 | **CasePayload System + Dev Logging + Console Cleanup + UI Refreshes** — Multi-feature commit. **(1) CasePayload type system** — `src/lib/types/casePayload.ts` (461 lines, 17 interfaces): `CasePayload` top-level with categorical sub-objects (`CaseScreening`, `CasePropertyLocation`/`Technical`/`Legal`/`Financial`, `CaseSeller`, `CaseLoanDetails`, `CaseBalanceTransfer`, `CaseTopUp`, `CaseApplicant` with `Personal`/`Income`/`Obligations`/`Cibil`, `CaseDerivedInsights` with per-applicant + loan-level computations), `_raw` safety net dump. **(2) CasePayload builder** — `src/lib/utils/casePayloadBuilder.ts` (~700 lines): `buildCasePayload()` entry point + 14 sub-builders (`buildScreening`, `buildPropertyLocation`/`Technical`/`Legal`/`Financial`, `buildSeller`, `buildLoanDetails`, `buildBalanceTransfer`, `buildTopUp`, `buildApplicantPersonal`/`Income`/`Obligations`/`Cibil`, `buildDerivedInsights` with FOIR/LTV/credit-risk-band/stability-signals). Exported 15 previously-private helpers from `payloadBuilder.ts` for reuse. **(3) CasePayload derived store** — added `casePayload` derived store + `getCasePayload()` to `cleanPayloadStore.ts`, re-exported all 12 CasePayload types. **(4) Dev-mode CasePayload logging** — all 6 form pages now log `[CasePayload] After page X` (collapsed group) on every Next button click and `[CasePayload] Final — before submission` on Submit. Uses `if (dev)` guard from `$app/environment`. Replaced old stale comparison blocks (`compareWithExisting`, "Existing Payload"/"Clean Payload" logs) in 3 secured pages; added new blocks to 3 unsecured pages. **(5) Console cleanup** — deleted ~70 noisy/dead console statements across ~25 files: commented-out dead logs (`// //console.log(...)`), meaningless debug labels (`'jjjj'`, `"appPage"`, `"conditions False"`), `[DEBUG BasicInfoUnsecureLoan]` keystroke spam (6 lines), `submitCleanPayload` log. Kept all `console.error`, `console.warn`, and existing `if (dev)` guarded logs. **(6) LenderResultCard CSS refresh** — premium DSA dashboard styling. **(7) Login page redesign** — split-screen layout. **(8) Legal pages** — Terms of Service, Refund Policy, Privacy Policy at `/(legal)/` with shared layout. **(9) Minor** — Footer CrossSellBanner, broadcasts API fix, partner-signup tweaks. **49 files changed** (+3,269, -517). **0 errors, 2,369 tests pass (40 files). 3 warnings (pre-existing).** | Cross-phase | CasePayload, Dev Logging, Console Cleanup, UI |
| 2026-02-16 | 224e2c3a | **Evaluation Transition Page + securedClone Fix** — Replaced direct external API calls in all 6 form pages with a centralized animated evaluation transition experience. **New route**: `/evaluating` — full-screen 5-step animated page that orchestrates the form-to-offers flow. Steps: (1) Profiling income sources (0.6s simulated), (2) Checking N lender policies (0.8s simulated), (3) Calculating best offers (real API call), (4) Comparing interest rates (0.5s simulated), (5) Preparing your results (0.4s simulated). Features: pulsing gold active-step dot, green checkmark bounce on completion, smooth progress bar (gold→blue gradient), rotating insight cards (5 tips, 3.5s interval), loan context display (type + amount + tenure), timeout handling (8s "taking longer" warning, 15s retry button), error state with "Try Again"/"Go Back" buttons, completion celebration (particle burst + "X Offers Ready!" scale-up), auto-navigation to offers page or case results page. Handles both new submissions and edit-mode re-evaluations (creates snapshot + stores edit results). **3 new components**: `EvaluationStep.svelte` (pending/active/complete states with CSS animations), `EvaluationProgressBar.svelte` (gradient bar with smooth transitions), `InsightCard.svelte` (fade-in card). **6 form pages modified**: home-Loan, Lap, plot-Loan, personal-Loan, business-Loan, Professional-Loan — each now stores `EvaluationRequest` in sessionStorage and `goto('/evaluating')` instead of inline API call + localStorage write + direct navigation. Net -76 lines (652 added, 728 removed) — duplicated API logic consolidated. **securedClone fix**: Changed `Object.create(null)` to `{}` in both `securedClone()` and `securedMerge()` — the null-prototype objects were stripping `.hasOwnProperty()`, `.toString()`, etc. from all cloned objects. Prototype pollution still prevented via `DANGEROUS_KEYS` set stripping `__proto__`/`constructor`/`prototype` keys. **0 errors, 2369 tests pass (40 files). 3 warnings (pre-existing).** 4 new files, 7 modified files. | Evaluation UX + Bug Fix | Evaluation Transition, securedClone |
| 2026-02-16 | f5885d56 | **Case Edit Flow + Results UI Redesign + API Wiring** — Full case edit round-trip: Edit button on case header → form pre-fills from latest snapshot via `formState.fromJSON()` → submit creates new versioned snapshot + fresh evaluation → navigate to case results. Added `loanTypeToFormRoute()` to caseHelpers.ts (6 loan types → form routes). Added `editFormURL` to case layout server data (both demo and real). Edit banner on form pages ("Editing case XXX — changes will create a new version"). Staleness detection on Results page (amber banner when `formSnapshotVersion > sourceFormSnapshotVersion` with "Re-evaluate Now" link). async onMount fix: changed all 6 form pages from `onMount(async () => { return cleanup })` to synchronous onMount with async IIFE (TypeScript doesn't allow async functions returning cleanup functions). **0 errors, 2369 tests pass.** | Lender Results + Case Edit | Case Edit Flow, Results UI |
| 2026-02-16 | — | **Lender Results: Versioned Evaluation, Selection Flow & Smart Updates** — Complete data-to-UI pipeline for lender eligibility results with versioned snapshots, selection management, change tracking, and on-demand policy staleness checks. **Phase 1 (Data Foundation)**: New types (`lenderResultsSnapshot.ts` — `LenderResultsSnapshot`, `LenderChangeDelta`, `LenderSelection`, `EvalTrigger`, `LenderPolicyStaleness`), extended Case type with `results_snapshot_version`/`results_snapshot_hash`/`lender_selections`, extended Timeline with 5 event types (`results_evaluated`, `results_refreshed`, `lender_shortlisted`, `lender_selected`, `lender_deselected`), Zod schemas (`lenderResultsSnapshotCreateSchema`, `lenderSelectionUpdateSchema`), `LenderResultsSnapshots` MongoDB collection with `{ case_id: 1, version: -1 }` unique compound index, pure helper functions (`computeChangeDeltas`, `checkPolicyStaleness`, `summarizeDeltas`). **Phase 2 (API Endpoints)**: 4 endpoint files — `POST/GET /api/cases/[case_id]/results` (create snapshot with auto-versioning, SHA-256 hash, change delta computation, timeline events; get latest or specific version), `GET /api/cases/[case_id]/results/history` (metadata-only version list, excludes payloads), `GET /api/cases/[case_id]/results/staleness` (checks PolicyDocuments.created_at against snapshot date), `GET/PATCH /api/cases/[case_id]/selections` (read/update lender selections with timeline events per state change). All endpoints follow existing patterns: auth guard, `resolveDsaId()`, `verifyCaseOwnership()`, `blockDemoWrite()`. **Phase 3 (Server Load)**: `results/+page.server.ts` replaced mock import with MongoDB queries — loads latest snapshot, version count, version history, lender selections from Case. Demo mode returns mock data. Handles empty state (no results yet). **Phase 4 (UI Components)**: 3 new components — `VersionTimelineStrip.svelte` (horizontal version dots with dates, trigger labels, click to switch), `SelectedLendersSection.svelte` (compact cards for selected/shortlisted lenders with quick-remove and Prepare File CTA), `CheckForUpdatesButton.svelte` (calls staleness API, shows current/stale state with lender count). Modified `LenderResultCard.svelte` — new optional props (`changeDelta`, `selectionState`, `onSelectionChange`), NEW CONTENDER/UPDATED/NEW badges, per-metric change diffs (amount/ROI/EMI/tenure with color-coded deltas), 3-state selection toggle (neutral→shortlisted→selected cycle). Modified `ResultsSummaryBar.svelte` — optional `version`/`computedAt` props with date indicator. Rewired `+page.svelte` — version timeline, selected lenders section, check-for-updates button, delta map, selection map with optimistic API updates, version switching via URL param, empty state for no results. **Key design decisions**: Re-evaluation is on-demand only (DSA clicks "Check for Updates"), policy-date aware (only if lender policy updated after evaluation date), no reject state (neutral/shortlisted/selected only), selections persist on Case document across re-evaluations, change deltas pre-computed at snapshot creation time. **0 errors, 2369 tests pass (40 files). 3 warnings (pre-existing).** 7 new files, 7 modified files. | Lender Results | Phase 2 Lender Results (Phases 1-4) |
| 2026-02-14 | — | **Phase 6 Completion (Batches 1-5)** — All RM dashboard features implemented. **Batch 1 (Foundation)**: Types, collections, indexes, profile management, disclaimer tracking, settings page. **Batch 2 (Engagement)**: Monthly email OTP verification, file review counters, system assessment viewer, accuracy ratings. **Batch 3 (Communication)**: Server-enforced footer injection, RM broadcasts, DSA-side content badges, quick query from case detail, communication chatbot with template replies. **Batch 4 (Intelligence)**: Policy uploads with version history, preferred DSA tagging, auto-match engine, policy feedback dashboard, RM reputation scoring, analytics page. **Batch 5 (Wiring)**: Sample data seeding (ratings, broadcasts, policies, preferred DSAs), comprehensive pure function tests (autoMatch, policyFeedback, rmReputation, disclaimerFooter), full navigation wiring. All RM dashboard pages fully functional: Dashboard, Cases, Case Detail, Communication, Broadcasts, Policies, DSA Search, Analytics, Settings. | Phase 6 | 6.2-6.15, 6.17-6.19 |
| 2026-02-14 | — | **RM Case Detail + Accuracy Rating (6.4 + 6.5)** — Two RM engagement features. **6 files created.** (1) **EligibilityCard.svelte** — Reusable traffic light card component with colored dot (emerald/amber/red/grey), label (Eligible/Marginal/Not Eligible/Unknown), message text, and optional timestamp. Ring styling matches existing `LenderApplicationCard` pattern. (2) **AccuracyRatingForm.svelte** — Interactive star rating form (Svelte 5 runes). Props: `caseId`, `lenderAppId`, `lenderName`, `existingRating?`, `onRated?` callback. Two modes: read-only (shows filled stars + category badge + comment) and interactive (5 clickable SVG stars with hover highlight, category dropdown with 5 RatingCategory options, optional 500-char comment textarea, inline per-rating disclaimer text, POST to `/api/rm/ratings`). Success/error states with page reload on submit. (3) **`/api/rm/ratings/+server.ts`** — POST (create rating: validates rating 1-5, valid RatingCategory, disclaimer_accepted=true, resolves RM with ObjectId+mobile fallback, verifies CommunicationThread access, enforces uniqueness via existing AccuracyRatings index, returns rating_id) + GET (list RM's ratings: optional `?case_id` filter, sorted by created_at DESC, limit 50, serialized dates). Both endpoints use `requireRoleApi('rm')` + `blockDemoWrite`. (4) **`/dashboard/rm/cases/[case_id]/+page.server.ts`** — RM case detail loader: resolves RM, verifies CommunicationThread access (403 if not shared), loads Case document, loads existing AccuracyRatings as lender_app_id→rating lookup map, loads 10 recent TimelineEvents. Returns serialized `caseData` (label, stage, loan info, lender_applications with eligibility_snapshot/document_summary/queries/sanction), `existingRatings`, `recentTimeline`, `rmBankName`. Safe date serialization with toISO helper. (5) **`/dashboard/rm/cases/[case_id]/+page.svelte`** — Read-only case detail view (Svelte 5 runes). Sections: back navigation, case header (label + case_id + loan type/amount + stage badge + DSA name + created date + optional contact), lender application cards (status badge + EligibilityCard + document progress bar + open queries count + sanction details + AccuracyRatingForm per lender app), timeline (last 10 events with SVG icons + time-ago formatting). Uses design system CSS vars. Reuses stage/status color maps from existing cases page. **0 errors, 0 warnings. 2,325 tests pass across 40 files.** | Phase 6 | 6.4, 6.5 |
| 2026-02-14 | — | **Language selector for DSA and RM (6.22 + 6.26)** — Full i18n UI integration. (1) **Types** — added `preferred_language?: string` to both `Dsa` and `Rm` interfaces in `types/index.ts`. (2) **i18n persistence** — added `initLanguage(serverLang?)` (priority: server DB value > localStorage > cookie > 'en') and `persistLanguage()` (saves to localStorage + `lang` cookie with 1-year TTL) to `i18n/index.ts`. (3) **LanguageSelector component** — new `LanguageSelector.svelte` showing 3 Phase 1 languages (English, हिन्दी, मराठी) with native labels, globe icon, dropdown with active checkmark. Props: `saveToServer` (calls API when true), `compact` (sidebar/footer styling). Includes CSRF token passthrough. (4) **API endpoint** — `PATCH /api/user/language` saves `preferred_language` to `DsaApplications` or `rmApplications` based on active role. Auth-required, validates against `isLanguageAvailable()`. (5) **Dashboard integration** — sidebar shows LanguageSelector above Delete Account/Logout with `saveToServer={true}`. Server loads `preferred_language` from DB in `+layout.server.ts` (added to existing onboarding-check queries via projection). Client initializes via `initLanguage(serverLang)` in `onMount`. (6) **Login integration** — LanguageSelector in footer below Terms/Privacy with `compact={true}` (localStorage/cookie only, no server call). `initLanguage()` called in existing `onMount`. (7) **Tests** — 8 new tests for `initLanguage()` and `persistLanguage()` (server preference, invalid codes, empty string, cookie/localStorage cleanup in beforeEach). **50 total i18n tests, 2227 tests pass, 0 type errors.** 8 files modified/created. | Phase 6 | 6.22, 6.26 |
| 2026-02-14 | — | **Form flow restructuring — all 6 loan types** (P0-P5). **24 files changed** (+6,447, -10,521 lines). (P0) **Schema sync fix** — LAP client schema was 11 pages while server had 10, Plot client was 10 while server had 9 (previous session edited server schemas but forgot client copies). Synced both. Archived `old-plot-loan-schema.json` to `src/lib/config/_archive/`. (P1) **Unsecured loans — prior application questions** — added 4 prior-app Qs (`q_priorApplication`, `q_priorApplicationLender`, `q_priorApplicationStatus`, `q_priorApplicationRejectionReason`) to `collateral_free_selectionPage` in Personal, Business, and Professional loan schemas (6 files, client+server each). (P2) **Plot Loan** — added same 4 prior-app Qs to `propertyIdentification` page (now 18 Qs). Client/server synced. (P3) **LAP restructuring** — split 14-question `propertyDetailsPage` into `propertyTechnical_LAP` (13 Qs — physical/construction characteristics) and `propertyLegal_LAP` (7 Qs — occupation, legal verification: ownership chain, original documents, legal disputes, encumbrance). Added 4 prior-app Qs to `propertyIdentificationPage` (5→9 Qs). LAP now has 11 pages. Updated `lapLoan.ts` wizard sections. (P4) **Home Loan full restructuring** — the largest change. Created 4 new pages: `propertyTechnical_homeLoan` (11 Qs from old propertyDetails + 2 checklist items converted to radio), `propertyLegal_homeLoan` (21 Qs from old propertyDetails + sellerInformation + 5 new legal verification Qs from checklist), `propertyFinancial_homeLoan` (9 Qs from old mortgageProfile with `propertyRelatedQuestionValidate` gate removed), `finalVerification_homeLoan` (3 auction-related Qs). Deleted 4 pages: `propertyDetails_homeLoan`, `sellerInformation_homeLoan`, `propertyCheckList_homeLoan`, `mortgageProfile_homeLoan`. 17-item checklist redistributed: technical items to Technical page, legal items to Legal page, 3 items deferred to future offer cards, `bank_risk_clearance` removed (lender-side). Applicants (`tellUs_homeLoan`) moved up from index 5 to 3 (matches DSA workflow). Added 4 prior-app Qs to `selection_homeLoan` (4→8 Qs). Replaced fragile `btTopUpSequence = [0,1,3,4,5,2,6,7]` hardcoded index array with `BT_TOPUP_PAGE_ORDER` (ID-based string array) + `resolvePageSequence()` function. Updated `homeLoan.ts` wizard sections (5 sections with new subsections), `firstPage/visibilty.ts` (new page ID arrays), `pageFlowMap.ts` (complete rewrite: new PAGE_IDS, flow sequences, question distributions), 4 test files (questionVisibility, nextButtonLogic, homeLoan-pageFlow, schemaAlignment), e2e setup file. Home Loan still 14 pages (4 created, 4 deleted). (P5) **Session migration + tests** — created `/api/admin/migrate-sessions` endpoint (GET to check count, POST to deactivate all active FormSessions with `flagReason: 'schema_migration'`). Removed deprecated `btTopUpSequence` export from `visibility.ts`. Archived helper script to `scripts/_archive/`. **All 2,219 tests pass across 38 files. svelte-check: 0 errors, 0 warnings.** | Form Restructuring | P0-P5 |
| 2026-02-14 | 4a7af833 | **Accommodate main branch intents into store-redesign** — Captured 4 intents from 10 commits by 4 developers on `main` (Mrityunjay Kumar, Alok Raj, Sudhanshu Kansal, Anshul Singh) and implemented them using our architecture. (1) **LAP schema: Remove redundant selectionPage** — relocated 2 questions (`q_approvedByAuthority`, `q_asPerMap`) from the standalone `selectionPage` to the beginning of `propertyDetailsPage`. LAP flow now goes directly from `propertyIdentificationPage` → `propertyDetailsPage` (11→10 pages). Removed `loan-selection` section from `lapLoan.ts` wizard config. (2) **Plot schema: Remove redundant plot_loan_selectionPage** — relocated 4 questions (`q1_isDefaulter`, `q11_madeGuarantor`, `q_approvedByAuthority`, `q_asPerMap`) from the standalone `plot_loan_selectionPage` to the beginning of `propertyIdentification`. Plot flow now starts at `propertyIdentification` directly (10→9 pages). Removed `loan-selection` section from `plotLoan.ts` wizard config. (3) **Layout: min-h-screen** — added `min-h-screen` wrapper div to `(app)/+layout.svelte` so pages fill the viewport. (4) **how-can-we-help: dark mode future-proofing** — added `dark:border-gray-700/50 dark:bg-gray-900` to form container, `dark:text-white` to title, `dark:bg-gray-800` to modals, consistent with other form pages. (5) **Directors import casing** — verified already correct on store-redesign (capital D), no change needed. (6) **Payload assembly** — skipped; our form engine handles this differently and future refactoring will supersede. All showWhen cross-page references preserved (answers from relocated questions still flow to dependent conditions on downstream pages). 6 files modified (+14, -110 lines). **2,204 tests pass, 0 errors, 0 warnings.** | Store Redesign | Main branch intent accommodation |
| 2026-02-13 | 3acc7489 | **Anti-Scraping, Form Security & Behavioral Telemetry System (AD-14)** — 8-layer defense protecting form engine decision tree (34-interview IP). **30 files changed** (8 new, 22 modified), 2,097 insertions. (1) **Server-side form sessions** (`formSession.ts`) — one session per user+loanType, `maxPageReached` high-water mark prevents skip-ahead, tab-agnostic design, max 5 concurrent sessions per user, 24h TTL. MongoDB `FormSessions` collection with 4 indexes. (2) **Progressive trust scoring** (`trustScore.ts`) — score 0-100, starts 50. 9 event types with deltas (-50 to +10). Thresholds: watchlisted <30, suspended <15 (1h ban), blocked <5. `TrustScores` collection. (3) **Form Guard orchestrator** (`formGuard.ts`) — single entry point: trust check → adaptive rate limit (60/min × trust multiplier) → session → page access → behavior analysis → reward. In-memory sliding window rate limiter with periodic cleanup. (4) **Behavioral telemetry** (`behaviorTelemetry.ts`) — `BehaviorTelemetry` class tracks boolean signals per page: hadMouseMovement, hadScrolling, hadFieldFocus, hadKeyboardInput, hadPasteEvents, focusBlurCount, timeToFirstInteraction. Uses `once` listeners for efficiency. Integrated into all 6 form pages (attach/destroy/reset/getSignals). (5) **Honeypot fields** (`HoneypotField.svelte`) — CSS-hidden inputs with session-rotated field names (hash of sessionId picks from pool of 5 plausible names). Not in API schema — only in HTML. Any input → immediate POST to `/api/security/honeypot-trap` for -50 trust penalty. Added to all 6 form pages with `formSessionId` state + sessionId capture from evaluate response. (6) **Response fingerprinting** (`engine.ts`) — zero-width character encoding (ZWC_ZERO `\u200B` + ZWC_ONE `\u200D`) embeds first 8 chars of sessionId in question descriptions. Deterministic question ordering via seeded Fisher-Yates shuffle per session+page. Both traceable if leaked. (7) **Multi-browser auth** (`hooks.server.ts`, `check-dsa/+server.ts`) — `activeTokenId: string` → `activeTokenIds: string[]` (max 10, with legacy fallback). Push with `$slice` on same-device refresh. Token validation via array `includes()`. (8) **Device-switch nuke** (`check-dsa/+server.ts`) — `buildTokenUpdate()` compares `deviceClassHash` (hardware-only fingerprint: screen res + colorDepth + timezone + platform + cores + DPR). Same device → push token. Different device → NUKE: `$set: { activeTokenIds: [newToken] }` + invalidate all FormSessions. All 3 user types (DSA, RM, Applicant) updated. (9) **Hardware fingerprint** (`hardwareFingerprint.ts`) — browser-independent signals → SHA-256 hash. Cross-browser stable (no user agent, no WebGL, no canvas). (10) **Within-page showWhen delivery** (`engine.ts`) — `transformJsonLogicToCustom()` converts `{"var":"key"}` → `"key"`. Within-page rules sent to client for instant reveals. Cross-page routing stays server-only. All 6 form pages filter `visibleQuestions` via `shouldShow()`. (11) **wizardState type fix** — introduced minimal `WizardQuestion` interface replacing `Question` import for compatibility with `ClientQuestion`. (12) **Bug fix** — conflicting `$set` operators in `formSession.ts` `getOrCreateSession()` (spread was overwriting `lastActivityAt`). **OTP verification** passes `hardwareFingerprint` to `check-dsa`. **Evaluate endpoint** passes `sessionId` to engine options for fingerprinting + returns `sessionId` to client. **Submit endpoint** calls `validateSubmitRequest()`. **0 new errors (pre-existing syntheticProfile.js only), 2,159 tests pass.** | Store Redesign + Security | AD-14, Anti-Scraping Phases 1-9 |
| 2026-02-13 | 3104d918 | **Store Redesign: Migrate all 6 form pages to server-driven evaluation** — all form pages now call `/api/form/evaluate` for page evaluation instead of local JSON Logic processing. Server-side form engine evaluates schemas, filters visible questions, resolves text/options, computes navigation/progress. Added sidebar navigation, fixed progressive visibility, fixed bank options loading. | Store Redesign | Phase 4d |
| 2026-02-13 | — | **Store Redesign Phase 8: Security Hardening & Final Cleanup** — Final cleanup pass for the store redesign branch. (1) **json-logic-js client assessment**: Audited all 30 files importing json-logic-js. 23 active client-side files use it for showWhen visibility, option filtering, dynamic text resolution, and validation conditions. Cannot remove from client bundle until Phase 4d (form page engine migration) migrates these to server-side `/api/form/evaluate` calls. Documented as Phase 4d dependency. (2) **Dead import cleanup**: Removed 2 dead imports from `MonthYearModal.svelte` (`applicantsStore` from loanData, `get` from svelte/store) left over from Phase 7d migration. Systematic scan of all `get()`, `writable`, and store imports confirmed all other remaining imports are actively used. (3) **svelte-persisted-store verification**: Confirmed zero active imports — only 4 occurrences remain, all in comments. (4) **Server-side form engine verification**: All 6 files in `src/lib/server/formEngine/` verified correct: barrel file exports complete, engine class functional, visibility evaluator handles both JSON Logic and custom ShowWhenCondition, text/option resolvers working, schema loader covers all 6 loan types + 17 component schemas. (5) **Rate limiting placeholders**: Added TODO comments to `/api/form/evaluate/+server.ts` (60 req/min recommended) and `/api/form/submit/+server.ts` (10 req/min recommended). (6) **Schema exposure noted**: Schema JSON files remain in both `src/lib/config/` and `src/lib/server/formEngine/schemas/` — client-side copies cannot be removed until Phase 4d. 3 files modified. **0 errors (pre-existing syntheticProfile.js only), 2159 tests pass.** | Store Redesign | Phase 8 |
| 2026-02-13 | — | **Store Redesign Phase 6: Form State Consolidation** — Converted `loanData.ts` (14 `persisted()`/`writable()` stores, 74+ consumers) and `applicationData.ts` (3 consumers) into compatibility bridges delegating to `formState` from `form.svelte.ts`. `formState` is now the sole source of truth for all form data. (1) `form.svelte.ts` — moved synchronous sessionStorage loads from `init()` into constructor (`_loadFromSessionStorage()`) so bridges get data immediately at module-load time; added 5 per-loan page index `$state` fields (`lapPageIndex`, `plotLoanPageIndex`, `businessLoanPageIndex`, `personalLoanPageIndex`, `professionalLoanPageIndex`) with setter methods and persistence; added `legacyBackHistory` field (single `BackHistoryEntry` object matching legacy `backHistory` store shape, distinct from the new array-based `backHistory`); added 8 `replace*()` bridge methods (`replaceLoanData`, `replaceApplicationData`, `replaceApplicants`, `replaceApplicantsPayload`, `replaceLegacyBackHistory`, `replacePageIndexObject`, `replaceApplicantErrors`, `replaceApplicantStepTouched`); updated `reset()`, `_persistAll()`, `_clearAllStorage()` for new fields. (2) `loanData.ts` — replaced all `persisted()`/`writable()` calls with `fromRune()` bridges from `_bridge.svelte.ts`; all 16 store exports now delegate to `formState`/`authState`; 3 helper functions delegate to `formState` methods; all type exports preserved. (3) `applicationData.ts` — replaced `writable()` + Capacitor Preferences + Zod validation with single `fromRune()` bridge. (4) `loanData.d.ts` — updated to declare all 16 bridged stores + 3 helper functions. Storage keys unchanged, 0 consumer files modified. **0 new errors (pre-existing syntheticProfile.js only), 2159 tests pass.** | Store Redesign | Phase 6 |
| 2026-02-13 | — | **Store Redesign Phase 5: Applicant State Consolidation** — Created unified `ApplicantStateManager` class (`src/lib/state/applicant.svelte.ts`, ~620 lines) consolidating 3 separate stores into one canonical source. Absorbs: (1) `applicantDataStore.svelte.ts` — per-applicant data with soft-delete/restore for income entries. (2) `applicantRecovery.ts` — deleted applicant recovery via 5-field signature matching (name+gender+marital+age+employment for Individual, company+type+business for Company). (3) `incomeProfileStore.ts` — employment-type switching cache (45 hardcoded keys replaced by soft-delete/restore pattern). Also absorbs `restoreApplicantIntent.ts` (restore modal state). Follows Svelte 5 runes class pattern (matches `auth.svelte.ts`, `dialog.svelte.ts`). Single `applicant-state` sessionStorage key with auto-migration from old keys (`applicant-data-store`, `applicant-recovery`, `denied-applicant-recovery-prefixes`). Re-exports all signature/detection helpers (`buildIndividualSignature`, `buildCompanySignature`, `buildMatchSignature`, `buildDetectionKey`, `matchesByName`). Original stores preserved — compatibility bridges deferred to consumer migration phase. 1 new file, 1 doc updated. **0 errors (pre-existing only), 2159 tests pass.** | Store Redesign | Phase 5 |
| 2026-02-13 | — | **RM Dashboard Enhanced with Sample Data**: Brought the RM dashboard to life with real MongoDB queries and sample data, matching the DSA dashboard quality. **Data model**: Uses `CommunicationThreads` as the Case↔RM junction — queries threads by `rm_id`, extracts `case_id`s, loads Cases. No changes to Case type needed. **New files (3)**: (1) `rmSampleDataSeeder.ts` (~756 lines) — creates 3 synthetic DSA personas (Rajesh Patel, Meera Investments, Arjun Nair), 6 sample Cases (HL–processing, PL–query with open Axis Bank query, LAP–sanctioned ₹1.15Cr, HL–submitted, BT–file_building, HL–intake), 6 CommunicationThreads with 1-3 realistic messages each, ~35 timeline events. All case IDs prefixed `SAMPLE-RM-` for cleanup. Idempotent (checks existing threads before seeding). Full document checklists, stage histories, lender tracking, sanction data. (2) `src/routes/api/rm/sample-data/+server.ts` — DELETE (clear RM sample data: threads + cases + timeline events) + POST (clear + re-seed). Auth via `rmApplications` lookup. (3) Wired seeder into `rm-onboarding/+server.ts` at both insertion points (existing RM update + new RM insert), non-blocking with error logging. **Modified files (7)**: (4) `mongo.ts` — added `CommunicationThreads` index `{ rm_id: 1, status: 1, updated_at: -1 }`. (5) `dashboard.ts` store — added `rm: boolean` to `SampleDataVisibility`, `dismissRm()` method, backward-compat parsing. (6) `AttentionCard.svelte` — added `basePath` prop (default `/dashboard/dsa/cases`), replaced hardcoded DSA paths. (7) `CaseListCompact.svelte` — added `caseBasePath` prop (default `/dashboard/dsa/cases`), replaced hardcoded DSA paths. (8) `rm/+page.server.ts` — full 10-step data loader (405 lines): resolve RM, load threads, load cases, classify real/sample, compute stats (casesReceived, activeCases, dsaConnections, openQueries, sanctionedThisMonth), pipeline counts, attention items, recent cases with `dsa_name`, timeline events, DSA connections list. (9) `rm/+page.svelte` — rich 513-line UI: sample data banner + clear prompt, welcome header with bank/designation/city, 4 StatCards, PipelineChart, two-column layout with AttentionCard + CaseListCompact + Quick Actions (left) and DSA Connections card + ActivityFeed (right), empty state with "Find DSAs" CTA. (10) `rm/cases/+page.server.ts` — full cases loader via CommunicationThreads→Cases pattern with `dsa_name` mapping and `has_open_query` detection. (11) `rm/cases/+page.svelte` — 167-line cases list with stage filter chips, case cards showing label/loan type/amount/DSA/lenders/stage badge/time ago, empty state. **Component backward-compat**: DSA dashboard unaffected (default props). **0 errors, 0 warnings. 2,876 tests across 45 files.** | Phase 6 | 6.8-6.10, RM Dashboard |
| 2026-02-12 | — | **Dev-Only Synthetic Data Dashboard**: Created visual dashboard at `/dev/synthetic` for browsing, analyzing, and generating test cases from synthetic profiles. Triple-gated for production safety: server 404 (throws `error(404)` if `!dev`), client `{#if dev}` guard, and route isolation (completely outside `/dashboard/`). **4-tab interface**: (1) **Overview & Stats** — 4 stat cards (total profiles, distinct loan types, obligation %, seeder status) + 5 distribution charts (loan type horizontal bars, employment type bars, CIBIL range color-coded bars, income bracket bars, applicant count vertical bars) + recent profiles table. All data from MongoDB aggregation pipelines (`$group` by loan_type, employment_type, cibil_range, income_bracket, applicant_count). (2) **Profile Browser** — filterable grid (loan type + employment type dropdowns), paginated 12/page with profile cards showing all metadata, "View" and "Generate Case" buttons. Client-side fetch to `/api/dev/synthetic-profiles`. (3) **Profile Viewer** — collapsible JSON tree viewer for full payload (3-level deep: top keys → array items → sub-objects), syntax-highlighted values (blue strings, green numbers, orange booleans), copy-to-clipboard, metadata summary header. (4) **Quick Generate** — profile ID input, optional case label, dynamic overrides form with suggestion chips (cibilScore, grossIncome, etc.), seed/delete controls with confirmation. Reuses existing `StatCard` component, matches design system (--ddsa-primary/secondary/accent/success CSS vars, Poppins font). Follows test-dashboard tab pattern. 2 new files. **0 errors, 0 warnings. 2,876 tests across 45 files.** | Cross-phase | Synthetic Data, Dev Tooling |
| 2026-02-12 | — | **Synthetic Data System**: Built complete synthetic data system with 500-profile seeder + dev-mode APIs. (1) **`syntheticDataSeeder.ts` (1,316 lines)** — generates 500 realistic Indian loan application profiles across all 6 loan types: Home Loan (200: 140 fresh, 30 resale, 20 BT, 10 top-up), LAP (100), Personal Loan (100), Business Loan (50), Plot & Construction (30), Balance Transfer (20). Each profile has a complete `FormSnapshot.payload` matching the exact format real submissions produce — `loanType`, `loanName`, `ApplicantIsNRI`, `tellUsWhoIsApplying`, loan-specific data keys (property details, amounts, loan purpose), and full `applicantsStore` array. Applicants have all real fields: identity (name, age, gender, maritalStatus, title), employment (employmentType, companyName, companyType), financials (grossIncome, netIncome, cibilScore, monthlyOtherIncome), obligations (tableLoanEntries with loanType/bankName/emi/tenure, tableLimitEntries), NRI/GPA details, and all form state flags (isCompleted, financialCompleted, etc.). Distributions: employment 40% Salaried(Private)/15% Salaried(Government)/20% Self-employed(Professional)/25% Self-employed(Other); CIBIL 40% 750+/30% 700-749/20% 550-699/10% <550; applicants 50% single/40% two/10% three. Special scenarios: NRI, Company applicants, high-income (>10L), low-CIBIL+high-income, 3+ obligations, seniors (55-65), young (22-25), divorced/widowed. Indian-formatted numbers (75,00,000). Idempotent (skips if >= 400 profiles exist). Batch inserts (100/batch). (2) **Dev-mode API** — `GET /api/dev/synthetic-profiles` (list with loan_type/employment_type filters + pagination), `POST /api/dev/synthetic-profiles` (generate Case + FormSnapshot from profile with dot-notation overrides), `POST /api/dev/synthetic-profiles/seed` (trigger seeder), `DELETE /api/dev/synthetic-profiles` (clear all). All gated behind SvelteKit `dev` mode. (3) **CLI script** — `pnpm run seed:synthetic` calls seed API endpoint (requires dev server running). (4) **Payload anonymizer** — for future on-demand anonymization of real data: deep clone + name-only replacement (fullNameOfApplicant, directorName, companyName, entityName, optional_contact.full_name), gender-aware Indian name generation (61 male, 55 female, 50 last names, 30 company, 20 entity). (5) **Case generator** — creates Cases (is_sample: true) + FormSnapshots from profiles with `setByPath` override system. 3 MongoDB indexes (profile_id unique, loan_type+employment_type, created_at). **177 tests** in 3 files. 12 new files, 2 modified. **Total: 2,876 tests across 45 files.** 0 errors, 0 warnings. | Cross-phase | Synthetic Data, Testing |
| 2026-02-12 | — | **Test Coverage Expansion (690 new tests)**: Added 6 comprehensive test files covering previously-untested critical modules: (1) `incomeProfiles.test.ts` (219 tests) — all 12 income profile types (salaried_regular, salaried_contractual, business_proprietorship, partner, director, professional, pension, rental, freelance, agriculture, investment, no_current_income), profile cards, form config (specifics + income fields), income calculations (computeMonthlyEquivalent for all types, computeIncomeSummary, formatIncomeCurrency/formatIndianNumber Indian locale, getFrequencyLabel, getEvidenceSummary). (2) `loanSchemas.test.ts` (95 tests) — structural validation of all 6 loan type JSON schemas (Home Loan 14 pages, LAP 10, Plot 9, Personal 8, Professional 8, Business 8), cross-schema contracts (shared pages, secured vs unsecured, question ID uniqueness, data binding checks, option validation). (3) `applicantUtils.test.ts` (206 tests) — all 11 ApplicantUtils files: calculateTotals (EMI/limit aggregation, Keep Running filter), createLoanEntry/clearLoanForm (field mapping, Indian number formatting), getLoanTypeOptions (employment-based filtering, Company vs Individual, dedup merge), validateLoanForm (required fields, EMI vs limit by loan type, interest rate bounds), applicantKey, selectToClose (closure options by loan type), getTitleValidationError, deleteLoanEntry/editLoanEntry (CRUD + recalculation), formatNumber (Indian locale). (4) `payloadBuilder.test.ts` (142 tests) — all helper functions from 1,495-line payloadBuilder.ts: toNumber (Indian commas, NaN, edge cases), toBoolean (Yes/No/true/false/1), extractSelectedOptions, hasAnySelected, 5 profile builders (salaried, government, business, pension, lowCredit — all key mappings verified), extractFinancials (fallback arrays, filtering), cleanObligationEntries (MIME stripping, EMI filtering), buildApplicantPayload (primary/co-applicant routing, employment-type profiles, NRI, obligations, Company), buildLoanTransactionPayload (secured/unsecured, BT/top-up, area normalization Meter/Yard/Feet, NRI detection, bank preferences), comparePayloads (added/removed/changed detection). (5) `uploadSecurity.test.ts` (72 tests) — MIME whitelist (7 allowed, 10 rejected), extension mapping, sanitizeFilename (path traversal, script injection, length limiting, Unicode), file size limits (10MB), max files per request. (6) `otpStore.test.ts` (51 tests) — SHA-256 hashing consistency, timing-safe comparison, exponential backoff array, configuration constants, expiry/attempt behavioral contracts, OTP document structure. Total: **2,699 tests across 42 files**. 0 errors, 0 warnings. | Cross-phase | Testing |
| 2026-02-13 | — | **Session, Security, and Storage Overhaul** (5 workstreams): (W1) **30-day sessions** — `REFRESH_TOKEN_EXPIRY` from 7d to 30d, new `sessionConstants.ts` (shared `REFRESH_COOKIE_MAX_AGE`, `ACCESS_COOKIE_MAX_AGE`, `REFRESH_TOKEN_DAYS`), updated 11 auth endpoints + hooks.server.ts to use shared constants for all cookie maxAge and DB expiry values. Fixed `restore-account` bug: was generating tokens but never persisting `refreshToken`/`refreshTokenExpiry` to DB. (W2) **Single-device enforcement via `activeTokenId`** — added `activeTokenId?: string` to User, Dsa, Rm interfaces. Every login writes `activeTokenId` alongside `refreshToken`. Middleware refresh path checks `activeTokenId` match — mismatch means another device logged in, old device gets soft-kicked within 15min. `refresh-token` endpoint now searches all 3 collections (was Applicant-only) and enforces same check. Logout clears `activeTokenId` from all 3 collections. Demo users skipped (static tokenId). (W3) **Device fingerprint registry** — new `DeviceRecord` type (`deviceRegistry.ts`), `DeviceRegistry` collection in `mongo.ts` with 3 indexes (userId+fingerprint unique, fingerprint, lastSeen TTL 90d). New `/api/auth/register-device` endpoint (authenticated POST, upserts). Client integration in `+layout.svelte` fires after auth init using existing `DeviceFingerprinter` singleton. Silent — no UI. (W4) **sessionStorage migration** — 19 `persisted()` stores switched from localStorage to sessionStorage via `{ storage: 'session' }` option (loanData 14, incomeProfileStore 1, applicantRecovery 2, relationshipStore 2). Manual localStorage in `applicantDataStore.svelte.ts` (3 locations) and `formState.ts` (1 location) changed to sessionStorage. One-time localStorage cleanup in `+layout.svelte` removes 22 orphaned keys on first load. (W5) **Retired tabLock** — deleted `tabLock.ts` and `TabBlockedOverlay.svelte`, removed all imports/init/destroy/template usage from `+layout.svelte`. `ddsa_tab_lock` included in cleanup list. **3 new files**, **2 deleted files**, **~20 modified files**. **0 errors, 0 warnings, 2,009 tests pass.** | Cross-phase | Session, Security, Storage |
| 2026-02-12 | — | **Relationship capture: fix reset bug + completion block + unlikely tags**: (1) Fixed form reset bug — removed reactive `$effect` that cascade-nulled `selectedRelation`/`selectedPersonB` before user clicked Add; replaced conditional DOM filtering with pure `$derived` data flow. (2) Added `isComplete` prop — when `graphStatus.isComplete` is true, form is replaced with a green "All relationships defined" banner. (3) Introduced tristate validity system (`valid`/`unlikely`/`invalid`) via new `checkPersonBValidity()` function — age-based constraints (spouse gap, nephew/niece age, parent-child) now return `unlikely` instead of `invalid`, shown with "(unusual)" tag in dropdowns. Hard constraints (gender, structural) still return `invalid` and hide the option. (4) Changed `validateAge` errors to `severity: 'warning'` — warnings display but don't block Add button. (5) Fixed Grandson/Granddaughter and Son-in-law/Daughter-in-law gender checks (were checking `personB.gender` instead of `personA.gender`). (6) Fixed Nephew/Niece Person B gender filter — removed incorrect male-only restriction. (7) New types: `PersonBValidity`, `PersonBOption`, `RelationOption`. (8) New functions: `checkPersonBValidity()`, `getPersonBOptionsWithLikelihood()`. (9) Added missing sibling+spouse in-law inference to `inferenceEngine.ts` — if A is Brother/Sister of X and B is Spouse of X, system now infers A is Brother-in-law/Sister-in-law of B. This prevents contradictory relations like Father-in-law being offered when they share the same generation. (10) Replaced "(unusual)" dropdown tags with confirmation-style warning messages — "Age difference is less/more than typical for [relation]. Are you sure?" shown below the form when unlikely age combination is selected. (11) Added hard age-direction blocks — parent younger than child (ageDiff < 12), grandparent (< 24), in-law parent (< 5), and inverse for child roles now return `invalid` (hidden from dropdown) instead of `unlikely` (was incorrectly allowing e.g. a 20-year-old as "Mother of" a 48-year-old). Unusual-but-possible cases (e.g. parent age diff 12-17, spouse gap > 15, uncle younger than nephew) remain as warnings. 6 files modified. **0 errors, 0 warnings. 2,009 tests pass.** |  Cross-phase | Bug Fix, UX |
| 2026-02-12 | — | **Delete-account cleanup + re-registration with restore/seed choice**: (1) `delete-account` now also archives the orphaned `Applicant` record by mobile number when a DSA deletes their account — ensures clean slate for re-registration. (2) `detect-roles` checks `deletedDsa` archive collection and returns `hasDeletedAccount` + `deletedAccountInfo` (name, deletedAt). (3) Login page shows a restore/fresh choice dialog when re-registering with a previously deleted number: "Restore my data" calls new `/api/auth/restore-account` endpoint; "Start fresh" proceeds with normal signup + onboarding. (4) New `restore-account` API endpoint moves archived DSA+Applicant docs back to active collections, preserving original `_id` (so cases/contacts remain linked), generates fresh JWT, sets auth cookies. (5) v1 `dsa-onboarding` endpoint now calls `seedSampleData()` after creating new DSA records (was only in v2), with mobile fallback from `locals.user?.mobileNumber`. (6) `restore-account` added to CSRF public endpoints. **0 errors, 0 warnings.** 6 files modified (1 new). | Cross-phase | Bug Fix, UX |
| 2026-02-12 | 28cc6241 | **Fix 403 on new user login**: Removed fragile `verifiedMobile` cookie guard from `/api/auth/detect-roles` — the cookie set by `verify-otp` was not reliably available to the immediate next fetch, blocking new users from reaching signup. Guard was unnecessary (read-only, CSRF-exempt endpoint). Fixed misleading "Invalid OTP" catch-all error in login page to show actual error message. 2 files modified. 0 errors, 0 warnings. | Cross-phase | Bug Fix |
| 2026-02-12 | — | **Audit + fix reactive loops across all loan forms**: Full audit of 30+ components for self-referential `$effect` patterns. Fixed 3 files: (1) `IncomeSourceForm.svelte` — `tableAnswers` read-write loop fixed with `untrack()`. (2) `personal-Loan/+page.svelte` — unguarded `updateAnswerByKey('loanType', ...)` in `$effect` (DOD handler) now checks value before writing. (3) `plot-Loan/+page.svelte` — unguarded `updateAnswerByKey('numberOfDirectorOrApplicant', 1)` now checks value before writing. All other flagged patterns verified safe: `checkUnsecureData` (4 files, converges via boolean), `schemaProcessed` (3 files, converges via guard), `customIncomeTable` (hash + itrRegularly guards), `__completion` effects (queueMicrotask + value match), `fyPlaceholders` (reads month, writes different var). **0 errors, 0 warnings.** 3 files modified. | Cross-phase | Bug Fix |
| 2026-02-12 | — | **Demo Mode: Case Detail + Profile**: Fixed 404 on `/dashboard/dsa/cases/[case_id]` for demo users. Case detail `+layout.server.ts` now returns in-memory demo case data (serialized dates, stage transitions, lender apps). Case overview `+page.server.ts` returns demo timeline events + RM contacts, extracted `computeAttentionItems()` into reusable function. Profile `+page.server.ts` returns demo onboarding v2 data (business profile, pain points, goals, workflow, modules). All 3 files check `DEMO_USER_ID` and skip MongoDB. **0 errors, 0 warnings.** 3 files modified. | Phase 4 | Demo System |
| 2026-02-12 | — | **Codebase Audit + Hardening**: (1) **Credit score + obligations wiring** — `handleCreditScoreChange()` now maps legacy credit answers (cibilScore, obligationsRunning, lowScoreReasons, hasRecentCibil) to `applicantDataStore.updateCreditScore()`. `handleObligationUpdate()` captures old state, diffs by obligation ID to detect adds/updates/deletes, handles toggle via `softDeleteAllObligations()`/`restoreAllObligations()`. `openModal()` calls `getOrCreate()`. (2) **blockDemoWrite on 39 API routes** — 46 handler-level `blockDemoWrite(locals)` guards across all write endpoints (POST/PATCH/PUT/DELETE). Excluded auth routes (15), share-link routes (5), and GET-only routes. Demo users get mock success responses instead of DB writes. (3) **Archive 47 unused components** — moved to `src/lib/components/_archive/` (auth, old forms, old income, dashboard widgets, landing, mobile, RM value screens, relationship-capture examples). Added `_archive` to tsconfig.json exclude. Cleaned stale re-exports from `src/lib/index.ts`. Verified 14 falsely-identified components restored (Toast, PipelineCaseCard, AddApplicant, QuestionRenderer, ApplicantSelect, onboarding v2 sections, relationship-capture, landing-revamp shared). **0 errors, 0 warnings.** ~45 files modified. | Cross-phase | Audit, Security, Cleanup |
| 2026-02-12 | — | **Security Hardening + Performance Indexes**: (1) **Token ID** — replaced `Math.random()` with `crypto.randomUUID()` in `generateTokenId()` (cryptographically secure). (2) **CSRF enforcement** — production now calls `process.exit(1)` if `CSRF_SECRET` missing (was silent log). (3) **CSP nonces** — replaced `'unsafe-inline'` for scripts with per-request `'nonce-xxx'`; added `https://ik.imagekit.io` to connect-src. (4) **File upload security** — rewrote `/api/upload`: MIME whitelist (7 types), 10MB limit, filename sanitization (strip traversal), UUID-based storage names, max 10 files/request. (5) **ImageKit error sanitization** — no longer leaks internal error messages to client. (6) **Demo token** — reduced from 24h to 1h expiry. (7) **OTP → MongoDB migration** — replaced in-memory `Map` with `emailOtps` MongoDB collection: SHA-256 hashed OTP storage (never stores raw), `crypto.timingSafeEqual()` comparison, exponential backoff (0→5s→15s→30s→60s), 5 max attempts (was 3), TTL index auto-cleanup, unique email index, persistent across restarts. Updated 5 API consumers (`verify-email-otp`, `verify-email`, `send-email-verification`, `resend-email-otp`) to `await` async methods. (8) **MongoDB indexes** — comprehensive index strategy in `mongo.ts` for all 12 collections + 4 archive collections: `Applicant` (mobileNumber unique, email sparse, lastActiveAt), `DsaApplications` (mobileNumber unique, lastActiveAt), `rmApplications` (mobileNumber unique, lastActiveAt), `Cases` (case_id unique, dsa_id+is_archived+updated_at compound, dsa_id+stage, dsa_id+loan.type, dsa_id+is_sample sparse), `TimelineEvents` (case_id+created_at, case_id+event_type), `FormSnapshots` (case_id+version unique), `RMContacts` (is_active+lender_name, is_active+city, contributed_by+is_active, is_active+confirmation_count+last_confirmed_at), `CommunicationThreads` (case_id+dsa_id+rm_id unique), `DisclaimerAcceptances` (userId+disclaimerType), `ShareLinks` (token unique, applicationId+createdBy+createdAt), deleted archives (deletedAt). All indexes idempotent on startup. **0 errors, 0 warnings, 2,009 tests pass.** 10 files modified. | Cross-phase | Security, Performance |
| 2026-02-12 | — | **Permission Guards System**: Created `src/lib/config/permissions.ts` (shared ROLE_PERMISSIONS map — 4 roles, `resource.action` naming). Created `src/lib/server/guards.ts` (4 guard functions: `requireAuth`, `requireRole`, `requireAuthApi`, `requireRoleApi` + `blockDemoWrite`). Admin bypasses all role checks. Updated `auth.svelte.ts` to import from shared config (removed duplicate). Created 3 dashboard layout guards (`dsa/+layout.server.ts`, `rm/+layout.server.ts`, `admin/+layout.server.ts`). Added `requireRoleApi('dsa')` to 8 DSA API routes (`/api/dsa/features`, `/api/dashboard/scorecard|crm|policy-alerts|reminders`, `/api/communication/render-for-case`, `/api/share-link/create|revoke`). Added `requireRoleApi('rm')` to `/api/rm/search-dsas`. Added `requireAuthApi` to `/api/communication/templates|render`. Deleted 3 dead files, cleaned TableQuestion.svelte, wired topup-loan-offers. **48 new tests** in `guards.test.ts`. Total: 2,009 tests across 36 files. 0 errors, 0 warnings. 5 new files, 15 modified. | Cross-phase | Security |
| 2026-02-12 | — | **i18n + Disclaimers + RM Value Screens**: Built i18n infrastructure (`src/lib/i18n/` — `t()`, `tIn()`, `setLanguage()`, fallback chain, coverage checker). 3 translation files: `en.ts` (baseline, ~80 keys), `hi.ts` (Devanagari Hinglish), `mr.ts` (Devanagari Marathi). 100% coverage all languages. Built disclaimer system: `disclaimer.ts` (types + 7-config registry), `disclaimer.schema.ts` (Zod validation), `disclaimerAcceptances` MongoDB collection. Built 5 RM Value Proposition Svelte 5 components: `ValueScreen1-4.svelte` + `ValueScreenCarousel.svelte` (touch/swipe, progress dots, mandatory view). **259 new tests** in 3 files: `i18n.test.ts` (42), `disclaimer.test.ts` (53), `valueScreenContent.test.ts` (164). Total: 1,961 tests across 35 files. 0 errors, 0 warnings. 12 new files, 1 modified. | Phase 6 | 6.1, 6.16, 6.20-6.21, 6.23-6.25 |
| 2026-02-12 | — | **Validation Audit + Test Coverage**: Comprehensive validation UX overhaul — split keystroke vs blur validation across all input components. Login/partner-signup: `formatMobile()` (keystroke, strips non-digits) + `validateMobile()` (blur, full Zod schema). EmailField: regex moved to blur. TextField: email validation on blur via `validateOnBlur()`, `$inputErrors` gated behind `isTouched`, `maxlength` context-aware (254 for email, configurable for others). Fixed OTP schema (4-digit to match UI). Added Indian mobile first-digit rule (6-9). Moved `painPoints.ts`/`modules.ts` from `$lib/server/data/` to `$lib/data/` (pure constants, not server-only). **219 new tests** in 3 files: `formValidation.test.ts` (69), `checkGibberish.test.ts` (49), `authSchemas.test.ts` (101). Total: 1,702 tests across 32 files. 0 errors, 0 warnings. | Cross-phase | Validation |
| 2026-02-12 | — | **Wire Onboarding V2 + Clean Up**: Created `/dashboard/dsa/profile` route (server + page) rendering `OnboardingV2Wizard` with save/complete callbacks to `/api/onboarding/dsa-onboarding-v2`. Added "Profile" nav item to sidebar. Added dismissible banner on DSA dashboard prompting v2 completion. Returned `onboarding_v2_completed` flag from dashboard server. Deleted orphaned `CommonDetails.svelte`. 2 new files, 4 modified, 1 deleted. 0 errors, 0 warnings, 1,483 tests pass. | Phase 1 | 1.14-1.20 |
| 2026-02-12 | — | **RM Portal Design (AD-10–AD-13)**: Added AD-10 (16 RM features across 3 phases), AD-11 (7-point disclaimer system, server-enforced, Devanagari Hinglish), AD-12 (4 pre-onboarding value proposition screens), AD-13 (language selection — English default, Hindi+Marathi Phase 1, i18n architecture). Phase 6 created with 26 pending tasks. | Phase 6 | 6.1-6.26 |
| 2026-02-12 | — | **RM Partner Integration + Warning Cleanup**: Added RM partner system — partner signup (`/partner-signup`), RM onboarding (`/rm-onboarding`), RM dashboard (`/dashboard/rm` with cases/dsa-search/policies). Created `create-rm`, `search-dsas`, `share-with-rm` APIs. Added `communicationThreads` collection. Fixed JWT mismatch (hooks.server.ts falls back to DSA/RM collections). Consolidated auth into single `check-dsa` endpoint (handles DSA, RM, admin). Removed role picker from login (direct routing). Resolved all 222 svelte-check warnings (a11y, $state, unused CSS, deprecated slot). 0 errors, 0 warnings, 1,483 tests pass. ~60 files modified, 14 new files. | Phase 5 | 5.1-5.14 |
| 2026-02-12 | — | **Non-DSA Cleanup**: Deleted orphaned User/PC onboarding components (13 files), removed `check-rm`, `check-user`, `check-property-consultant` endpoints, removed `rm-onboarding`, `user-onboarding`, `property-consultant-onboarding` API endpoints. Cleaned admin stats, account deletion, email verification. ~20 files modified, 19 files deleted. | Phase 4 | 4.26-4.33 |
| 2026-02-12 | — | **Sidebar fix + Guest Demo System**: Fixed dashboard sidebar navigation (Cases, CRM, Communication, Analytics, New Case) with `isNavActive()` sub-page highlighting. Built complete guest demo system: in-memory demo data (4 cases, 22 events, 2 RMs), demo JWT (24h, `isDemo: true`), synthetic user in `hooks.server.ts`, `/api/auth/demo-login` endpoint, all 5 `+page.server.ts` files updated for demo mode, DemoBanner.svelte, "Explore Demo" button on login page. 5 new files, 8 modified files. Zero MongoDB dependency for demo sessions. | Phase 4 | 4.20-4.25 |
| 2026-02-11 | — | Document upload flow: Upload API endpoint (ImageKit, 10MB, PDF/JPEG/PNG/WebP), DocumentUpload.svelte (drag-drop, progress, replace), DocumentChecklist.svelte (progress bar, expand/collapse, freshness), wired into LenderApplicationCard. 5 files (3 new, 2 modified). | Phase 3 | 3.6 |
| 2026-02-11 | 8a1d0935 | Feature flags (15 flags, 3 tiers, per-DSA overrides) + API unit tests (369 new: case validation, stage transitions, query, snapshot, RM). 9 files, 1,483 total tests. | Phase 1-2 | 1.25, 2.11-2.15 |
| 2026-02-11 | c438b7f5 | Playwright E2E tests: 15 spec files + 1 shared setup covering all dashboard features. 16 files, +6,386 lines. Requires dev server + MongoDB. | All Phases | 1.30-1.33, 2.16-2.21, 3.17-3.19, 4.15-4.19 |
| 2026-02-11 | a293c263 | Polish: Mobile responsiveness (18 files, 768px breakpoints, 44px touch targets), error handling (5 client-side fetches), PDF generator tests (36 new). 19 files, 1,053 total tests. | Phase 3-4 | 3.14, 4.10, 4.11 |
| 2026-02-11 | 9efc5049 | Phase 4 UI + Analytics: Communication hub page, CRM with kanban pipeline, analytics scorecard (8 metrics + insights), lender policy alerts. 18 files, 1,017 total tests. | Phase 4 | 4.3, 4.7, 4.8, 4.9 |
| 2026-02-11 | 0b18f344 | Phase 3.3 + Phase 4 partial: PDF generation (pdfGenerator.ts + download), communication templates (16) + rendering API + WhatsApp share, smart reminders engine (14 types), rejection analyzer (10 categories). 15 new files, 954 total tests. | Phase 3-4 | 3.3, 4.1-4.2, 4.4-4.6, 4.12-4.14 |
| 2026-02-11 | 0123b951 | Phase 3 partial: File configurator + PII stripping (fileConfigurator.ts), document templates (5 lenders), 7 new API routes (file-config, file-builder, file-builder/verify, documents CRUD, apply-template, bulk), 4 test files (705 total tests). | Phase 3 | 3.1, 3.2, 3.4, 3.5, 3.7, 3.12-3.13, 3.15-3.16 |
| 2026-02-11 | 187db602 | Phase 2 complete: Lender DELETE + comparison table + tracking UI, RM CRUD API (4 routes), Form snapshot API (3 routes + helpers). | Phase 2 | 2.5, 2.6, 2.8, 2.9 |
| 2026-02-11 | 238cf9dc | Phase 2 Case CRUD APIs (7 routes + helpers), Case UI (list + detail), Unit tests (6 files, 461 tests pass). Fixed TS errors (ok-discriminated unions), schema test assertions. | Phase 2 + Testing | 2.1-2.4, 2.7, 2.10, 1.26-1.28 |
| 2026-02-11 | bf14446f | Phase 1 complete: Non-DSA removal, data foundation, onboarding v2 (schemas+UI+API), enterprise dashboard, sample data seeder. 47 files, +6,605/-1,754 lines. | Phase 1 | 1.1-1.24 |
| 2026-02-11 | — | Plan document created, CLAUDE.md created, MEMORY.md initialized | Phase 0 | — |

---

## Appendix A: Pain Points List (for Onboarding Section B)

DSA ranks top 5 from:
1. Tracking file status across multiple lenders
2. Document collection from customers is chaotic
3. Don't know which lender suits which customer profile
4. Can't calculate eligibility accurately before submitting
5. RM doesn't respond or delays processing
6. Commission tracking is manual and unreliable
7. No system to follow up with old/rejected leads
8. Don't know balance transfer opportunities
9. Can't generate professional proposals for customers
10. Spending too much time on WhatsApp coordination

## Appendix B: Communication Templates (16 Core)

### Customer-Facing
1. Document Request — lists pending docs, asks customer to share
2. Status Update — Processing — file is being processed
3. Status Update — Query — lender raised a query
4. Congratulations — Sanctioned — shares sanction details
5. Follow-up — Pending Documents — gentle reminder
6. Acknowledgment — Documents Received — confirms receipt

### RM-Facing
7. New File — Preview Share — cover message with anonymized PDF
8. Full File Submission — formal file submission
9. Query Response — responding to lender queries
10. Follow-up — File Status — checking on progress
11. Thank You — Sanction — acknowledging sanction

### Source/Broker-Facing
12. Lead Acknowledgment — confirming receipt of referred lead
13. Lead Update — Status — current status
14. Lead Update — Sanctioned — good news
15. Lead Update — Rejected — with tact
16. General Update — periodic check-in

## Appendix C: Document Freshness Rules

| Document Type | Validity Period | Alert Before |
|---|---|---|
| Bank Statement | 90 days from statement end date | 15 days |
| Salary Slip | 60 days from payslip month | 10 days |
| ITR | Valid until next filing season | 30 days |
| Form 16 | Valid for financial year | — |
| Property Valuation | 180 days | 30 days |
| Encumbrance Certificate | 30 days | 7 days |
| Title Search Report | 90 days | 15 days |
| NOC/Completion Certificate | No expiry | — |
| Identity Documents | No expiry (unless expired) | — |
