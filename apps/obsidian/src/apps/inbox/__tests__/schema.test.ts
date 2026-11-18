import { describe, expect, it } from 'vitest';
import { inboxCodec } from '../controller/schema.js';
import { answeredQuestion } from '../testing/question.js';

function flatDocument() {
	return {
		questions: [answeredQuestion()],
		preferences: {
			provider: 'test',
			model: 'test',
			reasoning: 'off',
			answerInstructions: 'Keep it short.',
			concurrency: 3,
		},
	};
}

describe('Inbox base storage boundary', () => {
	it.each(['groups', 'actions', 'actionRuns', 'thoughtDumps'])(
		'rejects saved %s instead of silently discarding it',
		(field) => {
			for (const version of [3, 4, 5, 6, 7]) {
				expect(
					inboxCodec.decode({
						version,
						data: { ...flatDocument(), [field]: [{ id: 'preserve-me' }] },
					}).ok,
				).toBe(false);
			}
		},
	);
	it('accepts flat version 6 questions with empty later-feature collections', () => {
		const document = flatDocument();
		const result = inboxCodec.decode({
			version: 6,
			data: {
				...document,
				groups: [],
				actions: [],
				actionRuns: [],
				thoughtDumps: [],
			},
		});
		expect(result.ok && result.value).toEqual(document);
	});
});
