import { describe, expect, it } from 'vitest';

import { truncate } from '../utils/truncate.js';

describe('truncate', () => {
	it('returns the text unchanged when within budget', () => {
		expect(truncate('hello', 10)).toEqual({ text: 'hello', truncated: false });
	});

	it('returns the text unchanged when exactly at budget', () => {
		expect(truncate('hello', 5)).toEqual({ text: 'hello', truncated: false });
	});

	it('appends the default ellipsis and honors the total length budget', () => {
		const result = truncate('abcdefghij', 6);
		expect(result).toEqual({ text: 'abc...', truncated: true });
		expect(result.text.length).toBe(6);
	});

	it('trims trailing whitespace before appending the suffix', () => {
		const result = truncate('abc   defghij', 7);
		expect(result).toEqual({ text: 'abc...', truncated: true });
	});

	it('supports a custom suffix that consumes the same budget', () => {
		const result = truncate('abcdefghijklmno', 10, '[cut]');
		expect(result).toEqual({ text: 'abcde[cut]', truncated: true });
		expect(result.text.length).toBe(10);
	});

	it('returns a prefix of the suffix when the budget is smaller than the suffix', () => {
		expect(truncate('abcdefg', 2)).toEqual({ text: '..', truncated: true });
		expect(truncate('abcdefg', 0)).toEqual({ text: '', truncated: true });
	});

	it('handles a budget equal to the suffix length', () => {
		expect(truncate('abcdefg', 3)).toEqual({ text: '...', truncated: true });
	});
});
