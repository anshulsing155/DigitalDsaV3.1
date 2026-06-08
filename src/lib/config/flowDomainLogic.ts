/**
 * Flow Domain Logic
 * Loan type + purchase type-specific question visibility and behavior
 * Implements D2-D5 domain fixes for natural, contextual form flows
 */

export type LoanType =
	| 'New Loan'
	| 'Balance Transfer Only'
	| 'Balance Transfer With Top-up'
	| 'Top-up Only';

export type PurchaseType =
	| 'resale_normal'
	| 'resale_endorsement'
	| 'direct_from_builder'
	| 'direct_from_authority';

/**
 * D2: Dynamic purchaseType label based on loan type
 * For BT flows, reframe as "How was property originally acquired?"
 */
export function getPurchaseTypeLabel(loanType?: string): string {
	if (
		loanType === 'Balance Transfer Only' ||
		loanType === 'Balance Transfer With Top-up' ||
		loanType === 'Top-up Only'
	) {
		return 'How was the property originally acquired?';
	}
	return 'How do you plan to acquire the property?';
}

/**
 * D2: Dynamic purchaseType description based on loan type
 */
export function getPurchaseTypeDescription(loanType?: string): string {
	if (
		loanType === 'Balance Transfer Only' ||
		loanType === 'Balance Transfer With Top-up' ||
		loanType === 'Top-up Only'
	) {
		return 'Tell us how the existing property was originally purchased (this helps us understand the transaction structure).';
	}
	return 'Select how you plan to acquire the property.';
}

/**
 * D3: Hide builder/RERA/compliance questions for Top-up Only
 * Top-up properties already approved by existing lender; re-evaluation redundant
 */
export function shouldShowBuilderComplianceQuestions(loanType?: string): boolean {
	// Hide for Top-up Only (property already evaluated)
	if (loanType === 'Top-up Only') return false;

	// Show for all other loan types (new or BT with new evaluation)
	return true;
}

/**
 * Specific builder question visibility (q5_projectName)
 * Only for under-construction flats (not ready, not houses/plots)
 */
export function shouldShowProjectName(
	constructionType?: string,
	propertyType?: string,
	loanType?: string
): boolean {
	// Hide for Top-up Only
	if (loanType === 'Top-up Only') return false;

	// Show only for under-construction flats
	if (constructionType === 'Under Construction' && propertyType === 'Flat') return true;

	return false;
}

/**
 * RERA question visibility (q5_reraRegistrationStatus in propertyCondition)
 * Only for PLANNED_AUTHORITY properties, not for Top-up Only
 */
export function shouldShowReraRegistration(propertyAreaType?: string, loanType?: string): boolean {
	// Hide for Top-up Only (already approved)
	if (loanType === 'Top-up Only') return false;

	// Show only for development authority projects
	if (propertyAreaType === 'PLANNED_AUTHORITY') return true;

	return false;
}

/**
 * D4: Dynamic priorAssessmentHistory description per loan type
 * Same question, different meaning depending on loan context
 */
export function getPriorAssessmentHistoryLabel(loanType?: string): string {
	switch (loanType) {
		case 'Top-up Only':
			return 'Has this property been recently assessed for top-up eligibility?';
		case 'Balance Transfer Only':
		case 'Balance Transfer With Top-up':
			return 'Was this property assessed during the original home loan?';
		default:
			return 'Has this property been assessed for loan eligibility in the past?';
	}
}

/**
 * D4: Dynamic priorAssessmentHistory description
 */
export function getPriorAssessmentHistoryDescription(loanType?: string): string {
	switch (loanType) {
		case 'Top-up Only':
			return 'This helps us understand if any recent reports are available for the top-up evaluation.';
		case 'Balance Transfer Only':
		case 'Balance Transfer With Top-up':
			return 'This helps us reference earlier assessments and check for any changes since original approval.';
		default:
			return 'This helps us understand if any earlier reports or assessments are available for reference.';
	}
}

/**
 * D5: Authority-specific seller transaction page
 * Determine if should show authority-specific variant (sellerTransaction_authority_homeLoan)
 */
export function shouldShowAuthoritySellerPage(purchaseType?: string, loanType?: string): boolean {
	// Authority page only for direct_from_authority purchases
	if (purchaseType !== 'direct_from_authority') return false;

	// And only for New Loan (BT/Top-up don't have new sellers)
	if (loanType !== 'New Loan') return false;

	return true;
}

/**
 * Hide standard sellerTransaction_homeLoan for authority purchases
 */
export function shouldShowStandardSellerPage(purchaseType?: string, loanType?: string): boolean {
	// Hide for authority purchases (use authority variant instead)
	if (purchaseType === 'direct_from_authority') return false;

	// Hide for BT/Top-up (no new seller)
	if (loanType && loanType !== 'New Loan') return false;

	// Show for new loans with individual sellers (resale/builder)
	return true;
}

/**
 * D3: Hide sellerOnLoan for Top-up Only
 * Top-up doesn't have seller; question irrelevant
 */
export function shouldShowSellerOnLoan(purchaseType?: string, loanType?: string): boolean {
	// Hide for Top-up Only (no seller)
	if (loanType === 'Top-up Only') return false;

	// Show for all other loan types with individual sellers
	if (purchaseType === 'direct_from_authority') return false;

	return true;
}

/**
 * Helper: Is this a Balance Transfer variant?
 */
export function isBTLoan(loanType?: string): boolean {
	return loanType === 'Balance Transfer Only' || loanType === 'Balance Transfer With Top-up';
}

/**
 * Helper: Is this a Top-up loan?
 */
export function isTopupLoan(loanType?: string): boolean {
	return loanType === 'Top-up Only' || loanType === 'Balance Transfer With Top-up';
}

/**
 * Helper: Is this a New Loan (not BT/Top-up)?
 */
export function isNewLoan(loanType?: string): boolean {
	return loanType === 'New Loan';
}

/**
 * Helper: Is this a BT-only flow (not top-up)?
 */
export function isBTOnly(loanType?: string): boolean {
	return loanType === 'Balance Transfer Only';
}

/**
 * Helper: Has a seller (new loan or BT with resale)?
 */
export function hasSeller(loanType?: string): boolean {
	return (
		loanType === 'New Loan' ||
		loanType === 'Balance Transfer Only' ||
		loanType === 'Balance Transfer With Top-up'
	);
}
