---
type: review
epic: none
status: active
last_verified: 2026-06-05
owner: tech@digitaldsa.com
---

# Test-Necessity Audit — 2026-06-05

Fan-out workflow (`wf_db74559c-3ac`) audited 13,205 tests across 318 files for tautological / duplicate / dead-code / bad-lock-test patterns. Two adversarial skeptics per removal candidate; both had to agree before a finding survived.

## Headline

| | Count | % of 13,205 |
|---|---|---|
| Tests total | 13,205 | 100% |
| Candidates flagged by audit agents | 134 | 1.01% |
| Refuted by skeptics (kept) | 64 | 0.48% |
| **Survived as truly removable** | **70** | **0.53%** |
| + `ruleEngine/outputContract.test.ts` (entire file ~70 tests) | +~70 | +0.53% |
| **Effective removable upper bound** | **~140** | **~1.06%** |

No `dead-code` and no `bad-lock-test` findings survived — the codebase is clean on those dimensions. The 70 surviving findings concentrate in:

| File | Flagged tests | Pattern |
|---|---|---|
| `src/lib/testing/__tests__/rmPortal.test.ts` | 29 | Type-shape factory round-trips; TS already enforces |
| `components/ObligationCapture.test.ts` | 7 | Tests inline-defined logic, not the real component |
| `pms/deltaPipeline.test.ts` | 5 | Math tautology on a test-local helper |
| `billingEndpoints.test.ts` (flat) | 4 | Real function is mocked away at module level |
| `payloadSanitization.test.ts` | 4 | No production code under test |
| `ruleEngine/outputContract.test.ts` | 1 (~70 inside) | Entire file tests a self-consistent local mock |

## TAUTOLOGICAL (51)

### F:\TECH\DigitalDSA\REPOs\DigitalDSA-V3\src\lib\testing\__tests__\caseValidation.test.ts
- **accepts exactly 11 valid stages** [high]
  - describe: caseStageEnum — comprehensive stage validation
  - line: 173
  - why: The it.each block on the next lines asserts each stage individually with a real safeParse call. The count test only verifies the test-file's own array length, not the enum behavior.

### F:\TECH\DigitalDSA\REPOs\DigitalDSA-V3\src\lib\testing\__tests__\components\ObligationCapture.test.ts
- **button is disabled when loanType and bankName are both empty** [high]
  - describe: ObligationCapture — pending form validity (drives Done/Next button)
  - line: 92-94
  - why: Test asserts behavior of a function defined in the test file itself, not the production $derived. Header comment explicitly admits 'these tests verify the underlying logic modules' but in this case the logic was inlined into the test rather than extracted from the component.
- **no warning when EMI matches calculation within ₹500 tolerance** [high]
  - describe: ObligationCapture — EMI cross-check warning logic
  - line: 168-172
  - why: Tests the test file's own implementation, not the production EMI mismatch warning in ObligationCapture.svelte. If production drifts, this test won't catch it.
- **warning shown when entered EMI is far off from calculated EMI** [high]
  - describe: ObligationCapture — EMI cross-check warning logic
  - line: 174-178
  - why: Same as above — tests a function defined locally in the test.
- **no warning for credit line obligation types (not term loans)** [high]
  - describe: ObligationCapture — EMI cross-check warning logic
  - line: 180-184
  - why: Same as above.

### F:\TECH\DigitalDSA\REPOs\DigitalDSA-V3\src\lib\testing\__tests__\payloadSanitization.test.ts
- **only visible fields should appear in the final sanitized payload** [high]
  - describe: Payload sanitization — visibility-based field filtering concept
  - why: There is no production code under test; removing this verifies the same behavior in real form-submission paths is already covered by payloadFilterRegression.test.ts (Layer A schema-driven drop) and payloadFiltering.test.ts (selectedIncomeProfiles / guarantor-only filtering).
- **hidden conditional fields should be excluded from submission** [high]
  - describe: Payload sanitization — visibility-based field filtering concept
  - why: Behavior is tested via real code in payloadFilterRegression.test.ts (`drops stale business keys when user has switched to salaried`).
- **multiple-select fields default to empty array when not answered** [high]
  - describe: Payload sanitization — multiple-select defaults
  - why: The real payload builder lives under src/lib/utils/payloadBuilder/* and is covered by payloadFiltering.test.ts. The inline-builder test is a thought-experiment, not a regression guard.
- **multiple-select fields preserve selected values** [high]
  - describe: Payload sanitization — multiple-select defaults
  - why: No production code under test; the genuine behavior is covered by payloadBuilder tests.

### F:\TECH\DigitalDSA\REPOs\DigitalDSA-V3\src\lib\testing\__tests__\ruleEngine\outputContract.test.ts
- **ENTIRE FILE — all ~70 it() blocks across describe blocks 'outputContract — top-level shape', 'summary', 'per-result required fields', 'enum values', 'sort order', 'numeric range invariants', 'ISO date validation', 'factor structure', 'suggestion structure', 'traffic light semantics', 'lender ID uniqueness'** [high]
  - describe: outputContract — top-level shape (+10 sibling describes)
  - line: Entire file — local mockOutput at line 113 is the sole subject under test
  - why: Zero production coverage. The actual LenderResultsData contract is enforced by the TypeScript type at $lib/types/lenderResults.ts and exercised by evaluationEngine.test.ts and the real engine tests. This file's mock is self-consistent by construction; the only way these tests could fail is if a huma

### src/lib/testing/__tests__/billingEndpoints.test.ts
- **should return correct shape from getUsageSummary** [high]
  - describe: da-quota response shape
  - line: ~90
  - why: No real logic from daQuota.ts runs. The endpoint shape contract is better locked by either an integration test or a type assertion on the actual implementation. Removing this loses zero coverage of production behavior.
- **should return null when no usage record exists** [high]
  - describe: da-quota response shape
  - line: ~114
  - why: Same as above — verifies vi.fn behavior, not application behavior. The real getUsageSummary in daQuota.ts is never invoked because it's mocked away at module level.
- **should validate pack parameter against allowed values** [high]
  - describe: da-topup pack validation
  - line: ~127
  - why: The actual da-topup endpoint's pack validation is never exercised. If the real allowed-pack list drifts (or top-ups are retired entirely — per the 2026-05-28 comment in this very file), this test continues passing because it ratifies a local constant, not source code.
- **should verify Razorpay signature using HMAC SHA-256** [high]
  - describe: da-topup pack validation
  - line: ~142
  - why: This is a test of Node's crypto.createHmac, not the application's Razorpay signature verification. The actual verifier in the codebase is never imported or called. Removing loses no coverage of app code; it just stops re-asserting properties of HMAC-SHA256.

### src/lib/testing/__tests__/cibilFloor.test.ts
- **default scope is all_co_applicants when not specified** [high]
  - describe: cibilScope defaults
  - line: lines 126-131
  - why: The test explicitly asserts `true === true` with a comment admitting the real behavior lives in evaluationEngine.ts. It cannot detect any regression.

### src/lib/testing/__tests__/documentTemplates.test.ts
- **documents with freshness > 0 have positive values** [high]
  - describe: Lender Document Templates — freshness_rule_days
  - line: 121-134
  - why: Pure self-referential check: filters by `> 0` then asserts `> 0`. The preceding test 'freshness_rule_days is non-negative when present' already covers the real constraint.

### src/lib/testing/__tests__/dsaOnboardingV2.schema.test.ts
- **verifies master list has at least 10 pain points** [medium]
  - describe: dsaPainPointsSchema — Section B
  - line: 442-444
  - why: Locks a content count, not behavior. Pain-point list is product content; adding/removing options is a product decision, not a regression.

### src/lib/testing/__tests__/formGapReport.test.ts
- **logs high-priority gaps (required unanswered questions)** [high]
  - describe: Gap Report — Evidence Collection (informational)
  - line: ~208
  - why: Cannot fail; pure logging. If high-priority gaps matter as a quality gate, the test should assert `highPriority.length === 0` (or a threshold); as written, it tells the suite nothing.

### src/lib/testing/__tests__/pms/deltaPipeline.test.ts
- **does not trigger for a small addendum (10% of policy)** [high]
  - describe: size guard ratio math
  - line: lines 148-174 — entire 'size guard ratio math' describe block
  - why: Tests validate a helper defined in the test file, not production code. If the real size-guard logic in deltaPipeline.ts changes its threshold or moves to a different formula, these tests keep passing — they lock the test's own math, providing zero regression coverage. Either import the real check fr
- **does not trigger at exactly 60%** [high]
  - describe: size guard ratio math
  - line: line 159
  - why: Tests a math operation on a constant owned by the test file. No coupling to the production module.
- **triggers at 61% (just over threshold)** [high]
  - describe: size guard ratio math
  - line: line 163
  - why: Math tautology over a test-local constant; production threshold change would not break this test.
- **triggers when addendum is larger than policy** [high]
  - describe: size guard ratio math
  - line: line 167
  - why: Math tautology; the helper under test is defined in the test file.
- **handles equal length (100% — full policy re-upload detection)** [high]
  - describe: size guard ratio math
  - line: line 171
  - why: Math tautology; if the real deltaPipeline size guard breaks, this test keeps passing.

### src/lib/testing/__tests__/rmPortal.test.ts
- **allows optional _id field** [high]
  - describe: AccuracyRating — type shape
  - why: Verifies object-spread semantics, not application logic.
- **allows optional comment field** [high]
  - describe: AccuracyRating — type shape
  - why: Asserts what was just passed in via factory override — no logic verified.
- **disclaimer_accepted is boolean** [high]
  - describe: AccuracyRating — type shape
  - why: Tests JavaScript's typeof operator, not application code.
- **constructs a valid RMBroadcast with all required fields** [high]
  - describe: RMBroadcast — type shape
  - why: Type-shape factory round-trip.
- **allows optional expires_at field** [high]
  - describe: RMBroadcast — type shape
  - why: Spread-override round-trip.
- **footer contains disclaimer text (server-enforced)** [high]
  - describe: RMBroadcast — type shape
  - why: Truthiness check of a hardcoded factory default.
- **tracks read_by as array of ObjectIds** [high]
  - describe: RMBroadcast — type shape
  - why: Verifies Array.length on factory input.
- **constructs a valid PolicyDocument with all required fields** [high]
  - describe: PolicyDocument — type shape
  - why: Type-shape factory round-trip with no logic.
- **allows optional description** [high]
  - describe: PolicyDocument — type shape
  - why: Spread-override round-trip.
- **allows optional supersedes reference to previous version** [high]
  - describe: PolicyDocument — type shape
  - why: Spread-override round-trip.
- **version is a positive integer** [high]
  - describe: PolicyDocument — type shape
  - why: No code validates this — just JS's Number.isInteger on a literal.
- **constructs a valid score with all required fields** [high]
  - describe: RMReputationScore — type shape
  - why: Factory round-trip; no logic under test.
- **overall_score is in 0-100 range** [high]
  - describe: RMReputationScore — type shape
  - why: Tests nothing — type allows any number; factory just passes through.
- **query_resolution_rate is 0-1 range** [high]
  - describe: RMReputationScore — type shape
  - why: Factory round-trip; no range enforcement code.
- **constructs a valid suggestion with all required fields** [high]
  - describe: AutoMatchSuggestion — type shape
  - why: Factory round-trip.
- **allows optional city field** [high]
  - describe: AutoMatchSuggestion — type shape
  - why: Spread-override round-trip.
- **reasons is an array of strings** [high]
  - describe: AutoMatchSuggestion — type shape
  - why: Tests JS's Array.isArray.
- **constructs a valid aggregate with all required fields** [high]
  - describe: PolicyFeedbackAggregate — type shape
  - why: Factory round-trip with no logic.
- **trend can be up, down, or stable** [high]
  - describe: PolicyFeedbackAggregate — type shape
  - why: Spread-override round-trip; no validator.
- **each category is a non-empty string** [high]
  - describe: RatingCategory — validation
  - why: Tests JS typeof on test-local literals.
- **categories use snake_case format** [high]
  - describe: RatingCategory — validation
  - why: Self-referential — the test defines the array AND asserts about it.
- **income_estimation is a valid category on AccuracyRating** [high]
  - describe: RatingCategory — validation
  - why: Factory override round-trip; over-granular; TS already type-checks string-literal union.
- **categories are also used in PolicyFeedbackAggregate** [high]
  - describe: RatingCategory — validation
  - why: Spread-override round-trip; TS already enforces this union.
- **has exactly 4 distinct tiers** [high]
  - describe: ReputationRating — 4 rating tiers
  - why: Self-referential — tests Set behavior on a test-local literal.
- **each tier is a non-empty string** [high]
  - describe: ReputationRating — 4 rating tiers
  - why: Tests JS typeof on test-local literals.
- **constructs a valid acceptance record with required fields** [high]
  - describe: DisclaimerAcceptance — type shape
  - why: Pure literal-object round-trip.
- **allows optional ip_address and user_agent for audit** [high]
  - describe: DisclaimerAcceptance — type shape
  - why: Pure literal-object round-trip.

### src/lib/testing/__tests__/showWhenCipher.test.ts
- **shortHash > produces deterministic output** [high]
  - describe: shortHash
  - line: lines 189-231 (entire 'shortHash' describe block, 5 it() tests)
  - why: Tests a local re-implementation, not the real shortHash. Removing them loses zero coverage of production code. If shortHash's contract matters, expose it from engine.ts and import it (or test indirectly via engine output).

## DUPLICATE (17)

### F:\TECH\DigitalDSA\REPOs\DigitalDSA-V3\src\lib\testing\__tests__\components\ObligationCapture.test.ts
- **Home Loan maps to term_loan facility, which shows EMI and tenure inputs** [high]
  - describe: ObligationCapture — field visibility for Home Loan obligation type
  - line: 31-36
  - dup of: src/lib/testing/__tests__/obligationLogic.test.ts:995
  - why: obligationLogic.test.ts has a dedicated 'facility type derivation' suite covering this exact mapping plus 5 more variants. Removing this test loses zero coverage.
- **Insta Loan is flagged separately — auto-selects closure on render** [high]
  - describe: ObligationCapture — field visibility for Home Loan obligation type
  - line: 45-50
  - dup of: src/lib/testing/__tests__/obligationLogic.test.ts:1121
  - why: Two other files already lock this exact mapping. The test name claims it covers 'auto-selects closure on render' but never tests that — only tests the flag itself.
- **Individual applicant type sees standard loan types including Home Loan and Vehicle Loan** [medium]
  - describe: ObligationCapture — expected loan type options and role options are present
  - line: 235-242
  - dup of: src/lib/testing/__tests__/obligationLogic.test.ts:1032
  - why: Other suites lock the individual-visible loan types more thoroughly.

### F:\TECH\DigitalDSA\REPOs\DigitalDSA-V3\src\lib\testing\__tests__\regressionBugs.test.ts
- **includes "Close by this new loan" for Balance Transfer With Top-up** [high]
  - describe: BT/Top-up closure options
  - line: 205-213
  - dup of: src/lib/testing/__tests__/regressionBugs.test.ts:183 — 'includes "Close by this new loan" for Balance Transfer With Top-up variant'
  - why: The earlier test at line 183 already locks the exact same behavior with identical args. Removing the duplicate at 205 loses zero coverage; if the BT-with-Top-up closure behavior breaks, the line-183 test will still fail.

### src/lib/testing/__tests__/applicantClassification.test.ts
- **non_applicant_cibil_only → profile + credit only** [high]
  - describe: getRequiredTabsForClassification — tab visibility
  - line: 180-185
  - dup of: src/lib/testing/__tests__/applicantClassification.test.ts:633
  - why: Duplicate of test in the second describe block in the same file; the second block adds CIBIL-threshold cases the first lacks.

### src/lib/testing/__tests__/authSchemas.test.ts
- **rejects email shorter than 5 chars** [high]
  - describe: emailSchema
  - line: 58-61
  - dup of: src/lib/testing/__tests__/authSchemas.test.ts:50 (it.each rejects invalid email)
  - why: Exact duplicate of the it.each entry above — 'a@b' is already in the rejection table. The it.each version would still fail if the min-length constraint broke.

### src/lib/testing/__tests__/cibilFloor.test.ts
- **GOV upgrades family financial applicant — their CIBIL counts** [medium]
  - describe: CIBIL scope classification filtering
  - line: lines 18-42
  - dup of: src/lib/testing/__tests__/lenderClassificationEvaluator.test.ts: 'family co_applicant_non_financial + >=20% stake → upgraded to co_applicant_financial' (line 113)
  - why: Override behavior is fully locked by lenderClassificationEvaluator.test.ts. The downstream CIBIL-floor intent stated in the comment is not actually asserted here.

### src/lib/testing/__tests__/deriveFixtureName.test.ts
- **uses · as segment separator** [medium]
  - describe: format
  - line: 42-45
  - dup of: src/lib/testing/__tests__/deriveFixtureName.test.ts: 'Home Loan · New Loan · Salaried Private · Mumbai · CIBIL 750 · Couple' (and 7 sibling full-scenario tests)
  - why: The exact-string assertions in 'full scenario examples' lock the separator far more strictly than this presence-only check.

### src/lib/testing/__tests__/directorAutoIncome.test.ts
- **NRI with professional education can select salaried income** [high]
  - describe: NRI salaried professional bug fix
  - line: 717-722
  - dup of: src/lib/testing/__tests__/directorAutoIncome.test.ts: 'salaried_regular has no showWhen restriction'
  - why: Literally the same assertion executed twice in adjacent tests. The duplicate's name implies it tests NRI behavior but the body is identical to the previous test. The other test still locks the contract.
- **NRI cannot select professional_practice (correct business rule)** [medium]
  - describe: NRI salaried professional bug fix
  - line: 724-731
  - dup of: src/lib/testing/__tests__/directorAutoIncome.test.ts: 'professional_practice requires non-NRI AND non-low education'
  - why: The earlier test already locks `conditions[0] === { '==': ['isNRI', 'No'] }`. Removing this one loses no coverage — the first test would still fail if the rule changed.

### src/lib/testing/__tests__/formSnapshotValidation.test.ts
- **rejects fractional version (must be integer)** [high]
  - describe: formSnapshotSchema — version field constraints
  - line: 181-186
  - dup of: src/lib/testing/__tests__/formSnapshot.schema.test.ts:92 ("rejects non-integer version")
  - why: Same test exists with the same fractional input (1.5). Removing one loses nothing.

### src/lib/testing/__tests__/loanPageIndexRestore.test.ts
- **preserves variant-reset behavior (Pitfall #41): when picker just reset to 0, no resurrection of stale index** [medium]
  - describe: computePageIndexOnRemount — browser-back page-index restore
  - line: Line 55-60
  - dup of: src/lib/testing/__tests__/loanPageIndexRestore.test.ts:37-41 ('returns null when saved index is 0 (fresh entry from picker — nothing to restore)')
  - why: The two it() blocks invoke the function with exactly the same arguments and assert exactly the same return. If the variant-reset behavior broke, the fresh-entry test would also fail (same code path). The comment value (institutional memory about Pitfall #41) can be preserved by appending a sentence 

### src/lib/testing/__tests__/queryValidation.test.ts
- **has exactly 3 valid statuses** [high]
  - describe: queryStatusEnum — status validation
  - line: line 85-91
  - dup of: src/lib/testing/__tests__/queryValidation.test.ts:93 `it.each(ALL_STATUSES)('accepts valid status: %s')`
  - why: The it.each directly below locks identical behavior with better diagnostics. The count test adds no coverage.

### src/lib/testing/__tests__/rmValidation.test.ts
- **accepts standard email format** [medium]
  - describe: rmContactSchema — email format edge cases
  - dup of: src/lib/testing/__tests__/rmContact.schema.test.ts:58 — 'accepts full RM contact with all fields'
  - why: Standard email format is the happy-path already covered.
- **accepts creation without loan types (optional)** [high]
  - describe: rmContactCreateSchema — loan_types_handled
  - dup of: src/lib/testing/__tests__/rmContact.schema.test.ts:124 — 'accepts valid creation payload (minimal)'
  - why: Same behavior already locked.

### src/lib/testing/__tests__/verifySingleFather.test.ts
- **changing father age below child age (direction reversed) marks both sides HARD-invalid** [medium]
  - describe: Post-creation edits — marital and age changes invalidate stale relationships
  - dup of: src/lib/testing/__tests__/findInvalidRelationships.test.ts:109 'marks Father of as hard when father is younger than child' + lines 252-279 'both sides of a hard pair are marked not keepable'
  - why: Same function, same scenario class (direction-reversed age), same hard/keepable + reciprocal assertions. Removing loses no coverage.
- **Husband marital change (married → single) is HARD under new policy** [high]
  - describe: Post-creation edits — marital and age changes invalidate stale relationships
  - dup of: src/lib/testing/__tests__/findInvalidRelationships.test.ts:206 'marks Husband of as HARD when person becomes single (spouse requires marital)'
  - why: Exact same function, same scenario (husband married→single), same assertions (check=marital, keepable=false). Removing loses no coverage.

## OVER-GRANULAR (2)

### src/lib/testing/__tests__/rmPortal.test.ts
- **eligibility_check is a valid category on AccuracyRating** [high]
  - describe: RatingCategory — validation
  - why: One of 5 identical factory round-trips.
- **excellent is assignable to RMReputationScore.rating** [high]
  - describe: ReputationRating — 4 rating tiers
  - why: TS already enforces the literal union; tests just round-trip override values.
