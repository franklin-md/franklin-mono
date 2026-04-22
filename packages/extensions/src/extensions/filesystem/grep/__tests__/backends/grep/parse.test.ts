import { describe, expect, it } from 'vitest';
import { parseGrepOutput } from '../../../backends/grep/parse.js';

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
