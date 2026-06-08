/**
 * Payload comparison utility for debugging.
 */

import type { LoanApplicationPayload } from './types.js';

/**
 * Compares two payloads and returns differences
 * Useful for debugging and showing team what changed
 */
export function comparePayloads(
	oldPayload: Record<string, unknown>,
	newPayload: LoanApplicationPayload
): {
	added: string[];
	removed: string[];
	changed: string[];
} {
	const added: string[] = [];
	const removed: string[] = [];
	const changed: string[] = [];

	function compareObjects(
		oldObj: Record<string, unknown>,
		newObj: Record<string, unknown>,
		path: string = ''
	) {
		const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

		for (const key of allKeys) {
			const fullPath = path ? `${path}.${key}` : key;
			const oldVal = oldObj[key];
			const newVal = newObj[key];

			if (!(key in oldObj)) {
				added.push(fullPath);
			} else if (!(key in newObj)) {
				removed.push(fullPath);
			} else if (
				typeof oldVal === 'object' &&
				typeof newVal === 'object' &&
				oldVal !== null &&
				newVal !== null &&
				!Array.isArray(oldVal) &&
				!Array.isArray(newVal)
			) {
				compareObjects(
					oldVal as Record<string, unknown>,
					newVal as Record<string, unknown>,
					fullPath
				);
			} else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
				changed.push(fullPath);
			}
		}
	}

	compareObjects(oldPayload, newPayload as unknown as Record<string, unknown>);

	return { added, removed, changed };
}
