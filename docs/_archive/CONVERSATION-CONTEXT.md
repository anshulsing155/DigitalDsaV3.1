# DigitalDSA — Conversation Context

> **Created**: 2026-02-22 | **Updated**: 2026-02-26 | **Branch**: `main` | **Last commit**: `c09745fe`
> **Purpose**: Complete context snapshot for Claude Code sessions. Read this FIRST, then consult specialized docs as needed.

---

## 1. What Is This

A fintech SaaS platform for **Direct Selling Agents (DSAs)** in India who process home loans, LAP, personal loans, and balance transfers. DSA-only focus — no customer-facing portal. Three roles: DSA (primary), RM (bank relationship managers), Admin.

**Core user flow**: DSA fills loan form → Rule engine evaluates eligibility against bank rules → Shows lender results → DSA creates case → File builder generates submission documents → Track to disbursement.

**Business model**: Subscription SaaS for DSAs (Razorpay integration ready, billing UI pending).

---

## 2. Current Status

### Platform: Feature-Complete MVP

Everything below is **built, tested, and merged to `main`**:

| Area              | Status               | Details                                                                                   |
| ----------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| **Loan forms**    | 6 types              | Home, LAP, Plot, Personal, Business, Professional                                         |
| **Rule engine**   | In-house             | JSON-Logic evaluation, 12 income types, FOIR/LTV/EMI calculations                         |
| **Policy engine** | 8-phase workflow     | Geo + product axis, version control, RM submissions                                       |
| **Dashboards**    | 3 role-gated         | DSA (cases/CRM/analytics/team), RM (cases/broadcasts/policies), Admin (users/rules/audit) |
| **CRM**           | Optional             | Leads, contacts, follow-ups, lender contacts                                              |
| **i18n**          | 3 languages          | English, Hindi, Marathi (315+ keys, native script)                                        |
| **Auth**          | JWT + OTP            | 15min access, 7d refresh, MSG91 SMS, device fingerprinting                                |
| **Mobile**        | Capacitor 7          | Android config ready, needs APK build                                                     |
| **Dark mode**     | Complete             | System + manual toggle                                                                    |
| **Accessibility** | WCAG 2.1 AA          | Focus traps, ARIA labels, skip links, keyboard navigation                                 |
| **Anti-scraping** | 8 layers             | Session tracking, trust scoring, device fingerprinting                                    |
| **Guest demo**    | In-memory            | No MongoDB required, 4 sample cases                                                       |
| **Applicant Profile** | Complete          | Dedicated profile page for secured loans (education, religion, SC/ST category, disability, residence, properties). Lives in "Profile & Financial" wizard section (single-applicant) |
| **Pincode**       | Complete             | Typeahead, 3-digit validation, state/city/pincode cascade for all residence patterns       |
| **Testing**       | Comprehensive        | 7,010 unit tests (Vitest) + 34+ E2E specs (Playwright)                                    |
| **Type safety**   | 0 errors, 0 warnings | `pnpm run check` clean                                                                    |

### Production Blockers (2 items)

| #   | Blocker                     | Why                                                                                                       | Action                                                             |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | **Rotate all credentials**  | `.env` committed 19× to git history — Atlas, Razorpay, MSG91, ImageKit, SMTP, JWT, HMAC, CSRF all exposed | Rotate in each provider's console, update `.env`, verify app works |
| 2   | **Email service hardening** | Nodemailer SMTP with weak creds → need SES/SendGrid/Resend + SPF/DKIM/DMARC for digitaldsa.com            | Choose provider, configure DNS, update email service code          |

### Priorities After Launch

| Priority | Task                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------- |
| HIGH     | Push notifications (Web Push + email digests)                                                  |
| HIGH     | Subscription/payment UI (Razorpay wired, need plan selection + billing flow)                   |
| MEDIUM   | Capacitor APK build (Android Studio + Play Store submission)                                   |
| LATER    | Offline (Service Worker), WhatsApp Business API, AI document parsing, blog, commission tracker |

### Engineering Debt (Low Urgency)

- **E1.1**: 5 loan form pages share ~70% code (~7K lines). Extract shared `FormPage`. Deferred — high risk of regression.
- **i18n adoption**: 315+ keys defined but most UI still hardcoded English. Gradual `t()` replacement pass needed.

---

## 3. Tech Stack

| Layer               | Technology                      | Version/Notes                        |
| ------------------- | ------------------------------- | ------------------------------------ |
| **Framework**       | SvelteKit 5 + Svelte 5 Runes    | SSR + API routes                     |
| **Language**        | TypeScript (strict)             | Zero errors/warnings                 |
| **Database**        | MongoDB (native driver)         | 45 collections, 50+ indexes, no ORM  |
| **CSS**             | Tailwind CSS 4                  | Utility-first + custom CSS variables |
| **Icons**           | Lucide Svelte                   | 540+ icons via iconRegistry          |
| **Mobile**          | Capacitor 7                     | Android native shell                 |
| **Auth**            | JWT (access 15min + refresh 7d) | + OTP via MSG91                      |
| **Uploads**         | ImageKit                        | File storage + CDN                   |
| **PDF**             | pdf-lib                         | Server-side generation               |
| **Payment**         | Razorpay                        | Indian payment gateway               |
| **Email**           | Nodemailer                      | SMTP (migrating to SES/SendGrid)     |
| **Rules**           | json-logic-js                   | Declarative rule evaluation          |
| **Testing**         | Vitest + Playwright             | 7,010 unit + 34+ E2E                 |
| **Package manager** | pnpm 9+                         |                                      |
| **Deployment**      | Vercel                          | Node.js 22.x runtime                 |

---

## 4. Project Structure

```
DigitalDSA-V3/
├── src/
│   ├── hooks.server.ts                    # Auth entry — JWT, CSRF, device tracking, security headers
│   ├── app.d.ts                           # Global type definitions
│   │
│   ├── routes/
│   │   ├── (auth)/                        # Login, OTP verification
│   │   ├── (onboarding)/                  # DSA + RM registration flows
│   │   ├── (app)/                         # Protected routes
│   │   │   ├── form/                      # 6 loan form wizards (multi-page, multi-applicant)
│   │   │   ├── (Application)/             # Post-submission pages
│   │   │   ├── (offers)/                  # Lender results display
│   │   │   └── evaluating/                # Animated transition during evaluation
│   │   ├── dashboard/
│   │   │   ├── dsa/                       # Cases, CRM, analytics, team, RM contacts, profile
│   │   │   ├── rm/                        # Cases, DSA search, policies, broadcasts, submissions
│   │   │   └── admin/                     # Users, policies, testing, settings, audit
│   │   ├── (legal)/                       # About, terms, privacy, contact
│   │   ├── f/[token]/                     # Public share-link form page
│   │   └── api/                           # 161+ REST endpoints
│   │       ├── auth/                      # Login, OTP, logout, token refresh
│   │       ├── form/                      # Form evaluation, submission, snapshots
│   │       ├── cases/                     # Case CRUD, lender applications
│   │       ├── rule-engine/               # Loan eligibility evaluation
│   │       ├── policy-engine/             # Policy resolution
│   │       ├── admin/                     # User mgmt, rules, policies
│   │       ├── rm/                        # RM features
│   │       ├── dashboard/                 # Dashboard data
│   │       └── ...                        # 100+ more specialized endpoints
│   │
│   └── lib/
│       ├── components/                    # 100+ Svelte components
│       │   └── _archive/                  # 47 archived (check before creating new)
│       ├── database/
│       │   └── mongo.ts                   # 45 collections + 50+ indexes
│       ├── config/
│       │   ├── routes.ts                  # ALL route constants (single source of truth)
│       │   ├── accessControl.ts           # Permission system
│       │   ├── applicantOptions/          # Loan types, employment types
│       │   ├── bankSelection/             # Bank master list
│       │   └── incomeProfiles/            # 12 income type configs
│       ├── types/                         # TypeScript types (form, case, income, policy, etc.)
│       ├── server/                        # SERVER-ONLY business logic
│       │   ├── apiResponse.ts             # apiOk(), apiError(), apiServerError(), parseJsonBody()
│       │   ├── guards.ts                  # 9 auth/permission guards
│       │   ├── logger.ts                  # Structured logging (Pino-compatible)
│       │   ├── rateLimiter.ts             # Centralized rate limiting
│       │   ├── fileConfigurator.ts        # File builder + PII stripping
│       │   ├── pdfGenerator.ts            # PDF generation
│       │   ├── formEngine/                # Form evaluation, schema mapping
│       │   └── ...                        # 20+ more server utilities
│       ├── ruleEngine/                    # In-house evaluation system
│       │   ├── evaluationEngine.ts        # Main orchestrator
│       │   ├── incomeAssessor.ts          # 12 income types, multi-source
│       │   ├── emiCalculator.ts           # EMI, tenure calculations
│       │   ├── discomfortAnalyzer.ts      # Eligibility failure root causes
│       │   └── ...                        # 5+ more modules
│       ├── utils/
│       │   ├── payloadBuilder/            # Form → API payload (8 domain modules)
│       │   ├── securedClone.ts            # Secure clone/freeze/equality
│       │   └── ...
│       ├── i18n/                          # en.ts, hi.ts, mr.ts + helpers
│       ├── stores/                        # Legacy stores (migrating)
│       │   └── _bridge.svelte.ts          # Rune → Store bridge
│       ├── state/                         # Reactive state management
│       ├── services/                      # JWT, integrations
│       ├── validation/                    # Zod-based schemas
│       └── testing/                       # Fixtures, generators, scenarios
│
├── docs/                                  # Documentation (you are here)
│   ├── DEVELOPMENT-PLAN.md                # Living plan — always read first
│   ├── CHANGELOG.md                       # Detailed work log (append-only)
│   ├── ARCHITECTURE.md                    # 41KB system architecture deep-dive
│   ├── RULE-ENGINE-SPECIFICATION.md       # Rule engine spec (49KB)
│   ├── PAYLOAD_DOCUMENTATION.md           # Form → API data flow (22KB)
│   ├── LOAN-ASSESSMENT-API-INTEGRATION.md # External API contract (39KB)
│   ├── CONVERSATION-CONTEXT.md            # This file
│   └── _archive/                          # 6 completed docs (reference only)
│
├── .env / .env.example                    # Environment config
├── package.json                           # Dependencies (35 prod + 20 dev)
├── svelte.config.js                       # SvelteKit config (Vercel adapter)
├── capacitor.config.ts                    # Capacitor 7 mobile config
├── vite.config.ts                         # Vite + pre-launch reminders plugin
├── tsconfig.json                          # TypeScript strict mode
├── tailwind.config.ts                     # Tailwind CSS 4
├── playwright.config.ts                   # E2E testing
└── vitest.config.ts                       # Unit testing
```

---

## 5. Key Metrics

| Metric              | Value                    |
| ------------------- | ------------------------ |
| Source files        | 988 (TS/Svelte)          |
| Lines of code       | ~73,000                  |
| MongoDB collections | 45                       |
| API endpoints       | 161+                     |
| Svelte components   | 100+ active, 47 archived |
| Unit tests          | 7,010 (Vitest)           |
| E2E specs           | 34+ (Playwright)         |
| Git commits         | 1,836                    |
| Type errors         | 0                        |
| Type warnings       | 0                        |
| Loan types          | 6                        |
| Income types        | 12                       |
| Languages           | 3 (en, hi, mr)           |
| Dashboard roles     | 3 (DSA, RM, Admin)       |
| Translation keys    | 315+ per language        |

---

## 6. Architecture Decisions (Non-Negotiable)

These are **permanent constraints** — do not violate or propose alternatives.

| #     | Decision                       | Meaning                                                                                                           |
| ----- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| AD-01 | DSA primary, RM passive        | DSAs own cases. RMs are partners, not primary users.                                                              |
| AD-02 | Cases wrap immutable snapshots | `FormSnapshot` is versioned. Edits create new versions, not overwrites.                                           |
| AD-03 | File Builder is derived        | Auto-generated from form + rules. DSA controls presentation (show/hide, order) but CANNOT edit financial numbers. |
| AD-04 | RM database centralized        | RM contacts crowdsourced from all DSAs, shared globally.                                                          |
| AD-05 | Every edit = new version       | SHA-256 hash per snapshot. Full audit trail.                                                                      |
| AD-06 | v1 PDF has NO PII              | System-enforced by `fileConfigurator.ts`. Not a toggle.                                                           |
| AD-07 | CRM is optional                | DSA can use platform without CRM features.                                                                        |
| AD-08 | Sample data on onboarding      | 4 demo cases with `is_sample: true` pre-loaded for new DSAs.                                                      |
| AD-09 | Guest demo mode                | Works in-memory, no MongoDB connection needed.                                                                    |
| AD-10 | RM Portal (16+5 features)      | Full RM experience, not just a data viewer.                                                                       |
| AD-11 | Disclaimers server-enforced    | 7 disclaimer points, rendered in PDF footer by server.                                                            |
| AD-12 | RM value screens               | 4 pre-onboarding screens showing RM benefits.                                                                     |
| AD-13 | Language: English default      | Native Devanagari script for hi/mr. Colloquial, not formal.                                                       |
| AD-14 | Anti-scraping (8 layers)       | Silent fingerprinting, session tracking, trust scoring.                                                           |

---

## 7. Coding Conventions

### Svelte 5 Runes (Mandatory for New Code)

```svelte
<!-- Reactive state -->
let count = $state(0);
let form = $state({ name: '', email: '' });

<!-- Derived values -->
let fullName = $derived(first + ' ' + last);

<!-- Side effects -->
$effect(() => { console.log(count); });

<!-- Bridge for legacy store consumers -->
import { fromRune } from '$lib/stores/_bridge.svelte';
const store = fromRune(() => runeValue);
```

**Never** use legacy Svelte stores (`writable`, `readable`) in new code.

### Server API Pattern

```typescript
// Always use:
import { apiOk, apiError, apiServerError } from '$lib/server/apiResponse';
import { parseJsonBody } from '$lib/server/apiResponse';
import { logger } from '$lib/server/logger';
import { requireDsa, requireAdmin } from '$lib/server/guards';

// Parse body (never bare request.json())
const body = await parseJsonBody(request);
if (!body.ok) return apiError(400, body.error);

// Auth guards
const dsa = requireDsa(locals);
if (!dsa.ok) return apiError(401, dsa.error);

// Logging (never bare console.log/warn/error)
logger.info({ userId, action: 'case_created' }, 'New case');
logger.error({ err }, 'Failed to create case');

// Responses
return apiOk({ case: newCase });
return apiError(400, 'Invalid loan amount');
return apiServerError(err, 'POST /api/cases');
```

### Data Cloning

| Scenario                         | Use                 |
| -------------------------------- | ------------------- |
| Reactive `$state` → plain object | `$state.snapshot()` |
| Untrusted / user-submitted data  | `securedClone()`    |
| Trusted defaults / reset values  | `structuredClone()` |
| Shallow copy                     | `{ ...obj }` spread |
| Immutable audit snapshot         | `securedFreeze()`   |
| Deep equality check              | `securedEquals()`   |

**Never** use `JSON.parse(JSON.stringify())`.

### Other Rules

- **Server-side everything**: Business logic, calculations, eligibility in `+page.server.ts` or API routes. Client renders only.
- **No required PII**: Customer name/PAN/Aadhaar/phone/address never required. `optional_contact` is voluntary.
- **Routes**: All navigation paths in `src/lib/config/routes.ts` (single source of truth).
- **Archived components**: Check `src/lib/components/_archive/` (47 components) before creating new ones.
- **Income profiling**: 12 types, multi-source per applicant. This is the competitive moat — never simplify.
- **Numbers immutable**: DSA can control presentation but cannot edit financial figures.

---

## 8. Database Schema (Quick Reference)

### Core Collections (45 total)

**Users & Auth:**

- `userApplications` — Base user records
- `DsaApplications` — DSA role data
- `rmApplications` — RM role data
- `pcApplications` — Property Consultant data
- `AdminUsers` — Admin accounts

**Cases & Forms:**

- `cases` — Main case documents (stage, lender_applications[])
- `formSnapshots` — Immutable form versions (SHA-256 hash)
- `timelineEvents` — Case activity log
- `communicationThreads` — Case messaging

**Lender & Policy:**

- `lenderResultsSnapshots` — Versioned eligibility results
- `lenders` / `lenderProducts` / `productVariations` — Lender catalog
- `policyRules` / `policyVersions` — Policy logic (JSON-Logic)
- `geoScopes` — Geographic scoping
- `lenderRuleArtifacts` / `lenderRuleFixtures` — Rule definitions + test fixtures
- `rmSubmissions` — RM policy update submissions

**CRM:**

- `rmContacts` — RM database (crowdsourced)
- `leads` / `sources` — DSA CRM
- `crmLenders` — Lender contacts
- `teams` — Sub-DSA teams

**Security & Tracking:**

- `formSessions` — Anti-scraping session tracking
- `trustScores` — IP/device trust scoring
- `deviceRegistry` — Silent fingerprinting
- `disclaimerAcceptances` — Disclaimer version tracking
- `shareLinks` — Public form share tokens

**Data Model Quick Ref:**

```
Case: case_id, dsa_id, label, loan{type,amount,tenure}, stage(11 states),
      lender_applications[], optional_contact?, source?, is_sample

LenderApplication (embedded): lender_id, status(11 states),
      eligibility_snapshot{traffic_light, amount, roi, emi, foir, ltv},
      document_checklist[], file_config?, file_snapshots[]

FormSnapshot: case_id, version(auto-inc), payload(immutable), payload_hash(SHA-256)
```

---

## 9. Authentication & Security

**Auth Flow:**

1. DSA enters mobile number → SMS OTP via MSG91
2. OTP verified → JWT pair issued (access 15min + refresh 7d)
3. Tokens stored in secure HTTP-only cookies
4. Device fingerprinting (silent, stored in `deviceRegistry`)
5. One active token ID per device

**Security Stack:**

- CSRF: Synchronizer token pattern
- Headers: X-Frame-Options, X-Content-Type-Options, CSP
- Rate limiting: Centralized (`rateLimiter.ts`) — 1 OTP/5min/IP, 3 resends max
- Anti-scraping: 8 layers (session tracking, trust scores, device fingerprint, honeypot, etc.)
- PII protection: System-enforced — v1 PDF never contains PII

**Hooks pipeline** (`src/hooks.server.ts`): Every request goes through JWT validation → CSRF check → role resolution → security headers → route guard.

---

## 10. Loan Form System

### Form Types

| Form              | Route                                   | Property  | Loan Type             |
| ----------------- | --------------------------------------- | --------- | --------------------- |
| Home Loan         | `/form/home-loan`                       | Secured   | Purchase/refinance    |
| LAP               | `/form/lap`                             | Secured   | Loan Against Property |
| Plot Loan         | `/form/plot-loan`                       | Secured   | Plot purchase         |
| Personal Loan     | `/form/unsecure-loan/personal-loan`     | Unsecured | Personal              |
| Business Loan     | `/form/unsecure-loan/business-loan`     | Unsecured | Business/trade        |
| Professional Loan | `/form/unsecure-loan/professional-loan` | Unsecured | Professional services |

### Form Architecture

- Multi-page wizard (3-5 steps depending on loan type)
- Multi-applicant (1-N individual applicants + optional Company applicant)
- 12 income types per applicant (salaried, self-employed, rental, dividend, etc.)
- Autosave with visual indicator
- Draft export/import (JSON)
- Share links (public form access with OTP + session timeout)
- Schema-driven validation (7 JSON schema files in `src/lib/config/`)
- **Wizard sections** (secured loans): Applicants > Who's Applying | Profile & Financial > Profile > Employment & Income > Obligations > Credit Score | Property | Deal & Financials
- **Applicant Profile** includes: education, religion, SC/ST category (Hindu only), disability, residence pattern, state/city/pincode, owned properties, NRI country
- **SC/ST + Disability**: Per-applicant fields with case-level enricher derivations (`isSCST`, `hasDisabledApplicant`) for bank rate concession matching

### Form → Evaluation Flow

```
Form UI → payloadBuilder (8 modules) → API /evaluate → Rule Engine
  → incomeAssessor (12 types) → emiCalculator → evaluationEngine
  → resultBuilder → discomfortAnalyzer → Lender Results
```

---

## 11. Rule Engine

The in-house rule engine is the core competitive advantage. It evaluates loan eligibility against bank-specific rules.

**Components:**

- `evaluationEngine.ts` — Orchestrator
- `incomeAssessor.ts` — Calculates total income from 12 source types, handles multi-source
- `emiCalculator.ts` — EMI, tenure, rate calculations
- `payloadEnricher.ts` — Transforms form payload into evaluation-ready data
- `resultBuilder.ts` — Synthesizes per-lender results (traffic light: green/amber/red)
- `ruleValidator.ts` — Validates rule artifact format
- `discomfortAnalyzer.ts` — Root cause analysis for eligibility failures

**Rule Format:** JSON-Logic stored in `lenderRuleArtifacts` collection. Each bank has its own rules covering:

- Minimum/maximum income thresholds
- FOIR (Fixed Obligation to Income Ratio) limits
- LTV (Loan to Value) ratios
- Age limits
- Employment type requirements
- Geographic restrictions
- Product-specific criteria

**Deep dive:** See `docs/RULE-ENGINE-SPECIFICATION.md` (49KB).

---

## 12. External Integrations

| Service         | Purpose            | Env Vars                                                           |
| --------------- | ------------------ | ------------------------------------------------------------------ |
| MongoDB Atlas   | Database           | `VITE_MONGODB_URI`                                                 |
| MSG91           | OTP SMS delivery   | `MSG91_AUTHKEY`                                                    |
| ImageKit        | File upload + CDN  | `IMAGEKIT_ENDPOINT`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY` |
| Razorpay        | Payment processing | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`                           |
| Nodemailer/SMTP | Email delivery     | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`                              |
| Vercel          | Hosting            | Platform config                                                    |

---

## 13. Important Files (Quick Lookup)

### Critical — Read Before Modifying

| File                                     | Purpose                                                  |
| ---------------------------------------- | -------------------------------------------------------- |
| `src/hooks.server.ts`                    | Auth middleware, CSRF, security headers, device tracking |
| `src/lib/database/mongo.ts`              | All 45 collections + 50+ indexes                         |
| `src/lib/types/index.ts`                 | Core types (User, Dsa, Rm, PropertyConsultant)           |
| `src/lib/types/form.ts`                  | Applicant, employment, company types                     |
| `src/lib/types/case.ts`                  | Case stages, lender app status, documents                |
| `src/lib/config/routes.ts`               | ALL route constants (single source of truth)             |
| `src/lib/server/apiResponse.ts`          | Standardized API response helpers                        |
| `src/lib/server/guards.ts`               | 9 auth/permission guard functions                        |
| `src/lib/server/logger.ts`               | Structured server-side logging                           |
| `src/lib/ruleEngine/evaluationEngine.ts` | Rule evaluation orchestrator                             |
| `src/lib/ruleEngine/incomeAssessor.ts`   | Income profiling (12 types)                              |
| `src/lib/utils/payloadBuilder/`          | Form → API payload (8 modules)                           |
| `src/lib/server/fileConfigurator.ts`     | File builder + PII stripping                             |

### Reference — Consult When Working in Area

| File                                           | Purpose                                   |
| ---------------------------------------------- | ----------------------------------------- |
| `src/lib/types/incomeProfile.ts`               | 12 income source types                    |
| `src/lib/types/policyEngine.ts`                | Policy system types                       |
| `src/lib/config/incomeProfiles/`               | Income profile configurations             |
| `src/lib/config/bankSelection/`                | Bank master list                          |
| `src/lib/config/applicantOptions/loanTypes.ts` | Loan type definitions                     |
| `src/lib/server/pdfGenerator.ts`               | Server-side PDF generation                |
| `src/lib/i18n/index.ts`                        | i18n helpers (t, tPlural, formatCurrency) |
| `src/lib/utils/securedClone.ts`                | Secure clone/freeze/equals                |
| `src/lib/server/rateLimiter.ts`                | Centralized rate limiting                 |
| `src/lib/stores/_bridge.svelte.ts`             | Rune → Store bridge                       |

---

## 14. Dashboard Routes

```
/dashboard/dsa/
  ├── (home)            # Overview, stats, recent cases
  ├── cases/            # Case list + detail views
  ├── crm/              # Leads, contacts, follow-ups
  ├── communication/    # Case-level messaging
  ├── analytics/        # Pipeline, conversion metrics
  ├── rm-contacts/      # Crowdsourced RM database
  ├── profile/          # DSA profile + settings
  └── team/             # Sub-DSA management

/dashboard/rm/
  ├── (home)            # Overview
  ├── cases/            # Partner cases with DSAs
  ├── dsa-search/       # Find DSA partners
  ├── policies/         # Policy authoring
  ├── broadcasts/       # Policy update broadcasts
  └── submissions/      # Policy approval/rejection

/dashboard/admin/
  ├── (home)            # Overview
  ├── users/            # Approve/block DSAs, RMs
  ├── policies/         # Rule authoring + testing
  ├── approvals/        # Pending approvals
  ├── audit/            # Activity logs
  └── settings/         # System configuration
```

---

## 15. Recent Git History (Last 20 Commits)

```
82171357 feat: resale checklist consolidation + NBFC capabilities + credit score fix + property logic
c09745fe feat: add ApplicantProfilePage — dedicated profile step for all secured loans
85d42eba feat: pincode validation — show error if pincode doesn't match city/state
e7e6d0fb feat: pincode typeahead — area suggestions after 3 digits, filtered by city
0c93d711 fix: pincode field now accepts digits — was blocked by text-only filter
718f9d72 fix: wire pincode into payload pipeline — was captured but never saved
a0ee6475 feat: company enhancement — office proximity, owned properties, director details
44b1e703 fix: compound index — all Cases queries now use { case_id, dsa_id }
955da905 fix: V2 dropdown IDs + server import guard
f29cbbc0 feat: Phase 4 — offer card updates (tranche, NRI GPA, urgency, BT appreciation)
68b86e42 feat: Phases 1-3 — rule engine wiring, component pages, V2 schema
fd713f00 chore: evaluating page cleanup, payloadBuilder fixes, icon registry, misc updates
4d4bbeca feat: add API routes — evaluate-and-persist, policy seed/delete, testing-activity
81ca98da feat: enhance admin dashboard — policies, testing, settings, users, audit pages
9d2d112b feat: expand testing infrastructure — 2,520 new tests, gap reports, real bank integration
6b62bc73 feat: enhance rule engine — discomfort analyzer, real bank rules, system config
0aea1661 refactor: clean up JSON schemas across all 7 loan types + update reverseSchemaMap
b84bd946 fix: resolve submit button blocked by Company applicant on secured loan forms
bfafdbf8 docs: restructure development plan + create changelog + archive completed docs
86cbd6d1 feat: P1.1-P1.4 — draft export, case prefill, OTP timer, session timeout
a51195af feat: E3.1-E3.4 — i18n expansion (315+ keys, Hindi/Marathi, pluralization, currency formatting)
```

---

## 16. Development Commands

```bash
# Daily workflow
pnpm run dev           # Dev server → localhost:5173
pnpm run check         # TypeScript — target: 0 errors, 0 warnings
pnpm run test:unit     # Vitest — 7,010 tests
pnpm run test:e2e      # Playwright — 34+ specs (needs dev server + MongoDB)

# Build & preview
pnpm run build         # Production build
pnpm run preview       # Local preview → localhost:4173

# Install
pnpm install           # Install dependencies
```

---

## 17. Development Rules

1. **Always update `docs/DEVELOPMENT-PLAN.md`** when completing tasks
2. **Always log to `docs/CHANGELOG.md`** after every session/commit
3. **Stay on `main` branch** — never switch to other branches
4. **Never add Co-Authored-By lines** to commits
5. **Don't delete multi-role code** — soft-disable in UI only
6. **File Builder is derived** — never allow editing of financial numbers
7. **v1 PDF never contains PII** — system-enforced
8. **Check `_archive/`** before creating new components or docs
9. **Server-side everything** — client is rendering only
10. **No required PII** — `optional_contact` is voluntary
11. **Use Svelte 5 runes** for all new reactive state
12. **Use standardized API patterns** (`apiOk`, `parseJsonBody`, `logger`, guards)
13. **Income profiling is the moat** — 12 types, multi-source, never simplify

---

## 18. Documentation Map

| Doc                                       | Size    | Read When                                            |
| ----------------------------------------- | ------- | ---------------------------------------------------- |
| **This file** (`CONVERSATION-CONTEXT.md`) | ~15KB   | Start of every session — complete overview           |
| `DEVELOPMENT-PLAN.md`                     | 7KB     | Always — current plan, priorities, conventions       |
| `CHANGELOG.md`                            | 10KB    | After completing work — append your entry            |
| `NEXT-SESSION-PLAN.md`                    | 6KB     | Next session task breakdown + continuation prompt    |
| `NEXT-SESSION-PROMPT.md`                  | 4KB     | Copy-paste prompt for next Claude Code session       |
| `NEXT-SESSION-AREA-SPECIFIC-IMPLEMENTATION.md` | 5KB | Step-by-step schema update guide                   |
| `AREA-SPECIFIC-COMPLIANCE-REDESIGN.md`    | —       | Full area-specific redesign spec                     |
| `ARCHITECTURE.md`                         | 41KB    | Before touching code — system deep-dive              |
| `RULE-ENGINE-SPECIFICATION.md`            | 49KB    | Rule engine / policy work                            |
| `PAYLOAD_DOCUMENTATION.md`                | 22KB    | Form → API data flow                                 |
| `LOAN-ASSESSMENT-API-INTEGRATION.md`      | 39KB    | External API contract                                |
| `CLAUDE.md` (project root)                | 10KB    | Quick reference — conventions, patterns, quick start |
| `_archive/`                               | 6 files | Historical reference only                            |

---

## 19. Session Checklist

**Start of session:**

1. Read this file (`CONVERSATION-CONTEXT.md`)
2. Read `DEVELOPMENT-PLAN.md` for current priorities
3. `git status` to confirm clean working tree on `main`

**During work:** 4. `pnpm run check` after every change (target: 0 errors, 0 warnings) 5. `pnpm run test:unit` to verify no regressions

**End of session:** 6. Update `DEVELOPMENT-PLAN.md` if tasks completed/discovered 7. Append entry to `CHANGELOG.md` 8. Commit to `main` (no Co-Authored-By)

---

_Last updated: 2026-02-26 by Claude Code session_
