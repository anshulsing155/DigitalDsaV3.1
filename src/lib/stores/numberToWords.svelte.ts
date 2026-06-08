/**
 * Number-to-Words Store (Svelte 5 Runes)
 * ============================================================================
 * Tracks per-field number-to-words text keyed by field ID.
 * Migrated from writable<Record<string, string>> to class-based $state.
 * ============================================================================
 */

class NumberToWordsState {
	/** Map of field ID -> words text */
	words = $state<Record<string, string>>({});

	/** Get words text for a specific field */
	get(id: string): string {
		return this.words[id] ?? '';
	}

	/** Set words text for a specific field */
	set(id: string, text: string): void {
		this.words = { ...this.words, [id]: text };
	}

	/** Update words by merging partial record */
	update(updater: (current: Record<string, string>) => Record<string, string>): void {
		this.words = updater({ ...this.words });
	}

	/** Clear all words */
	clear(): void {
		this.words = {};
	}
}

export const numberToWordsState = new NumberToWordsState();
