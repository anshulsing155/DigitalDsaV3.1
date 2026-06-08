# src/lib/server/ -- Server-Side Modules

All modules in this directory are server-only. They can only be imported from `+page.server.ts`, `+server.ts`, `hooks.server.ts`, or other `$lib/server/` files. The client never receives this code.

---

## Core Infrastructure

### `guards.ts` -- Authorization Guards

Reusable guard functions for page loads and API routes. Two flavors:

- **Page guards** (`requireAuth`, `requireRole`) -- throw SvelteKit `error()` for error pages
- **API guards** (`requireAuthApi`, `requireRoleApi`) -- return `json()` Response or `null` (null = OK)
- **Team permission guards** (`requireTeamPermission`) -- checks member-level permissions
- **Admin guards** (`requireAdminPermission`, `requireSuperAdmin`) -- admin panel access control
- **Demo guard** (`blockDemoWrite`) -- returns mock success for demo user write operations

Admin users bypass all role checks. Used across every protected route.

### `apiResponse.ts` -- Standardized Response Helpers

Codifies the `{ success, data, error }` JSON response pattern. Thin wrappers around SvelteKit's `json()`:

| Helper                             | Purpose                                    | Default Status |
| ---------------------------------- | ------------------------------------------ | -------------- |
| `apiOk(data?)`                     | Success with optional data                 | 200            |
| `apiOkMessage(msg)`                | Success with message                       | 200            |
| `apiError(msg, status?)`           | Client error                               | 400            |
| `apiServerError(err, msg?)`        | Logs error, returns generic message        | 500            |
| `apiValidationError(msg, details)` | Structured validation errors               | 400            |
| `parseJsonBody<T>(request)`        | Safe JSON parsing with discriminated union | --             |

Used by: all `+server.ts` API routes.

### `logger.ts` -- Structured Logger

`ConsoleLogger` class with timestamped, level-filtered output. Supports both pino-style `(object, message)` and simple `(message, meta)` signatures. In production, suppresses `debug` level. Singleton export: `logger`.

Used by: virtually every server module.

### `rateLimiter.ts` -- Rate Limiting

IP-based rate limiting with Redis (via `redisService`) and in-memory fallback. Configurable per-route via `maxRequests` and `windowMs` options.

- `rateLimit(ip, options)` -- async, Redis-first
- `rateLimitSync(ip)` -- sync, in-memory only
- `getRateLimitStatus(id)` / `clearRateLimit(id)` -- admin monitoring

Used by: `hooks.server.ts`, auth API routes, form API routes.

### `sessionConstants.ts` -- Cookie/Session Config

Single source of truth for session durations:

- `REFRESH_TOKEN_DAYS` = 30
- `REFRESH_COOKIE_MAX_AGE` = 30 days in seconds
- `ACCESS_COOKIE_MAX_AGE` = 15 minutes in seconds

Used by: `hooks.server.ts`, JWT service, auth routes.

### `encryption.ts` -- AES-256-GCM Encryption

Encrypts API keys at rest. Format: `base64(iv):base64(authTag):base64(ciphertext)`. Keys are never exposed to the client.

Used by: admin API key management routes.

---

## Form Engine (`formEngine/`)

The server-side form engine evaluates JSON schemas, determines visible questions, validates answers, and computes navigation/progress. The client never receives schemas, showWhen rules, or validation thresholds.

### `formEngine/index.ts` -- Barrel Export

Re-exports all public APIs from the sub-modules below.

### `formEngine/engine.ts` -- FormEngine Class

Core class that orchestrates form evaluation:

- `evaluatePage(pageIndex, answers, options)` -- main entry point, returns `PageResponse` with visible questions, navigation, progress, validation errors/warnings, and page map
- `getVisiblePages(answers)` -- filters schema pages by visibility rules
- `validatePage(page, answers)` -- validates answers against schema conditions
- Response fingerprinting: embeds invisible zero-width characters in descriptions for leak tracing; deterministic question shuffling per session

Factory: `createFormEngine(loanType)` creates an engine for a specific loan type.

Used by: form API routes (`/api/form/...`).

### `formEngine/schemaLoader.ts` -- Schema Loader

Loads form schemas by loan type from static JSON imports (never bundled client-side). Supports 6 main loan types (Home Loan, LAP, Plot Loan, Personal Loan, Business Loan, Professional Loan) and 16+ component schemas (applicant details, income questions, obligations, etc.).

### `formEngine/visibility.ts` -- Visibility Evaluator

Unified evaluator supporting BOTH rule formats:

1. **JSON Logic** (`json-logic-js`) -- used in main loan schemas
2. **Custom ShowWhenCondition** -- used in applicant/component schemas

Auto-detects format and delegates. Custom `!=`/`!==` operators ensure unanswered fields hide dependent questions.

Public API: `isVisible()`, `isQuestionVisible()`, `isPageVisible()`, `isOptionVisible()`.

### `formEngine/textResolver.ts` -- Text Resolver

Resolves dynamic text in question labels and descriptions:

- Switch arrays: conditional text via JSON Logic rules
- Template placeholders: `{variableName}` substitution
- Financial year placeholders: `{{thisYear}}`, `{{previousYear}}`, etc. (Indian FY: April-March)

### `formEngine/optionResolver.ts` -- Option Resolver

Filters and resolves question options:

- Filters out options whose showWhen rules don't match
- Dynamic option generators for state/city selects, bank lists, age/tenure ranges
- String option references (e.g., `"bankNameJSON"`) resolved to actual data
- Strips showWhen rules from response (client never sees them)

### `formEngine/engineContext.ts` -- Engine Context

Loads and caches static reference data (pincode datasets, bank names) once on server start. Provides city lookup functions for derived-select questions. Prevents the client from importing large JSON datasets (~4.5MB total).

### `formEngine/reverseSchemaMap.ts` -- Reverse Schema Map

Inverts the `bindsTo` mapping: from storage key to question metadata. Used by E2E test infrastructure to map payload keys back to form question IDs.

### `formEngine/schemas/` -- JSON Schemas (20+ files)

Form definition JSON files for all loan types and component schemas. Server-only -- never sent to the client.

---

## Form Security

### `formGuard.ts` -- Form Guard Orchestrator

Single entry point for all form security checks. Ties together trust scoring, adaptive rate limiting, form session validation, and behavioral analysis. Tab-agnostic (works with multi-tab usage).

Used by: form API routes before engine evaluation.

### `formSession.ts` -- Form Session Management

Tracks form-filling progress per user+loanType for anti-scraping defense. Key behaviors: high-water-mark page tracking, append-only timing logs, max 5 active sessions per user. Tab-agnostic.

### `trustScore.ts` -- Progressive Trust Scoring

Per-user trust score (0-100, starts at 50). Decreases on suspicious behavior, increases on normal usage. Thresholds: score < 30 = watchlisted, < 15 = suspended (1hr ban), < 5 = blocked (manual review).

---

## Policy Engine

### `policyResolver.ts` -- Policy Resolution Engine

CSS-specificity model for two-axis policy resolution:

- **Product axis**: Lender > Product Type > Variation
- **Geography axis**: PAN India > State > City > Zone

Algorithm: builds geo scope chain, queries matching rules (2 MongoDB queries), sorts by specificity, merges fields (last write wins), collects overlays. In-memory cache with 1hr TTL.

Used by: lender results computation, eligibility checks.

### `policyAlerts.ts` -- Lender Policy Alerts

Pure-function module. Generates policy alerts (rate changes, criteria changes, new products) and matches them to affected cases by lender name.

### `policyDocGenerator.ts` -- Policy Document Generator

Template-based (not AI) generator converting structured `PolicyVersion` data into human-readable HTML summaries. Shows rates, fees, charges, insurance, turnaround, limits, geographic applicability. Used in admin preview, RM review, PDF export.

### `policyFeedback.ts` -- Policy Feedback Aggregation

Pure-function module. Aggregates accuracy ratings by category + lender.

---

## Case Management

### `caseHelpers.ts` -- Case Helper Functions

Shared utilities for case-related API routes:

- `resolveDsaId(mobileNumber)` -- resolves DSA `_id` from phone
- `verifyCaseOwnership(caseId, dsaId)` -- finds case and verifies ownership
- `createTimelineEvent(...)` -- inserts timeline events
- `generateCaseId(loanType)` -- generates sequential case IDs (`HL-2026-001`)

### `stagePipeline.ts` -- Stage Transition Pipeline

Defines allowed transitions for case stages and lender application statuses. Validates transitions with `canTransitionTo()` and `getAvailableTransitions()`.

### `lenderResultsHelpers.ts` -- Lender Results Helpers

Pure functions for change delta computation, policy staleness checks, and result comparison between form submission versions.

### `snapshotHelpers.ts` -- Snapshot Helpers

Utilities for form snapshot hash computation (SHA-256) and diff comparison. Used for tamper detection on immutable form snapshots.

---

## File Builder & PDF

### `fileConfigurator.ts` -- File Configurator

Core logic for the File Builder feature. DSAs control presentation (sections, display modes, notes) but never edit numbers. Two file versions:

- **Review (v1)**: PII always stripped (system-enforced guarantee)
- **Submission (v2)**: Full data including contact details

Functions: `getDefaultFileConfig`, `buildFilePayload`, `stripPII`, `validateFileIntegrity` (SHA-256).

### `pdfGenerator.ts` -- PDF Generator

Generates professional A4 loan application PDFs using `pdf-lib`. Review copies are watermarked "FOR REVIEW ONLY" with PII redacted. Submission copies include full data. Features: section-based layout, tables, DSA notes in colored boxes, footer with page numbers and payload hash.

---

## Communication

### `templateRenderer.ts` -- Template Rendering Engine

Renders communication templates by substituting variables. Reports missing required variables. Generates WhatsApp URLs. Auto-suggests templates based on case stage.

### `disclaimerFooter.ts` -- Disclaimer Footer Injection

Server-enforced disclaimer footer injection before DB insert. The footer cannot be removed by the client.

### `shareLinks.ts` -- Share Link Management

Full CRUD for shareable form links:

1. **Generate**: DSA creates token-based link for applicant
2. **Validate**: checks active, not expired, max uses
3. **Verify**: OTP-based identity verification
4. **Submit**: applicant submits form data via link
5. **Revoke**: DSA deactivates a link

Storage: MongoDB `shareLinks` collection. Tokens: UUID v4 + random suffix.

---

## Analytics & Intelligence

### `scorecardEngine.ts` -- DSA Performance Scorecard

Pure-function module. Computes performance scorecard with 8 metrics, insights, and trends from case data + DSA profile.

### `rejectionAnalyzer.ts` -- Rejection Analyzer

Pure-function module. Analyzes rejection reasons and suggests reroute options and prevention tips.

### `reminderEngine.ts` -- Smart Reminder Engine

Pure-function module. Generates action-needed, follow-up, expiring, stale, and milestone reminders from case data.

### `autoMatch.ts` -- DSA-RM Auto-Matching

Pure-function module. Scores RM candidates against DSA profile: same city (+30), same lender (+40), preferred DSA (+20), high reputation (+10).

### `rmReputation.ts` -- RM Reputation Score

Pure-function module. Computes RM reputation from communication threads, case data, and ratings.

---

## Feature Management

### `featureFlags.ts` -- Feature Flag Definitions

Central registry for subscription-tier-based feature flags. Pure functions only. Tier hierarchy: free < pro < enterprise. Resolution: per-DSA override > tier level > expired fallback.

### `featureGate.ts` -- Feature Gating Helper

Checks whether a feature is enabled for a given DSA considering: system-wide config toggle, DSA-level overrides, subscription tier gating.

---

## AI & Admin

### `aiService.ts` -- AI Service

Server-side utility for AI operations in the rule authoring pipeline. Handles parsing, reverse-writing, comparison, and auto-correction of bank policy documents using AI.

---

## Demo & Seed Data

### `demoData.ts` -- Demo Data (In-Memory)

Generates 4 sample cases, timeline events, and RM contacts as plain objects without MongoDB writes. Used by the guest demo system. Dates are relative so the demo always feels fresh.

### `demoDataLoaders.ts` -- Demo Data Loaders

Pre-computed page data for guest demo mode. Each function returns the same shape as the corresponding `+page.server.ts` load function but operates on in-memory demo data.

### `sampleDataSeeder.ts` -- DSA Sample Data Seeder

Creates 4 demo cases (with timeline events and RM contacts) when a DSA completes onboarding. Idempotent.

### `rmSampleDataSeeder.ts` -- RM Sample Data Seeder

Creates 6 demo cases (with timeline events and communication threads) when an RM completes onboarding. Idempotent.

---

## Testing

### `testing/syntheticProfiles.ts` -- Synthetic Test Profiles

500 deterministic profiles generated from demographic archetypes. Covers all 6 loan types, employment types, city tiers, and edge cases. Same seed produces the same 500 profiles every time.

### `testing/payloadToFillInstructions.ts` -- Payload-to-Fill Converter

Converts `LoanApplicationPayload` into page-ordered fill instructions for Playwright E2E form filling. Two-step: flatten payload to bindsTo keys, then match to reverse schema map.

---

## Static Data

### `data/communicationTemplates.ts` -- Communication Templates

Pre-defined message templates for DSA communication with customers, RMs, and brokers. Used by `templateRenderer.ts` and communication API routes.

### `data/documentTemplates.ts` -- Lender Document Templates

Pre-defined document checklists for major Indian lenders. Used by the "apply-template" endpoint to bulk-add documents to a lender application's checklist.
