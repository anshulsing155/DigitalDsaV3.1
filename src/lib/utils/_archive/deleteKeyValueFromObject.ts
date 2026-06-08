export function deleteKey(
	answers: string,
	targetObj: Record<string, unknown>,
	path: string[]
): void {
	if (answers === 'No') {
		let current: Record<string, unknown> = targetObj;

		for (let i = 0; i < path.length - 1; i++) {
			const key = path[i];
			if (!current[key] || typeof current[key] !== 'object') {
				return; // Path not found, exit safely
			}
			current = current[key] as Record<string, unknown>;
		}

		delete current[path[path.length - 1]];
	}
}
