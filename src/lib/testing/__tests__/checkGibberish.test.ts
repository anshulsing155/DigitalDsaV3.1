import { describe, it, expect } from 'vitest';
import { checkGibberish, checkGibberishLegacy } from '$lib/utils/checkGibberish';

const SOFT_FLAG_REASON = 'This name looks unusual. Continue if correct.';

// ───────────────────────────────────────────────────────────────────────────
// PERSON CONTEXT — names of individuals (full name, GPA holder, RM contact)
// ───────────────────────────────────────────────────────────────────────────

describe('checkGibberish — person context — accepts legitimate names', () => {
	it.each([
		'Rajesh Kumar',
		'Priya Sharma',
		'Sunita Devi',
		'Mohammed Ali Khan',
		'Vikram Singh',
		'Lakshmi Narasimhan',
		'Mary-Anne',
		"O'Brien",
		'K.K. Sharma',
		'M.A. Sharma',
		'Mohammed bin Salman',
		'Ravi K Sharma', // single-letter middle initial OK in multi-word
		'Ram Prasad Sharma',
		'Anantha Padmanabhan'
	])('accepts: "%s"', (name) => {
		const result = checkGibberish(name, 'person');
		expect(result.severity).toBe('ok');
		expect(result.reason).toBeNull();
	});
});

describe('checkGibberish — person context — soft-warns on unusual but valid patterns', () => {
	it.each(['Rao Rao', 'Kumar Kumar', 'Priya Priya'])('warns on repeated word: "%s"', (name) => {
		const result = checkGibberish(name, 'person');
		expect(result.severity).toBe('warn');
		expect(result.reason).toBe(SOFT_FLAG_REASON);
	});
});

describe('checkGibberish — person context — blocks genuine garbage', () => {
	it.each([
		['', 'empty'],
		['   ', 'whitespace only'],
		['12345', 'all numeric'],
		['Raj123', 'mixed digits'],
		['Raj@Kumar', '@ symbol'],
		['Raj_Kumar', 'underscore'],
		['Raj,Kumar', 'comma'],
		['aaaa', 'all-same-letter'],
		['xxxxxxxx', 'all-same-letter long'],
		['a', 'single letter'],
		['x', 'single letter']
	])('blocks: "%s" (%s)', (input) => {
		const result = checkGibberish(input, 'person');
		expect(result.severity).toBe('block');
		expect(result.reason).not.toBeNull();
	});

	it('blocks single-word over 50 characters', () => {
		const longWord = 'a'.repeat(51);
		const result = checkGibberish(longWord, 'person');
		expect(result.severity).toBe('block');
	});
});

// ───────────────────────────────────────────────────────────────────────────
// ENTITY CONTEXT — company / firm / builder / bank / authority / project
// ───────────────────────────────────────────────────────────────────────────

describe('checkGibberish — entity context — accepts legitimate company patterns', () => {
	it.each([
		'AAA Industries',
		'AAR EES Properties',
		'5G Networks Pvt Ltd',
		'M&A Partners',
		'7-Eleven India',
		'Tata Consultancy Services Ltd.',
		'L&T Realty Ltd',
		'ICICI Bank Ltd.',
		'Reliance Jio Infocomm',
		'K.K. Industries',
		"O'Reilly Auto Parts India",
		'Maruti Suzuki India Ltd',
		'Adani Enterprises Limited',
		'HDFC Bank',
		'Apollo Hospitals Group',
		'Phase-2 Heights Builders',
		'Tower 9 Developers',
		'Shree Ram & Sons',
		'A-1 Logistics',
		'Mahindra & Mahindra'
	])('accepts: "%s"', (name) => {
		const result = checkGibberish(name, 'entity');
		expect(result.severity).toBe('ok');
		expect(result.reason).toBeNull();
	});
});

describe('checkGibberish — entity context — soft-warns on suspicious repetition', () => {
	it.each([
		'AAAA Industries', // 4+ consecutive A
		'XXXXXX Holdings',
		'Test BBBBBB'
	])('warns on 4+ consecutive identical letters: "%s"', (name) => {
		const result = checkGibberish(name, 'entity');
		expect(result.severity).toBe('warn');
		expect(result.reason).toBe(SOFT_FLAG_REASON);
	});

	it('does NOT warn on exactly 3 consecutive (legitimate AAA pattern)', () => {
		expect(checkGibberish('AAA Industries', 'entity').severity).toBe('ok');
		expect(checkGibberish('BBB Holdings', 'entity').severity).toBe('ok');
	});
});

describe('checkGibberish — entity context — blocks only true garbage', () => {
	it.each([
		['', 'empty'],
		['   ', 'whitespace only'],
		['<script>alert(1)</script>', 'angle brackets / XSS attempt'],
		['Hello\x00World', 'null byte (control char)']
	])('blocks "%s" (%s)', (input, _label) => {
		const result = checkGibberish(input, 'entity');
		expect(result.severity).toBe('block');
	});

	it('blocks input over 200 characters', () => {
		const result = checkGibberish('A'.repeat(201), 'entity');
		expect(result.severity).toBe('block');
	});
});

// ───────────────────────────────────────────────────────────────────────────
// GENERIC CONTEXT — backward-compatible behaviour (default for unmigrated callers)
// ───────────────────────────────────────────────────────────────────────────

describe('checkGibberish — generic context — preserves legacy behaviour', () => {
	it.each([
		'Rajesh Kumar',
		'Priya Sharma',
		'Sunita Devi',
		'Mohammed Ali Khan',
		'Vikram Singh',
		'Lakshmi Narasimhan'
	])('accepts valid Indian name: "%s"', (name) => {
		const result = checkGibberish(name, 'generic');
		expect(result.severity).toBe('ok');
	});

	it.each([
		'Raj123',
		'Raj@Kumar',
		'Raj-Kumar', // generic context still rejects hyphens (legacy behaviour)
		'Raj_Kumar',
		'Raj.Kumar', // generic context still rejects dots
		'12345'
	])('rejects non-letter chars: "%s"', (input) => {
		const result = checkGibberish(input, 'generic');
		expect(result.severity).toBe('block');
		expect(result.reason).toBe('Name can only contain letters');
	});

	it.each(['A', 'AB', 'Hi', 'Mr'])('rejects very short word: "%s"', (input) => {
		expect(checkGibberish(input, 'generic').severity).toBe('block');
	});

	it('rejects word longer than 20 characters', () => {
		expect(checkGibberish('Abcdefghijklmnopqrstu', 'generic').severity).toBe('block');
	});

	it.each(['aaabcd', 'bbbxyz', 'cccdef'])('rejects first 3 identical: "%s"', (input) => {
		const result = checkGibberish(input, 'generic');
		expect(result.severity).toBe('block');
		expect(result.reason).toBe('First three characters are identical');
	});

	it.each(['abcaaad', 'xyzbbbb', 'helllo'])('rejects 3+ repeated chars: "%s"', (input) => {
		const result = checkGibberish(input, 'generic');
		expect(result.severity).toBe('block');
		expect(result.reason).toBe('Too many repeated characters');
	});

	it('rejects long word with bad vowel ratio (legacy heuristic)', () => {
		expect(checkGibberish('bcdfghjk', 'generic').severity).toBe('block');
	});

	it('default context is generic', () => {
		// No second arg — should behave like generic
		expect(checkGibberish('aaabcd').severity).toBe('block');
		expect(checkGibberish('Rajesh Kumar').severity).toBe('ok');
	});
});

// ───────────────────────────────────────────────────────────────────────────
// LEGACY WRAPPER — backward compat for callers using the boolean shape
// ───────────────────────────────────────────────────────────────────────────

describe('checkGibberishLegacy — boolean-shape backward compat', () => {
	it('returns gibberish: false for valid input', () => {
		expect(checkGibberishLegacy('Rajesh Kumar')).toEqual({
			gibberish: false,
			reason: null
		});
	});

	it('returns gibberish: true with reason for invalid input', () => {
		const result = checkGibberishLegacy('aaabcd');
		expect(result.gibberish).toBe(true);
		expect(typeof result.reason).toBe('string');
		expect(result.reason!.length).toBeGreaterThan(0);
	});
});

// ───────────────────────────────────────────────────────────────────────────
// EDGE CASES
// ───────────────────────────────────────────────────────────────────────────

describe('checkGibberish — edge cases', () => {
	it('trims leading/trailing whitespace', () => {
		expect(checkGibberish('  Rajesh Kumar  ', 'person').severity).toBe('ok');
		expect(checkGibberish('  AAA Industries  ', 'entity').severity).toBe('ok');
	});

	it('handles multiple internal spaces', () => {
		expect(checkGibberish('Ram   Kumar', 'person').severity).toBe('ok');
	});

	it('person context allows curly-quote apostrophe', () => {
		expect(checkGibberish('O’Brien', 'person').severity).toBe('ok');
	});

	it('return shape always includes severity and reason', () => {
		const result = checkGibberish('Rajesh', 'person');
		expect(result).toHaveProperty('severity');
		expect(result).toHaveProperty('reason');
	});
});
