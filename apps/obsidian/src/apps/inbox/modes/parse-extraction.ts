import { extractionSchema } from './extraction-schema.js';
import type { Extraction } from './types.js';

export function parseExtraction(value: unknown): Extraction {
	const result = extractionSchema.parse(value);
	if (!result.questions.length)
		throw new Error(
			'No questions found. Try making your uncertainties more explicit.',
		);
	return { ...result, questions: [...new Set(result.questions)] };
}
