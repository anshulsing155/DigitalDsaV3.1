/**
 * Coins Store (Svelte 5 Runes)
 * ============================================================================
 * Tracks available and used coin counts.
 * Migrated from two writables to a single class-based $state.
 * ============================================================================
 */

class CoinsState {
	/** Available coins balance */
	available = $state<number>(500);

	/** Used coins count */
	used = $state<number>(0);

	/** Remaining coins (derived) */
	get remaining(): number {
		return this.available - this.used;
	}

	/** Set available coins */
	setAvailable(amount: number): void {
		this.available = amount;
	}

	/** Set used coins */
	setUsed(amount: number): void {
		this.used = amount;
	}

	/** Add to available coins */
	addAvailable(amount: number): void {
		this.available += amount;
	}

	/** Reset to defaults */
	reset(): void {
		this.available = 500;
		this.used = 0;
	}
}

export const coinsState = new CoinsState();
