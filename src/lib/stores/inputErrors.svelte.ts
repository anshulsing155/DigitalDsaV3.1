/**
 * Input Errors Store (Svelte 5 Runes)
 * ============================================================================
 * Tracks per-field validation errors keyed by field ID.
 * Migrated from writable<Record<string, string>> to class-based $state.
 * ============================================================================
 */

class InputErrorsState {
	/** Map of field ID -> error message */
	errors = $state<Record<string, string>>({});

	/** Get error for a specific field */
	get(id: string): string {
		return this.errors[id] ?? '';
	}

	/** Set error for a specific field */
	set(id: string, message: string): void {
		this.errors = { ...this.errors, [id]: message };
	}

	/** Update errors by merging partial record */
	update(updater: (current: Record<string, string>) => Record<string, string>): void {
		this.errors = updater({ ...this.errors });
	}

	/** Clear all errors */
	clear(): void {
		this.errors = {};
	}

	/** Check if a specific field has a non-empty error */
	has(id: string): boolean {
		return !!this.errors[id] && this.errors[id] !== '';
	}
}

export const inputErrorsState = new InputErrorsState();
