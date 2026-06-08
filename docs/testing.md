# DigitalDSA Testing Guide

## Overview

DigitalDSA uses a layered testing strategy covering unit tests, end-to-end tests, accessibility audits, and performance budgets.

| Test Type       | Tool                    | Location                          | Command                |
| --------------- | ----------------------- | --------------------------------- | ---------------------- |
| Unit            | Vitest 3.2.4            | `src/lib/testing/__tests__/`      | `pnpm run test:unit`   |
| E2E             | Playwright 1.58         | `src/lib/testing/e2e/`            | `pnpm run test:e2e`    |
| Accessibility   | @axe-core/playwright    | `src/lib/testing/e2e/`            | See E2E commands below |
| Performance     | Playwright (Web Vitals) | `src/lib/testing/e2e/`            | See E2E commands below |

## Quick Start

```bash
# Run all unit tests
pnpm run test:unit

# Run E2E tests (default: Chrome, DSA role)
pnpm run test:e2e

# Run a specific E2E test file
npx playwright test accessibility.spec.ts

# Run cross-browser tests
npx playwright test --project=dsa-firefox
npx playwright test --project=dsa-webkit
npx playwright test --project=dsa-edge

# Run mobile/tablet viewport tests
npx playwright test --project=mobile
npx playwright test --project=tablet

# Run accessibility tests only
npx playwright test accessibility.spec.ts

# Run performance tests only
npx playwright test performance.spec.ts

# Type check
pnpm run check
```

## Unit Testing

### File Structure

All unit tests live in `src/lib/testing/__tests__/` with the naming convention `*.test.ts`. Currently there are 73 test files containing 7,015+ tests (count grows as new features are added).

Key test areas:

- **Rule engine**: `evaluationEngine.test.ts`, `incomeAssessor.test.ts`, `payloadEnricher.test.ts`, `resultBuilder.test.ts`, `discomfortAnalyzer.test.ts`
- **Schema composition**: `schemaComposer.test.ts` (validates all 6 loan type schemas)
- **Form logic**: `directorFormUtils.test.ts`, `applicantDuplicateDetector.test.ts`, `crossStepValidator.test.ts`
- **Income profiles**: `incomeProfiles.test.ts` (12 income types)
- **Utilities**: `securedClone.test.ts`, `emiShareCalculator.test.ts`, `iconRegistry.test.ts`
- **Anti-scraping**: `formGuard.test.ts`, `showWhenEngine.test.ts`

### Fixture System

Test fixtures in `src/lib/testing/fixtures/` provide seed data for all 6 loan types.

### Generator System

Synthetic test data generators in `src/lib/testing/generators/`:

| Generator                  | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `profileGenerator.ts`      | Generates applicant profiles with income data  |
| `combinationGenerator.ts`  | Generates multi-applicant combinations         |
| `syntheticGenerator.ts`    | Generates full synthetic form submissions      |

Archetypes in `src/lib/testing/generators/archetypes/` provide pre-configured applicant profiles for common scenarios (salaried, self-employed, NRI, etc.).

### Scenario System

Form path scenarios in `src/lib/testing/scenarios/` define expected navigation paths through the wizard for different loan types and applicant configurations.

### Running Specific Tests

```bash
# Run a single test file
pnpm run test:unit -- evaluationEngine

# Run tests matching a pattern
pnpm run test:unit -- --grep "income"

# Run with coverage
pnpm run test:unit -- --coverage
```

## E2E Testing

### Multi-Role Authentication

E2E tests support three authenticated roles via Playwright projects:

| Project | Role  | Auth State File           | Test Match                        |
| ------- | ----- | ------------------------- | --------------------------------- |
| `dsa`   | DSA   | `dsa.json`                | All specs except `-rm`/`-admin`   |
| `rm`    | RM    | `rm.json`                 | `*-rm.spec.ts` only               |
| `admin` | Admin | `admin.json`              | `*-admin.spec.ts` only            |

Authentication is handled by `global.setup.ts` which runs before all test projects.

### Form Helpers

- **`formHelpers.ts`** — Navigation helpers (`goToPage`, `clickNext`, `waitForFormLoad`), assertion helpers, form interaction utilities
- **`dataFillHelpers.ts`** — Automated data entry for loan forms, applicant profiles, income sources

### Spec File Organization

Spec files follow the naming convention `{feature}-{variant}.spec.ts`:

- `homeLoan-newLoan-happyPath.spec.ts` — Happy path for new home loan
- `homeLoan-balanceTransfer.spec.ts` — Balance transfer flow
- `dashboard-mobile.spec.ts` — Mobile dashboard tests
- `dashboard-rm.spec.ts` — RM-specific dashboard tests
- `adminDashboard-admin.spec.ts` — Admin dashboard tests

## Cross-Browser Testing

### Available Browser Projects

| Project        | Browser/Engine  | Channel  |
| -------------- | --------------- | -------- |
| `dsa`          | Chromium         | -        |
| `dsa-firefox`  | Firefox          | -        |
| `dsa-webkit`   | WebKit (Safari)  | -        |
| `dsa-edge`     | Chromium         | `msedge` |

All cross-browser projects use DSA auth state and run the same spec file set as the `dsa` project.

### Running Cross-Browser Tests

```bash
# Run on all browsers
npx playwright test --project=dsa --project=dsa-firefox --project=dsa-webkit --project=dsa-edge

# Run on a specific browser
npx playwright test --project=dsa-firefox

# Run a specific test on all browsers
npx playwright test homeLoan-newLoan-happyPath.spec.ts --project=dsa --project=dsa-firefox --project=dsa-webkit
```

### Viewport Testing

| Project   | Device           | Viewport    |
| --------- | ---------------- | ----------- |
| `mobile`  | iPhone 14        | 390 x 844   |
| `tablet`  | iPad (gen 7)     | 810 x 1080  |

Mobile and tablet projects only run files matching `dashboard-mobile.spec.ts` or `*-happyPath.spec.ts`.

```bash
# Run mobile viewport tests
npx playwright test --project=mobile

# Run tablet viewport tests
npx playwright test --project=tablet

# Run both
npx playwright test --project=mobile --project=tablet
```

## Accessibility Testing

### Setup

Accessibility testing uses `@axe-core/playwright` to run axe-core audits against rendered pages.

- **Helper**: `src/lib/testing/e2e/a11yHelper.ts` — `checkAccessibility()` and `formatViolations()`
- **Spec**: `src/lib/testing/e2e/accessibility.spec.ts` — Tests for login, dashboard, and all 6 loan forms

### WCAG Compliance Level

Default: **WCAG 2.1 AA** (`wcag2aa`). Can be changed per-test via the `wcagLevel` option.

### What Gets Tested

- **Login page**: Zero violations (all impact levels)
- **Dashboard**: No critical or serious violations
- **All 6 loan forms**: No critical or serious violations (excludes third-party widgets)

### Adding Accessibility Checks to New Tests

```typescript
import { checkAccessibility, formatViolations } from './a11yHelper';

test('my page is accessible', async ({ page }) => {
  await page.goto('/my-page');
  await page.waitForLoadState('networkidle');

  const results = await checkAccessibility(page, {
    excludeSelectors: ['.third-party-widget'],
    wcagLevel: 'wcag2aa'  // default
  });

  // Fail on critical/serious only
  const critical = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious'
  );
  expect(critical).toHaveLength(0);
});
```

## Performance Testing

### Thresholds

| Metric              | Login Page | Dashboard | Form Pages |
| ------------------- | ---------- | --------- | ---------- |
| TTFB                | < 800ms    | < 1000ms  | < 1000ms   |
| DOM Content Loaded  | < 3000ms   | < 5000ms  | -          |
| First Contentful Paint | < 1800ms | -         | -          |
| Full Load           | -          | -         | < 5000ms   |

### How It Works

Performance tests use the browser's `Performance API` (`PerformanceNavigationTiming` and paint entries) to measure real loading metrics against the budgets above.

### Running Performance Tests

```bash
npx playwright test performance.spec.ts
```

### Adding Performance Checks

```typescript
test('my page loads fast', async ({ page }) => {
  await page.goto('/my-page');
  await page.waitForLoadState('load');

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      ttfb: nav.responseStart - nav.requestStart,
      load: nav.loadEventEnd - nav.fetchStart
    };
  });

  expect(timing.ttfb).toBeLessThan(1000);
  expect(timing.load).toBeLessThan(5000);
});
```

## Adding New Tests

### Naming Conventions

- **Unit tests**: `{module}.test.ts` in `src/lib/testing/__tests__/`
- **E2E specs**: `{feature}-{variant}.spec.ts` in `src/lib/testing/e2e/`
  - Use `-happyPath` suffix for core happy-path flows (these run on mobile/tablet too)
  - Use `-rm` suffix for RM-specific tests
  - Use `-admin` suffix for Admin-specific tests
- **Setup files**: `{feature}.setup.ts` for per-feature authentication/seed data

### File Locations

| Test Type | Location |
| --------- | -------- |
| Unit test | `src/lib/testing/__tests__/{module}.test.ts` |
| E2E spec | `src/lib/testing/e2e/{feature}.spec.ts` |
| E2E helper | `src/lib/testing/e2e/{name}Helpers.ts` |
| Fixture | `src/lib/testing/fixtures/` |
| Generator | `src/lib/testing/generators/` |
| Scenario | `src/lib/testing/scenarios/` |

### Fixture Usage

Import fixtures from `src/lib/testing/fixtures/` for consistent test data:

```typescript
import { createFixtureProfile } from '$lib/testing/fixtures/profileFixtures';

const salariedApplicant = createFixtureProfile('salaried');
```

Use generators for randomized/parameterized test data:

```typescript
import { generateSyntheticSubmission } from '$lib/testing/generators/syntheticGenerator';

const submission = generateSyntheticSubmission('homeLoan', { applicantCount: 2 });
```

## CI Pipeline

### GitHub Actions

The CI workflow runs on every pull request and push to `main`:

1. **Install** — `pnpm install`
2. **Type check** — `pnpm run check`
3. **Unit tests** — `pnpm run test:unit`
4. **E2E tests (PR)** — Chromium only (`--project=dsa --project=rm --project=admin`)
5. **E2E tests (nightly)** — Full cross-browser matrix including Firefox, WebKit, Edge, mobile, and tablet

### What Runs When

| Trigger    | Unit | E2E Chrome | E2E Firefox | E2E WebKit | E2E Edge | Mobile/Tablet |
| ---------- | ---- | ---------- | ----------- | ---------- | -------- | ------------- |
| PR         | Yes  | Yes        | No          | No         | No       | No            |
| Push main  | Yes  | Yes        | No          | No         | No       | No            |
| Nightly    | Yes  | Yes        | Yes         | Yes        | Yes      | Yes           |

## Known Gaps

- **No visual regression testing** — Screenshot comparison not yet set up
- **No API-only test suite** — API endpoints tested indirectly via E2E flows
- **Accessibility tests require auth** — Login and dashboard a11y tests need authenticated sessions to test actual content
- **Performance thresholds are initial estimates** — May need tuning based on production baselines
- **Mobile E2E coverage is limited** — Only happy-path and mobile-dashboard specs run on mobile/tablet viewports
- **No load/stress testing** — No concurrent user simulation
