import type { StudyQuestion } from './types.js';

export function questionTitle(question: StudyQuestion): string {
	if (question.state.kind === 'answered' && question.state.title)
		return question.state.title;
	// Queued questions and older saved answers have no model-generated header.
	// Clean presentation syntax without rewriting or dropping their wording.
	return question.text
		.split('\n')
		.map((line) =>
			line
				.trim()
				.replace(/^(?:[-+*]|\d+[.)])\s+/, '')
				.replace(/^\[[ xX-]\]\s*/, ''),
		)
		.join(' ')
		.trim();
}
