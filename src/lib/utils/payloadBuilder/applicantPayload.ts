/**
 * Applicant payload builder — transforms raw applicant form data
 * into a clean ApplicantPayload structure.
 */

import type { ApplicantPayload, RelationshipEntry } from './types.js';
import { toNumber, deriveTitle } from './sanitizers.js';
import {
	extractSelectedOptions,
	hasAnySelected,
	buildSalariedProfile,
	buildGovernmentProfile,
	buildBusinessProfile,
	buildPensionProfile,
	buildLowCreditReasons
} from './activityProfiles.js';
import { extractIncomeEntries, extractFinancials } from './incomePayload.js';
import { cleanObligationEntries } from './obligationPayload.js';

/**
 * Resolves relationship with primary applicant from either:
 * 1. The applicant's own relationship/relationType field
 * 2. The relationships array (matched by index)
 */
export function resolveRelationship(
	index: number,
	rawApplicant: Record<string, unknown>,
	relationships?: RelationshipEntry[]
): string {
	// Try applicant's own field first
	const directRel = String(rawApplicant.relationship ?? rawApplicant.relationType ?? '');
	if (directRel) return directRel;

	// Fallback: look up in relationships array
	if (relationships) {
		const match = relationships.find(
			(r) =>
				(r.fromIndex === index && r.toIndex === 0) || (r.fromIndex === 0 && r.toIndex === index)
		);
		if (match) return match.relationType;
	}

	return '';
}

/**
 * Builds a single applicant's payload from raw store data
 */
export function buildApplicantPayload(
	rawApplicant: Record<string, unknown>,
	index: number,
	relationships?: RelationshipEntry[],
	allApplicants?: Record<string, unknown>[]
): ApplicantPayload {
	const employmentType = String(rawApplicant.employmentType ?? '');
	const applicantType = String(rawApplicant.applicantType ?? 'Individual') as
		| 'Individual'
		| 'Company';

	// Base applicant data
	const payload: ApplicantPayload = {
		applicantType,
		title:
			(rawApplicant.title as string) ||
			deriveTitle(String(rawApplicant.gender ?? ''), String(rawApplicant.maritalStatus ?? '')),
		fullName: String(rawApplicant.fullName ?? ''),
		age: toNumber(rawApplicant.age ?? rawApplicant.age ?? rawApplicant.applicantAge) ?? 0,
		gender: String(rawApplicant.gender ?? ''),
		maritalStatus: String(rawApplicant.maritalStatus ?? ''),
		employmentType,
		creditScore: toNumber(rawApplicant.creditScore) ?? 0,
		hasExistingObligations: rawApplicant.ObligationsRunning === 'Yes'
	};

	// Role & Relationship (for co-applicants)
	if (index > 0) {
		// Director/guarantor role override — loanRole from director form takes precedence
		const loanRole = rawApplicant.loanRole as string | undefined;
		const isGuarantor = rawApplicant.isGuarantor === 'Yes';
		if (loanRole === 'guarantor' || isGuarantor) {
			payload.roleInApplication = 'Guarantor';
		} else if (loanRole === 'co_borrower') {
			payload.roleInApplication = 'Co-Borrower';
		} else {
			payload.roleInApplication = String(
				rawApplicant.existingRoleOfPerson ?? rawApplicant.roleOfPerson ?? 'Co-applicant'
			);
		}
		payload.relationshipWithPrimary = resolveRelationship(index, rawApplicant, relationships);
		if (rawApplicant.otherBloodRelation) {
			payload.otherRelationship = String(rawApplicant.otherBloodRelation);
		}
	} else {
		payload.roleInApplication = 'Primary';
	}

	// 6-way classification (new system — coexists with roleInApplication)
	if (rawApplicant.applicantClassification) {
		payload.applicantClassification = String(rawApplicant.applicantClassification);
	}

	// Residence
	if (rawApplicant.TypeOfResidence) {
		payload.residenceType = String(rawApplicant.TypeOfResidence);
	}
	const yearsAtAddress = toNumber(rawApplicant.yearsAtCurrentAddress);
	if (yearsAtAddress != null) {
		payload.yearsAtCurrentAddress = yearsAtAddress;
	}

	// NRI status
	if (rawApplicant.isNRI === 'Yes' || rawApplicant.isNRI === true) {
		payload.isNRI = true;
		if (rawApplicant.nriCountry) payload.nriCountry = String(rawApplicant.nriCountry);

		// GPA (General Power of Attorney) details for NRI applicants
		const gpaName = rawApplicant.gpaFullName ?? rawApplicant.gpa_fullName;
		if (gpaName) {
			payload.gpaDetails = {
				fullName: String(gpaName),
				age: toNumber(rawApplicant.gpaAge ?? rawApplicant.gpa_age) ?? 0,
				relationship: String(rawApplicant.gpaRelationship ?? rawApplicant.gpa_relationship ?? ''),
				address: (rawApplicant.gpaAddress ?? rawApplicant.gpa_address) as string | undefined
			};
		}
	}

	// ─── Per-Applicant Profile Fields ─────────────────────────────────────
	// These are captured on the Applicant Profile page and needed for
	// lender matching, rate concessions, and policy evaluation.

	// Education & demographics (affects rate concessions for women, SC/ST)
	if (rawApplicant.education) payload.education = String(rawApplicant.education);
	if (rawApplicant.religion) payload.religion = String(rawApplicant.religion);
	if (rawApplicant.casteCategory) payload.casteCategory = String(rawApplicant.casteCategory);
	if (rawApplicant.hasDisability) payload.hasDisability = String(rawApplicant.hasDisability);

	// Property ownership (affects LTV and eligibility for some lenders)
	if (rawApplicant.ownedResidentialProperties) {
		payload.ownedResidentialProperties = String(rawApplicant.ownedResidentialProperties);
	}
	if (rawApplicant.applicantResidencePattern) {
		payload.applicantResidencePattern = String(rawApplicant.applicantResidencePattern);
	}

	// Per-applicant residence location (V2 — separate from loan-level property location)
	if (rawApplicant.applicantResidenceState) {
		payload.applicantResidenceState = String(rawApplicant.applicantResidenceState);
	}
	if (rawApplicant.applicantResidenceCity) {
		payload.applicantResidenceCity = String(rawApplicant.applicantResidenceCity);
	}
	if (rawApplicant.applicantResidencePincode) {
		payload.applicantResidencePincode = String(rawApplicant.applicantResidencePincode);
	}

	// Credit history details (graduated questions from credit score tab)
	if (rawApplicant.creditHistoryStatus) {
		payload.creditHistoryStatus = String(rawApplicant.creditHistoryStatus);
	}
	if (rawApplicant.defaultSettlementStatus) {
		payload.defaultSettlementStatus = String(rawApplicant.defaultSettlementStatus);
	}
	if (rawApplicant.emiBounceCount) {
		payload.emiBounceCount = String(rawApplicant.emiBounceCount);
	}
	if (rawApplicant.recentEnquiryCount) {
		payload.recentEnquiryCount = String(rawApplicant.recentEnquiryCount);
	}
	if (rawApplicant.bounceReason) {
		payload.bounceReason = String(rawApplicant.bounceReason);
	}
	if (rawApplicant.defaultReason) {
		payload.defaultReason = String(rawApplicant.defaultReason);
	}
	if (rawApplicant.enquiryReason) {
		payload.enquiryReason = String(rawApplicant.enquiryReason);
	}

	// Professional loan fields
	if (rawApplicant.professionalCategory) {
		payload.professionalCategory = String(rawApplicant.professionalCategory);
	}
	if (rawApplicant.practiceType) {
		payload.practiceType = String(rawApplicant.practiceType);
	}
	if (rawApplicant.registrationStatus) {
		payload.registrationStatus = String(rawApplicant.registrationStatus);
	}

	// Director/company linkage (for multi-applicant cases)
	if (rawApplicant.linkedCompanyId) {
		payload.linkedCompanyId = String(rawApplicant.linkedCompanyId);
	}
	if (rawApplicant.ownershipPercent) {
		payload.ownershipPercent = toNumber(rawApplicant.ownershipPercent) ?? undefined;
	}
	if (rawApplicant.directorRole) {
		payload.directorRole = String(rawApplicant.directorRole);
	}

	// On EMI / On Property flags (multi-applicant role definition)
	if (rawApplicant.onEMI !== undefined) {
		payload.onEMI = rawApplicant.onEMI === true || rawApplicant.onEMI === 'Yes';
	}
	if (rawApplicant.onProperty !== undefined) {
		payload.onProperty = rawApplicant.onProperty === true || rawApplicant.onProperty === 'Yes';
	}

	// ─── Employment-specific profiles ─────────────────────────────────────

	// Salaried (Private)
	if (employmentType === 'Salaried(Private)') {
		const activitySelections = extractSelectedOptions(
			rawApplicant.salariedActivityDetailsVisible as Record<string, unknown>
		);
		if (hasAnySelected(activitySelections)) {
			payload.salariedProfile = buildSalariedProfile(activitySelections);
		}
		payload.grossIncome = toNumber(rawApplicant.grossIncome) ?? undefined;
		payload.netIncome = toNumber(rawApplicant.netIncome) ?? undefined;
		payload.monthlyOtherIncome = toNumber(rawApplicant.monthlyOtherIncome) ?? undefined;
	}

	// Salaried (Government)
	if (employmentType === 'Salaried(Government)') {
		const activitySelections = extractSelectedOptions(
			rawApplicant.salariedActivityDetailsVisible as Record<string, unknown>
		);
		if (hasAnySelected(activitySelections)) {
			payload.governmentProfile = buildGovernmentProfile(activitySelections);
		}
		payload.grossIncome = toNumber(rawApplicant.grossIncome) ?? undefined;
		payload.netIncome = toNumber(rawApplicant.netIncome) ?? undefined;
		payload.monthlyOtherIncome = toNumber(rawApplicant.monthlyOtherIncome) ?? undefined;
	}

	// Self-employed (Professional)
	if (employmentType === 'Self-employed(Professional)') {
		payload.professionType = rawApplicant.professionType as string | undefined;
		if (rawApplicant.isLawyerBarCouncil) {
			payload.hasBarCouncilChamber = rawApplicant.isLawyerBarCouncil === 'Yes';
		}

		const activitySelections = extractSelectedOptions(
			rawApplicant.businessActivityDetailsVisible as Record<string, unknown>
		);
		if (hasAnySelected(activitySelections)) {
			payload.businessProfile = buildBusinessProfile(activitySelections);
		}

		if (rawApplicant.GSTRegistrationYear) {
			payload.gstRegistrationDate = String(rawApplicant.GSTRegistrationYear);
		}

		payload.financials = extractFinancials(
			rawApplicant.financialsTableVisible as Record<string, unknown>
		);
		payload.averageBankBalance = toNumber(rawApplicant.averageBankBalance) ?? undefined;
		payload.averageCashAmount = toNumber(rawApplicant.cashAmount) ?? undefined;
	}

	// Self-employed (Other)
	if (employmentType === 'Self-employed(Other)') {
		payload.businessType = rawApplicant.businessType as string | undefined;

		const activitySelections = extractSelectedOptions(
			rawApplicant.businessActivityDetailsVisible as Record<string, unknown>
		);
		if (hasAnySelected(activitySelections)) {
			payload.businessProfile = buildBusinessProfile(activitySelections);
		}

		if (rawApplicant.GSTRegistrationYear) {
			payload.gstRegistrationDate = String(rawApplicant.GSTRegistrationYear);
		}

		payload.financials = extractFinancials(
			rawApplicant.financialsTableVisible as Record<string, unknown>
		);
		payload.averageBankBalance = toNumber(rawApplicant.averageBankBalance) ?? undefined;
		payload.averageCashAmount = toNumber(rawApplicant.cashAmount) ?? undefined;
	}

	// Pensioner
	if (employmentType === 'Pensioner') {
		const activitySelections = extractSelectedOptions(
			(rawApplicant.pensionActivityDetailsVisible as Record<string, unknown>) ??
				(rawApplicant.salariedActivityDetailsVisible as Record<string, unknown>)
		);
		if (hasAnySelected(activitySelections)) {
			payload.pensionProfile = buildPensionProfile(activitySelections);
		}
		payload.netIncome = toNumber(rawApplicant.netIncome) ?? undefined;
		payload.monthlyOtherIncome = toNumber(rawApplicant.monthlyOtherIncome) ?? undefined;
	}

	// Credit score reasons
	const creditReasons = extractSelectedOptions(
		rawApplicant.whyPrimaryLowCreditVisible as Record<string, unknown>
	);
	if (hasAnySelected(creditReasons)) {
		payload.lowCreditReasons = buildLowCreditReasons(creditReasons);
	}

	// ─── Income Entries (structured array from income profiling system) ───
	const cleanEntries = extractIncomeEntries(rawApplicant);
	if (cleanEntries.length > 0) {
		payload.incomeEntries = cleanEntries;
		// Backfill legacy flat fields if they're still undefined
		if (payload.grossIncome === undefined) {
			const sal = cleanEntries.find((e) =>
				['salaried_regular', 'salaried_contractual'].includes(e.profileType)
			);
			if (sal) {
				payload.grossIncome = toNumber(sal.income.grossMonthlySalary) ?? undefined;
				payload.netIncome = toNumber(sal.income.netMonthlySalary) ?? undefined;
			}
		}
	}

	// Non-earning applicant flag + reason
	const selectedProfiles = rawApplicant.selectedIncomeProfiles as string[] | undefined;
	if (selectedProfiles?.includes('no_current_income')) {
		payload.isNonEarning = true;
		payload.noIncomeReason = (rawApplicant.noIncomeReason as string) ?? '';
	}

	// ─── Unsecured Business/Professional Profile (E2E fill) ─────────────
	// These are loan-level questions for business/professional loans that
	// describe the applicant's business entity details.
	if (rawApplicant.businessEntityType) {
		payload.businessEntityType = String(rawApplicant.businessEntityType);
	}
	if (rawApplicant.businessIndustrySector) {
		payload.businessIndustrySector = String(rawApplicant.businessIndustrySector);
	}
	if (rawApplicant.businessVintage) {
		payload.businessVintage = String(rawApplicant.businessVintage);
	}
	if (rawApplicant.gstRegistrationStatus) {
		payload.gstRegistrationStatus = String(rawApplicant.gstRegistrationStatus);
	}
	if (rawApplicant.annualTurnoverRange) {
		payload.annualTurnoverRange = String(rawApplicant.annualTurnoverRange);
	}
	if (rawApplicant.numberOfEmployees) {
		payload.numberOfEmployees = String(rawApplicant.numberOfEmployees);
	}
	if (rawApplicant.banksOfCurrentAccount) {
		const banks = rawApplicant.banksOfCurrentAccount;
		if (Array.isArray(banks)) {
			payload.banksOfCurrentAccount = banks.filter((b): b is string => typeof b === 'string');
		}
	}

	// Obligations — unified array, no computed totals (rule engine's job)
	// Include obligations when:
	// 1. User said "Yes" to running obligations (standard mode), OR
	// 2. User said "No" to running obligations but "Yes" to being guarantor on other loans
	//    (guarantor-only mode — cleanObligationEntries filters to guarantor role only)
	const hasGuarantorObligations =
		rawApplicant.ObligationsRunning === 'No' && rawApplicant.isGuarantorOnOtherLoan === 'Yes';
	if (payload.hasExistingObligations || hasGuarantorObligations) {
		payload.obligations = cleanObligationEntries(rawApplicant);
	}

	// Company specific
	if (applicantType === 'Company') {
		payload.companyName = rawApplicant.companyName as string | undefined;
		payload.companyType = rawApplicant.companyType as string | undefined;
		payload.companyAge = toNumber(rawApplicant.companyAge) ?? undefined;
		payload.companyOfficeProximity = rawApplicant.companyOfficeProximity as string | undefined;
		payload.companyOwnedProperties = rawApplicant.companyOwnedProperties as string | undefined;
		if (rawApplicant.companyOfficeState) {
			payload.companyOfficeState = String(rawApplicant.companyOfficeState);
		}
		if (rawApplicant.companyOfficeCity) {
			payload.companyOfficeCity = String(rawApplicant.companyOfficeCity);
		}
		if (rawApplicant.companyOfficePincode) {
			payload.companyOfficePincode = String(rawApplicant.companyOfficePincode);
		}

		if (Array.isArray(rawApplicant.directors)) {
			const companyId = rawApplicant.id as string | undefined;
			payload.directors = rawApplicant.directors
				.map((d: unknown) => {
					const dir = d as Record<string, unknown>;
					const dirName = String(dir.name ?? dir.directorName ?? '');
					const shareRaw = dir.sharePercent;
					const shareNotSure = dir.shareNotSure === true;

					// Look up linked Individual's creditScore — the DirectorInfo on the
					// Company doesn't store CIBIL, but the linked Individual applicant does.
					let cibil = toNumber(dir.cibil) ?? undefined;
					if (cibil === undefined && allApplicants && companyId) {
						const linked = allApplicants.find(
							(a) =>
								a.applicantType === 'Individual' &&
								a.linkedCompanyId === companyId &&
								((a.fullName as string) ?? '').toLowerCase().trim() === dirName.toLowerCase().trim()
						);
						if (linked) {
							cibil = toNumber(linked.creditScore) ?? undefined;
						}
					}

					return {
						name: dirName,
						age: toNumber(dir.age ?? dir.directorAge) ?? 0,
						designation: dir.designation as string | undefined,
						din: (dir.din as string) || undefined,
						sharePercent: shareNotSure ? null : (toNumber(shareRaw) ?? undefined),
						location: (dir.location as string) || undefined,
						isCoApplicant: dir.isCoApplicant === true,
						cibil
					};
				})
				.filter((d) => d.name);
		}

		// Company business profile
		const businessSelections = extractSelectedOptions(
			rawApplicant.businessActivityDetailsVisible as Record<string, unknown>
		);
		if (hasAnySelected(businessSelections)) {
			payload.businessProfile = buildBusinessProfile(businessSelections);
		}

		payload.financials = extractFinancials(
			rawApplicant.financialsTableVisible as Record<string, unknown>
		);
	}

	return payload;
}
