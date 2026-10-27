import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';

export function migrateAnswerInstructions<T extends { terse: boolean }>(
	previous: T,
): Omit<T, 'terse'> & { answerInstructions: string } {
	const { terse, ...rest } = previous;
	return {
		...rest,
		answerInstructions: terse
			? 'Prefer 1–3 short sentences or a few short bullets. No introductions, restatements, or closing offers. Use more words when correctness requires them.'
			: DEFAULT_ANSWER_INSTRUCTIONS,
	};
}
