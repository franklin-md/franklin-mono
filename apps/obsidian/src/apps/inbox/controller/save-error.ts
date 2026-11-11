import { errorMessage } from './error.js';

export class QuestionSaveError extends Error {
	constructor(readonly questionId: string, cause: unknown) {
		super(errorMessage(cause), { cause });
		this.name = 'QuestionSaveError';
	}
}
