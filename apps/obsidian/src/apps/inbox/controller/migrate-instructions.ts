export function migrateAnswerInstructions<T extends { terse: boolean }>(
	previous: T,
): Omit<T, 'terse'> & { answerInstructions: string } {
	const { terse, ...rest } = previous;
	// Preserve the default that v1/v2 actually captured. Future changes to the
	// editable default must not rewrite historical retry instructions.
	return {
		...rest,
		answerInstructions: terse
			? 'Prefer 1–3 short sentences or a few short bullets. No introductions, restatements, or closing offers. Use more words when correctness requires them.'
			: 'Give a focused explanation with a small example when useful.',
	};
}
