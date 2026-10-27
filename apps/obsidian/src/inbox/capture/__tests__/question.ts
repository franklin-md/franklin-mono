import type { InboxQuestion } from '../../controller/types.js';

export function answeredQuestion(id = 'q'): InboxQuestion {
	return {
		id,
		attemptId: `${id}-accepted`,
		rootId: id,
		text: `Question ${id}?`,
		provider: 'test',
		model: 'test',
		reasoning: 'off',
		answerInstructions: 'Explain the mechanism.',
		createdAt: 1,
		updatedAt: 2,
		state: { kind: 'answered', answer: `Answer ${id}.` },
		source: {
			note: 'Source',
			heading: 'Mechanism',
			quote: 'Original quote',
			location: {
				id: 'source',
				path: 'Source.md',
				from: { line: 0, ch: 0 },
				to: { line: 0, ch: 14 },
				context: 'Original source context',
				capturedAt: 1,
			},
		},
	};
}
