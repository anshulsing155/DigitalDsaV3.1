/**
 * Store-compatibility bridge utilities
 *
 * Converts Svelte 5 $state runes into Svelte store-compatible objects
 * that support .subscribe(), .set(), and .update().
 *
 * This allows existing consumers using `$store` auto-subscription syntax,
 * `.set()`, and `.update()` to continue working while the source of truth
 * lives in a runes-based state manager.
 *
 * Will be removed in Phase 8 when all consumers migrate to direct rune access.
 */

import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { browser } from '$app/environment';

// ============================================================================
// SESSION-PERSISTED STORE (replaces svelte-persisted-store)
// ============================================================================

interface SessionPersistedOptions<T> {
	/** Custom serializer for non-JSON-safe types (e.g. Set, Map) */
	serializer?: {
		parse: (str: string) => T;
		stringify: (value: T) => string;
	};
}

/**
 * Drop-in replacement for `persisted()` from svelte-persisted-store
 * with `{ storage: 'session' }`.
 *
 * Creates a Svelte writable store whose value is persisted to sessionStorage.
 * On init, reads any previously stored value. On every change, writes back.
 *
 * @param key - sessionStorage key
 * @param initial - default value when nothing is stored
 * @param options - optional custom serializer
 */
export function sessionPersisted<T>(
	key: string,
	initial: T,
	options?: SessionPersistedOptions<T>
): Writable<T> {
	const parse = options?.serializer?.parse ?? JSON.parse;
	const stringify = options?.serializer?.stringify ?? JSON.stringify;

	let value = initial;
	if (browser) {
		try {
			const stored = sessionStorage.getItem(key);
			if (stored !== null) {
				value = parse(stored);
			}
		} catch {
			// Corrupt data — fall back to initial
		}
	}

	const store = writable<T>(value);

	if (browser) {
		store.subscribe((v) => {
			try {
				sessionStorage.setItem(key, stringify(v));
			} catch {
				// Storage full or unavailable — silently ignore
			}
		});
	}

	return store;
}

/**
 * Create a Svelte store-compatible wrapper around a rune getter/setter pair.
 *
 * The returned object implements the Svelte store contract:
 *   - `.subscribe(callback)` — reactive subscription via `$effect.root`
 *   - `.set(value)` — delegates to the setter
 *   - `.update(fn)` — calls getter, applies fn, delegates to setter
 *
 * @param getter - Function that reads the current $state value (must be reactive)
 * @param setter - Function that writes a new value to the $state
 * @returns A store-compatible object (subscribe + set + update)
 */
export function fromRune<T>(getter: () => T, setter: (v: T) => void): Writable<T> {
	return {
		subscribe(run: (value: T) => void, invalidate?: () => void) {
			// Immediately call with current value
			run(getter());

			// Set up reactive tracking via $effect.root so it works
			// outside component initialization context
			const cleanup = $effect.root(() => {
				$effect(() => {
					run(getter());
				});
			});

			return () => {
				invalidate?.();
				cleanup();
			};
		},

		set(value: T) {
			setter(value);
		},

		update(fn: (current: T) => T) {
			setter(fn(getter()));
		}
	};
}

/**
 * Create a read-only store-compatible wrapper (no set/update).
 * Useful for derived values like `isBodyLocked`.
 *
 * @param getter - Function that reads the current derived value
 * @returns A readable store-compatible object (subscribe only)
 */
export function fromRuneReadonly<T>(getter: () => T): {
	subscribe: (run: (value: T) => void, invalidate?: () => void) => () => void;
} {
	return {
		subscribe(run: (value: T) => void, invalidate?: () => void) {
			run(getter());

			const cleanup = $effect.root(() => {
				$effect(() => {
					run(getter());
				});
			});

			return () => {
				invalidate?.();
				cleanup();
			};
		}
	};
}
