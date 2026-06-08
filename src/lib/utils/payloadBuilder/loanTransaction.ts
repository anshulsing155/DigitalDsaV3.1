/**
 * Loan transaction and complete payload builders.
 */

import type {
	LoanTransactionPayload,
	LoanApplicationPayload,
	RelationshipEntry,
	StructuredPayload
} from './types.js';
import { toNumber, toBoolean } from './sanitizers.js';
import { buildApplicantPayload } from './applicantPayload.js';
import { groupAnswersBySchema } from '$lib/utils/payloadGrouping';

/**
 * Builds the loan transaction payload from raw form data.
 *
 * `opts.now` lets callers inject the "current time" used by time-derived
 * fields (`loanVintageMonths` = months between disbursement date and `now`).
 * Production omits it (defaults to real `new Date()`); tests pass a frozen
 * date so snapshots stay deterministic. Locked by
 * `payloadBuilderTimeInjection.test.ts` per CLAUDE.md §16.16. Added
 * 2026-06-01 (S210, TECH-DEBT-CLEANUP D-incoming-4 Level-3 fix).
 */
export function buildLoanTransactionPayload(
	loanAnswers: Record<string, unknown>,
	applicationData: Record<string, unknown>,
	opts?: { now?: Date }
): LoanTransactionPayload {
	const loanName = String(applicationData.loanName ?? loanAnswers.loanName ?? '');
	const loanType = String(loanAnswers.loanType ?? 'New Loan');
	const loanVariant = String(loanAnswers.loanVariant ?? '');

	const UNSECURED_LOANS = ['Personal Loan', 'Business Loan', 'Professional Loan'];
	const isUnsecuredLoan = UNSECURED_LOANS.includes(loanName);

	// Facility type (Term Loan / OD / DOD / Flexi DOD / CC) — set by LAP and the
	// three unsecured loans on the shared first page.
	const facilityType =
		isUnsecuredLoan || loanName === 'Loan Against Property'
			? String(loanAnswers.facilityType ?? applicationData.facilityType ?? '')
			: undefined;

	const payload: LoanTransactionPayload = {
		loanName,
		loanType,
		...(loanVariant ? { loanVariant } : {}),
		...(facilityType ? { facilityType } : {}),
		numberOfApplicants: toNumber(loanAnswers.numberOfDirectorOrApplicant) ?? 1,
		...(!isUnsecuredLoan
			? {
					// Plot Loan + LAP always have an identified property (it's the
					// loan target / collateral). Neither form asks the question, so
					// without forcing here the payload would coerce undefined → false
					// and downstream consumers reading `propertyIdentified` as a "is
					// there a real property?" signal would silently miss Plot/LAP
					// deals. Home Loan still reads its explicit Yes/No answer (which
					// drives the sanction-letter view at `propertyNotIdentified` below).
					propertyIdentified:
						loanName === 'Plot Loan' || loanName === 'Loan Against Property'
							? true
							: toBoolean(loanAnswers.propertyIdentified),
					propertyComplianceStatus:
						(loanAnswers.propertyComplianceStatus as LoanTransactionPayload['propertyComplianceStatus']) ??
						undefined,
					propertyRegistered:
						loanName === 'Loan Against Property'
							? true
							: toBoolean(loanAnswers.ifPropertyRegistered)
				}
			: {}),
		// BT/Top-up loanAmount sizing — see Audit BUG-A (2026-05-28). Without
		// the scope-aware branch below, BT-Only / Top-up Only / BT+Top-up all
		// fall through to the `propertyCost - downPayment` fallback or to
		// `sanctionAmount` (original sanction), evaluating the customer for
		// the wrong amount (e.g. ₹60L property value instead of ₹30L
		// takeover principal) → false RED rejections across all lenders.
		//
		// Post-rename: scope lives in `loanType` for every loan (Plot included),
		// so a single check covers Home/LAP/Plot/unsecured BT paths.
		loanAmount: ((): number => {
			if (loanType === 'Balance Transfer Only') {
				return toNumber(loanAnswers.principalOutstanding) ?? 0;
			}
			if (loanType === 'Top-up Only') {
				return toNumber(loanAnswers.topUpAmount) ?? 0;
			}
			if (loanType === 'Balance Transfer With Top-up') {
				const outstanding = toNumber(loanAnswers.principalOutstanding) ?? 0;
				const topup = toNumber(loanAnswers.topUpAmount) ?? 0;
				return outstanding + topup;
			}
			return (
				toNumber(
					loanAnswers.RequiredLoanAmount ?? loanAnswers.loanAmount ?? loanAnswers.sanctionAmount
				) ?? 0
			);
		})(),
		tenureYears: toNumber(loanAnswers.mortgageYear ?? loanAnswers.tenure) ?? 0
	};

	// Sanction-letter view = Home Loan where the user EXPLICITLY answered "No" to
	// property identified. We key off the raw answer, NOT payload.propertyIdentified:
	// toBoolean(undefined) coerces to false, so LAP/Plot (which never ask this question)
	// would otherwise be mistaken for "not identified" and lose their property cost.
	const propertyNotIdentified = loanAnswers.propertyIdentified === 'No';

	// Derive loanAmount from property cost for secured loans where no explicit amount exists.
	// Skip in the sanction-letter view: the property cost is preserved in the form but must
	// NOT drive a requested amount — the offer is income-based eligibility, not a property
	// deal. Otherwise a stale cost from a prior "identified = Yes" run leaks back in and
	// produces a wrong Amount/EMI.
	//
	// Plot Construction sizing (Audit, 2026-05-28): the default fallback
	// (`cost - dp`) under-sizes Plot & Construction (ignores construction
	// cost) and oversizes Construction Only (uses plot value the borrower
	// already owns, instead of construction cost). Branch by loanType so
	// each Plot variant gets the correct request amount derived from the
	// answers the user actually gave.
	if (payload.loanAmount === 0 && !isUnsecuredLoan && !propertyNotIdentified) {
		// Plot variant drives the property-cost vs construction-cost split.
		// Other secured loans fall back to the standard cost-minus-down-payment.
		const cost =
			toNumber(loanAnswers.propertyCost ?? loanAnswers.propCost ?? loanAnswers.dealValue) ?? 0;
		const constructionCost = toNumber(loanAnswers.requiredExtraAmount) ?? 0;
		const dp =
			toNumber(loanAnswers.downPayment ?? loanAnswers.downpaymentByOwn ?? loanAnswers.deposit) ?? 0;

		if (loanVariant === 'Construction Loan Only') {
			// Plot already owned — funded amount is construction cost minus borrower's contribution.
			if (constructionCost > 0) {
				payload.loanAmount = Math.max(0, constructionCost - dp);
			}
		} else if (loanVariant === 'Plot & Construction Loan') {
			// Buy plot + build house — total project value funded, minus down payment.
			const total = cost + constructionCost;
			if (total > 0) {
				payload.loanAmount = Math.max(0, total - dp);
			}
		} else if (cost > 0) {
			payload.loanAmount = Math.max(0, cost - dp);
		}
	}

	// Application structure
	if (applicationData.tellUsWhoIsApplying) {
		payload.applicationStructure = String(applicationData.tellUsWhoIsApplying);
	}

	// Property details (only for secured loans)
	if (!isUnsecuredLoan) {
		if (loanAnswers.propertyStateName) {
			payload.propertyState = String(loanAnswers.propertyStateName);
		}
		if (loanAnswers.propertyCityName) {
			payload.propertyCity = String(loanAnswers.propertyCityName);
		}
		if (loanAnswers.propertyPincode || loanAnswers.pincode) {
			payload.propertyPincode = String(loanAnswers.propertyPincode ?? loanAnswers.pincode);
		}
		if (loanAnswers.propertyAge) {
			payload.propertyAge = String(loanAnswers.propertyAge);
		}
		if (loanAnswers.propertyType) {
			payload.propertyType = String(loanAnswers.propertyType);
		}
		if (loanAnswers.purchaseType || loanAnswers.plotSource) {
			payload.purchaseType = String(loanAnswers.purchaseType || loanAnswers.plotSource);
		}
		if (loanAnswers.constructionType) {
			payload.constructionStatus = String(loanAnswers.constructionType);
		}
		if (loanAnswers.PropertyStage) {
			payload.propertyStage = String(loanAnswers.PropertyStage);
		}

		// Property valuation figures only belong in the payload when a property is
		// actually identified. In the sanction-letter view they are preserved in the
		// form for later but kept OUT of the calc so a stale cost can't drive LTV caps
		// or the offered amount. (Keyed off the explicit "No" — see propertyNotIdentified.)
		if (!propertyNotIdentified) {
			// Property cost — for LTV computation, the security value is:
			//   • Plot & Construction Loan: plot value + construction estimate (full project value)
			//   • Construction Loan Only:  construction estimate only (plot already owned, not security for this loan)
			//   • everything else:          the raw propertyCost / propCost / dealValue answer
			// (Audit, 2026-05-28: LTV caps were being computed on plot value alone for
			// Plot & Construction, understating the LTV base by the construction amount.)
			const rawPropertyCost =
				toNumber(loanAnswers.propertyCost ?? loanAnswers.propCost ?? loanAnswers.dealValue) ?? 0;
			const rawConstructionCost = toNumber(loanAnswers.requiredExtraAmount) ?? 0;

			let computedPropertyCost = rawPropertyCost;
			if (loanVariant === 'Plot & Construction Loan') {
				computedPropertyCost = rawPropertyCost + rawConstructionCost;
			} else if (loanVariant === 'Construction Loan Only') {
				computedPropertyCost = rawConstructionCost;
			}

			if (computedPropertyCost > 0) {
				payload.propertyCost = computedPropertyCost;
			}

			const atsValue = toNumber(loanAnswers.propertyValueAsPerATS);
			if (atsValue) {
				payload.atsValue = atsValue;
			}

			// Market value (V2 three-cost model)
			const marketValue = toNumber(loanAnswers.marketValue);
			if (marketValue) {
				payload.marketValue = marketValue;
			}

			// Registry value (V2 three-cost model)
			const registryValue = toNumber(loanAnswers.registryValue);
			if (registryValue) {
				payload.registryValue = registryValue;
			}

			// Plot & Equity Loan canonical-field aliasing (ADR-0025).
			// The Plot Loan form collects market value under `propCost` (per the
			// question wording at plotLoan/questionBank/loanRequirement.ts:176 —
			// "assessed market value of the property or the agreed-upon deal value
			// with the seller") and registry value under `agreementSellValue`.
			// We mirror them into the canonical V2 keys here so the engine
			// (Phase 2) and parser (Phase 1c keyRegistry / termDictionary) can
			// read unambiguous names without an app-wide rename.
			//
			// Sunset trigger (CLAUDE.md §16 Rule #15): delete this block when EITHER
			// (a) Plot Loan form gains its own marketValue / registryValue questions,
			// OR (b) the app-wide propCost → marketValue / agreementSellValue →
			// registryValue rename ships. See ADR-0025.
			if (loanVariant === 'Plot & Equity Loan') {
				if (payload.marketValue === undefined) {
					const fromPropCost = toNumber(loanAnswers.propCost);
					if (fromPropCost) {
						payload.marketValue = fromPropCost;
					}
				}
				if (payload.registryValue === undefined) {
					const fromAgreement = toNumber(loanAnswers.agreementSellValue);
					if (fromAgreement) {
						payload.registryValue = fromAgreement;
					}
				}
				// Derived: off-paper cash demand from seller. Only compute when
				// both values landed and market > registry (the normal case for
				// Plot & Equity — the whole reason the variant exists).
				if (
					payload.marketValue !== undefined &&
					payload.registryValue !== undefined &&
					payload.marketValue > payload.registryValue
				) {
					payload.sellerCashComponent = payload.marketValue - payload.registryValue;
				}
			}
		}

		const downPayment = toNumber(
			loanAnswers.downPayment ?? loanAnswers.downpaymentByOwn ?? loanAnswers.deposit
		);
		if (downPayment) {
			payload.downPayment = downPayment;
		}

		// Pre-sanction profile (property not yet identified): drives how many
		// affordability scenario cards the DSA chose to see on the results screen.
		if (loanAnswers.sanctionType) {
			payload.sanctionType = String(loanAnswers.sanctionType);
		}
		if (loanAnswers.withPersonalLoan) {
			payload.withPersonalLoan = String(loanAnswers.withPersonalLoan);
		}

		// Advance paid in agreement (V2 — deducted from LCR disbursement)
		const advanceInAgreement = toNumber(loanAnswers.advanceInAgreement);
		if (advanceInAgreement) {
			payload.advanceInAgreement = advanceInAgreement;
		}

		// LAP-specific property valuation details
		const rawArea = toNumber(loanAnswers.carpetArea);
		const areaUnit = String(loanAnswers.carpetAreaUnit || 'Feet');
		if (rawArea) {
			let areaInSqFt = rawArea;
			if (areaUnit === 'Meter') areaInSqFt = Math.round(rawArea * 10.7639);
			else if (areaUnit === 'Yard') areaInSqFt = Math.round(rawArea * 9);
			payload.carpetArea = areaInSqFt;
			payload.carpetAreaUnit = areaUnit;
			payload.carpetAreaRaw = rawArea;
		}
		if (loanAnswers.propertyAreaType) {
			payload.propertyAreaType = String(loanAnswers.propertyAreaType);
		}
		if (loanAnswers.societyStatus) {
			payload.societyStatus = String(loanAnswers.societyStatus);
		}
		if (loanAnswers.pendingSocietyDues) {
			payload.pendingSocietyDues = String(loanAnswers.pendingSocietyDues);
		}
		if (loanAnswers.approachRoadWidth) {
			payload.approachRoadWidth = String(loanAnswers.approachRoadWidth);
		}
		if (loanAnswers.restrictedZone) {
			payload.restrictedZone = String(loanAnswers.restrictedZone);
		}
		if (loanAnswers.floodDisasterZone) {
			payload.floodDisasterZone = String(loanAnswers.floodDisasterZone);
		}
		if (loanAnswers.leaseRemainingPeriod) {
			payload.leaseRemainingPeriod = String(loanAnswers.leaseRemainingPeriod);
		}
		if (loanAnswers.existingEncumbrance) {
			payload.existingEncumbrance = String(loanAnswers.existingEncumbrance);
		}
		if (loanAnswers.ocCcAvailable) {
			payload.ocCcAvailable = String(loanAnswers.ocCcAvailable);
		}
		if (loanAnswers.municipalApproval) {
			payload.municipalApproval = String(loanAnswers.municipalApproval);
		}
		const rentalIncome = toNumber(loanAnswers.rentalIncome);
		if (rentalIncome) {
			payload.rentalIncome = rentalIncome;
		}
		if (loanAnswers.loanPurpose) {
			payload.loanPurpose = String(loanAnswers.loanPurpose);
		}

		// LAP-specific
		if (loanAnswers.categoryOfProperty) {
			payload.categoryOfProperty = String(loanAnswers.categoryOfProperty);
		}
		const builtArea = toNumber(loanAnswers.builtArea);
		if (builtArea) {
			payload.builtArea = builtArea;
		}

		// Plot-specific
		if (loanAnswers.plotAge) {
			payload.plotAge = String(loanAnswers.plotAge);
		}
		const rawPlotArea = toNumber(loanAnswers.PlotArea);
		const plotAreaUnit = String(loanAnswers.plotAreaUnit || 'Feet');
		if (rawPlotArea) {
			let plotAreaInSqFt = rawPlotArea;
			if (plotAreaUnit === 'Meter') plotAreaInSqFt = Math.round(rawPlotArea * 10.7639);
			else if (plotAreaUnit === 'Yard') plotAreaInSqFt = Math.round(rawPlotArea * 9);
			payload.plotArea = plotAreaInSqFt;
			payload.plotAreaUnit = plotAreaUnit;
			payload.plotAreaRaw = rawPlotArea;
		}
		if (loanAnswers.plotBoundaryStatus) {
			payload.plotBoundaryStatus = String(loanAnswers.plotBoundaryStatus);
		}
		if (loanAnswers.landUseClassification) {
			payload.landUseClassification = String(loanAnswers.landUseClassification);
		}
		if (loanAnswers.developmentAuthority) {
			payload.developmentAuthority = String(loanAnswers.developmentAuthority);
		}

		// ── Area-Specific Property Compliance & Legal ──
		if (loanAnswers.reraRegistrationStatus) {
			payload.reraRegistrationStatus = String(loanAnswers.reraRegistrationStatus);
		}
		if (loanAnswers.naConversionStatus) {
			payload.naConversionStatus = String(loanAnswers.naConversionStatus);
		}
		if (loanAnswers.zoneClassification) {
			payload.zoneClassification = String(loanAnswers.zoneClassification);
		}
		if (loanAnswers.municipalTaxStatus) {
			payload.municipalTaxStatus = String(loanAnswers.municipalTaxStatus);
		}
		if (loanAnswers.unauthorizedAdditions) {
			payload.unauthorizedAdditions = String(loanAnswers.unauthorizedAdditions);
		}
		if (loanAnswers.revenueRecordStatus) {
			payload.revenueRecordStatus = String(loanAnswers.revenueRecordStatus);
		}
		if (loanAnswers.colonyRegularizationStatus) {
			payload.colonyRegularizationStatus = String(loanAnswers.colonyRegularizationStatus);
		}
		if (loanAnswers.gramPanchayatPermission) {
			payload.gramPanchayatPermission = String(loanAnswers.gramPanchayatPermission);
		}
		if (loanAnswers.titleChainStatus) {
			payload.titleChainStatus = String(loanAnswers.titleChainStatus);
		}
		if (loanAnswers.encumbranceCertStatus) {
			payload.encumbranceCertStatus = String(loanAnswers.encumbranceCertStatus);
		}
		if (loanAnswers.successionStatus) {
			payload.successionStatus = String(loanAnswers.successionStatus);
		}
		if (loanAnswers.revenueRecordMutation) {
			payload.revenueRecordMutation = String(loanAnswers.revenueRecordMutation);
		}

		// ── Seller & Transaction Details ──
		if (loanAnswers.sellerOwnershipType) {
			payload.sellerOwnershipType = String(loanAnswers.sellerOwnershipType);
		}
		if (loanAnswers.poaRegistrationStatus) {
			payload.poaRegistrationStatus = String(loanAnswers.poaRegistrationStatus);
		}
		if (loanAnswers.propertyAcquisitionMethod) {
			payload.propertyAcquisitionMethod = String(loanAnswers.propertyAcquisitionMethod);
		}
		if (loanAnswers.agreementPoaRegistryWilling) {
			payload.agreementPoaRegistryWilling = String(loanAnswers.agreementPoaRegistryWilling);
		}
		if (loanAnswers.agreementPoaNbfcKnown) {
			payload.agreementPoaNbfcKnown = String(loanAnswers.agreementPoaNbfcKnown);
		}
		if (loanAnswers.agreementPoaNbfcName) {
			payload.agreementPoaNbfcName = String(loanAnswers.agreementPoaNbfcName);
		}
		if (loanAnswers.lastRegistryDuration) {
			payload.lastRegistryDuration = String(loanAnswers.lastRegistryDuration);
		}
		if (loanAnswers.isAnyBuilderDemand) {
			payload.isAnyBuilderDemand = String(loanAnswers.isAnyBuilderDemand);
		}

		// ── Authority Purchase Fields ──
		if (loanAnswers.authorityName) {
			payload.authorityName = String(loanAnswers.authorityName);
		}
		if (loanAnswers.allotmentLetterStatus) {
			payload.allotmentLetterStatus = String(loanAnswers.allotmentLetterStatus);
		}
		if (loanAnswers.allotmentDate) {
			payload.allotmentDate = String(loanAnswers.allotmentDate);
		}
		if (loanAnswers.authorityPaymentStatus) {
			payload.authorityPaymentStatus = String(loanAnswers.authorityPaymentStatus);
		}
		if (loanAnswers.possessionCertificateStatus) {
			payload.possessionCertificateStatus = String(loanAnswers.possessionCertificateStatus);
		}
		if (loanAnswers.authorityDuesStatus) {
			payload.authorityDuesStatus = String(loanAnswers.authorityDuesStatus);
		}

		// ── Property Usage Intent ──
		if (loanAnswers.propertyUsageIntent) {
			payload.propertyUsageIntent = String(loanAnswers.propertyUsageIntent);
		}
	}

	// Residence (Home/Plot use residenceOptionSame, LAP uses applicantResidingInProperty)
	if (!isUnsecuredLoan && loanAnswers.residenceOptionSame) {
		payload.residenceSameAsProperty = loanAnswers.residenceOptionSame === 'Yes';
	}
	if (!isUnsecuredLoan && loanAnswers.applicantResidingInProperty) {
		payload.applicantResidingInProperty = loanAnswers.applicantResidingInProperty === 'Yes';
	}
	if (loanAnswers.propertyOccupancyStatus) {
		payload.propertyOccupancyStatus = String(loanAnswers.propertyOccupancyStatus);
	}
	if (loanAnswers.residenceStateName) {
		payload.residenceState = String(loanAnswers.residenceStateName);
	}
	if (loanAnswers.residenceCityName) {
		payload.residenceCity = String(loanAnswers.residenceCityName);
	}

	// Business/Professional loan geography (practice/business location)
	if (loanAnswers.businessStateName) {
		payload.businessState = String(loanAnswers.businessStateName);
	}
	if (loanAnswers.businessCityName) {
		payload.businessCity = String(loanAnswers.businessCityName);
	}

	// Existing loan details (BT, BT+TopUp, TopUp Only — all share the btExistingLoan page)
	const hasExistingLoan =
		loanType.includes('Balance Transfer') ||
		loanType.includes('Top-up') ||
		loanType.includes('Topup');
	if (hasExistingLoan) {
		// Core existing loan fields
		payload.currentBank = loanAnswers.selectSingleBank as string | undefined;
		payload.principalOutstanding = toNumber(loanAnswers.principalOutstanding) ?? undefined;
		payload.currentInterestRate = toNumber(loanAnswers.existingInterestRate) ?? undefined;
		payload.remainingTenure =
			toNumber(loanAnswers.remainingTenure ?? loanAnswers.orignalRemaningTenure) ?? undefined;
		payload.currentEMI = toNumber(loanAnswers.includedCurrentEMIsAmount) ?? undefined;
		payload.sixMonthsAfterRegistry = toBoolean(loanAnswers.sixMonthsPassedAfterRegistry);
		payload.currentPropertyValue = toNumber(loanAnswers.currentPropertyValue) ?? undefined;
		payload.newTenure = toNumber(loanAnswers.newTenure) ?? undefined;

		// V2: Additional existing loan signals
		if (loanAnswers.interestRateType) {
			payload.interestRateType = String(loanAnswers.interestRateType);
		}
		if (loanAnswers.emiBounceHistory) {
			payload.emiBounceHistory = String(loanAnswers.emiBounceHistory);
		}
		const sanctionAmt = toNumber(loanAnswers.sanctionAmount);
		if (sanctionAmt) {
			payload.sanctionAmount = sanctionAmt;
		}

		// V2: Derive loan vintage months from disbursement date
		if (loanAnswers.loanDisbursementDate) {
			const parts = String(loanAnswers.loanDisbursementDate).split('-').map(Number);
			if (parts.length >= 2 && parts[0] > 2000) {
				// Time injection per S210: caller supplies `now` to make this
				// deterministic for snapshots. Production defaults to real time.
				const now = opts?.now ?? new Date();
				const months = (now.getFullYear() - parts[0]) * 12 + (now.getMonth() + 1 - parts[1]);
				if (months >= 0) {
					payload.loanVintageMonths = months;
				}
			}
		}

		// Track record
		if (loanAnswers.loanVintage) {
			payload.loanVintage = String(loanAnswers.loanVintage);
		}
		if (loanAnswers.repaymentTrack) {
			payload.repaymentTrack = String(loanAnswers.repaymentTrack);
		}
	}

	// Top-up specific
	if (loanType.includes('Top-up') || loanType.includes('Topup')) {
		payload.topUpAmount =
			toNumber(loanAnswers.requiredTopupAmount ?? loanAnswers.topUpAmount) ?? undefined;
		payload.topUpTenure = toNumber(loanAnswers.topupTerm ?? loanAnswers.topUpTenure) ?? undefined;
		if (loanAnswers.topUpPurpose) {
			payload.topUpPurpose = String(loanAnswers.topUpPurpose);
		}
	}

	// DOD-specific
	const dodWithdrawal = toNumber(loanAnswers.dodMonthlyWithdrawal);
	if (dodWithdrawal) {
		payload.dodMonthlyWithdrawal = dodWithdrawal;
	}

	// NRI
	if (applicationData.ApplicantIsNRI === 'Yes' || applicationData.hasNRIApplicant) {
		payload.hasNRIApplicant = true;
	}

	// Bank preferences
	if (loanAnswers.approvedBankForSelectedByUser) {
		const banks = loanAnswers.approvedBankForSelectedByUser;
		if (Array.isArray(banks)) {
			payload.preferredBanks = banks.filter((b): b is string => typeof b === 'string');
		} else if (typeof banks === 'string') {
			payload.preferredBanks = [banks];
		}
	}
	if (loanAnswers.excludedBanks) {
		const excluded = loanAnswers.excludedBanks;
		if (Array.isArray(excluded)) {
			payload.excludedBanks = excluded.filter((b): b is string => typeof b === 'string');
		}
	}

	// ── Case Intake (shared page 0 — all 6 loan types) ──
	if (loanAnswers.assessmentStatus) {
		payload.assessmentStatus = String(loanAnswers.assessmentStatus);
	}
	if (loanAnswers.assessmentLenders) {
		const lenders = loanAnswers.assessmentLenders;
		if (Array.isArray(lenders)) {
			payload.assessmentLenders = lenders.filter((l): l is string => typeof l === 'string');
		}
	}
	if (loanAnswers.rejectionReasons) {
		const reasons = loanAnswers.rejectionReasons;
		if (Array.isArray(reasons)) {
			payload.rejectionReasons = reasons.filter((r): r is string => typeof r === 'string');
		}
	}
	if (loanAnswers.sanctionNotDisbursedReasons) {
		const reasons = loanAnswers.sanctionNotDisbursedReasons;
		if (Array.isArray(reasons)) {
			payload.sanctionNotDisbursedReasons = reasons.filter(
				(r): r is string => typeof r === 'string'
			);
		}
	}

	// ── Home Loan Redesign Signals ──
	if (loanAnswers.registryTimeline) {
		payload.registryTimeline = String(loanAnswers.registryTimeline);
	}
	if (loanAnswers.auctionPropertyStatus) {
		payload.auctionPropertyStatus = String(loanAnswers.auctionPropertyStatus);
	}
	if (loanAnswers.priorAssessmentHistory) {
		payload.priorAssessmentHistory = String(loanAnswers.priorAssessmentHistory);
	}

	// ── Seller on Loan (V2 — enricher reads for backward compat derivations) ──
	if (loanAnswers.sellerOnLoan) {
		payload.sellerOnLoan = String(loanAnswers.sellerOnLoan);
	}
	const sellerOutstanding = toNumber(loanAnswers.sellerOutstandingAmount);
	if (sellerOutstanding) {
		payload.sellerOutstandingAmount = sellerOutstanding;
	}
	if (loanAnswers.sellerCurrentLender) {
		payload.sellerCurrentLender = String(loanAnswers.sellerCurrentLender);
	}

	// ── BT Possession & Demand (V2 merged question — enricher splits) ──
	if (loanAnswers.bt_possessionAndDemandStatus) {
		payload.bt_possessionAndDemandStatus = String(loanAnswers.bt_possessionAndDemandStatus);
	}

	// ── Mortgage year custom (V2 — enricher resolves "OTHER") ──
	if (loanAnswers.mortgageYearCustom) {
		payload.mortgageYearCustom = String(loanAnswers.mortgageYearCustom);
	}

	// ── Property dispute status (V2 — enricher derives noLegalDispute) ──
	if (loanAnswers.propertyDisputeStatus) {
		payload.propertyDisputeStatus = String(loanAnswers.propertyDisputeStatus);
	}

	// ── Documentation & Legal Readiness (E2E fill) ──
	if (loanAnswers.documentationReadiness) {
		const docs = loanAnswers.documentationReadiness;
		if (Array.isArray(docs)) {
			payload.documentationReadiness = docs.filter((d): d is string => typeof d === 'string');
		}
	}
	if (loanAnswers.nocFromPreviousLender) {
		payload.nocFromPreviousLender = String(loanAnswers.nocFromPreviousLender);
	}

	// Store the raw disbursement date (in addition to derived loanVintageMonths)
	if (loanAnswers.loanDisbursementDate) {
		payload.loanDisbursementDate = String(loanAnswers.loanDisbursementDate);
	}
	const btEmisPaid = toNumber(loanAnswers.btEmisPaid);
	if (btEmisPaid != null) {
		payload.btEmisPaid = btEmisPaid;
	}
	if (loanAnswers.loanAccountNumber) {
		payload.loanAccountNumber = String(loanAnswers.loanAccountNumber);
	}

	// ── LAP Legal Details (E2E fill) ──
	if (loanAnswers.originalDocumentsAvailable) {
		payload.originalDocumentsAvailable = String(loanAnswers.originalDocumentsAvailable);
	}
	if (loanAnswers.ownershipChainComplete) {
		payload.ownershipChainComplete = String(loanAnswers.ownershipChainComplete);
	}
	if (loanAnswers.noLegalDispute) {
		payload.noLegalDispute = String(loanAnswers.noLegalDispute);
	}
	if (loanAnswers.encumbranceCertificateVerified) {
		payload.encumbranceCertificateVerified = String(loanAnswers.encumbranceCertificateVerified);
	}
	if (loanAnswers.rentalAgreementType) {
		payload.rentalAgreementType = String(loanAnswers.rentalAgreementType);
	}

	// ── Unsecured Loan Common Fields (E2E fill) ──
	if (isUnsecuredLoan) {
		if (loanAnswers.urgencyLevel) {
			payload.urgencyLevel = String(loanAnswers.urgencyLevel);
		}
		// existingBankRelationship + dcExistingBank dropped — superseded by
		// q6_banksOfCurrentAccount on the Location page (banksOfCurrentAccount in payload).
		// CC/OD facility specifics live in the Obligations section.
	}

	// Professional Loan stores applicant type (individual/joint/company) in loanAnswers,
	// unlike Home/Business which use applicationData.tellUsWhoIsApplying
	if (loanName === 'Professional Loan' && loanAnswers.professionalApplicantType) {
		payload.applicationStructure = String(loanAnswers.professionalApplicantType);
	}

	return payload;
}

/**
 * Main function to build the complete loan application payload.
 *
 * `opts.now` threads through to `buildLoanTransactionPayload` for
 * deterministic time-derived fields. See that function's JSDoc.
 */
export function buildLoanPayload(
	loanAnswers: Record<string, unknown>,
	applicants: Record<string, unknown>[],
	applicationData: Record<string, unknown>,
	relationships?: Array<{ fromId: string; toId: string; relationType: string; category?: string }>,
	opts?: { now?: Date }
): LoanApplicationPayload {
	// Resolve relationships: map IDs to applicant indices
	const resolvedRels: RelationshipEntry[] = (relationships ?? [])
		.map((r) => {
			const fromIdx = applicants.findIndex((a) => String(a.id) === r.fromId);
			const toIdx = applicants.findIndex((a) => String(a.id) === r.toId);
			return {
				fromIndex: fromIdx,
				toIndex: toIdx,
				relationType: r.relationType,
				category: r.category ?? ''
			};
		})
		.filter((r) => r.fromIndex >= 0 && r.toIndex >= 0);

	return {
		loanTransaction: buildLoanTransactionPayload(loanAnswers, applicationData, opts),
		allApplicantDetails: applicants.map((applicant, index) =>
			buildApplicantPayload(applicant, index, resolvedRels, applicants)
		)
	};
}

/**
 * Builds the structured payload: schema-driven groups + applicants + relationships.
 */
export function buildStructuredPayload(
	schema: import('$lib/types/formTypes').Schema,
	loanAnswers: Record<string, unknown>,
	applicants: Record<string, unknown>[],
	applicationData: Record<string, unknown>,
	relationships?: Array<{ fromId: string; toId: string; relationType: string; category?: string }>,
	groupOverrides?: Record<string, string>,
	opts?: { now?: Date }
): StructuredPayload {
	// Resolve relationships: map IDs to applicant indices
	const resolvedRels: RelationshipEntry[] = (relationships ?? [])
		.map((r) => {
			const fromIdx = applicants.findIndex((a) => String(a.id) === r.fromId);
			const toIdx = applicants.findIndex((a) => String(a.id) === r.toId);
			return {
				fromIndex: fromIdx,
				toIndex: toIdx,
				relationType: r.relationType,
				category: r.category ?? ''
			};
		})
		.filter((r) => r.fromIndex >= 0 && r.toIndex >= 0);

	// Build applicant payloads with income + title + relationships
	const applicantPayloads = applicants.map((a, i) =>
		buildApplicantPayload(a, i, resolvedRels, applicants)
	);

	// Group loan-level answers by schema page ID
	const groups = groupAnswersBySchema(schema, loanAnswers, groupOverrides) as Record<
		string,
		Record<string, unknown>
	>;

	// Build backward-compat flat payload
	const loanTransaction = buildLoanTransactionPayload(loanAnswers, applicationData, opts);

	return {
		...groups,
		applicants: applicantPayloads,
		relationships: resolvedRels,
		loanTransaction
	};
}
