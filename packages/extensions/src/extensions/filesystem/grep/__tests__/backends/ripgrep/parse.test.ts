import { describe, expect, it } from 'vitest';
import { parseRipgrepJson } from '../../../backends/ripgrep/parse.js';

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
