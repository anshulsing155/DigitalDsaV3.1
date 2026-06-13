/**
 * Schema Composer Equivalence Test
 *
 * Verifies that the composed TypeScript schema (from question bank modules)
 * produces output structurally equivalent to the original monolithic JSON schema.
 *
 * The TypeScript composer has been intentionally enhanced beyond the original JSON
 * in Sessions 6-9. Known divergences are documented below and tested separately.
 */
import { describe, it, expect } from 'vitest';
import { composeHomeLoanSchema } from '$lib/config/homeLoan/composer.js';
import originalSchema from '$lib/config/homeLoanSchemaV2.json';

describe('Schema Composer — equivalence with original JSON', () => {
	const composed = composeHomeLoanSchema();
	const original = originalSchema as any;

	// ── Known intentional divergences ────────────────────────────────
	// The TypeScript composer is the source of truth. These enhancements
	// were added in Sessions 6-9 and are verified in dedicated tests below.

	/** Pages with extra questions added in the composer (not in original JSON) */
	const EXTRA_QUESTIONS_BY_PAGE: Record<string, string[]> = {
		// Session 32: BT Registry questions merged into Location, plus compound location + usage intent
		// Session 34: q2_propertyIdentified moved here from caseIntake (which was redesigned)
		// Form Optimization Tier 1.2: q4_sixMonthsPassedAfterRegistry removed (auto-derivable from disbursement date)
		// S64: q_intendedCityDecided added for pre-approval flow (property not identified)
		// Removed 2026-05-27 (first pass): pre-approval used to gate the city
		//   picker with Yes/No; removed so the picker always shows when
		//   propertyIdentified=No, just with a different question label.
		// Updated 2026-05-27 (second pass): the single-question approach used
		//   a server-resolved conditional locationConfig (showArea / showPincode
		//   as RulesLogic), which was only resolved at page-load time and
		//   stayed stale when the DSA toggled propertyIdentified within the
		//   page. Split into two questions instead:
		//     - q_propertyLocation:        full picker (state+city+area+pincode), identified Yes / BT / Top-up
		//     - q_propertySearchLocation:  state+city only, identified No
		//   Both share the `property` prefix so answers carry across the toggle.
		propertyLocation_homeLoan: [
			'q2_propertyIdentified',
			'q_propertyUsageIntent',
			'q_propertyLocation',
			'q_propertySearchLocation',
			'q1_isRegistryDone',
			'q2_bt_possessionAndDemandStatus',
			'q3_bt_outstandingDemandAmount'
		],
		loanRequirements_homeLoan: ['q1_mortgageYear', 'q1a_mortgageYearCustom'],
		// Session 32: builder role, RERA status moved from compliance
		// Session 46: builder→project→lender chain moved from propertyLocation, q1e_projectLenders replaced with q_projectLenders (multi-select)
		propertyCharacter_homeLoan: [
			'q_builderName',
			'q_builderNameManual',
			'q_projectName',
			'q_projectNameManual',
			'q1c_builderRole',
			'q1d_reraStatus',
			'q_projectLenders'
		],
		// Session 32: authority page expanded with OC/CC, municipal, and doc readiness
		// q4_isPossessionOfferedByAuthority removed (duplicate of q5_possessionCertificateStatus)
		sellerTransaction_authority_homeLoan: [
			'q2_ocCcAvailable',
			'q3_municipalApproval',
			'q7_authorityDocReadiness'
		],
		// FG-2 #8: BT EMI count question re-added — critical for BT eligibility (<6 EMIs = rejection)
		btExistingLoan_homeLoan: ['q3b_btEmisPaid']
	};

	/** Pages where JSON has extra questions not yet in the composer (Session 20/23 additions) */
	const JSON_EXTRA_QUESTIONS_BY_PAGE: Record<string, string[]> = {
		// caseIntake_homeLoan — now in RESTRUCTURED_PAGES (Session 34: fully redesigned)
		propertyCharacter_homeLoan: ['q1b_propertyType', 'q1c_leaseRemainingPeriod', 'q5_projectName'],
		// Old separate state/city/pincode replaced by compound q_propertyLocation; zone question removed
		propertyLocation_homeLoan: [
			'q4_propertyStateName',
			'q5_propertyCityName',
			'q6_pincode',
			'q1b_specialAreaRestriction'
		],
		// Session 32: q6_authorityDuesStatus removed (merged into q4_authorityPaymentStatus)
		sellerTransaction_authority_homeLoan: ['q6_authorityDuesStatus'],
		// Loan account number removed from composer (operational detail, not needed at assessment)
		btExistingLoan_homeLoan: ['q2_loanAccountNumber'],
		// Form Optimization Tier 2.1: q7b_registryDateReason removed (zero rule engine consumers, zero lender impact)
		dealFinancials_homeLoan: ['q7b_registryDateReason']
		// propertyCondition_homeLoan is now a restructured page (merged into complianceLegal_homeLoan)
	};

	/** Pages where question ORDER has been intentionally changed (compare as sets, not arrays) */
	const REORDERED_PAGES = new Set([
		'propertyCharacter_homeLoan' // Session 32: carpet area moved before PropertyStage
	]);

	/** Pages where the page title has been intentionally changed */
	const DIVERGENT_PAGE_TITLES = new Set([
		'propertyLocation_homeLoan' // Session 32: renamed from "Property Location & Type" to "Property Location & Status"
	]);

	/** Pages where page-level showWhen has been intentionally changed */
	const DIVERGENT_PAGE_SHOWWHEN = new Set([
		'propertyLocation_homeLoan',
		'sellerTransaction_homeLoan',
		'sellerTransaction_authority_homeLoan', // Session 46: added propertyIdentified='Yes' gate
		'applicantProfilePage', // Session 47: __onlyCompanyApplicant gate added
		'incomeProfilesPage', // Session 47: __onlyCompanyApplicant gate added
		'incomeDetailsPage', // Session 47: __onlyCompanyApplicant gate added
		'creditScorePage', // Session 47: __onlyCompanyApplicant gate added
		'obligationsPage' // Session 32: showWhen simplified + Session 47: __onlyCompanyApplicant gate added
	]);

	/** Pages where ALL questions may have divergent showWhen (Session 20 audit restructured them) */
	const DIVERGENT_PAGES = new Set(['sellerTransaction_homeLoan']);

	/**
	 * Questions with ANY intentionally divergent property — skip in equivalence tests.
	 * Complete list derived from programmatic comparison of composer vs JSON.
	 */
	const DIVERGENT_QUESTIONS = new Set([
		// Session 33: warning field added to existing question
		'q8_remainingTenure',
		// FG-2 #7: property age + tenure warning added
		'q2_mortgageYear',
		// Form Optimization Tier 3: spacing + description changes for visual grouping
		'q4_interestRateType',
		'q3b_btEmisPaid',
		'q7_existingInterestRate',
		'q3_marketValue',
		'q4_propCost',
		'q5_registryValue',
		'q6_deposit',
		'q6_principalOutstanding',
		// propertyLocation_homeLoan — enhanced showWhen, dynamic text, option-level showWhen
		'q1_propertyAreaType',
		'q2a_purchaseType_planned',
		'q2b_purchaseType_other',
		'q4_propertyStateName',
		'q5_propertyCityName',
		'q6_pincode',
		// sellerTransaction_homeLoan — options divergence (page-level showWhen handled via DIVERGENT_PAGES)
		'q9_sellerCurrentLender',
		// sellerTransaction_authority_homeLoan — required flags, type, showWhen
		'q2_allotmentLetterStatus',
		'q3_allotmentDate',
		'q4_authorityPaymentStatus',
		'q5_possessionCertificateStatus',
		'q1_authorityName',
		// dealFinancials_homeLoan — showWhen
		'q1_auctionPropertyStatus',
		// propertyCharacter_homeLoan — showWhen changed (Session 20 audit: PropertyStage → constructionType)
		'q2_PropertyStage', // resale_normal exclusion added
		'q3_propertyAge', // resale_normal only (other purchase types are new properties)
		'q4_carpetArea', // Session 32: showWhen simplified (moved before PropertyStage, only depends on constructionType)
		'q5_projectName',
		// Session 32: type changed from 'text' to 'currency' (currency type migration)
		'q3_bt_outstandingDemandAmount',
		'q8_sellerOutstandingAmount',
		'q3_marketValue',
		'q4_propCost',
		'q5_registryValue',
		'q6_deposit',
		'q6a_advanceInAgreement',
		'q1_sanctionAmount',
		'q6_principalOutstanding',
		'q10_includedCurrentEMIsAmount',
		'q5_topUpAmount',
		'q3_deposit',
		// Session 57: riskSignal added to option (new field not in legacy JSON)
		'q2_poaRegistrationStatus',
		// 2026-05-15: wired month picker (uiType:'monthYear', minYear, new placeholder)
		// Legacy JSON had plain text input with hand-typed YYYY-MM. See dealFinancials.ts.
		'q7a_registryPlannedDate'
		// Note: propertyCondition_homeLoan questions skipped via DIVERGENT_PAGES (Session 20 audit restructured all)
	]);

	it('formId matches', () => {
		expect(composed.formId).toBe(original.formId);
	});

	it('title matches', () => {
		expect(composed.title).toBe(original.title);
	});

	it('composed has 16 pages (restructured: BT Registry merged into Location, Legal merged into Compliance)', () => {
		expect(composed.pages.length).toBe(16);
	});

	it('page IDs are correct after restructuring', () => {
		const composedIds = composed.pages.map((p) => p.id);
		// Session 32: btRegistry_homeLoan removed (merged into propertyLocation),
		// propertyCondition_homeLoan → complianceLegal_homeLoan,
		// legalVerification_homeLoan removed (merged into complianceLegal)
		expect(composedIds).toContain('complianceLegal_homeLoan');
		expect(composedIds).not.toContain('btRegistry_homeLoan');
		expect(composedIds).not.toContain('legalVerification_homeLoan');
		expect(composedIds).not.toContain('propertyCondition_homeLoan');
	});

	// Session 32: Pages restructured — match by ID, skip restructured pages
	const RESTRUCTURED_PAGES = new Set([
		'btRegistry_homeLoan', // merged into propertyLocation_homeLoan
		'propertyCondition_homeLoan', // replaced by complianceLegal_homeLoan
		'legalVerification_homeLoan', // merged into complianceLegal_homeLoan
		'caseIntake_homeLoan' // Session 34: fully redesigned (assessmentStatus replaces priorAssessmentHistory)
	]);
	const compPageMap = new Map(composed.pages.map((p) => [p.id, p]));

	it('each page has same number of questions (accounting for known extras)', () => {
		for (let i = 0; i < original.pages.length; i++) {
			const origPage = original.pages[i];
			if (RESTRUCTURED_PAGES.has(origPage.id)) continue;
			const compPage = compPageMap.get(origPage.id);
			if (!compPage) continue;
			const composerExtras = EXTRA_QUESTIONS_BY_PAGE[origPage.id];
			const jsonExtras = JSON_EXTRA_QUESTIONS_BY_PAGE[origPage.id];

			const composerExtraCount = composerExtras?.length ?? 0;
			const jsonExtraCount = jsonExtras?.length ?? 0;

			// composerCount - composerExtras == originalCount - jsonExtras
			// i.e. both should have the same "shared" question count
			expect(
				compPage.questions.length - composerExtraCount,
				`Page "${origPage.id}" question count mismatch (composer extras: ${composerExtraCount}, JSON extras: ${jsonExtraCount})`
			).toBe(origPage.questions.length - jsonExtraCount);
		}
	});

	it('question IDs match per page (excluding known extras)', () => {
		for (let i = 0; i < original.pages.length; i++) {
			const origPage = original.pages[i];
			if (RESTRUCTURED_PAGES.has(origPage.id)) continue;
			const compPage = compPageMap.get(origPage.id);
			if (!compPage) continue;

			// Filter out composer extras from composed IDs
			const composerPageExtras = new Set(EXTRA_QUESTIONS_BY_PAGE[origPage.id] ?? []);
			const compIds = compPage.questions
				.map((q: any) => q.id)
				.filter((id: string) => !composerPageExtras.has(id));

			// Filter out JSON extras from original IDs
			const jsonPageExtras = new Set(JSON_EXTRA_QUESTIONS_BY_PAGE[origPage.id] ?? []);
			const origIds = origPage.questions
				.map((q: any) => q.id)
				.filter((id: string) => !jsonPageExtras.has(id));

			if (REORDERED_PAGES.has(origPage.id)) {
				// Same questions, different order — compare as sorted sets
				expect(
					[...compIds].sort(),
					`Page "${origPage.id}" question IDs mismatch (reordered)`
				).toEqual([...origIds].sort());
			} else {
				expect(compIds, `Page "${origPage.id}" question IDs mismatch`).toEqual(origIds);
			}
		}
	});

	it('page showWhen conditions match (excluding known divergences)', () => {
		for (let i = 0; i < original.pages.length; i++) {
			const origPage = original.pages[i];
			if (RESTRUCTURED_PAGES.has(origPage.id)) continue;
			const compPage = compPageMap.get(origPage.id);
			if (!compPage) continue;
			if (DIVERGENT_PAGE_SHOWWHEN.has(origPage.id)) continue;
			const origShowWhen = origPage.showWhen ?? undefined;
			const compShowWhen = compPage.showWhen ?? undefined;
			expect(compShowWhen, `Page "${origPage.id}" showWhen mismatch`).toEqual(origShowWhen);
		}
	});

	it('page titles match', () => {
		for (let i = 0; i < original.pages.length; i++) {
			const origPage = original.pages[i];
			if (RESTRUCTURED_PAGES.has(origPage.id)) continue;
			if (DIVERGENT_PAGE_TITLES.has(origPage.id)) continue;
			const compPage = compPageMap.get(origPage.id);
			if (!compPage) continue;
			expect(compPage.title, `Page "${origPage.id}" title mismatch`).toBe(origPage.title);
		}
	});

	it('question showWhen conditions match', () => {
		for (let i = 0; i < original.pages.length; i++) {
			const origPage = original.pages[i];
			if (RESTRUCTURED_PAGES.has(origPage.id)) continue;
			const compPage = compPageMap.get(origPage.id);
			if (!compPage) continue;
			if (DIVERGENT_PAGES.has(origPage.id)) continue;

			const compQMap = new Map(compPage.questions.map((q: any) => [q.id, q]));

			for (let j = 0; j < origPage.questions.length; j++) {
				const origQ = origPage.questions[j];
				const compQ = compQMap.get(origQ.id) as any;
				if (!origQ || !compQ) continue;
				if (DIVERGENT_QUESTIONS.has(origQ.id)) continue;

				const origShowWhen = origQ.showWhen ?? undefined;
				const compShowWhen = compQ.showWhen ?? undefined;
				expect(
					compShowWhen,
					`Question "${origQ.id}" on page "${origPage.id}" showWhen mismatch`
				).toEqual(origShowWhen);
			}
		}
	});

	it('question types match', () => {
		for (let i = 0; i < original.pages.length; i++) {
			const origPage = original.pages[i];
			if (RESTRUCTURED_PAGES.has(origPage.id)) continue;
			const compPage = compPageMap.get(origPage.id);
			if (!compPage) continue;

			const compQMap = new Map(compPage.questions.map((q: any) => [q.id, q]));

			for (let j = 0; j < origPage.questions.length; j++) {
				const origQ = origPage.questions[j];
				const compQ = compQMap.get(origQ.id) as any;
				if (!origQ || !compQ) continue;
				if (DIVERGENT_QUESTIONS.has(origQ.id)) continue;
				expect(compQ.type, `Question "${origQ.id}" type mismatch`).toBe(origQ.type);
			}
		}
	});

	it('question required flags match', () => {
		for (let i = 0; i < original.pages.length; i++) {
			const origPage = original.pages[i];
			if (RESTRUCTURED_PAGES.has(origPage.id)) continue;
			const compPage = compPageMap.get(origPage.id);
			if (!compPage) continue;

			const compQMap = new Map(compPage.questions.map((q: any) => [q.id, q]));

			for (let j = 0; j < origPage.questions.length; j++) {
				const origQ = origPage.questions[j];
				const compQ = compQMap.get(origQ.id) as any;
				if (!origQ || !compQ) continue;
				if (DIVERGENT_QUESTIONS.has(origQ.id)) continue;
				expect(compQ.required ?? false, `Question "${origQ.id}" required flag mismatch`).toBe(
					origQ.required ?? false
				);
			}
		}
	});

	it('question bindsTo/bindsTo_template match', () => {
		for (let i = 0; i < original.pages.length; i++) {
			const origPage = original.pages[i];
			if (RESTRUCTURED_PAGES.has(origPage.id)) continue;
			const compPage = compPageMap.get(origPage.id);
			if (!compPage) continue;

			const compQMap = new Map(compPage.questions.map((q: any) => [q.id, q]));

			for (let j = 0; j < origPage.questions.length; j++) {
				const origQ = origPage.questions[j];
				const compQ = compQMap.get(origQ.id) as any;
				if (!origQ || !compQ) continue;
				expect(
					compQ.bindsTo_template ?? compQ.bindsTo ?? undefined,
					`Question "${origQ.id}" binding mismatch`
				).toEqual(origQ.bindsTo_template ?? origQ.bindsTo ?? undefined);
			}
		}
	});

	it('question contextKey match', () => {
		for (let i = 0; i < original.pages.length; i++) {
			const origPage = original.pages[i];
			if (RESTRUCTURED_PAGES.has(origPage.id)) continue;
			const compPage = compPageMap.get(origPage.id);
			if (!compPage) continue;

			const compQMap = new Map(compPage.questions.map((q: any) => [q.id, q]));

			for (let j = 0; j < origPage.questions.length; j++) {
				const origQ = origPage.questions[j];
				const compQ = compQMap.get(origQ.id) as any;
				if (!origQ || !compQ) continue;
				expect(compQ.contextKey ?? undefined, `Question "${origQ.id}" contextKey mismatch`).toEqual(
					origQ.contextKey ?? undefined
				);
			}
		}
	});

	it('question text/question field matches', () => {
		for (let i = 0; i < original.pages.length; i++) {
			const origPage = original.pages[i];
			if (RESTRUCTURED_PAGES.has(origPage.id)) continue;
			const compPage = compPageMap.get(origPage.id);
			if (!compPage) continue;

			const compQMap = new Map(compPage.questions.map((q: any) => [q.id, q]));

			for (let j = 0; j < origPage.questions.length; j++) {
				const origQ = origPage.questions[j];
				const compQ = compQMap.get(origQ.id) as any;
				if (!origQ || !compQ) continue;
				if (DIVERGENT_QUESTIONS.has(origQ.id)) continue;
				// derivedSelect questions may have question:'' in TS (required by type)
				// but undefined in JSON — treat empty string as equivalent to undefined
				const compQuestion = compQ.question === '' ? undefined : compQ.question;
				const origQuestion = origQ.question === '' ? undefined : origQ.question;
				expect(
					compQuestion,
					`Question "${origQ.id}" on page "${origPage.id}" question text mismatch`
				).toEqual(origQuestion);
			}
		}
	});

	it('question options match', () => {
		for (let i = 0; i < original.pages.length; i++) {
			const origPage = original.pages[i];
			if (RESTRUCTURED_PAGES.has(origPage.id)) continue;
			const compPage = compPageMap.get(origPage.id);
			if (!compPage) continue;

			const compQMap = new Map(compPage.questions.map((q: any) => [q.id, q]));

			for (let j = 0; j < origPage.questions.length; j++) {
				const origQ = origPage.questions[j];
				const compQ = compQMap.get(origQ.id) as any;
				if (!origQ || !compQ) continue;
				if (DIVERGENT_QUESTIONS.has(origQ.id)) continue;

				const origOptions = origQ.options ?? undefined;
				const compOptions = compQ.options ?? undefined;
				expect(
					compOptions,
					`Question "${origQ.id}" on page "${origPage.id}" options mismatch`
				).toEqual(origOptions);
			}
		}
	});

	it('output is JSON-serializable', () => {
		// schemaLoader does JSON.parse(JSON.stringify(schema))
		const serialized = JSON.parse(JSON.stringify(composed));
		expect(serialized.formId).toBe(composed.formId);
		expect(serialized.pages.length).toBe(composed.pages.length);
	});

	it('all optionResolver question IDs present', () => {
		// These IDs are hardcoded in optionResolver.ts for dynamic option generation
		// Note: q4_propertyStateName, q5_propertyCityName, q6_pincode replaced by q_propertyLocation
		const criticalIds = [
			'q_propertyLocation', // compound location question (replaces q4/q5/q6)
			'q9_selectSingleBank', // btExistingLoan page
			'q9_sellerCurrentLender' // sellerTransaction page
		];

		const allQuestionIds = composed.pages.flatMap((p) => p.questions.map((q) => q.id));

		for (const id of criticalIds) {
			expect(allQuestionIds, `Critical question ID "${id}" missing from composed schema`).toContain(
				id
			);
		}
	});

	// ── Tests for known enhancements (composer is source of truth) ──

	it('extra questions exist on their respective pages', () => {
		for (const [pageId, questionIds] of Object.entries(EXTRA_QUESTIONS_BY_PAGE)) {
			const page = composed.pages.find((p) => p.id === pageId);
			expect(page, `Page "${pageId}" not found in composed schema`).toBeDefined();
			for (const qId of questionIds) {
				const q = page!.questions.find((q) => q.id === qId);
				expect(q, `Extra question "${qId}" not found on page "${pageId}"`).toBeDefined();
			}
		}
	});

	it('q_propertyUsageIntent is a radio question', () => {
		const page = composed.pages.find((p) => p.id === 'propertyLocation_homeLoan');
		const q = page!.questions.find((q) => q.id === 'q_propertyUsageIntent');
		expect(q!.type).toBe('radio');
	});

	it('q1_propertyAreaType has dynamic question text', () => {
		const page = composed.pages.find((p) => p.id === 'propertyLocation_homeLoan');
		const q = page!.questions.find((q) => q.id === 'q1_propertyAreaType') as any;
		// Composer uses a switch object for dynamic question text
		expect(q.question).toHaveProperty('default');
		expect(q.question).toHaveProperty('switch');
	});

	// Deep equivalence test: full question object comparison (excluding divergent questions)
	it('full deep equality per question (all properties)', () => {
		for (let i = 0; i < original.pages.length; i++) {
			const origPage = original.pages[i];
			if (RESTRUCTURED_PAGES.has(origPage.id)) continue;
			const compPage = compPageMap.get(origPage.id);
			if (!compPage) continue;
			if (DIVERGENT_PAGES.has(origPage.id)) continue;

			const compQMap = new Map(compPage.questions.map((q: any) => [q.id, q]));

			for (let j = 0; j < origPage.questions.length; j++) {
				const origQ = origPage.questions[j];
				const compQ = compQMap.get(origQ.id) as any;
				if (!origQ || !compQ) continue;
				// Skip questions with any known divergence — tested separately above
				if (DIVERGENT_QUESTIONS.has(origQ.id)) continue;

				// Normalize: derivedSelect questions may have question:'' in TS
				// (required by type) but undefined in JSON — strip empty string for comparison
				const normalizedCompQ = { ...compQ };
				if (normalizedCompQ.question === '') delete normalizedCompQ.question;
				// Strip groupId/groupTitle — TS-only visual grouping fields not in JSON
				delete normalizedCompQ.groupId;
				delete normalizedCompQ.groupTitle;
				// Strip minLimit/maxLimit — TS-only numeric contract fields added in
				// CLAUDE.md Pitfall #14 audit (2026-05-04). These document the
				// answered-state semantic for `isFieldAnswered` and don't exist
				// in the legacy JSON. Like groupId/groupTitle, they're enhancements,
				// not divergences in question intent.
				delete normalizedCompQ.minLimit;
				delete normalizedCompQ.maxLimit;
				// Strip labelClass — the 2026-05-20 mobile/uniform-UI refresh removed
				// the per-question `labelClass: 'text-[var(--form-text)]'` override
				// from the TS question banks (label colour is now owned by the field
				// components). The legacy JSON still carries it; since the composer is
				// the source of truth, normalize it away on both sides.
				delete normalizedCompQ.labelClass;
				const normalizedOrigQ = { ...origQ };
				delete normalizedOrigQ.labelClass;

				expect(
					normalizedCompQ,
					`Question "${origQ.id}" on page "${origPage.id}" full deep mismatch`
				).toEqual(normalizedOrigQ);
			}
		}
	});
});
