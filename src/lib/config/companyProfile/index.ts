/**
 * Company Profile Config — Public API
 * ═══════════════════════════════════════════════════════════════════
 * Re-exports everything from categories and questions for clean imports.
 * ═══════════════════════════════════════════════════════════════════
 */

export { BUSINESS_CATEGORIES, getCategoryOption, type BusinessCategoryOption } from './categories';

export {
	IDENTITY_QUESTIONS,
	CHARACTER_COMMON_QUESTIONS,
	CHARACTER_CONDITIONAL_QUESTIONS,
	getCategoryQuestions,
	getCategorySections,
	type ProfileQuestion,
	type ProfileOption,
	type CategorySection
} from './questions';
