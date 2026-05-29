import { describe, expect, it } from 'vitest';

import {
	formatReferenceMention,
	parseReferenceMention,
	splitMentionSegments,
} from '../embedding.js';

describe('reference mention embedding', () => {
	it('formats and parses reference mentions', () => {
		const reference = {
			type: 'file',
			locator: 'notes/deep work.md',
			selector: 'lines=1-5',
			label: 'Deep work',
		};
		const mention = formatReferenceMention(reference);

		expect(mention).toMatch(/^@\{reference:/);
		expect(parseReferenceMention(mention)).toEqual(reference);
	});

	it('splits text into sequenced text and reference segments', () => {
		const first = { type: 'file', locator: 'notes/a.md' };
		const second = { type: 'file', locator: 'b.md', label: 'B' };

		expect(
			splitMentionSegments(
				`Read ${formatReferenceMention(first)} then ${formatReferenceMention(
					second,
				)}`,
			),
		).toEqual([
			{ type: 'text', text: 'Read ' },
			{ type: 'reference', reference: first },
			{ type: 'text', text: ' then ' },
			{ type: 'reference', reference: second },
		]);
	});

	it('preserves invalid mention text as normal text', () => {
		expect(splitMentionSegments('Read @{reference:not-json} next')).toEqual([
			{ type: 'text', text: 'Read @{reference:not-json} next' },
		]);
		expect(parseReferenceMention('@{reference:not-json}')).toBeUndefined();
	});
});
