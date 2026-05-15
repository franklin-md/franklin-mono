import { describe, expect, it } from 'vitest';
import { reduceNonEmpty } from '../reduce-non-empty.js';

describe('reduceNonEmpty', () => {
	it('reduces values from left to right', () => {
		const result = reduceNonEmpty(
			['a', 'b', 'c'],
			(left, right) => `(${left}+${right})`,
			'empty',
		);

		expect(result).toBe('((a+b)+c)');
	});

	it('rejects empty input', () => {
		expect(() =>
			reduceNonEmpty<number>([], (left, right) => left + right, 'empty'),
		).toThrow('empty');
	});
});
