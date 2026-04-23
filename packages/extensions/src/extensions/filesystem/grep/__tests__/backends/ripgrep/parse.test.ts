import { describe, expect, it } from 'vitest';
import { parseRipgrepLine } from '../../../backends/ripgrep/parse.js';

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

describe('parseRipgrepLine', () => {
	it('parses match records into GrepMatch entries', () => {
		expect(
			parseRipgrepLine(rgMatch('src/a.ts', 12, 'const foo = 1\n')),
		).toEqual({
			file: 'src/a.ts',
			line: 12,
			text: 'const foo = 1',
		});
	});

	it('ignores blank lines, invalid JSON, and non-match records', () => {
		expect(parseRipgrepLine('')).toBeUndefined();
		expect(parseRipgrepLine('not json at all')).toBeUndefined();
		expect(
			parseRipgrepLine(JSON.stringify({ type: 'summary', data: {} })),
		).toBeUndefined();
		expect(parseRipgrepLine(rgMatch('src/a.ts', 1, 'hit\n'))).toEqual({
			file: 'src/a.ts',
			line: 1,
			text: 'hit',
		});
	});

	it('strips only a trailing newline from lines.text', () => {
		expect(parseRipgrepLine(rgMatch('a.ts', 1, 'leading\nstays\n'))).toEqual({
			file: 'a.ts',
			line: 1,
			text: 'leading\nstays',
		});
	});

	it('skips records missing required fields', () => {
		expect(
			parseRipgrepLine(
				JSON.stringify({ type: 'match', data: { path: { text: 'a.ts' } } }),
			),
		).toBeUndefined();
		expect(parseRipgrepLine(rgMatch('b.ts', 2, 'ok\n'))).toEqual({
			file: 'b.ts',
			line: 2,
			text: 'ok',
		});
	});
});
