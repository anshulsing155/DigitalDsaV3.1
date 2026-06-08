// ───────────────────────────────────────────────
// RAW VALUE (digits + optional minus)
// ───────────────────────────────────────────────
export function getRawValue(str: string, allowMinus: boolean): string {
	if (allowMinus) {
		return str
			.replace(/[^0-9-]/g, '') // allow digits + minus
			.replace(/(?!^)-/g, ''); // minus only at start
	}

	// If minus NOT allowed → digits only
	return str.replace(/[^0-9]/g, '');
}

// ───────────────────────────────────────────────
// FORMAT AS INDIAN NUMBER (1,00,000 etc.)
// ───────────────────────────────────────────────

export function formatIndianNumber(numStr: string): string {
	if (!numStr) return '';

	let isNegative = numStr.startsWith('-');
	numStr = numStr.replace('-', '');

	let lastThree = numStr.slice(-3);
	let otherDigits = numStr.slice(0, -3);

	if (otherDigits !== '') {
		lastThree = ',' + lastThree;
	}

	let formatted = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

	return isNegative ? '-' + formatted : formatted;
}

// ───────────────────────────────────────────────
// MAIN FUNCTION → CALL IN ANY INPUT
// Handles: raw extraction, formatting, cursor fix
// ───────────────────────────────────────────────

export function handleIndianNumberInput(
	e: Event & { target: HTMLInputElement },
	allowMinus: boolean = false
): { raw: string; formatted: string } {
	let cursor = e.target.selectionStart;

	// RAW VALUE (based on rule)
	let raw = getRawValue(e.target.value, allowMinus);

	// FORMATTED VALUE
	let formatted = formatIndianNumber(raw);

	e.target.value = formatted;

	// FIX CURSOR JUMP
	const diff = formatted.length - raw.length;
	if (cursor !== null) {
		e.target.setSelectionRange(cursor + diff, cursor + diff);
	}

	return { raw, formatted };
}
