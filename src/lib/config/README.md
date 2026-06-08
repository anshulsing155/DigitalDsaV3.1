# Config Directory

Centralized configuration for the DigitalDSA platform. Everything here is **declarative data** -- no side effects, no API calls, no DOM access. Configs are imported by both server (`+page.server.ts`, API routes) and client (Svelte components) as needed.

---

## Directory Structure

```
config/
├── applicantOptions/       # Loan-type option lists for obligation forms
├── bankSelection/          # Master bank/NBFC/HFC list
├── incomeProfiles/         # Income profiling system (12 types)
├── walkthrough/            # Guided tour / onboarding walkthrough steps
├── wizardSections/         # Form wizard sidebar section configs per loan type
├── *.json                  # Legacy JSON form schemas (question sets, loan schemas)
├── routes.ts               # Centralized route constants (single source of truth)
├── showWhenEngine.ts       # Conditional visibility engine for form fields
├── permissions.ts          # Role-based permission definitions
├── accessControl.ts        # Route-level access rules
├── storageKeys.ts          # Registry of all sessionStorage/localStorage keys
├── lenderDomains.ts        # Bank/NBFC email domain whitelist for RM validation
├── landing-page-config.ts  # Public landing page content (products, FAQs, etc.)
└── README.md               # This file
```

---

## Modules

### `routes.ts` -- Centralized Route Constants

Single source of truth for **all** navigation paths. Eliminates hardcoded route strings across 56+ files.

| Export                        | Type                     | Purpose                                                                              |
| ----------------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `ROUTES`                      | `const object`           | Nested route constant tree (Form, Offers, Application, Dashboard, Onboarding, Legal) |
| `LOAN_TYPE_FORM_ROUTES`       | `Record<string, string>` | Maps display loan type names to form route paths                                     |
| `howCanWeHelpRoute(loanName)` | `function`               | Builds the how-can-we-help URL with a loan query param                               |

**Convention**: All routes use kebab-case (SvelteKit standard).

**Consumed by**: Layout navigation, `+page.server.ts` redirects, `caseHelpers`, landing page config, `goto()` calls.

---

### `wizardSections/` -- Form Wizard Sidebar Config

Defines the section/subsection structure displayed in the form wizard sidebar for each loan type. Each config maps to the multi-step form pages the user navigates through.

| File                  | Export                       | Loan Type                |
| --------------------- | ---------------------------- | ------------------------ |
| `homeLoan.ts`         | `homeLoanSections`           | Home Loan                |
| `lapLoan.ts`          | `lapLoanSections`            | Loan Against Property    |
| `plotLoan.ts`         | `plotLoanSections`           | Plot Loan                |
| `businessLoan.ts`     | `businessLoanSections`       | Business Loan            |
| `personalLoan.ts`     | `personalLoanSections`       | Personal Loan            |
| `professionalLoan.ts` | `professionalLoanSections`   | Professional Loan        |
| `index.ts`            | `getSectionConfig(loanName)` | Lookup by loan type name |

**Structure**: Each section has `id`, `label`, optional `showWhen` callback, `contextInfo` (title, description, tips), and an array of `subsections` that reference `pageIds` from the JSON schemas.

**Type**: `WizardSectionConfig` from `$lib/types/wizard`.

**Consumed by**: `WizardSidebar` component, form progress tracking.

---

### `incomeProfiles/` -- Income Profiling System

The competitive moat. Defines 12 income profile types, their form fields, document requirements, and display utilities. This is a multi-file module with a barrel export.

| File                        | Key Exports                                                                                                                          | Purpose                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `profileCards.ts`           | `INCOME_PROFILE_CARDS`, `getProfileCard()`, `getProfileCardsForLoan()`, `deriveLegacyEmploymentType()`, `validateProfileSelection()` | Profile card definitions (Tab 1 selector), loan-type ordering, legacy mapping |
| `profileFormConfig.ts`      | `getSpecificsForProfile()`, `getIncomeFieldsForProfile()`, `getDropdownLabel()`, `getEntityNameLabel()`                              | Per-profile specifics questions and income fields (Tab 2 form)                |
| `incomeCalculations.ts`     | `formatIncomeCurrency()`, `getEvidenceSummary()`                                                                                     | Display formatting for income amounts (Indian number system)                  |
| `obligationEnhancements.ts` | `LOAN_ROLE_OPTIONS`, `EMI_SOURCE_OPTIONS`, `LOAN_CAPACITY_OPTIONS`, `getFilteredCapacityOptions()`                                   | Obligation form enhancements (role, EMI source, capacity)                     |
| `documentConfig.ts`         | `getDocumentsForProfile()`, `getDocumentsForProfiles()`, `groupDocumentsByCategory()`, `OBLIGATION_DOCUMENTS`                        | Document upload specs per income type                                         |

**12 income profile types**: `salaried_regular`, `salaried_contractual`, `business_proprietorship`, `business_partnership`, `director_company`, `professional_practice`, `pension`, `rental_income`, `freelance_consulting`, `agriculture_income`, `investment_income`, `no_current_income`.

**Key rules**:

- Applicants can select multiple profiles (multi-select).
- `no_current_income` is exclusive and cannot combine with earning profiles.
- Cash income is only allowed for business/self-employed profiles.
- Profile cards use `showWhen` conditions (e.g., NRI restrictions).

**Consumed by**: Income profile selector component, income detail forms, document upload, obligation entry form, legacy data mapping.

---

### `bankSelection/` -- Bank Master List

| File          | Export                | Purpose                                             |
| ------------- | --------------------- | --------------------------------------------------- |
| `bankName.ts` | `bankData`            | Array of `{ Classification, label, value }` entries |
| `index.ts`    | Re-exports `bankData` | Barrel export                                       |

**Classifications**: `PVT` (private banks), `GOV` (government/PSU banks), `NBFC` (NBFCs/HFCs).

**Consumed by**: Bank selection dropdowns in the form wizard, obligation forms, offer pages.

---

### `applicantOptions/` -- Loan Type Options

| File           | Export                                 | Purpose                                                             |
| -------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `loanTypes.ts` | `personalLoanType`, `businessLoanType` | `Option[]` arrays listing loan types for obligation entry dropdowns |
| `index.ts`     | Re-exports both                        | Barrel export                                                       |

**Consumed by**: Obligation entry forms (the "what type of existing loan" dropdown).

---

### `showWhenEngine.ts` -- Conditional Visibility Engine

A mini rule engine that evaluates `ShowWhenCondition` objects against an answers map. Used by both JSON schemas and TypeScript configs to conditionally show/hide form fields and options.

| Export                                 | Purpose                                      |
| -------------------------------------- | -------------------------------------------- |
| `shouldShow(showWhen, answers)`        | Main entry point -- returns boolean          |
| `evaluateCondition(cond, answers)`     | Recursive evaluator                          |
| `getValueByPath(obj, path)`            | Dot-notation path resolver                   |
| `getVisibleOptions(question, answers)` | Filters question options by their `showWhen` |
| `isInvalid(value)`                     | Null/empty/NaN check                         |

**Supported operators**: `and`, `or`, `not`/`!`, `in`, `==`, `!=`, `<`, `>`, `<=`, `>=`.

**Consumed by**: Form rendering components, income profile card filtering, JSON schema question rendering.

---

### `permissions.ts` -- Role-Based Permissions

Defines granular permissions per role using a `resource.action` naming convention.

| Export                                | Purpose                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ROLE_PERMISSIONS`                    | `Record<role, string[]>` -- permission arrays for `dsa`, `rm`, `admin`, `user`, `dsa_team_member` |
| `roleHasPermission(role, permission)` | Check if a role has a specific permission                                                         |
| `getPermissionsForRole(role)`         | Get all permissions for a role                                                                    |

**Consumed by**: `auth.svelte.ts` (client), `guards.ts` (server), layout components for conditional rendering.

---

### `storageKeys.ts` -- Storage Key Registry

Centralized registry of every `sessionStorage` and `localStorage` key used in the app. Prevents storage mismatch bugs.

| Export             | Purpose                                 |
| ------------------ | --------------------------------------- | --------------------------- |
| `STORAGE_REGISTRY` | `Record<key, { storage: 'session'       | 'local', domain: string }>` |
| `StorageKey`       | TypeScript type union of all valid keys |

**Domains**: `form`, `form-payload`, `offers`, `ui`, `security`, `migration`.

**Rule**: Form draft data uses `sessionStorage` (clears on tab close). Offer results and UI preferences use `localStorage`.

---

### `lenderDomains.ts` -- Lender Email Domain Whitelist

Validates RM email addresses against known bank/NBFC/HFC domains.

| Export                           | Purpose                                                           |
| -------------------------------- | ----------------------------------------------------------------- |
| `LENDER_DOMAINS`                 | `ReadonlySet<string>` -- explicit domain whitelist (100+ entries) |
| `LENDER_WILDCARD_SUFFIXES`       | `['.bank.in', '.fin.in']` -- RBI-mandated suffixes                |
| `isLenderDomain(email)`          | Validates an email domain against whitelist + wildcards           |
| `getLenderNameFromDomain(email)` | Returns display name for common banks                             |

**Consumed by**: RM onboarding validation (client + server).

---

### `landing-page-config.ts` -- Landing Page Content

Declarative content for the public-facing landing page: hero section, loan product cards (6 types with routes, rates, features), process steps, testimonials, trust metrics, comparison table, and FAQs.

**Type**: `LandingPageConfig` from `$lib/types/landing`.

**Consumed by**: Landing page Svelte components.

---

### `accessControl.ts` -- Route Access Rules

Simple route-to-role mapping for basic access control.

**Consumed by**: Auth middleware, route guards.

---

### `walkthrough/` -- Guided Tour System

Tour step definitions for the Driver.js-powered onboarding walkthrough.

| File                 | Export                                                            | Purpose                                                                           |
| -------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `types.ts`           | `WalkthroughStep`, `PageTourId`, `TourMode`, `WalkthroughDbState` | Shared types and helpers                                                          |
| `introTour.ts`       | `INTRO_TOUR_STEPS`                                                | 8-step sidebar orientation (~30s, auto-triggers for new DSAs)                     |
| `explanatoryTour.ts` | `EXPLANATORY_TOUR_STEPS`                                          | 15-step detailed workflow guide (~2min, on-demand)                                |
| `pages/index.ts`     | `PAGE_TOUR_REGISTRY`                                              | Registry mapping page IDs to their tour step arrays                               |
| `pages/*.ts`         | `*_TOUR_STEPS`                                                    | Per-page tours: profile, cases, CRM, communication, analytics, team, shared-links |

**Consumed by**: `WalkthroughController`, dashboard layout, tour launcher button.

---

### JSON Schema Files -- Form Question Definitions

Legacy JSON configs that define form pages, questions, options, validation rules, and conditional visibility. Each file maps to one or more pages in the multi-step loan form wizard.

#### Loan Schemas (page structure per loan type)

| File                            | Description                        |
| ------------------------------- | ---------------------------------- |
| `homeLoanSchema.json`           | Home loan form pages and questions |
| `LAP-schema.json`               | Loan Against Property form         |
| `plot-loan-schema.json`         | Plot loan form                     |
| `businessLoanSchema.json`       | Business loan form                 |
| `personal-loan-schema.json`     | Personal loan form                 |
| `professional-loan-schema.json` | Professional loan form             |
| `formSchema.json`               | Shared/generic form schema         |

#### Question Sets (reusable across loan types)

| File                          | Description                          |
| ----------------------------- | ------------------------------------ |
| `salariedQuestion.json`       | Salaried employment detail questions |
| `businessQuestions.json`      | Business owner questions             |
| `businessOtherQuestions.json` | Additional business questions        |
| `professionalQuestion.json`   | Professional practice questions      |
| `companyQuestion.json`        | Company detail questions             |
| `NewCompanyQuestion.json`     | Updated company questions            |
| `directorsQuestion.json`      | Director-specific questions          |
| `directorTable.json`          | Director financial table config      |

#### Applicant & Obligation Configs

| File                                       | Description                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `applicantBasicDetails.json`               | Shared applicant fields (deprecated -- see secured/unsecured variants) |
| `applicantBasicDetailsSecuredLoans.json`   | Applicant fields for secured loan types                                |
| `applicantBasicDetailsUnsecuredLoans.json` | Applicant fields for unsecured loan types                              |
| `applicantQuestion.json`                   | Applicant type/count questions                                         |
| `obligation.json`                          | Existing loan/obligation entry form fields                             |

#### Specialized Configs

| File                       | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `commonPage.json`          | Shared page definitions used across loan types               |
| `companyBasicData.json`    | Company basic information fields                             |
| `GPAforNRI.json`           | GPA (General Power of Attorney) questions for NRI applicants |
| `GPAOfNRIApplicant.json`   | NRI applicant GPA detail questions                           |
| `pensionerPerson.json`     | Pensioner-specific questions                                 |
| `unemployedPerson.json`    | Unemployed/homemaker questions                               |
| `gstStateCodes.json`       | Indian GST state code lookup (state name to code)            |
| `pincode_IN_all.json`      | All India pincodes (full dataset)                            |
| `pincode_IN_Selected.json` | Curated pincode dataset (serviceable areas)                  |

**Structure**: Each JSON schema has a `pages` array containing `questions` arrays. Questions use `showWhen` conditions (evaluated by `showWhenEngine.ts`), `type` for rendering, and `bindsTo`/`contextKey` for data binding.

**Consumed by**: `schemaLoader.ts`, form page components, `+page.server.ts` form handlers.

---

## How to Add New Configs

### Adding a new loan type wizard config

1. Create `wizardSections/newLoanType.ts` exporting a `WizardSectionConfig`.
2. Add the export to `wizardSections/index.ts` and register it in `configMap`.
3. Create the corresponding JSON schema file (`new-loan-schema.json`) with page definitions.

### Adding a new income profile type

1. Add the type to `IncomeProfileType` in `$lib/types/incomeProfile.ts`.
2. Add a card entry in `incomeProfiles/profileCards.ts` (`INCOME_PROFILE_CARDS` array).
3. Add specifics questions and income fields in `incomeProfiles/profileFormConfig.ts`.
4. Add document specs in `incomeProfiles/documentConfig.ts`.
5. Update `deriveLegacyEmploymentType()` for backward compatibility.

### Adding a new route

1. Add the route to the appropriate section in `routes.ts` under the `ROUTES` constant.
2. Use `ROUTES.YOUR.NEW.ROUTE` everywhere -- never hardcode path strings.

### Adding a new storage key

1. Add it to `STORAGE_REGISTRY` in `storageKeys.ts` with the correct `storage` type and `domain`.
2. Use the `StorageKey` type for type-safe access.

### Adding a new walkthrough tour

1. Create a step file in `walkthrough/pages/` exporting a `WalkthroughStep[]`.
2. Add the page ID to `PageTourId` in `walkthrough/types.ts`.
3. Register it in `PAGE_TOUR_REGISTRY` in `walkthrough/pages/index.ts`.
