import { describe, expect, it } from 'vitest';

import { truncate, truncateStream } from '../utils/truncate.js';

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

describe('truncateStream', () => {
	it('joins all chunks when they fit', () => {
		expect(
			truncateStream(['a', 'b', 'c'], { maxLength: 100, separator: ',' }),
		).toEqual({ text: 'a,b,c', truncated: false });
	});

	it('returns empty text for empty input', () => {
		expect(
			truncateStream([], { maxLength: 10, separator: '\n' }),
		).toEqual({ text: '', truncated: false });
	});

	it('accepts chunks that exactly fit the budget', () => {
		expect(
			truncateStream(['ab', 'cd'], { maxLength: 5, separator: '\n' }),
		).toEqual({ text: 'ab\ncd', truncated: false });
	});

	it('drops the first overflowing chunk atomically', () => {
		expect(
			truncateStream(['ab', 'cd', 'ef'], { maxLength: 5, separator: '\n' }),
		).toEqual({ text: 'ab\ncd', truncated: true });
	});

	it('accounts for the separator cost between chunks', () => {
		expect(
			truncateStream(['abc', 'def'], { maxLength: 6, separator: '\n' }),
		).toEqual({ text: 'abc', truncated: true });
	});

	it('handles maxLength = 0 by truncating before any chunk', () => {
		expect(
			truncateStream(['a'], { maxLength: 0, separator: '\n' }),
		).toEqual({ text: '', truncated: true });
	});

	it('stops consuming a generator on the first overflow', () => {
		let consumed = 0;
		function* chunks() {
			for (const c of ['ab', 'cd', 'ef', 'gh']) {
				consumed += 1;
				yield c;
			}
		}
		const { text, truncated } = truncateStream(chunks(), {
			maxLength: 5,
			separator: '\n',
		});
		expect(text).toBe('ab\ncd');
		expect(truncated).toBe(true);
		expect(consumed).toBe(3);
	});

	it('defaults to an empty separator', () => {
		expect(truncateStream(['ab', 'cd'], { maxLength: 4 })).toEqual({
			text: 'abcd',
			truncated: false,
		});
	});

	it('reserves space for the suffix and appends it on truncation', () => {
		const suffix = '[more]';
		// maxLength 12, suffix reserves 6 + sep(1) = 7, contentBudget = 5.
		// 'ab\ncd' (5 chars) fits; 'ef' does not.
		expect(
			truncateStream(['ab', 'cd', 'ef'], {
				maxLength: 12,
				separator: '\n',
				suffix,
			}),
		).toEqual({ text: 'ab\ncd\n[more]', truncated: true });
	});

	it('omits the suffix when no truncation occurs', () => {
		expect(
			truncateStream(['ab', 'cd'], {
				maxLength: 100,
				separator: '\n',
				suffix: '[more]',
			}),
		).toEqual({ text: 'ab\ncd', truncated: false });
	});

	it('returns only the suffix when no chunk fits', () => {
		expect(
			truncateStream(['abcdef'], {
				maxLength: 8,
				separator: '\n',
				suffix: 'NOTE',
			}),
		).toEqual({ text: 'NOTE', truncated: true });
	});

	it('slices the suffix when maxLength is smaller than it', () => {
		expect(
			truncateStream(['x'], { maxLength: 2, suffix: 'NOTE' }),
		).toEqual({ text: 'NO', truncated: true });
	});

	it('treats Infinity as no limit', () => {
		expect(
			truncateStream(['a', 'b'], {
				maxLength: Infinity,
				separator: '\n',
				suffix: 'NOTE',
			}),
		).toEqual({ text: 'a\nb', truncated: false });
	});
});
