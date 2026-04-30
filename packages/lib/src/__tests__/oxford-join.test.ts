import { describe, expect, it } from 'vitest';

import { oxfordJoin } from '../utils/oxford-join.js';

describe('oxfordJoin', () => {
	it('returns empty string for empty input', () => {
		expect(oxfordJoin([])).toBe('');
	});

	it('returns the single item unchanged', () => {
		expect(oxfordJoin(['only'])).toBe('only');
	});

	it('joins two items with " and " (no comma)', () => {
		expect(oxfordJoin(['a', 'b'])).toBe('a and b');
	});

	it('uses the Oxford comma for three or more items', () => {
		expect(oxfordJoin(['a', 'b', 'c'])).toBe('a, b, and c');
		expect(oxfordJoin(['a', 'b', 'c', 'd'])).toBe('a, b, c, and d');
	});

	it('preserves item content verbatim, including surrounding markup', () => {
		expect(oxfordJoin(['`x`', '`y`', '`z`'])).toBe('`x`, `y`, and `z`');
	});
});
