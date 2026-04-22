import { describe, expect, it } from 'vitest';
import { formatMatches } from '../../format/matches.js';
import type { GrepMatch } from '../../format/types.js';

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
			'a.ts\n  1: x\n(results truncated; narrow with path/include/limit)',
		);
	});

	it('truncates long match text previews when requested', () => {
		const matches: GrepMatch[] = [
			{ file: 'a.ts', line: 1, text: 'abcdefghijklmnopqrstuvwxyz' },
		];
		expect(
			formatMatches(matches, {
				truncated: false,
				maxMatchTextChars: 10,
			}),
		).toBe('a.ts\n  1: abcdefg...');
	});

	it('caps the formatted output and keeps a truncation note', () => {
		const matches: GrepMatch[] = [
			{ file: 'a.ts', line: 1, text: 'alpha' },
			{ file: 'a.ts', line: 2, text: 'beta' },
			{ file: 'b.ts', line: 3, text: 'gamma' },
			{ file: 'b.ts', line: 4, text: 'delta' },
			{ file: 'c.ts', line: 5, text: 'epsilon' },
		];

		expect(
			formatMatches(matches, {
				truncated: false,
				maxChars: 68,
			}),
		).toBe(
			'a.ts\n  1: alpha\n(results truncated; narrow with path/include/limit)',
		);
	});

	it('drops orphaned file headers when the cap forces truncation mid-file', () => {
		const matches: GrepMatch[] = [
			{ file: 'a.ts', line: 1, text: 'alpha' },
			{ file: 'b.ts', line: 2, text: 'x'.repeat(60) },
		];

		// Budget fits the b.ts header but not its (long) match. Without header
		// cleanup the output would end in a bare 'b.ts' line before the note.
		expect(
			formatMatches(matches, {
				truncated: false,
				maxChars: 70,
			}),
		).toBe(
			'a.ts\n  1: alpha\n(results truncated; narrow with path/include/limit)',
		);
	});
});
