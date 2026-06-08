// Rule Validator — validates JSON-Logic rule documents against the payload key registry
// Part of RE-1: Rule Engine — In-House Build (Path A)

// ============================================================================
// KEY REGISTRIES
// ============================================================================

const LOAN_TRANSACTION_KEYS = new Set([
	'loanName',
	'loanType',
	// Post-2026-05-31 rename additions (ADR-0020): facility-axis and Plot-variant
	// fields now flow through loanTransaction. Rule docs referencing
	// `{ var: 'facilityType' }` or `{ var: 'loanVariant' }` will fail
	// validation if these aren't registered.
	'facilityType',
	'loanVariant',
	'numberOfApplicants',
	'applicationStructure',
	'propertyIdentified',
	'propertyState',
	'propertyCity',
	'propertyPincode',
	'propertyType',
	'purchaseType',
	'constructionStatus',
	'propertyStage',
	'approvedByAuthority',
	'asPerApprovedMap',
	'creditHistoryStatus',
	'propertyComplianceStatus',
	'incomeDocAvailable',
	'propertyRegistered',
	'propertyCost',
	'atsValue',
	'downPayment',
	'residenceSameAsProperty',
	'residenceState',
	'residenceCity',
	'loanAmount',
	'tenureYears',
	'currentBank',
	'principalOutstanding',
	'currentInterestRate',
	'remainingTenure',
	'currentEMI',
	'sixMonthsAfterRegistry',
	'currentPropertyValue',
	'newTenure',
	'topUpAmount',
	'topUpTenure',
	'hasNRIApplicant',
	'preferredBanks',
	'excludedBanks',
	'carpetArea',
	'carpetAreaUnit',
	'carpetAreaRaw',
	'propertyAreaType',
	'leaseRemainingPeriod',
	'existingEncumbrance',
	'ocCcAvailable',
	'municipalApproval',
	'rentalIncome',
	'loanPurpose',
	'loanVintage',
	'repaymentTrack',
	'dodMonthlyWithdrawal',

	// ── Home Loan Redesign: Three-Cost Model ──
	'marketValue',
	'registryValue',
	'advanceInAgreement',

	// ── Home Loan Redesign: BT Existing Loan Signals ──
	'interestRateType',
	'emiBounceHistory',
	'sanctionAmount',
	'topUpPurpose',
	'loanVintageMonths',

	// ── Home Loan Redesign: New Signals ──
	'registryTimeline',
	'auctionPropertyStatus',
	'priorAssessmentHistory',

	// ── Area-Specific Property Compliance & Legal ──
	'reraRegistrationStatus',
	'naConversionStatus',
	'zoneClassification',
	'municipalTaxStatus',
	'unauthorizedAdditions',
	'revenueRecordStatus',
	'colonyRegularizationStatus',
	'gramPanchayatPermission',
	'titleChainStatus',
	'encumbranceCertStatus',
	'successionStatus',
	'revenueRecordMutation',

	// ── Seller & Transaction Details ──
	'sellerOwnershipType',
	'poaRegistrationStatus',
	'propertyAcquisitionMethod',
	'agreementPoaRegistryWilling',
	'agreementPoaNbfcKnown',
	'agreementPoaNbfcName',
	'lastRegistryDuration',
	'isAnyBuilderDemand',

	// ── SC/ST + Disability Derived Flags ──
	'isSCST',
	'hasDisabledApplicant'
]);

const APPLICANT_FLAT_KEYS = new Set([
	'applicantType',
	'title',
	'fullName',
	'age',
	'gender',
	'maritalStatus',
	'roleInApplication',
	'relationshipWithPrimary',
	'otherRelationship',
	'residenceType',
	'yearsAtCurrentAddress',
	'isNRI',
	'employmentType',
	'professionType',
	'hasBarCouncilChamber',
	'businessType',
	'gstRegistrationDate',
	'grossIncome',
	'netIncome',
	'monthlyOtherIncome',
	'averageBankBalance',
	'averageCashAmount',
	'creditScore',
	'hasExistingObligations',
	'companyName',
	'companyType',
	'companyAge',

	// ── Home Loan Redesign: Per-Applicant Signals ──
	'emiBounceCount',
	'defaultSettlementStatus',
	'recentEnquiryCount',
	'applicantResidencePattern',
	'ownedResidentialProperties',
	'education',
	'religion',
	'casteCategory',
	'hasDisability',
	'creditHistoryStatus',

	// ── Profile Page: Location + NRI Fields ──
	'applicantResidenceState',
	'applicantResidenceCity',
	'applicantResidencePincode',
	'companyOfficeState',
	'companyOfficeCity',
	'companyOfficePincode',
	'nriCountry'
]);

const SALARIED_PROFILE_KEYS = new Set([
	'worksForReputedOrg',
	'companyHas100PlusEmployees',
	'employerIsProprietorship',
	'employerSharesFinancials',
	'isPermanentEmployee',
	'twoYearsWithSameEmployer',
	'threeYearsTotalExperience',
	'hasProvidentFund',
	'salaryInBankAccount',
	'receivesBonus',
	'receivesSalarySlip',
	'hasHigherEducation'
]);

const GOVERNMENT_PROFILE_KEYS = new Set([
	'isCentralGovt',
	'isDefense',
	'isStateGovt',
	'isPermanent',
	'isContractual',
	'probationCompleted',
	'twoYearsService',
	'noDisciplinaryAction',
	'nonAccessiblePosting',
	'verificationPossible',
	'alternateAddressAvailable',
	'receivesBonus',
	'pensionEligible',
	'receivesSalarySlip',
	'filesITR',
	'ownsProperty',
	'hasOtherIncome'
]);

const BUSINESS_PROFILE_KEYS = new Set([
	'gstRegistered',
	'hasCurrentAccount',
	'usesSavingsAccount',
	'filesITRRegularly',
	'profitableLast3Years',
	'profitableSinceStart',
	'majorCashSales',
	'fewKeyClients',
	'hasCCOD',
	'hasOtherIncome',
	'hasProfessionalLicense',
	'hasCommercialPremises',
	'ownsPremises',
	'threeYearsInBusiness',
	'enrolledWithProfessionalBody',
	'priorExperience',
	'seasonalBusiness'
]);

const PENSION_PROFILE_KEYS = new Set([
	'pensionInBankAccount',
	'pensionRegular',
	'isGovernmentPension',
	'isPSUDefensePension',
	'isLifelongPension',
	'isFamilyPension',
	'continuesBeyond75',
	'receivesPensionSlip',
	'nationalizedBankAccount',
	'noPensionLoanDeduction',
	'hasOtherIncome',
	'ownsProperty',
	'spousePensionApplicable',
	'filesITR',
	'verificationPossible'
]);

const FINANCIALS_KEYS = new Set(['grossReceipts', 'netProfit', 'depreciation', 'itrFiled']);

const LOW_CREDIT_REASONS_KEYS = new Set([
	'delayedEMI',
	'highCreditUtilization',
	'noCreditHistory',
	'minimumDueOnly',
	'multipleEnquiries',
	'coApplicantDefault',
	'loanDefault',
	'onlyUnsecuredLoans'
]);

const GPA_KEYS = new Set(['fullName', 'age', 'relationship', 'address']);

const OBLIGATION_FIELDS = new Set([
	'obligationType',
	'loanType',
	'bankName',
	'selectedToClose',
	'emi',
	'totalLimit',
	'tenure',
	'interestRate',
	'remainingLimit',
	'remainingTenure',
	'utilizedAmount',
	'sanctionedLimit',
	'sanctionedTenure'
]);

const DIRECTOR_FIELDS = new Set(['name', 'age', 'designation', 'din']);

/** Computed fields produced by payloadEnricher.ts — available via _computed.{key} */
const COMPUTED_FIELD_KEYS = new Set([
	'_total_gross_monthly',
	'_total_obligations_monthly',
	'_applicant_count',
	'_has_co_applicant',
	'_primary_age',
	'_primary_employment',
	'_is_business_file',
	'_is_salaried_file',
	'_max_cibil',
	'_min_cibil',
	'_total_vintage_years',
	'_income_source_count',
	'_income_profile_types'
]);

const POLICY_KEYS = new Set([
	'roi_type',
	'roi_benchmark',
	'roi_spread',
	'roi_range',
	'teaser_rate',
	'processing_fee_percent',
	'processing_fee_flat',
	'processing_fee_waiver',
	'prepayment_charge_floating',
	'prepayment_charge_fixed',
	'lock_in_period_months',
	'insurance_mandatory',
	'insurance_type',
	'login_to_sanction_days',
	'login_to_disbursal_days',
	'max_age_at_maturity',
	'min_loan_amount',
	'max_loan_amount',
	'women_borrower_discount',
	'festive_offer',
	'stamp_duty_info',
	'legal_technical_fee',
	'cersai_charge',
	'moratorium_available',
	'part_disbursement_allowed',
	'tranche_disbursement_info'
]);

// Nested profile name -> allowed keys
const NESTED_PROFILES: Record<string, Set<string>> = {
	salariedProfile: SALARIED_PROFILE_KEYS,
	governmentProfile: GOVERNMENT_PROFILE_KEYS,
	businessProfile: BUSINESS_PROFILE_KEYS,
	pensionProfile: PENSION_PROFILE_KEYS,
	financials: FINANCIALS_KEYS,
	lowCreditReasons: LOW_CREDIT_REASONS_KEYS,
	gpaDetails: GPA_KEYS
};

// Array sub-objects within an applicant
const ARRAY_SUB_OBJECTS: Record<string, Set<string>> = {
	obligations: OBLIGATION_FIELDS,
	directors: DIRECTOR_FIELDS
};

// ============================================================================
// extractVarPaths — walk JSON-Logic, collect all {var: "path"} references
// ============================================================================

export function extractVarPaths(logic: unknown): string[] {
	const paths: string[] = [];
	walk(logic, paths);
	return paths;
}

function walk(node: unknown, paths: string[]): void {
	if (node === null || node === undefined || typeof node !== 'object') return;

	if (Array.isArray(node)) {
		for (const item of node) {
			walk(item, paths);
		}
		return;
	}

	const obj = node as Record<string, unknown>;
	const keys = Object.keys(obj);

	// Check if this is a {var: "path"} reference
	if (keys.length === 1 && keys[0] === 'var' && typeof obj.var === 'string') {
		paths.push(obj.var as string);
		return;
	}

	// Recurse into all values
	for (const key of keys) {
		walk(obj[key], paths);
	}
}

// ============================================================================
// validateVarPath — validate a single var path against the key registry
// ============================================================================

export function validateVarPath(path: string): { valid: boolean; error?: string } {
	if (!path || typeof path !== 'string') {
		return { valid: false, error: 'Path must be a non-empty string' };
	}

	// Check for structural issues
	if (path.startsWith('.') || path.endsWith('.') || path.includes('..')) {
		return { valid: false, error: `Invalid path structure: "${path}"` };
	}

	const segments = path.split('.');
	if (segments.length < 2) {
		return {
			valid: false,
			error: `Path must have a section prefix (e.g. loanTransaction.field): "${path}"`
		};
	}

	const root = segments[0];

	// --- loanTransaction.{key} ---
	if (root === 'loanTransaction') {
		if (segments.length !== 2) {
			return {
				valid: false,
				error: `loanTransaction paths must be exactly loanTransaction.{key}, got: "${path}"`
			};
		}
		if (!LOAN_TRANSACTION_KEYS.has(segments[1])) {
			return {
				valid: false,
				error: `Unknown loanTransaction key: "${segments[1]}" in path "${path}"`
			};
		}
		return { valid: true };
	}

	// --- allApplicantDetails.{N}.{...} ---
	if (root === 'allApplicantDetails') {
		if (segments.length < 3) {
			return { valid: false, error: `allApplicantDetails paths require an index: "${path}"` };
		}

		const indexStr = segments[1];
		if (!/^\d+$/.test(indexStr)) {
			return {
				valid: false,
				error: `allApplicantDetails index must be numeric, got "${indexStr}" in path "${path}"`
			};
		}

		const fieldName = segments[2];

		// Flat applicant key: allApplicantDetails.{N}.{flatKey}
		if (segments.length === 3) {
			if (APPLICANT_FLAT_KEYS.has(fieldName)) {
				return { valid: true };
			}
			return { valid: false, error: `Unknown applicant key: "${fieldName}" in path "${path}"` };
		}

		// Nested profile: allApplicantDetails.{N}.{profile}.{key}
		if (segments.length === 4 && fieldName in NESTED_PROFILES) {
			const profileKeys = NESTED_PROFILES[fieldName];
			if (profileKeys.has(segments[3])) {
				return { valid: true };
			}
			return {
				valid: false,
				error: `Unknown ${fieldName} key: "${segments[3]}" in path "${path}"`
			};
		}

		// Array sub-object: allApplicantDetails.{N}.{arrayName}.{idx}.{field}
		if (segments.length === 5 && fieldName in ARRAY_SUB_OBJECTS) {
			const arrayIdx = segments[3];
			if (!/^\d+$/.test(arrayIdx)) {
				return {
					valid: false,
					error: `${fieldName} index must be numeric, got "${arrayIdx}" in path "${path}"`
				};
			}
			const allowedFields = ARRAY_SUB_OBJECTS[fieldName];
			if (allowedFields.has(segments[4])) {
				return { valid: true };
			}
			return {
				valid: false,
				error: `Unknown ${fieldName} field: "${segments[4]}" in path "${path}"`
			};
		}

		return { valid: false, error: `Invalid applicant path structure: "${path}"` };
	}

	// --- _computed.{key} ---
	if (root === '_computed') {
		if (segments.length !== 2) {
			return {
				valid: false,
				error: `_computed paths must be exactly _computed.{key}, got: "${path}"`
			};
		}
		if (!COMPUTED_FIELD_KEYS.has(segments[1])) {
			return { valid: false, error: `Unknown _computed key: "${segments[1]}" in path "${path}"` };
		}
		return { valid: true };
	}

	return { valid: false, error: `Unknown root section: "${root}" in path "${path}"` };
}

// ============================================================================
// validateRule — validate a rule object
// ============================================================================

export function validateRule(rule: unknown): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (rule === null || rule === undefined || typeof rule !== 'object' || Array.isArray(rule)) {
		return { valid: false, errors: ['Rule must be a non-null object'] };
	}

	const r = rule as Record<string, unknown>;

	// Required string fields
	if (!r.rule_id || typeof r.rule_id !== 'string' || (r.rule_id as string).trim() === '') {
		errors.push('rule_id is required and must be a non-empty string');
	}
	if (
		!r.description ||
		typeof r.description !== 'string' ||
		(r.description as string).trim() === ''
	) {
		errors.push('description is required and must be a non-empty string');
	}
	if (
		!r.source_excerpt ||
		typeof r.source_excerpt !== 'string' ||
		(r.source_excerpt as string).trim() === ''
	) {
		errors.push('source_excerpt is required and must be a non-empty string');
	}
	if (r.outcome === undefined || r.outcome === null || r.outcome === '') {
		errors.push('outcome is required');
	}

	// Confidence: number 0-1
	if (r.confidence === undefined || r.confidence === null) {
		errors.push('confidence is required and must be a number between 0 and 1');
	} else if (typeof r.confidence !== 'number' || r.confidence < 0 || r.confidence > 1) {
		errors.push('confidence must be a number between 0 and 1');
	}

	// Logic: must be a non-null object (or at least present)
	if (r.logic === undefined || r.logic === null) {
		errors.push('logic is required and must be a JSON-Logic object');
	} else if (typeof r.logic === 'object' && !Array.isArray(r.logic)) {
		// Validate var paths within logic
		const varPaths = extractVarPaths(r.logic);
		for (const vp of varPaths) {
			const pathResult = validateVarPath(vp);
			if (!pathResult.valid) {
				errors.push(pathResult.error!);
			}
		}
	} else if (typeof r.logic !== 'object') {
		errors.push('logic must be a JSON-Logic object');
	}

	return { valid: errors.length === 0, errors };
}

// ============================================================================
// validateDeviation — validate a deviation object with cross-reference
// ============================================================================

export function validateDeviation(
	deviation: unknown,
	existingRuleIds: string[]
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (
		deviation === null ||
		deviation === undefined ||
		typeof deviation !== 'object' ||
		Array.isArray(deviation)
	) {
		return { valid: false, errors: ['Deviation must be a non-null object'] };
	}

	const d = deviation as Record<string, unknown>;

	// Required string fields
	if (
		!d.deviation_id ||
		typeof d.deviation_id !== 'string' ||
		(d.deviation_id as string).trim() === ''
	) {
		errors.push('deviation_id is required and must be a non-empty string');
	}
	if (
		!d.description ||
		typeof d.description !== 'string' ||
		(d.description as string).trim() === ''
	) {
		errors.push('description is required and must be a non-empty string');
	}
	if (
		!d.source_excerpt ||
		typeof d.source_excerpt !== 'string' ||
		(d.source_excerpt as string).trim() === ''
	) {
		errors.push('source_excerpt is required and must be a non-empty string');
	}

	// applies_to_rule: must reference existing rule
	if (
		!d.applies_to_rule ||
		typeof d.applies_to_rule !== 'string' ||
		(d.applies_to_rule as string).trim() === ''
	) {
		errors.push('applies_to_rule is required');
	} else if (!existingRuleIds.includes(d.applies_to_rule as string)) {
		errors.push(`applies_to_rule references non-existent rule: "${d.applies_to_rule}"`);
	}

	// adjustment: must be present
	if (d.adjustment === undefined || d.adjustment === null) {
		errors.push('adjustment is required');
	}

	// Confidence: number 0-1
	if (d.confidence === undefined || d.confidence === null) {
		errors.push('confidence is required and must be a number between 0 and 1');
	} else if (typeof d.confidence !== 'number' || d.confidence < 0 || d.confidence > 1) {
		errors.push('confidence must be a number between 0 and 1');
	}

	// Validate var paths in conditions (if present and is an object)
	if (d.conditions && typeof d.conditions === 'object' && !Array.isArray(d.conditions)) {
		const varPaths = extractVarPaths(d.conditions);
		for (const vp of varPaths) {
			const pathResult = validateVarPath(vp);
			if (!pathResult.valid) {
				errors.push(pathResult.error!);
			}
		}
	}

	return { valid: errors.length === 0, errors };
}

// ============================================================================
// validatePolicyKey — check against 25 universal policy keys
// ============================================================================

export function validatePolicyKey(key: string): boolean {
	return POLICY_KEYS.has(key);
}

// ============================================================================
// validateLenderRuleDocument — full document validation
// ============================================================================

export function validateLenderRuleDocument(doc: unknown): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (doc === null || doc === undefined || typeof doc !== 'object' || Array.isArray(doc)) {
		return { valid: false, errors: ['Document must be a non-null object'] };
	}

	const d = doc as Record<string, unknown>;

	// Required document-level fields
	if (!d.lender_id || typeof d.lender_id !== 'string' || (d.lender_id as string).trim() === '') {
		errors.push('lender_id is required and must be a non-empty string');
	}
	if (
		!d.lender_name ||
		typeof d.lender_name !== 'string' ||
		(d.lender_name as string).trim() === ''
	) {
		errors.push('lender_name is required and must be a non-empty string');
	}
	if (
		!d.product_type ||
		typeof d.product_type !== 'string' ||
		(d.product_type as string).trim() === ''
	) {
		errors.push('product_type is required and must be a non-empty string');
	}
	if (d.version === undefined || d.version === null) {
		errors.push('version is required');
	}

	// Rules array
	if (d.rules === undefined || d.rules === null) {
		errors.push('rules is required and must be an array');
	} else if (!Array.isArray(d.rules)) {
		errors.push('rules must be an array');
	} else {
		const ruleIds: string[] = [];
		const seenRuleIds = new Set<string>();

		for (let i = 0; i < d.rules.length; i++) {
			const ruleResult = validateRule(d.rules[i]);
			if (!ruleResult.valid) {
				for (const err of ruleResult.errors) {
					errors.push(`rules[${i}]: ${err}`);
				}
			}

			// Collect rule_id for cross-reference and duplicate check
			const rule = d.rules[i] as Record<string, unknown>;
			if (rule && typeof rule === 'object' && typeof rule.rule_id === 'string' && rule.rule_id) {
				if (seenRuleIds.has(rule.rule_id as string)) {
					errors.push(`Duplicate rule_id: "${rule.rule_id}"`);
				} else {
					seenRuleIds.add(rule.rule_id as string);
				}
				ruleIds.push(rule.rule_id as string);
			}
		}

		// Validate deviations (optional)
		if (d.deviations !== undefined && d.deviations !== null) {
			if (!Array.isArray(d.deviations)) {
				errors.push('deviations must be an array');
			} else {
				const seenDevIds = new Set<string>();

				for (let i = 0; i < d.deviations.length; i++) {
					const devResult = validateDeviation(d.deviations[i], ruleIds);
					if (!devResult.valid) {
						for (const err of devResult.errors) {
							errors.push(`deviations[${i}]: ${err}`);
						}
					}

					// Duplicate deviation_id check
					const dev = d.deviations[i] as Record<string, unknown>;
					if (
						dev &&
						typeof dev === 'object' &&
						typeof dev.deviation_id === 'string' &&
						dev.deviation_id
					) {
						if (seenDevIds.has(dev.deviation_id as string)) {
							errors.push(`Duplicate deviation_id: "${dev.deviation_id}"`);
						} else {
							seenDevIds.add(dev.deviation_id as string);
						}
					}
				}
			}
		}
	}

	// Policy section (optional)
	if (d.policy !== undefined && d.policy !== null) {
		if (typeof d.policy !== 'object' || Array.isArray(d.policy)) {
			errors.push('policy must be an object');
		} else {
			const policy = d.policy as Record<string, unknown>;
			for (const key of Object.keys(policy)) {
				if (!validatePolicyKey(key)) {
					errors.push(`Invalid policy key: "${key}"`);
				}
			}
		}
	}

	return { valid: errors.length === 0, errors };
}
