# Utils Directory

Shared utility functions used across the DigitalDSA platform. Organized by concern: form processing, number formatting, payload construction, security, platform helpers, and more.

**Total: 43 files** across 4 directories.

---

## Directory Structure

```
utils/
  ApplicantUtils/      # Applicant form helpers (obligations, completion, validation)
  camera/              # Selfie quality checks (brightness, blur, face detection)
  compressImage/       # Client-side image compression before upload
  *.ts                 # Top-level utility files (detailed below)
```

---

## Payload Builders

These construct the structured data sent to calculation APIs and stored as immutable snapshots.

| File                    | Purpose                                                                                                                                                                                                                                                                                                           | Key Exports                                                                                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payloadBuilder.ts`     | **Primary payload builder.** Converts raw form stores into a clean `LoanApplicationPayload` for bank eligibility APIs. Defines all payload interfaces (`ApplicantPayload`, `LoanTransactionPayload`, etc.) and shared helpers.                                                                                    | `buildLoanPayload()`, `buildApplicantPayload()`, `buildLoanTransactionPayload()`, `buildStructuredPayload()`, `comparePayloads()`, `toNumber()`, `toBoolean()`, `deriveTitle()`, `extractIncomeEntries()`, `cleanObligationEntries()` |
| `casePayloadBuilder.ts` | **Case-level payload builder.** Builds a `CasePayload` with categorical sub-objects (screening, property, seller, loan, applicants) and derived credit insights (FOIR, LTV, EMI, risk flags). Unlike `payloadBuilder`, this reads ALL raw answers without visibility filtering and computes derived intelligence. | `buildCasePayload()`                                                                                                                                                                                                                  |
| `payloadGrouping.ts`    | **Schema-driven answer grouping.** Groups form answers by schema page ID into logical sections (property, loanRequirements, balanceTransfer, etc.). Used by `buildStructuredPayload()`.                                                                                                                           | `groupAnswersBySchema()`, `buildCleanAnswers()`                                                                                                                                                                                       |
| `loanPayload.ts`        | **Legacy payload builder.** Older format for the external eligibility API (`bank-loan-management.vercel.app`). Builds `loanTransaction` and `allApplicantDetails` in the shape that API expects.                                                                                                                  | `buildLoanTransaction()`, `buildApplicantDetails()`                                                                                                                                                                                   |


> **payloadBuilder vs casePayloadBuilder:** These are NOT duplicates. `payloadBuilder` produces the API-submission payload (visibility-filtered, flat). `casePayloadBuilder` produces the case-review payload (unfiltered, categorical, with derived insights like FOIR/LTV/risk flags).

---

## Number and Format Utilities

| File              | Purpose                                                                                                                                                                                        | Key Exports                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `numberFormat.ts` | **Input formatting.** Handles live Indian number formatting in `<input>` fields (1,00,000 style). Strips non-digits, formats with Indian grouping, and fixes cursor position after formatting. | `getRawValue()`, `formatIndianNumber()`, `handleIndianNumberInput()` |
| `formatNumber.ts` | **Display formatting.** Converts a number to Indian locale display string using `Intl.NumberFormat('en-IN')`. For read-only display, not input fields.                                         | `formatNumber()`                                                     |
| `roundNumber.ts`  | **Rounding helper.** Rounds a number to the nearest multiple (e.g., nearest 10, 50, 100).                                                                                                      | `roundNum()`                                                         |

> **numberFormat.ts vs formatNumber.ts:** These are NOT duplicates. `numberFormat.ts` is for **input fields** (handles events, cursor position, raw extraction). `formatNumber.ts` is for **display** (static formatting of numbers in UI text).

---

## Scroll Utilities

| File                    | Purpose                                                                                                                                                                                                         | Key Exports                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `scroll.ts`             | **Landing page scroll.** General-purpose smooth scrolling: scroll to element by ID, scroll to top, viewport intersection check, and throttled scroll listener.                                                  | `smoothScrollTo()`, `scrollToTop()`, `isElementInViewport()`, `onScroll()` |
| `formAutoScroll.ts`     | **Form wizard auto-scroll.** Tracks visible question IDs across form pages; auto-scrolls to newly appeared questions when conditional visibility changes. Auto-focuses the first question on initial page load. | `createFormAutoScroll()` (returns `{ update, reset }`)                     |
| `scrollToFirstError.ts` | **Validation error scroll.** After form validation fails, scrolls to the first visible error element (`[data-error="true"]`, `.error-message`, `.text-red-500`).                                                | `scrollToFirstError()`                                                     |

> **Three distinct scroll utilities:** `scroll.ts` = marketing/landing pages. `formAutoScroll.ts` = progressive form wizard (auto-scroll on new questions). `scrollToFirstError.ts` = validation feedback.

---

## Form Utilities

| File                              | Purpose                                                                                                                                                                                                                                                                   | Key Exports                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deriveFlagKeys.ts`               | **Flag derivation.** Derives context flag keys (e.g., `isSecuredLoan`, `hasCar`) from form questions and user answers. Evaluates `showWhen`, `contextKey`, and radio option `flagKeys`.                                                                                   | `deriveFlagKeys()`                                                                                                                                          |
| `resolveDynamicText.ts`           | **Dynamic text resolution.** Resolves question labels/hints that use `switch` conditions based on current answers.                                                                                                                                                        | `resolveDynamicText()`                                                                                                                                      |
| `incomeTabState.ts`               | **Income tab state management.** Shared tab completion logic for the income wizard (profiles, details, credit score, obligations tabs). Used by both secured and unsecured loan flows.                                                                                    | `computeSectionCompletion()`, `buildIncomeTabs()`, `isTabAccessible()`, `areAllTabsComplete()`                                                              |
| `getFinancialYearPlaceholders.ts` | **FY label generator.** Generates financial year placeholder strings (e.g., "FY2023-24") based on current month and ITR filing decision. India's FY runs Apr-Mar.                                                                                                         | `getFinancialYearPlaceholders()`                                                                                                                            |
| `unsecuredApplicantHandlers.ts`   | **Unsecured loan store handlers.** Store operations for single-applicant unsecured loan flows (Personal/Business/Professional). Handles income profile changes, entry CRUD, credit score, and obligation updates. Partially deprecated after unified applicant migration. | `handleProfileSelectionChange()`, `handleAddEntry()`, `handleUpdateEntry()`, `handleDeleteEntry()`, `handleCreditScoreChange()`, `handleObligationUpdate()` |

---

## ApplicantUtils/ (Subdirectory)

Focused helpers for the applicant form system (obligations table, completion checks, validation).

| File                    | Purpose                                                                                                                                                                   | Key Exports                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `closureOptions.ts`     | Returns obligation closure plan options filtered by loan type (Self-funded, Top-up settle, Keep running).                                                                 | `selectToClose()`                      |
| `computeCompletion.ts`  | Determines if a form page is "complete" by checking visible questions have answers, no validation errors exist, and extra structural checks pass.                         | `computeCompletion()`                  |
| `createLoanEntry.ts`    | Creates a new `LoanEntry` obligation object from current applicant form fields. Clears the form after creation.                                                           | `createLoanEntry()`, `clearLoanForm()` |
| `getLoanTypeOptions.ts` | Returns available loan type options based on employment type and entity type (personal-only, business, or merged).                                                        | `getLoanTypeOptions()`                 |
| `handleGPASelection.ts` | Handles GPA (General Power of Attorney) selection for NRI applicants. Copies GPA details across applicants when reusing an existing GPA holder.                           | `handleGPASelection()`                 |
| `loanEntries.ts`        | Delete and edit operations on the unified `obligations[]` array. Supports both new unified format and legacy split arrays.                                                | `deleteLoanEntry()`, `editLoanEntry()` |
| `titleValidation.ts`    | Validates that a title (Mr./Ms./Mrs.) is selected when a name is entered.                                                                                                 | `getTitleValidationError()`            |
| `updateAnswer.ts`       | Generic answer update function that writes a question's value into the applicant store at the correct key, handling type coercion for numbers and multiple-select arrays. | `updateAnswer()`                       |
| `validateLoanForm.ts`   | Validates the obligation entry form (required fields, numeric ranges for EMI/tenure/rate).                                                                                | `validateLoanForm()`                   |

---

## Auth and Security

| File                   | Purpose                                                                                                                                                                                                                          | Key Exports                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `csrf.ts`              | **CSRF fetch wrapper.** Reads CSRF token from cookie and injects it as `X-CSRF-Token` header on state-changing requests. Drop-in replacement for `fetch()`.                                                                      | `getCSRFToken()`, `secureFetch()`                                                                                                                     |
| `csrfClient.ts`        | **CSRF client (class-based).** Singleton CSRF manager with token caching, cookie reading, server fallback fetching, and header injection. More full-featured than `csrf.ts`.                                                     | `csrfClient` (singleton), `getCSRFToken()`, `getCSRFHeaders()`, `fetchWithCSRF()`                                                                     |
| `deviceFingerprint.ts` | **Device fingerprint.** Singleton that collects screen, timezone, language, canvas, WebGL, audio, and other browser signals. Produces a SHA-256 hash for session binding.                                                        | `deviceFingerprinter` (singleton), `DeviceFingerprinter`                                                                                              |
| `behaviorTelemetry.ts` | **Bot detection signals.** Tracks boolean behavioral signals (mouse movement, scrolling, focus, keyboard, paste) to distinguish real users from headless automation. Lightweight, no keystroke logging.                          | `BehaviorTelemetry` (class)                                                                                                                           |
| `sanitize.ts`          | **Input sanitization suite.** Comprehensive sanitizers for XSS prevention, HTML entity encoding, and field-specific cleaning (name, email, phone, numeric, URL, HTML). Includes SQL injection and prototype pollution detection. | `sanitizeInput()`, `sanitizeName()`, `sanitizeEmail()`, `sanitizePhone()`, `sanitizeHtml()`, `sanitizeObject()`, `sanitizeFormData()`, `escapeHtml()` |
| `sanitizeKey.ts`       | **Key sanitizer.** Converts a string to a safe object key by replacing spaces with underscores.                                                                                                                                  | `sanitizeKey()`                                                                                                                                       |
| `securedClone.ts`      | **Secured deep clone.** Prototype-pollution-safe deep clone with circular reference handling, Date preservation, configurable depth, and store-optimized helpers.                                                                | `securedClone()`, `securedCloneWithInfo()`, `securedMerge()`, `securedFreeze()`, `securedEquals()`, `cloneForStore()`, `cloneApplicants()`            |

> **csrf.ts vs csrfClient.ts:** `csrf.ts` is a simpler synchronous wrapper (reads cookie directly). `csrfClient.ts` is a full singleton class with caching, server fallback, and uses the `digitaldsa_csrf` cookie name. Different integration points may use either.

---

## Platform and Environment

| File     | Purpose                                                                                                                                    | Key Exports                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `api.ts` | **Cross-platform fetch.** Wraps the Fetch API with Capacitor platform detection, network connectivity checks, and native app CORS headers. | `fetchWithPlatformSupport()`, `postJsonData()`, `isPlatformNative()`, `getPlatformName()` |

---

## Schema Utilities

| File             | Purpose                                                                                                                                                                                          | Key Exports                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `schemaUtils.ts` | **Schema CRUD and preprocessing.** Client-side upload/retrieve/list schemas via `/api/schemas`. Also preprocesses `bindsTo_template` placeholders (replaces `{loanName}` with actual loan name). | `uploadSchema()`, `getSchema()`, `listSchemas()`, `preprocessSchemaBindings()` |

---

## Email Utilities (Server-Side)

| File            | Purpose                                                                                                                                                          | Key Exports                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |

| `emailSend.ts`  | **Email sending functions.** Sends styled HTML emails: user confirmation email and admin notification email (with JSON + PDF attachments generated via pdf-lib). | `sendUserEmail()`, `sendAdminEmail()` |

---

## Icon Registry

| File              | Purpose                                                                                                                                                                                                                     | Key Exports                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `iconRegistry.ts` | **Centralized Lucide icon imports.** Instead of `import * from 'lucide-svelte'` (bundles all icons), this file imports only the ~90 icons actually used. Supports both static imports and dynamic `getIcon('Name')` lookup. | All individual icon components, `getIcon()`, `hasIcon()`, `iconRegistry` |

---

## Image and Camera

| File                             | Purpose                                                                                                                                                       | Key Exports                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `camera/checkSelfieQuality.ts`   | **Selfie quality checks.** Validates selfie images for brightness (luminance threshold), blur (pixel variance), and face presence (MediaPipe face detection). | `checkBrightness()`, `checkBlur()`, `checkFacePresence()` |
| `compressImage/compressImage.ts` | **Client-side image compression.** Resizes images to max 1280px width and compresses via canvas `toBlob()` with configurable quality.                         | `compressImage()`                                         |

---

## Validation and Text

| File                | Purpose                                                                                                                                                           | Key Exports        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `checkGibrrish.ts`  | **Gibberish name detector.** Heuristic checks for name inputs: repeated characters, vowel ratio, length limits, non-letter characters. Prevents junk data entry.  | `checkGibberish()` |
| `zodErrorMapper.ts` | **Zod error formatter.** Maps Zod validation errors into per-index field error records for array-based form validation (e.g., director list, obligation entries). | `mapZodErrors()`   |

---

## Date Utilities

| File                              | Purpose                                                                                                       | Key Exports                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `dateUtils.ts`                    | **Financial year helper.** Returns the start year of the current Indian financial year (Apr-Mar).             | `getCurrentFYStartYear()`        |
| `getFinancialYearPlaceholders.ts` | **FY placeholder strings.** Generates 3 financial year labels based on current month and ITR filing decision. | `getFinancialYearPlaceholders()` |

---

## DOM and UI Helpers

| File                          | Purpose                                                                                                                                                         | Key Exports      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `clickOutside.ts`             | **Svelte action.** Detects clicks outside a DOM node and fires a callback. Used for dropdown/modal dismissal.                                                   | `clickOutside()` |

