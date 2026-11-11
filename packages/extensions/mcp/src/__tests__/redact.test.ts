import { expect, it } from 'vitest';
import { redactValue } from '../redact.js';

it('redacts secrets in string values and keys without altering JSON booleans, numbers or structure', () => {
	expect(redactValue({ a: 'a', value: false, rows: [1, null] }, ['a'])).toEqual(
		{ '[REDACTED]': '[REDACTED]', 'v[REDACTED]lue': false, rows: [1, null] },
	);
});
