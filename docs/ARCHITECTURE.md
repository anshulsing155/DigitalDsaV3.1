# DigitalDSA V3 — Architecture Guide

> **Purpose**: One document, full understanding. Read this before touching any code.
> **Last updated**: 2026-04-03

---

## Table of Contents

1. [What This System Does](#1-what-this-system-does)
2. [The 30-Second Mental Model](#2-the-30-second-mental-model)
3. [Tech Stack](#3-tech-stack)
4. [Directory Map](#4-directory-map)
5. [Request Lifecycle](#5-request-lifecycle)
6. [Authentication & Security](#6-authentication--security)
7. [Routing Architecture](#7-routing-architecture)
8. [The Form Engine](#8-the-form-engine)
9. [The Rule Engine](#9-the-rule-engine)
10. [The Policy Engine](#10-the-policy-engine)
11. [Case & Snapshot System](#11-case--snapshot-system)
12. [Income Profiling System](#12-income-profiling-system)
13. [Database Layer](#13-database-layer)
14. [State Management](#14-state-management)
15. [Component Architecture](#15-component-architecture)
16. [PDF Generation](#16-pdf-generation)
17. [CRM & Team System](#17-crm--team-system)
18. [Anti-Scraping & Trust](#18-anti-scraping--trust)
19. [Testing](#19-testing)
20. [External Integrations](#20-external-integrations)
21. [Key Architectural Decisions](#21-key-architectural-decisions)

---

## 1. What This System Does

DigitalDSA is a **fintech platform for Direct Selling Agents (DSAs)** in India who process **6 loan types**: home loans, LAP, plot loans, personal loans, business loans, and professional loans. Supports balance transfers and top-ups.

**Core value proposition**: A DSA fills in a loan application form. The system:

1. Profiles the applicant's income (12 types, multi-source)
2. Evaluates eligibility against 50+ bank policies
3. Returns per-lender results (green/amber/red) with amounts, rates, EMIs
4. Generates lender-ready files (PDFs)
5. Tracks the case through its lifecycle to disbursement

**Users**:
| Role | What they do |
|------|-------------|
| **DSA** | Fill forms, view results, build files, manage cases, run CRM |
| **RM** (Relationship Manager) | Review cases, broadcast policies, submit policy updates |
| **Admin** | Manage users, author rules, configure policy engine, run tests |

---

## 2. The 30-Second Mental Model

```
                          DigitalDSA — End-to-End Flow
                          ============================

  DSA logs in          Fills loan form          System evaluates
  (OTP on phone)       (multi-page wizard)      (rule engine)
       |                     |                        |
       v                     v                        v
  +---------+    +------------------+    +------------------------+
  |  AUTH   | -> |   FORM ENGINE    | -> |     RULE ENGINE        |
  | JWT+OTP |    | Server-driven    |    | JSON-Logic per lender  |
  +---------+    | schema + showWhen|    | Income + FOIR + LTV    |
                 +------------------+    +------------------------+
                                                    |
                                                    v
                                         +-------------------+
                                         |  LENDER RESULTS   |
                                         | Green/Amber/Red   |
                                         | Amount, ROI, EMI  |
                                         +-------------------+
                                                    |
                          +-------------------------+-------------------------+
                          |                         |                         |
                          v                         v                         v
                 +----------------+       +------------------+      +----------------+
                 |  CASE SYSTEM   |       |  FILE BUILDER    |      |  PDF GENERATOR |
                 | Stage pipeline |       | DSA presentation |      | PII-stripped   |
                 | Lender apps    |       | control layer    |      | review + full  |
                 +----------------+       +------------------+      +----------------+
```

**Key invariant**: All business logic runs server-side. The client is a rendering layer.

---

## 3. Tech Stack

```
Layer           Technology              Why
-----------     ---------------------   ----------------------------------------
Framework       SvelteKit 5 + Svelte 5  SSR + SSG + API routes in one
Language        TypeScript (strict)      Type safety across 1,232 files (859 TS + 373 Svelte)
Database        MongoDB (native driver)  Flexible schema, no ORM overhead
CSS             Tailwind CSS 4           Utility-first + dark mode tokens
Mobile          Capacitor 7 (Android)    Native shell wrapping web app
Auth            JWT (15min + 7d) + OTP   Stateless auth, MSG91 for SMS
Uploads         ImageKit                 CDN + image processing
PDF             pdf-lib                  Server-side PDF generation
Payment         Razorpay                 Indian payment gateway
Email           Nodemailer               SMTP-based email delivery
Rules           json-logic-js            Declarative rule evaluation
Testing         Vitest + Playwright      Unit (73 files, 7,015+ tests) + E2E
Pkg Manager     pnpm                     Fast, strict node_modules
```

---

## 4. Directory Map

```
src/
 |
 |-- hooks.server.ts              # REQUEST ENTRY POINT
 |                                  JWT auth, CSRF, security headers,
 |                                  device detection, activity tracking
 |
 |-- routes/                      # PAGES + API (SvelteKit routing)
 |    |-- (auth)/login/             # OTP login flow
 |    |-- (onboarding)/             # DSA + RM registration
 |    |-- (app)/                    # AUTH-GATED: forms + results
 |    |    |-- form/                  # Multi-page loan forms
 |    |    |-- (Application)/         # Post-submission pages
 |    |    |-- (offers)/              # Lender result pages
 |    |    +-- evaluating/            # Animated transition
 |    |-- dashboard/                # ROLE-GATED dashboards
 |    |    |-- dsa/                   # DSA: cases, CRM, analytics
 |    |    |-- rm/                    # RM: cases, broadcasts, policies
 |    |    +-- admin/                 # Admin: users, rules, settings
 |    |-- f/[token]/                # PUBLIC: share-link form
 |    +-- api/                      # 183 REST API endpoints
 |         |-- auth/                  # 16 auth endpoints
 |         |-- form/                  # Form evaluate + submit
 |         |-- cases/                 # Case CRUD + nested resources
 |         |-- rule-engine/           # Evaluate loan against rules
 |         |-- policy-engine/         # Resolve policy by geo + product
 |         |-- admin/                 # User mgmt, policy, settings
 |         |-- rm/                    # RM features (15+ endpoints)
 |         +-- ...                    # 100+ more endpoints
 |
 |-- lib/                         # SHARED CODE (the "engine room")
      |
      |-- database/
      |    +-- mongo.ts               # 58 collections, 110 indexes
      |
      |-- server/                   # SERVER-ONLY BUSINESS LOGIC
      |    |-- formEngine/            # Form evaluation + rendering
      |    |    |-- engine.ts           # Core: page eval, validation
      |    |    |-- visibility.ts       # showWhen rule evaluation
      |    |    |-- optionResolver.ts   # Dynamic option filtering
      |    |    +-- schemas/_archive/   # Legacy JSON schemas (archived)
      |    |-- pdfGenerator.ts        # Review (PII-stripped) + Full PDFs
      |    |-- scorecardEngine.ts     # DSA performance metrics
      |    |-- reminderEngine.ts      # Smart case reminders
      |    |-- fileConfigurator.ts    # DSA presentation layer
      |    |-- caseHelpers.ts         # Case CRUD utilities
      |    |-- demoData.ts            # In-memory demo dataset
      |    +-- aiService.ts           # AI rule parsing (Gemini/OpenAI)
      |
      |-- ruleEngine/               # LOAN ELIGIBILITY ENGINE
      |    |-- evaluationEngine.ts    # Main pipeline orchestrator
      |    |-- incomeAssessor.ts      # Multi-source income haircuts
      |    |-- emiCalculator.ts       # EMI, FOIR, LTV calculations
      |    |-- ruleValidator.ts       # JSON-Logic validation
      |    |-- resultBuilder.ts       # Decision factors + suggestions
      |    |-- payloadEnricher.ts     # Derived fields (avg profit, etc.)
      |    +-- types.ts               # Rule engine types
      |
      |-- services/                 # CROSS-CUTTING SERVICES
      |    |-- jwtService.ts          # Token generation + verification
      |    |-- authService.ts         # Client-side auth orchestration
      |    |-- emailService.ts        # Nodemailer wrapper
      |    |-- otpStore.ts            # In-memory OTP tracking
      |    +-- securityMonitor.ts     # Rate limiting + abuse detection
      |
      |-- types/                    # TYPESCRIPT DEFINITIONS
      |    |-- index.ts               # User, Dsa, Rm, PropertyConsultant
      |    |-- form.ts                # Applicant, LoanEntry (730 lines)
      |    |-- case.ts                # Case stages, lender app status
      |    |-- incomeProfile.ts       # 12 income source types
      |    |-- policyEngine.ts        # 2-axis policy types
      |    |-- formSnapshot.ts        # Immutable form versions
      |    +-- ...                    # 30+ more type files
      |
      |-- config/                   # CONFIGURATION & SCHEMAS
      |    |-- {loanType}/            # TS COMPOSITION LAYER (6 loan types)
      |    |    |-- composer.ts         # Schema assembly per loan
      |    |    |-- pages.ts            # Page definitions & ordering
      |    |    +-- questionBank/       # Questions grouped by page
      |    |-- schema/                # Shared composition infrastructure
      |    |    |-- jsonLogicHelpers.ts  # jl() builder, showWhen helpers
      |    |    +-- schemaTypes.ts      # RawSchemaQuestion, Page types
      |    |-- incomeProfiles/        # 12 income type configs (6 files)
      |    |-- bankSelection/         # 50+ banks (PVT/GOV/NBFC)
      |    |-- wizardSections/        # Per-loan sidebar configs (6 files)
      |    |-- showWhenEngine.ts      # Conditional visibility rules
      |    +-- permissions.ts         # Role-based access control
      |
      |-- state/                    # CLIENT STATE (Svelte 5 Runes)
      |    |-- form.svelte.ts         # Form answers, navigation, page index
      |    |-- applicant.svelte.ts    # Applicant data + recovery bin
      |    |-- auth.svelte.ts         # User, role, OTP flow
      |    |-- dialog.svelte.ts       # Modal stack management
      |    +-- ui.svelte.ts           # Loading, errors, toasts
      |
      |-- components/               # 373 SVELTE COMPONENTS
      |    |-- form-wizard/           # FormShell, StepIndicator, Nav
      |    |-- dashboard/             # CaseCard, Pipeline, Results
      |    |-- landing-revamp/        # Marketing page components
      |    |-- onboarding/            # Registration wizards
      |    |-- Modal.svelte           # Base modal (<dialog>)
      |    |-- AddApplicant.svelte    # Applicant entry (composable extraction)
      |    |-- DirectorCards.svelte   # Director/partner card capture
      |    |-- DirectorFormModal.svelte # Per-director detail modal
      |    |-- Company*.svelte        # 8+ company tab components
      |    +-- ...                    # 350+ more components
      |
      |-- utils/                    # HELPER FUNCTIONS (50 files)
      |    |-- payloadBuilder.ts      # Form data -> lender-ready payload
      |    |-- casePayloadBuilder.ts  # Form data -> case document
      |    +-- ...                    # Formatting, validation, etc.
      |
      +-- testing/                  # TEST INFRASTRUCTURE
           |-- __tests__/             # 73 Vitest test files (7,015+ tests)
           |-- e2e/                   # Playwright specs
           |-- fixtures/              # 15 realistic loan profiles
           |-- scenarios/             # Form path scenarios + auditor
           +-- generators/            # Synthetic data generators
```

---

## 5. Request Lifecycle

Every HTTP request flows through `hooks.server.ts` before reaching any route:

```
Browser Request
     |
     v
[1] CSRF TOKEN
     |  GET requests: generate + set cookie
     |  POST/PUT/DELETE: validate x-csrf-token header
     |  Skip: public auth endpoints, share links
     v
[2] JWT AUTHENTICATION
     |  Read accessToken from cookie or Authorization header
     |  If expired -> attempt refresh token rotation
     |  If refresh succeeds -> new token pair, set cookies
     |  If refresh fails -> user = null (unauthenticated)
     |
     |  Device detection:
     |    Same device -> push tokenId to activeTokenIds[] (max 10)
     |    Different device -> NUKE all old tokens (security reset)
     |
     |  Demo user bypass: isDemo flag skips DB lookup
     v
[3] USER ASSEMBLY -> event.locals.user
     |  {
     |    id, name, email, mobileNumber,
     |    role: 'dsa' | 'rm' | 'admin',
     |    roles: { dsa: true, rm: false, admin: false },
     |    teamContext?: { permissions, isOwner }
     |  }
     v
[4] ACTIVITY TRACKING (fire-and-forget)
     |  Update lastActiveAt once per 5 min (throttled)
     v
[5] ROUTE HANDLER
     |  +page.server.ts (pages) or +server.ts (API)
     v
[6] SECURITY HEADERS (response)
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
     CSP: strict (prod only)
```

---

## 6. Authentication & Security

### Login Flow

```
Step 1: Phone Input
     |  DSA enters 10-digit Indian mobile number
     v
Step 2: OTP via MSG91
     |  POST /api/auth/send-otp -> MSG91 widget
     |  4-digit code sent to phone
     v
Step 3: Verify OTP
     |  POST /api/auth/verify-otp
     |  On success: set verifiedMobile cookie
     v
Step 4: Role Detection
     |  POST /api/auth/detect-roles
     |  Check: DsaApplications, rmApplications, AdminUsers
     |
     |  No profile found -> auto-create Applicant -> /dsa-onboarding
     |  One role -> login directly -> /dashboard/{role}
     |  Multiple roles -> show role picker modal
     |  Deleted account -> show restore/start-fresh choice
     v
Step 5: Token Issuance
     |  POST /api/auth/check-dsa
     |  Generate: accessToken (15min) + refreshToken (7d)
     |  Set HttpOnly cookies (Secure + SameSite=Strict in prod)
     |  Store tokenId in user's activeTokenIds[]
     v
  Dashboard
```

### Token Architecture

```
Access Token (15 min)                 Refresh Token (7 days)
+----------------------------+       +----------------------------+
| userId                     |       | userId                     |
| email                      |       | tokenId (UUID)             |
| mobileNumber               |       | iat                        |
| name                       |       | exp                        |
| role                       |       +----------------------------+
| isDemo?                    |
| iat, exp                   |       Stored: HttpOnly cookie
+----------------------------+       Validated: hooks.server.ts
                                     Rotated: on expiry of access token
Stored: HttpOnly cookie
Validated: every request
```

### Multi-Device Management

```
User has activeTokenIds: ['tok-A', 'tok-B', 'tok-C']

Login from SAME device (same deviceClassHash):
  -> push new tokenId: ['tok-A', 'tok-B', 'tok-C', 'tok-D']
  -> max 10, oldest evicted

Login from DIFFERENT device:
  -> NUKE array: ['tok-NEW']
  -> All other sessions immediately invalid
```

### Permission System

```
Role-Based:
  DSA   -> cases_view, cases_create, form_fill, results_view
  RM    -> cases_view, ratings_submit, broadcasts_send
  Admin -> users_manage, policies_edit, settings_configure

Team-Based (DSA sub-accounts):
  Owner  -> all permissions (full access)
  Member -> granular: { cases_view, cases_create, leads_view, ... }
           14 permission flags, configured by owner

Guards:
  requireAuth(locals)              -> 401 if no user
  requireRole(locals, 'dsa')       -> 403 if wrong role
  requireTeamPermission(locals, p) -> 403 if member lacks permission
  blockDemoWrite(locals)           -> 403 if demo user writing
```

---

## 7. Routing Architecture

### Route Groups

```
(auth)        -> Login, signup.       No auth required.
(onboarding)  -> DSA/RM registration. Needs verifiedMobile cookie.
(app)         -> Forms + results.     Needs JWT auth. Blocks demo.
(legal)       -> Terms, privacy.      Static. No auth.
(offers)      -> Lender results.      Inside (app), needs auth.
(Application) -> Post-submit pages.   Inside (app), needs auth.
dashboard/    -> Role-gated panels.   Needs auth + correct role.
f/[token]     -> Share links.         Public. OTP-verified.
api/          -> REST endpoints.      Mixed auth (per endpoint).
```

### Dashboard Layout Nesting

```
/dashboard/+layout.server.ts          <- Auth guard, role resolution
  |
  +-- /dashboard/dsa/+layout.server.ts    <- requireRole('dsa'), load cases
  |     +-- /cases/+page.server.ts          <- Case list
  |     +-- /cases/[case_id]/+page.server.ts <- Case detail
  |     +-- /crm/+page.server.ts             <- CRM hub
  |     +-- /analytics/+page.server.ts       <- Metrics
  |
  +-- /dashboard/rm/+layout.server.ts     <- requireRole('rm')
  |     +-- /cases/+page.server.ts
  |     +-- /submissions/+page.server.ts
  |     +-- /broadcasts/+page.server.ts
  |
  +-- /dashboard/admin/+layout.server.ts  <- requireRole('admin') + hostname check
        +-- /users/+page.server.ts
        +-- /policies/+page.server.ts
        +-- /testing/+page.server.ts
```

---

## 8. The Form Engine

The form engine is **server-driven**. The client never sees the raw schema.

### Architecture

```
                     TypeScript Composition Layer (per loan type)
                     src/lib/config/{loanType}/
                       composer.ts         — assembles full schema
                       pages.ts            — page definitions & order
                       questionBank/*.ts   — questions grouped by page
                            |
                            v
                   +------------------+
                   |  Schema Loader   |  compose{LoanType}Schema()
                   |  schemaLoader.ts |  builds schema at runtime
                   +------------------+
                            |
                            v
     User Answers  +------------------+  Evaluated Page
     ----------->  |   Form Engine    |  ------------->
                   |                  |  {
                   | 1. Load schema   |    questions: [{id, title, type, options}],
                   | 2. Apply showWhen|    progress: {current, total},
                   | 3. Filter visible|    canGoBack, canGoForward,
                   | 4. Resolve opts  |    pageTitle
                   | 5. Validate      |  }
                   +------------------+
                            |
              Stored server-side in formSessions collection
              (anti-scraping: prevents skip-ahead)
```

> **Note**: The original JSON schema approach (homeLoanSchemaV2.json etc.) was migrated to TypeScript composition in Session 26-27. All JSON schemas are archived in `schemas/_archive/`. The TS question bank is now the single source of truth.

### showWhen Rules (Conditional Visibility)

Questions appear/hide based on previous answers using JSON-Logic:

```json
{
	"showWhen": {
		"and": [
			{ "===": [{ "var": "employmentType" }, "Salaried(Private)"] },
			{ ">": [{ "var": "age" }, 21] }
		]
	}
}
```

This means: "Show this question only if employment is Salaried(Private) AND age > 21."

### Loan Types & Form Pages

| Loan Type         | Route                                   | QB Modules | Category |
| ----------------- | --------------------------------------- | ---------- | -------- |
| Home Loan         | `/form/home-Loan/`                      | 10         | Secured  |
| LAP               | `/form/Lap/`                            | 8          | Secured  |
| Plot Loan         | `/form/plot-Loan/`                      | 8          | Secured  |
| Personal Loan     | `/form/unsecureLoan/personal-Loan/`     | 2          | Unsecured|
| Business Loan     | `/form/unsecureLoan/business-Loan/`     | 3          | Unsecured|
| Professional Loan | `/form/unsecureLoan/Professional-Loan/` | 3          | Unsecured|

### Form Data Flow

```
Client                          Server
  |                               |
  |  POST /api/form/evaluate      |
  |  { loanType, pageIndex,       |
  |    answers, sessionId }        |
  |  ----------------------------> |
  |                               |  1. Validate session (anti-skip)
  |                               |  2. Load schema for loanType
  |                               |  3. Evaluate showWhen on all Qs
  |                               |  4. Filter to visible questions
  |                               |  5. Resolve dynamic options
  |                               |  6. Return page definition
  |  <--------------------------- |
  |  { questions[], progress }    |
  |                               |
  |  (User fills answers)         |
  |                               |
  |  POST /api/form/submit        |
  |  { loanType, allAnswers }      |
  |  ----------------------------> |
  |                               |  1. Re-validate ALL pages
  |                               |  2. Build payload
  |                               |  3. Create Case + FormSnapshot
  |                               |  4. Run Rule Engine
  |                               |  5. Create ResultsSnapshot
  |  <--------------------------- |
  |  { success, caseId, results } |
```

---

## 9. The Rule Engine

Evaluates a loan application against lender policies. Returns per-lender eligibility.

### Pipeline (per lender rule document)

```
LoanApplicationPayload
     |
     v
[A] HARD GATES                    Pass/Fail checks
     |  - min_age, max_age           (e.g., age >= 21)
     |  - min_cibil_score            (e.g., CIBIL >= 700)
     |  - property_approved          (e.g., must be authority-approved)
     |  - employment_eligible        (e.g., salaried only)
     |  Uses JSON-Logic: jsonLogic.apply(rule, payload)
     |  Any CRITICAL gate fail -> RED (rejected)
     v
[B] PARAMETER EXTRACTION          Lender-specific numbers
     |  - ROI (interest rate)
     |  - maxLTV (loan-to-value)
     |  - maxFOIR (fixed-obligation-to-income ratio)
     |  - maxTenure, maxAgeAtMaturity
     |  - processingFee
     v
[C] INCOME ASSESSMENT             Per-applicant, per-source
     |  For each applicant (excluding guarantors):
     |    For each income source:
     |      - Determine profile type
     |      - Extract gross monthly income
     |      - Apply haircut % (salaried: 0%, self-employed: 30%, etc.)
     |      - Check acceptance criteria
     |  Output: totalAssessedIncome
     v
[D] OBLIGATION LOAD               Existing debt service
     |  For each obligation:
     |    Term loan: EMI contribution
     |    Credit line: 3% of limit or utilization
     |    Closing: self-funded=0, keep-running=full, top-up=subtract
     |  Output: totalExistingEMI
     v
[E] COMPUTE AMOUNTS
     |
     |  FOIR-eligible = [(income * maxFOIR) - existingEMI] * emiFactor
     |  LTV-capped    = propertyValue * maxLTV  (secured only)
     |  Offered        = MIN(FOIR, LTV, requested)
     |  EMI           = P * r * (1+r)^n / ((1+r)^n - 1)
     v
[F] DEVIATIONS                    Red -> Amber recovery paths
     |  Some lenders allow exceptions:
     |    Low CIBIL with explanation -> AMBER
     |    High FOIR with strong income -> AMBER
     v
[G] TRAFFIC LIGHT
     |  GREEN:  All gates passed, clean file
     |  AMBER:  Failed non-critical gate, has recovery path
     |  RED:    Failed critical gate, no recovery
     |  GREY:   Gate didn't apply (conditional)
     v
Output: LenderResult
  {
    lender_name, product_code,
    traffic_light: 'green',
    offered_amount: 4500000,
    roi: 8.75,
    emi: 39847,
    tenure_months: 240,
    foir: 52.3,
    ltv: 72.0,
    decision_factors: [...],
    improvement_suggestions: [...],
    rejection_reasons: [...]
  }
```

### Summary Output

```
LenderResultsData {
  summary: {
    total_lenders: 12,
    green_count: 5,
    amber_count: 4,
    red_count: 3,
    best_amount: 6000000,
    best_roi: 8.25,
    best_emi: 34521
  },
  results: LenderResult[],
  cross_sell: CrossSellOpp[]   // "Your shortfall of 10L can be covered by personal loan"
}
```

---

## 10. The Policy Engine

A **two-axis system** for managing lender policies at different geographic levels.

### Two Axes

```
Axis 1: PRODUCT HIERARCHY          Axis 2: GEOGRAPHIC SCOPE

Lender (e.g., HDFC Bank)           PAN India (specificity: 0)
  +-- Product (Home Loan)             +-- State (specificity: 10)
       +-- Variation (Salaried)            +-- City (specificity: 20)
            +-- PolicyRule                      +-- Zone (specificity: 30)
```

### CSS-Specificity Resolution

When multiple rules match, the **most specific** one wins:

```
Rule: HDFC Home Loan, Pan India    -> min_age: 21, roi: 8.75%
Rule: HDFC Home Loan, Maharashtra  -> min_age: 23, roi: 8.50%
Rule: HDFC Home Loan, Mumbai       -> min_age: 25, roi: 8.25%

Applicant in Mumbai:
  -> Mumbai rule (specificity 20) wins over Maharashtra (10) and Pan India (0)
  -> min_age: 25, roi: 8.25%
```

### Policy Version Workflow

```
Draft -> Pending Approval -> Active -> Superseded
                |                         ^
                v                         |
           Admin reviews              New version
           Approves/Rejects           created
```

### Collections

| Collection                | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `lenders`                 | 50+ banks: HDFC, SBI, ICICI, etc.         |
| `lenderProducts`          | Products per lender: HL, LAP, PL, etc.    |
| `productVariations`       | Variants: standard, premium, NRI, etc.    |
| `geoScopes`               | Geographic hierarchy: pan_india -> states |
| `policyRules`             | Rules at variation + geo level            |
| `policyVersions`          | Versioned rules with approval workflow    |
| `policyEvidenceDocuments` | Source documents for policies             |
| `policyAuditLogs`         | Complete change audit trail (2yr TTL)     |

---

## 11. Case & Snapshot System

### Case Lifecycle

```
intake -> profiling -> file_building -> submitted -> processing
                                                        |
                                          +---------+---+--------+
                                          |         |            |
                                       query -> sanctioned -> disbursed
                                                     |
                                                  rejected
                                                  dropped
                                                  closed
```

### Immutable Snapshots (Audit Trail)

```
Case (mutable workflow state)
  |
  +-- FormSnapshot v1 (initial submission)
  |     payload: { loanTransaction, allApplicantDetails }
  |     payload_hash: "sha256..."
  |     created_at: 2026-02-01
  |
  +-- FormSnapshot v2 (DSA edited income)
  |     payload: { ... updated ... }
  |     payload_hash: "sha256..."  (different hash = data changed)
  |     created_at: 2026-02-03
  |
  +-- LenderResultsSnapshot v1 (based on form v1)
  |     results: [ green HDFC, amber SBI, red ICICI ]
  |     source_form_snapshot_version: 1
  |
  +-- LenderResultsSnapshot v2 (re-evaluated after form v2)
        results: [ green HDFC, green SBI, amber ICICI ]
        source_form_snapshot_version: 2
        change_deltas: [ "SBI: amber->green (income increased)" ]
```

**Key principle**: Old versions are **never deleted**. New edits create new versions.

### File Builder

The File Builder is a **presentation layer**, NOT data entry:

```
DSA CAN:                          DSA CANNOT:
- Choose which sections to show   - Edit financial figures
- Add notes per section            - Change income amounts
- Reorder presentation             - Modify CIBIL score
- Select which lenders to file     - Override eligibility
```

### Submission Pipeline — Raw Memory vs Filtered View

There are **two derivations on top of one physical store**, not two stores. Details live in `docs/PAYLOAD_DOCUMENTATION.md` → "Submission Pipeline"; here is the architectural shape:

```
formState.loanData (raw)  +  formState.applicants (raw)
          │
          │  (untouched — full navigation history preserved for back-nav UX;
          │   consumed by form bindings + combinedAnswers for isQuestionVisible)
          │
          └─→ buildFilteredAnswers(schema, rawLoanAnswers, rawApplicants)   [src/lib/utils/payloadFilter.ts]
                 │
                 ├── Layer A (floor, schema-driven):
                 │     buildCleanAnswers(schema, rawAnswers) drops keys whose page/question
                 │     is invisible at the current route. Default-safe: new hidden questions
                 │     are auto-excluded. Passthrough when schema is null (client today).
                 │
                 ├── Layer B, loan-level gates:  LOAN_ANSWERS_GATES  (reserved, currently empty)
                 │
                 └── Layer B, per-applicant gates: APPLICANT_GATES
                        ├── includeGuarantorObligations  — surface guarantor-role obligations
                        │                                  when ObligationsRunning=No +
                        │                                  isGuarantorOnOtherLoan=Yes
                        └── includeSelectedIncomeProfiles — only selected profile types survive
                 │
                 ▼
         FilteredView { loanAnswers, applicants }  ──▶  cleanPayloadStore.svelte.ts
                                                            ├── cleanPayload  ($derived.by → buildLoanPayload)
                                                            └── casePayload   ($derived.by → buildCasePayload)
                                                                   │
                                                                   ▼
                                                    Rule engine · persisted snapshot · external API
```

**Why**: users navigate freely and switch high-level choices mid-form (e.g. Self-Employed → Salaried). Raw memory keeps the abandoned path's answers so back-nav restores progress. Without the filter, those stale keys leak into the payload and poison derivations (`_is_business_file`, `_computed._total_gross_monthly`, `loanAmount` fallbacks) producing wrong lender assessments.

**Invariants**:
- `buildFilteredAnswers()` never mutates its inputs — every gate returns at minimum a shallow copy. Asserted by `payloadFilterRegression.test.ts`.
- Gates are pure functions — no I/O, no side effects, no global reads.
- Gates only **lift keys from raw that Layer A dropped** — they never introduce keys absent from raw.
- Submission view is structurally identical to raw so payload builders need no shape change.
- Layer A activation client-side is deferred as Phase 1.6 — recommended pivot is server endpoint consuming raw + returning filtered (leverages `schemaLoader.ts` deep-frozen cache, zero client bundle bloat).

**When to add a gate vs. fix a `showWhen`**:
- Prefer fixing the visibility rule (Layer A). If the answer should be absent from the submission when the user is off that path, tighten the page/question `showWhen`.
- Add a gate (Layer B) **only** when the answer must **survive** hidden parents because of a business rule (like the guarantor case). Each gate requires a documented business justification in `payloadFilter.ts`.
- Never add a gate to paper over a buggy `showWhen`.

---

## 12. Income Profiling System

This is the **competitive moat**. Don't simplify it.

### 12 Income Types

```
Employment Income:
  1. salaried_regular         Salary credited to bank account monthly
  2. salaried_contractual     Contract-based employment

Business Income:
  3. business_proprietorship  Sole proprietor (shop, trader, etc.)
  4. business_partnership     Partnership firm partner

Self-Employed Income:
  5. director_company         Director in Pvt Ltd / LLP
  6. professional_practice    CA, Doctor, Lawyer, Architect, etc.

Other Income:
  7. pension                  Government/PSU/defense pension
  8. rental_income            Rent from owned property
  9. freelance_consulting     Project-based / consulting

Passive Income:
 10. agriculture_income       Farm income
 11. investment_income        Dividends, FD interest, capital gains

Special:
 12. no_current_income        Homemaker, student, between jobs
```

### Multi-Source Per Applicant

Same person can have MULTIPLE income sources:

```
Mr. Sharma:
  Source 1: Director in Company A     -> 2,00,000/month
  Source 2: Director in Company B     -> 1,50,000/month
  Source 3: Rental Income (2 flats)   -> 40,000/month
  Source 4: Investment Income          -> 25,000/month
                                       -----------
  Gross Total:                          4,15,000/month
  After Haircuts (per lender rules):    3,20,000/month
```

### Per-Entry Storage (NOT aggregated)

Each income source is stored separately with its own:

- **Specifics**: Yes/No questions (e.g., "GST registered?", "Files ITR?")
- **Income amounts**: Profile-specific fields (salary, profit, rent, etc.)
- **Evidence**: What documents are available
- **Entity**: Company name, property address, etc.

Aggregation is the Rule Engine's job, not the form's job.

---

## 13. Database Layer

### MongoDB — 58 Collections, 110 Indexes

```
USER MANAGEMENT                    CASE MANAGEMENT
+----------------------------+    +----------------------------+
| userApplications (User)    |    | cases (Case)               |
| DsaApplications (Dsa)     |    | formSnapshots              |
| rmApplications (Rm)       |    | lenderResultsSnapshots     |
| pcApplications (PC)       |    | timelineEvents             |
| AdminUsers                 |    | communicationThreads       |
+----------------------------+    +----------------------------+

POLICY ENGINE                      CRM & TEAMS
+----------------------------+    +----------------------------+
| lenders                    |    | teams                      |
| lenderProducts             |    | leads (6-status pipeline)  |
| productVariations          |    | sources (8 categories)     |
| geoScopes                  |    | crmLenders                 |
| policyRules                |    +----------------------------+
| policyVersions             |
| policyEvidenceDocuments    |    SECURITY
| policyAuditLogs (2yr TTL) |    +----------------------------+
+----------------------------+    | deviceRegistry (90d TTL)   |
                                  | formSessions (24h TTL)     |
RM PORTAL                         | trustScores                |
+----------------------------+    | disclaimerAcceptances      |
| rmContacts                 |    +----------------------------+
| accuracyRatings            |
| rmBroadcasts               |    TESTING & ADMIN
| rmSubmissions              |    +----------------------------+
| reviewComments             |    | syntheticProfiles          |
+----------------------------+    | e2eTestRuns (7d TTL)       |
                                  | apiKeys, systemConfigs     |
SHARE LINKS & ARCHIVE             | lenderRuleArtifacts        |
+----------------------------+    | lenderRuleFixtures         |
| shareLinks                 |    +----------------------------+
| deletedUsers (30d TTL)     |
| deletedDsa (30d TTL)       |
| deletedRm (30d TTL)        |
+----------------------------+
```

### Key Indexes

| Collection             | Index                                             | Purpose             |
| ---------------------- | ------------------------------------------------- | ------------------- |
| cases                  | `{ dsa_id: 1, is_archived: 1, updated_at: -1 }`   | DSA case listing    |
| formSnapshots          | `{ case_id: 1, version: -1 }` UNIQUE              | Latest form version |
| lenderResultsSnapshots | `{ case_id: 1, version: -1 }` UNIQUE              | Latest results      |
| policyRules            | `{ lender_id: 1, product_type: 1, geo_level: 1 }` | Policy resolution   |
| leads                  | `{ dsa_id: 1, status: 1, created_at: -1 }`        | CRM pipeline        |

---

## 14. State Management

### Svelte 5 Runes (Current Pattern)

```typescript
// src/lib/state/form.svelte.ts

class FormStateManager {
	// Reactive state
	loanData = $state<Record<string, unknown>>({});
	applicants = $state<Applicant[]>([]);
	currentPageIndex = $state(0);
	isLoading = $state(false);

	// Persisted to sessionStorage + Capacitor Preferences
	// Debounced save (300ms) on every mutation
}
```

### State Files

| File                    | Purpose                                           |
| ----------------------- | ------------------------------------------------- |
| `form.svelte.ts`        | Form answers, page navigation, applicant list     |
| `applicant.svelte.ts`   | Per-applicant data, recovery bin, restore prompts |
| `auth.svelte.ts`        | Current user, role, OTP flow state                |
| `dialog.svelte.ts`      | Modal stack (register/unregister)                 |
| `ui.svelte.ts`          | Loading spinners, error states, toasts            |
| `walkthrough.svelte.ts` | Tour completion tracking                          |

### Legacy Stores (Being Migrated)

`src/lib/stores/` contains older Svelte 4 writable stores. These are being migrated to runes.

---

## 15. Component Architecture

### Component Hierarchy

```
FormShell (wizard container)
  +-- FormSidebar (page navigation)
  +-- FormNavigationBar (prev/next/submit)
  +-- FormContextPanel (help panel)
  +-- [Page Content]
       +-- QuestionRenderer (dynamic)
            +-- TextField / SelectField / RadioField / ...
            +-- AddApplicant (1,720 lines - applicant form)
            +-- IncomePageNew (income profiling)
            +-- UnsecuredObligation (obligation entry)
```

### Component Categories

| Category      | Count       | Examples                                               |
| ------------- | ----------- | ------------------------------------------------------ |
| Form inputs   | 18+ types   | TextField, SelectField, RadioField, CheckboxField      |
| Form wizard   | 12 files    | FormShell, Sidebar, NavBar, ContextPanel               |
| Income system | 7 files     | IncomePageNew, IncomeSourceForm, IncomeProfileSelector |
| Dashboard     | 20+ files   | CaseCard, PipelineChart, LenderResultCard              |
| Landing       | 22 files    | HeroSection, PricingSection, ComparisonSection         |
| Modals        | 13 variants | Modal, WideModal, ConfirmModal, InfoModal              |
| Onboarding    | 8 files     | OnboardingV2Wizard, BusinessProfileSection             |

### Company & Director Architecture

Company applicants follow a multi-step flow with director/partner capture:

```
Step 0: Company identity (name, type, country, director count)
Step 0.5: Director/Partner cards (DirectorCards.svelte)
          - Name, gender, age, ownership %, location, onEMI, onProperty
          - Cross-company matching (same director at multiple companies)
          - Family-run auto-derivation from relationship graph
Step 1: Relationships (enhanced with director linking)
Step 2: Credit & Obligations
Step 3: Business Profile (CompanyBusinessProfile.svelte)
          - GST-driven vintage, revenue, industry, employee count
          - Card-style UI (not Yes/No toggles)
Step 4: Income (CompanyIncomeTab.svelte, CompanyFinancials.svelte)
```

Key components: `DirectorCards.svelte`, `DirectorFormModal.svelte`, `DirectorCountPicker.svelte`, `DirectorRemovePickerModal.svelte`, `CompanyDeleteDialog.svelte`, `applicantFormManager.svelte.ts`

Key utilities: `directorAutoIncome.ts`, `directorFormUtils.ts`, `directorRestoreHandler.ts`, `familyControlDerivation.ts`

**Spec**: `docs/specs/COMPANY-DIRECTOR-ARCHITECTURE.md` (Phases 1-3 done, Phase 4 parked)

### Svelte 5 Runes Usage

```svelte
<!-- Props -->
let { value = $bindable(), onChange, options }: Props = $props();

<!-- Reactive state -->
let isOpen = $state(false);
let filteredOptions = $derived(options.filter(o => shouldShow(o)));

<!-- Side effects -->
$effect(() => {
  if (dialog && showModal && !dialog.open) {
    dialog.showModal();
  }
  return () => cleanup();
});
```

---

## 16. PDF Generation

Two document types, generated server-side with `pdf-lib`:

```
Review PDF (v1)                    Submission PDF (v2)
+----------------------------+    +----------------------------+
| FOR REVIEW ONLY            |    | OFFICIAL DOCUMENT          |
| (watermark)                |    |                            |
|                            |    |                            |
| Name: Raj Kumar            |    | Name: Raj Kumar            |
| Address: [REDACTED]        |    | Address: 23, MG Road...    |
| PAN: [REDACTED]            |    | PAN: ABCDE1234F            |
| CIBIL: 780                 |    | CIBIL: 780                 |
| Income: 80,000             |    | Income: 80,000             |
|                            |    |                            |
| Payload Hash: abc123...    |    | Payload Hash: abc123...    |
+----------------------------+    +----------------------------+

PII STRIPPED (system-enforced)     FULL DATA (for lender filing)
Cannot be toggled                  Only after DSA selects lender
```

---

## 17. CRM & Team System

### CRM Pipeline

```
Lead Status Flow:
  new -> contacted -> qualified -> converted -> won
                                       |
                                     lost
                                     closed

Source Categories (8):
  Walk-in, Builder, CA/Tax Consultant, Referral,
  Online Inquiry, Property Broker, Self-Sourced, Other
```

### Team Hierarchy

```
Main DSA (team owner)
  +-- Sub-DSA 1 (member, permissions: { cases_view, form_fill })
  +-- Sub-DSA 2 (member, permissions: { cases_view, cases_create, leads_view })
  +-- Sub-DSA 3 (member, permissions: { full_access })
```

---

## 18. Anti-Scraping & Trust

8-layer defense system protecting the form engine:

```
Layer 1: Server-side form sessions     Skip-ahead prevention
Layer 2: Progressive trust scoring     Behavioral risk scoring
Layer 3: Adaptive rate limiting        60/min * trust multiplier
Layer 4: Behavioral telemetry          Form interaction tracking
Layer 5: Honeypot fields               Hidden form traps
Layer 6: Response fingerprinting       ZWC + deterministic ordering
Layer 7: Multi-browser auth            activeTokenIds[] tracking
Layer 8: Device-switch nuke            New device = logout all others
```

---

## 19. Testing

### Unit Tests (Vitest)

```
73 test files, 7,015+ tests (growing as features are added)
Run: pnpm run test:unit

Key test areas:
- Rule engine: validators + evaluation + income
- Form validation + schema composition
- Income profiles + company income
- Director auto-income + cross-company matching
- Case management + payload building
- Communication templates
- XOR cipher round-trip (anti-scraping)
```

### E2E Tests (Playwright)

```
Specs across 3 projects (dsa, rm, admin)
Run: pnpm run test:e2e

Architecture: Two-stage testing
- Stage 1: Applicant setup (storageState)
- Stage 2: Full path via storageState chain
- Selector registry + health specs
```

### Fixture Profiles

15 realistic Indian loan application fixtures in `src/lib/testing/fixtures/fixtureProfiles.ts`:

| ID     | Name                | Scenario                              |
| ------ | ------------------- | ------------------------------------- |
| FIX-01 | Salaried Clean      | 80K net, CIBIL 780, no obligations    |
| FIX-02 | Salaried + Car Loan | 35K net, CIBIL 720, car EMI 12K       |
| FIX-03 | Self-employed CA    | 3yr ITR, CIBIL 750, professional      |
| FIX-04 | Cash-heavy Trader   | CIBIL 680, no ITR, GST registered     |
| FIX-05 | Pensioner           | 40K net, CIBIL 800, govt pension      |
| FIX-06 | NRI Salaried        | 280K net, CIBIL 760, with GPA         |
| FIX-07 | Company Pvt Ltd     | 8yr company, CIBIL 730, business loan |
| FIX-08 | BT Clean Track      | 90K net, CIBIL 770, HDFC outstanding  |
| FIX-09 | BT Irregular        | 60K net, CIBIL 650, minor irregular   |
| FIX-10 | Low CIBIL Default   | CIBIL 580, loan default flag          |
| FIX-11 | High FOIR           | 1L income, 72K EMIs (72% ratio)       |
| FIX-12 | Couple Joint        | 80K+50K, both salaried                |
| FIX-13 | High Net Worth      | 20L/month, CIBIL 820, 5Cr property    |
| FIX-14 | Young First Buyer   | Age 23, 30K net, <2yr experience      |
| FIX-15 | Senior Pensioner    | Age 58, PSU pension, 7yr tenure       |

---

## 20. External Integrations

| Service       | Purpose            | Config                                   |
| ------------- | ------------------ | ---------------------------------------- |
| MSG91         | Mobile OTP         | `MOBILE_OTP_API_KEY`                     |
| Nodemailer    | Email delivery     | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`    |
| ImageKit      | Image upload + CDN | `IMAGEKIT_PRIVATE_KEY`, `PUBLIC_KEY`     |
| Razorpay      | Payment gateway    | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| MongoDB Atlas | Database           | `MONGODB_URI`                            |
| Google Gemini | AI rule parsing    | `GOOGLE_AI_KEY`                          |
| Vercel        | Deployment         | `@sveltejs/adapter-vercel`               |

---

## 21. Key Architectural Decisions

These are **locked decisions**. Don't change them without understanding why:

| #     | Decision                      | Rationale                                |
| ----- | ----------------------------- | ---------------------------------------- |
| AD-01 | DSA-only platform             | No customer/RM/PC dashboards             |
| AD-02 | Server-side everything        | Business logic never on client           |
| AD-03 | No required PII               | Customer name/PAN/address optional       |
| AD-04 | File Builder is derived       | DSA controls presentation, not data      |
| AD-05 | Numbers are immutable         | DSA cannot edit financial figures        |
| AD-06 | Review PDF never has PII      | System-enforced, not a toggle            |
| AD-07 | RM database is centralized    | Shared across DSAs, not competitive      |
| AD-08 | Immutable snapshots           | Edits create new versions, audit trail   |
| AD-09 | 12 income types, multi-source | The competitive moat. Don't simplify.    |
| AD-10 | JSON-Logic for rules          | Declarative, testable, admin-authorable  |
| AD-11 | CSS-specificity for policies  | Most specific geo+product rule wins      |
| AD-12 | pnpm only                     | Not npm, not yarn. `pnpm exec` not `npx` |

---

## Quick Reference: "Where Do I Find...?"

| I want to...              | Look at...                                                     |
| ------------------------- | -------------------------------------------------------------- |
| Understand auth flow      | `src/hooks.server.ts`                                          |
| Add a form question       | `src/lib/config/{loanType}/questionBank/` (TS composition)     |
| Add a new income type     | `src/lib/config/incomeProfiles/` (all 6 files)                 |
| Add a rule engine feature | `src/lib/ruleEngine/evaluationEngine.ts`                       |
| Add a new API endpoint    | `src/routes/api/{domain}/+server.ts`                           |
| Add a dashboard page      | `src/routes/dashboard/{role}/{page}/`                          |
| Modify a component        | `src/lib/components/`                                          |
| Add a database collection | `src/lib/database/mongo.ts`                                    |
| Add/modify types          | `src/lib/types/`                                               |
| Run unit tests            | `pnpm run test:unit`                                           |
| Run E2E tests             | `pnpm run test:e2e`                                            |
| Type check                | `pnpm run check`                                               |
| Check development plan    | `docs/DEVELOPMENT-PLAN.md`                                     |
