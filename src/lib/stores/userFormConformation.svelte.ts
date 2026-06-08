/**
 * User Form Conformation Store (Svelte 5 Runes)
 * ============================================================================
 * Tracks user's form conformation state: loan name and first page data.
 * Migrated from writable to class-based $state.
 * ============================================================================
 */

class UserFormConformationState {
	/** Selected loan name */
	loanName = $state<string>('');

	/** First page form data */
	firstPageData = $state<Record<string, unknown>>({});

	/** Update state */
	set(data: { loanName?: string; firstPageData?: Record<string, unknown> }): void {
		if (data.loanName !== undefined) this.loanName = data.loanName;
		if (data.firstPageData !== undefined) this.firstPageData = data.firstPageData;
	}

	/** Reset to defaults */
	reset(): void {
		this.loanName = '';
		this.firstPageData = {};
	}
}

export const userFormConformationState = new UserFormConformationState();
