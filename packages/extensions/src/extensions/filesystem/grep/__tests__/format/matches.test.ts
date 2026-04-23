import { describe, expect, it } from 'vitest';
import { formatMatches } from '../../format/matches.js';
import type { GrepMatch } from '../../format/types.js';

const NOTE = '(results truncated; narrow with path/include/limit)';

describe('formatMatches', () => {
	it('returns "No matches found." when the list is empty', () => {
		expect(formatMatches([], { truncated: false })).toBe('No matches found.');
	});

	it('groups matches by file with indented line:text entries', () => {
		const matches: GrepMatch[] = [
			{ file: 'src/a.ts', line: 1, text: 'alpha' },
			{ file: 'src/a.ts', line: 5, text: 'beta' },
			{ file: 'src/b.ts', line: 2, text: 'gamma' },
		];

		expect(formatMatches(matches, { truncated: false })).toBe(
			['src/a.ts', '  1: alpha', '  5: beta', 'src/b.ts', '  2: gamma'].join(
				'\n',
			),
		);
	});

	it('appends a truncation note when truncated is true', () => {
		const matches: GrepMatch[] = [{ file: 'a.ts', line: 1, text: 'x' }];
		expect(formatMatches(matches, { truncated: true })).toBe(
			`a.ts\n  1: x\n${NOTE}`,
		);
	});

	it('drops whole groups rather than leaving an orphaned file header', () => {
		const matches: GrepMatch[] = [
			{ file: 'a.ts', line: 1, text: 'alpha' },
			{ file: 'b.ts', line: 2, text: 'x'.repeat(60) },
		];

		// After the suffix reservation (51 chars), content budget is 80 - 51 = 29.
		// 'a.ts\n  1: alpha' (15) fits; the b.ts block (≥ 60) does not, so it is
		// dropped atomically — no bare header survives.
		expect(formatMatches(matches, { truncated: false, maxLength: 80 })).toBe(
			`a.ts\n  1: alpha\n${NOTE}`,
		);
	});

	it('returns just the note when even the first group does not fit', () => {
		const matches: GrepMatch[] = [
			{ file: 'a.ts', line: 1, text: 'x'.repeat(200) },
		];

		expect(formatMatches(matches, { truncated: false, maxLength: 60 })).toBe(
			NOTE,
		);
	});
});
