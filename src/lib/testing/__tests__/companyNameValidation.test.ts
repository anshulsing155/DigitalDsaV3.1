/**
 * Company/Firm name validation — regression coverage.
 *
 * Before this, `validateCompanyField('companyName', ...)` only checked
 * required + min-2-chars, so junk like "omega........." passed. The fix adds
 * a letter-content check and a repeated-punctuation guard, while keeping
 * legitimate names with repeated letters/ampersands (AAA Corp, AT&T) valid.
 */
import { describe, it, expect } from 'vitest';
import { validateCompanyField } from '$lib/utils/applicantFormValidation';

const ctx = { isOPC: true, companyType: 'One Person Company (OPC)', entityLabel: 'Company' };
const check = (name: string) => validateCompanyField('companyName', name, ctx);

describe('validateCompanyField — companyName', () => {
	it('rejects empty / whitespace-only', () => {
		expect(check('')).toMatch(/required/i);
		expect(check('   ')).toMatch(/required/i);
	});

	it('rejects names shorter than 2 characters', () => {
		expect(check('a')).toMatch(/at least 2/i);
	});

	it('rejects names with no letters', () => {
		expect(check('123')).toMatch(/must contain letters/i);
		expect(check('....')).toBeTruthy(); // caught by letters or repeat rule
	});

	it('rejects filler runs of repeated punctuation', () => {
		expect(check('omega.........')).toMatch(/repeated characters/i);
		expect(check('test----name')).toMatch(/repeated characters/i);
	});

	it('accepts legitimate company names', () => {
		expect(check('Omega Industries')).toBeNull();
		expect(check('AAA Corp')).toBeNull(); // repeated LETTERS are fine
		expect(check('AT&T')).toBeNull();
		expect(check('M&M')).toBeNull();
		expect(check('P. N. Gadgil')).toBeNull(); // single dots, no 3+ run
		expect(check('3M India')).toBeNull();
	});
});
