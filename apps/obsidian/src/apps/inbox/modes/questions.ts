import { z } from 'zod';

const questions = z.array(z.string().trim().min(1));

export function parseQuestions(value: unknown): string[] {
	const result = questions.parse(value);
	if (!result.length)
		throw new Error(
			'No questions found. Try making your uncertainties more explicit.',
		);
	return [...new Set(result)];
}
