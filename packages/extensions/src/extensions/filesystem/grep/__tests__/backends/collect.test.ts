import { describe, expect, it } from 'vitest';
import { collectMatches } from '../../backends/collect.js';

describe('collectMatches', () => {
	it('collects parsed matches and skips invalid lines', () => {
		const result = collectMatches(
			['skip', 'a:1:x', 'b:2:y'].join('\n'),
			(line) => {
				const match = /^(.*):(\d+):(.*)$/.exec(line);
				if (match === null) return undefined;
				const [, file, lineNumber, text] = match;
				if (
					file === undefined ||
					lineNumber === undefined ||
					text === undefined
				) {
					return undefined;
				}
				return {
					file,
					line: Number(lineNumber),
					text,
				};
			},
			10,
		);

		expect(result).toEqual({
			matches: [
				{ file: 'a', line: 1, text: 'x' },
				{ file: 'b', line: 2, text: 'y' },
			],
			truncated: false,
		});
	});

	it('stops after limit plus one parsed matches and reports truncation', () => {
		const seen: string[] = [];

		const result = collectMatches(
			['a:1:x', 'b:2:y', 'c:3:z', 'd:4:w'].join('\n'),
			(line) => {
				seen.push(line);
				const match = /^(.*):(\d+):(.*)$/.exec(line);
				if (match === null) return undefined;
				const [, file, lineNumber, text] = match;
				if (
					file === undefined ||
					lineNumber === undefined ||
					text === undefined
				) {
					return undefined;
				}
				return {
					file,
					line: Number(lineNumber),
					text,
				};
			},
			2,
		);

		expect(result).toEqual({
			matches: [
				{ file: 'a', line: 1, text: 'x' },
				{ file: 'b', line: 2, text: 'y' },
			],
			truncated: true,
		});
		expect(seen).toEqual(['a:1:x', 'b:2:y', 'c:3:z']);
	});
});
