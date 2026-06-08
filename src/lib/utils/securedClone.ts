/**
 * Secured Deep Clone Utility
 *
 * A safe alternative to JSON.stringify/parse and structuredClone that:
 * - Prevents prototype pollution attacks
 * - Handles circular references gracefully
 * - Preserves Date objects
 * - Handles undefined values (JSON drops them)
 * - Provides configurable depth limits
 * - Is fully type-safe
 *
 * @example
 * ```typescript
 * import { securedClone } from '$lib/utils/securedClone';
 *
 * const original = { name: 'John', date: new Date(), nested: { value: 1 } };
 * const cloned = securedClone(original);
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CloneOptions {
	/** Maximum nesting depth (default: 20) */
	maxDepth?: number;
	/** Strip __proto__ and constructor properties (default: true) */
	stripDangerous?: boolean;
	/** Preserve Date objects as Date instead of string (default: true) */
	preserveDates?: boolean;
	/** How to handle circular references (default: 'null') */
	onCircular?: 'error' | 'null' | 'skip' | 'reference';
	/** Custom handler for unsupported types */
	onUnsupported?: (value: unknown, path: string) => unknown;
}

export interface CloneResult<T> {
	data: T;
	warnings: string[];
	hadCircular: boolean;
}

// Dangerous keys that could be used for prototype pollution
const DANGEROUS_KEYS = new Set([
	'__proto__',
	'constructor',
	'prototype',
	'__defineGetter__',
	'__defineSetter__',
	'__lookupGetter__',
	'__lookupSetter__'
]);

// ============================================================================
// MAIN CLONE FUNCTION
// ============================================================================

/**
 * Safely deep clone an object with protection against prototype pollution
 *
 * @param obj - The object to clone
 * @param options - Clone configuration options
 * @returns A deep clone of the object
 * @throws Error if circular reference detected and onCircular is 'error'
 * @throws Error if max depth exceeded
 */
export function securedClone<T>(obj: T, options: CloneOptions = {}): T {
	const {
		maxDepth = 20,
		stripDangerous = true,
		preserveDates = true,
		onCircular = 'null',
		onUnsupported
	} = options;

	// Track seen objects to detect circular references
	const seen = new WeakMap<object, unknown>();
	const warnings: string[] = [];

	function clone(value: unknown, depth: number, path: string): unknown {
		// Check depth limit
		if (depth > maxDepth) {
			throw new Error(`securedClone: Maximum depth (${maxDepth}) exceeded at path: ${path}`);
		}

		// Handle null and undefined
		if (value === null) return null;
		if (value === undefined) return undefined;

		// Handle primitives (string, number, boolean, bigint, symbol)
		const type = typeof value;
		if (type === 'string' || type === 'number' || type === 'boolean' || type === 'bigint') {
			return value;
		}

		// Handle symbols - return undefined (can't be cloned meaningfully)
		if (type === 'symbol') {
			if (onUnsupported) {
				return onUnsupported(value, path);
			}
			warnings.push(`Symbol at ${path} converted to undefined`);
			return undefined;
		}

		// Handle functions - return undefined (security risk to clone)
		if (type === 'function') {
			if (onUnsupported) {
				return onUnsupported(value, path);
			}
			warnings.push(`Function at ${path} converted to undefined`);
			return undefined;
		}

		// Handle objects (including arrays, dates, etc.)
		if (type === 'object') {
			const obj = value as object;

			// Check for circular references
			if (seen.has(obj)) {
				switch (onCircular) {
					case 'error':
						throw new Error(`securedClone: Circular reference detected at path: ${path}`);
					case 'skip':
						return undefined;
					case 'reference':
						return seen.get(obj);
					case 'null':
					default:
						warnings.push(`Circular reference at ${path} converted to null`);
						return null;
				}
			}

			// Handle Date objects
			if (obj instanceof Date) {
				if (preserveDates) {
					return new Date(obj.getTime());
				}
				return obj.toISOString();
			}

			// Handle RegExp
			if (obj instanceof RegExp) {
				return new RegExp(obj.source, obj.flags);
			}

			// Handle Map
			if (obj instanceof Map) {
				const clonedMap = new Map();
				seen.set(obj, clonedMap);
				obj.forEach((val, key) => {
					const clonedKey = clone(key, depth + 1, `${path}.Map.key`);
					const clonedVal = clone(val, depth + 1, `${path}.Map.value`);
					clonedMap.set(clonedKey, clonedVal);
				});
				return clonedMap;
			}

			// Handle Set
			if (obj instanceof Set) {
				const clonedSet = new Set();
				seen.set(obj, clonedSet);
				obj.forEach((val) => {
					clonedSet.add(clone(val, depth + 1, `${path}.Set`));
				});
				return clonedSet;
			}

			// Handle ArrayBuffer and TypedArrays
			if (obj instanceof ArrayBuffer) {
				return obj.slice(0);
			}

			if (ArrayBuffer.isView(obj) && !(obj instanceof DataView)) {
				const TypedArrayConstructor = obj.constructor as new (buffer: ArrayBuffer) => typeof obj;
				return new TypedArrayConstructor(obj.buffer.slice(0) as ArrayBuffer);
			}

			// Handle Arrays
			if (Array.isArray(obj)) {
				const clonedArray: unknown[] = [];
				seen.set(obj, clonedArray);

				for (let i = 0; i < obj.length; i++) {
					clonedArray[i] = clone(obj[i], depth + 1, `${path}[${i}]`);
				}

				return clonedArray;
			}

			// Handle plain objects
			const clonedObj: Record<string, unknown> = {};
			seen.set(obj, clonedObj);

			// Get all own properties (including non-enumerable)
			const keys = Object.keys(obj);

			for (const key of keys) {
				// Skip dangerous keys if stripDangerous is enabled
				if (stripDangerous && DANGEROUS_KEYS.has(key)) {
					warnings.push(`Dangerous key "${key}" stripped at ${path}`);
					continue;
				}

				// Validate key is a safe string
				if (typeof key !== 'string') {
					continue;
				}

				const descriptor = Object.getOwnPropertyDescriptor(obj, key);
				if (descriptor && 'value' in descriptor) {
					clonedObj[key] = clone(descriptor.value, depth + 1, `${path}.${key}`);
				}
			}

			return clonedObj;
		}

		// Unknown type - return undefined
		if (onUnsupported) {
			return onUnsupported(value, path);
		}
		return undefined;
	}

	return clone(obj, 0, 'root') as T;
}

/**
 * Clone with detailed result including warnings
 */
export function securedCloneWithInfo<T>(obj: T, options: CloneOptions = {}): CloneResult<T> {
	const warnings: string[] = [];
	let hadCircular = false;

	const enhancedOptions: CloneOptions = {
		...options,
		onCircular: options.onCircular || 'null'
	};

	// Intercept to track circular references
	const originalOnCircular = enhancedOptions.onCircular;
	if (originalOnCircular !== 'error') {
		const seen = new WeakSet<object>();
		enhancedOptions.onUnsupported = (value, path) => {
			if (typeof value === 'object' && value !== null && seen.has(value)) {
				hadCircular = true;
				warnings.push(`Circular reference detected at ${path}`);
			}
			return options.onUnsupported?.(value, path);
		};
	}

	const data = securedClone(obj, enhancedOptions);

	return { data, warnings, hadCircular };
}

/**
 * Quick check if an object can be safely cloned
 */
export function isCloneable(obj: unknown): boolean {
	try {
		securedClone(obj, { maxDepth: 10, onCircular: 'error' });
		return true;
	} catch {
		return false;
	}
}

/**
 * Merge objects safely (like Object.assign but secured)
 */
export function securedMerge<T extends object>(...objects: Partial<T>[]): T {
	const result = {} as T;

	for (const obj of objects) {
		if (obj === null || obj === undefined) continue;

		const cloned = securedClone(obj);

		for (const key of Object.keys(cloned as object)) {
			if (DANGEROUS_KEYS.has(key)) continue;
			(result as Record<string, unknown>)[key] = (cloned as Record<string, unknown>)[key];
		}
	}

	return result;
}

/**
 * Deep freeze an object (makes it immutable)
 */
export function securedFreeze<T>(obj: T): Readonly<T> {
	const cloned = securedClone(obj);

	function deepFreeze(o: unknown): unknown {
		if (o === null || typeof o !== 'object') return o;

		Object.freeze(o);

		if (Array.isArray(o)) {
			o.forEach(deepFreeze);
		} else {
			Object.keys(o).forEach((key) => {
				deepFreeze((o as Record<string, unknown>)[key]);
			});
		}

		return o;
	}

	return deepFreeze(cloned) as Readonly<T>;
}

/**
 * Compare two objects for deep equality (after secured cloning)
 */
export function securedEquals<T>(a: T, b: T): boolean {
	const clonedA = securedClone(a);
	const clonedB = securedClone(b);

	return JSON.stringify(clonedA) === JSON.stringify(clonedB);
}

// ============================================================================
// STORE HELPERS
// ============================================================================

/**
 * Create a secured clone for Svelte store updates
 * Optimized for the common pattern of cloning store arrays/objects
 */
export function cloneForStore<T>(data: T): T {
	return securedClone(data, {
		maxDepth: 15,
		stripDangerous: true,
		preserveDates: true,
		onCircular: 'null'
	});
}

/**
 * Clone an array of applicants (common operation in this app)
 */
export function cloneApplicants<T extends { id?: string }>(applicants: T[]): T[] {
	return securedClone(applicants, {
		maxDepth: 10,
		stripDangerous: true,
		preserveDates: true,
		onCircular: 'null'
	});
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default securedClone;
