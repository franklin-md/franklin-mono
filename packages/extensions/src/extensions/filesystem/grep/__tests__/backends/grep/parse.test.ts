import { describe, expect, it } from 'vitest';
import { parseGrepLine } from '../../../backends/grep/parse.js';

describe('parseGrepLine', () => {
	it('parses POSIX grep -rn output lines', () => {
		expect(parseGrepLine('src/a.ts:12:const foo = 1')).toEqual({
			file: 'src/a.ts',
			line: 12,
			text: 'const foo = 1',
		});
	});

	it('ignores lines that do not match path:line:text', () => {
		expect(parseGrepLine('')).toBeUndefined();
		expect(parseGrepLine('no colon here')).toBeUndefined();
		expect(parseGrepLine('src/a.ts:nope:text')).toBeUndefined();
		expect(parseGrepLine('src/b.ts:7:real')).toEqual({
			file: 'src/b.ts',
			line: 7,
			text: 'real',
		});
	});
});
