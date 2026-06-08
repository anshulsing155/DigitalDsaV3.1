/**
 * Income Profiles Config — Barrel Export
 * ═══════════════════════════════════════════════════════════════════
 */
export {
	INCOME_PROFILE_CARDS,
	getProfileCard,
	getEarningProfileTypes,
	getProfileCardsForLoan,
	allowsCashIncome,
	deriveLegacyEmploymentType,
	validateProfileSelection
} from './profileCards';

export {
	getSpecificsForProfile,
	getIncomeFieldsForProfile,
	getDropdownLabel,
	getEntityNameLabel,
	getEntityNamePlaceholder
} from './profileFormConfig';

export { formatIncomeCurrency, getEvidenceSummary } from './incomeCalculations';

export {
	LOAN_ROLE_OPTIONS,
	EMI_SOURCE_OPTIONS,
	EMI_PAID_BY_OPTIONS,
	LOAN_CAPACITY_OPTIONS,
	getFilteredCapacityOptions,
	getCapacityEntityLabel,
	needsCapacityEntity
} from './obligationEnhancements';

export {
	getDocumentsForProfile,
	getDocumentsForProfiles,
	getCategoryLabel,
	groupDocumentsByCategory,
	OBLIGATION_DOCUMENTS,
	type DocumentSpec
} from './documentConfig';
