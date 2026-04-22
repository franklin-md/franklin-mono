import { describe, expect, it } from 'vitest';
import {
	formatMatches,
	parseGrepOutput,
	parseRipgrepJson,
	type GrepMatch,
} from '../format.js';

function rgMatch(path: string, lineNumber: number, text: string): string {
	return JSON.stringify({
		type: 'match',
		data: {
			path: { text: path },
			line_number: lineNumber,
			lines: { text },
		},
	});
}

describe('parseRipgrepJson', () => {
	it('parses match records into GrepMatch entries', () => {
		const stdout = [
			JSON.stringify({ type: 'begin', data: { path: { text: 'a.ts' } } }),
			rgMatch('src/a.ts', 12, 'const foo = 1\n'),
			rgMatch('src/b.ts', 3, 'foo()\n'),
			JSON.stringify({ type: 'end', data: {} }),
		].join('\n');

		expect(parseRipgrepJson(stdout, 100)).toEqual([
			{ file: 'src/a.ts', line: 12, text: 'const foo = 1' },
			{ file: 'src/b.ts', line: 3, text: 'foo()' },
		]);
	});

	it('ignores blank lines, invalid JSON, and non-match records', () => {
		const stdout = [
			'',
			'not json at all',
			JSON.stringify({ type: 'summary', data: {} }),
			rgMatch('src/a.ts', 1, 'hit\n'),
		].join('\n');

		expect(parseRipgrepJson(stdout, 100)).toEqual([
			{ file: 'src/a.ts', line: 1, text: 'hit' },
		]);
	});

	it('respects the limit', () => {
		const stdout = [
			rgMatch('a.ts', 1, 'x\n'),
			rgMatch('a.ts', 2, 'y\n'),
			rgMatch('a.ts', 3, 'z\n'),
		].join('\n');

		expect(parseRipgrepJson(stdout, 2)).toHaveLength(2);
	});

	it('strips only a trailing newline from lines.text', () => {
		const stdout = rgMatch('a.ts', 1, 'leading\nstays\n');
		expect(parseRipgrepJson(stdout, 100)).toEqual([
			{ file: 'a.ts', line: 1, text: 'leading\nstays' },
		]);
	});

	it('skips records missing required fields', () => {
		const stdout = [
			JSON.stringify({ type: 'match', data: { path: { text: 'a.ts' } } }),
			rgMatch('b.ts', 2, 'ok\n'),
		].join('\n');

		expect(parseRipgrepJson(stdout, 100)).toEqual([
			{ file: 'b.ts', line: 2, text: 'ok' },
		]);
	});
});

describe('parseGrepOutput', () => {
	it('parses POSIX grep -rn output lines', () => {
		const stdout = ['src/a.ts:12:const foo = 1', 'src/b.ts:3:foo()'].join('\n');

		expect(parseGrepOutput(stdout, 100)).toEqual([
			{ file: 'src/a.ts', line: 12, text: 'const foo = 1' },
			{ file: 'src/b.ts', line: 3, text: 'foo()' },
		]);
	});

	it('ignores lines that do not match path:line:text', () => {
		const stdout = [
			'',
			'no colon here',
			'src/a.ts:nope:text',
			'src/b.ts:7:real',
		].join('\n');

		expect(parseGrepOutput(stdout, 100)).toEqual([
			{ file: 'src/b.ts', line: 7, text: 'real' },
		]);
	});

	it('respects the limit', () => {
		const stdout = ['a:1:x', 'a:2:y', 'a:3:z'].join('\n');
		expect(parseGrepOutput(stdout, 2)).toHaveLength(2);
	});
});

describe('formatMatches', () => {
	it('returns "No matches found." when the list is empty', () => {
		expect(formatMatches([], false)).toBe('No matches found.');
	});

	it('groups matches by file with indented line:text entries', () => {
		const matches: GrepMatch[] = [
			{ file: 'src/a.ts', line: 1, text: 'alpha' },
			{ file: 'src/a.ts', line: 5, text: 'beta' },
			{ file: 'src/b.ts', line: 2, text: 'gamma' },
		];

		expect(formatMatches(matches, false)).toBe(
			['src/a.ts', '  1: alpha', '  5: beta', 'src/b.ts', '  2: gamma'].join(
				'\n',
			),
		);
	});

	it('appends a truncation note when truncated is true', () => {
		const matches: GrepMatch[] = [{ file: 'a.ts', line: 1, text: 'x' }];
		expect(formatMatches(matches, true)).toBe(
			'a.ts\n  1: x\n(results truncated)',
		);
	});
});
