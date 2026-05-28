import { describe, expect, it } from 'vitest';

import {
	findReferenceTokens,
	formatReferenceToken,
} from '../../../../../src/conversation/input/editor-prompt/mention/reference-token.js';

describe('file reference tokens', () => {
	it('formats and finds canonical file reference tokens', () => {
		expect(formatReferenceToken('notes/deep work.md')).toBe(
			'@{notes/deep work.md}',
		);
		expect(findReferenceTokens('Read @{notes/deep work.md} next')).toEqual([
			{
				index: 5,
				text: '@{notes/deep work.md}',
				path: 'notes/deep work.md',
			},
		]);
	});
});
