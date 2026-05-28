import { describe, expect, it } from 'vitest';

import {
	findFileReferenceTokens,
	formatFileReferenceToken,
	splitFileReferenceSegments,
} from '../../../src/conversation/file-reference/token.js';

describe('file reference tokens', () => {
	it('formats and finds canonical file reference tokens', () => {
		expect(formatFileReferenceToken('notes/deep work.md')).toBe(
			'@{notes/deep work.md}',
		);
		expect(findFileReferenceTokens('Read @{notes/deep work.md} next')).toEqual([
			{
				index: 5,
				text: '@{notes/deep work.md}',
				path: 'notes/deep work.md',
			},
		]);
	});

	it.fails('TODO: round-trips paths containing a closing brace', () => {
		const path = 'notes/a}b.md';
		const token = formatFileReferenceToken(path);

		expect(findFileReferenceTokens(token)).toEqual([
			{
				index: 0,
				text: token,
				path,
			},
		]);
	});

	it('splits text around canonical file reference tokens', () => {
		expect(
			splitFileReferenceSegments('Read @{notes/a.md} then @{b.md}'),
		).toEqual([
			{ type: 'text', text: 'Read ' },
			{
				type: 'reference',
				token: {
					index: 5,
					text: '@{notes/a.md}',
					path: 'notes/a.md',
				},
			},
			{ type: 'text', text: ' then ' },
			{
				type: 'reference',
				token: {
					index: 24,
					text: '@{b.md}',
					path: 'b.md',
				},
			},
		]);
	});
});
