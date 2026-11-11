import type { AnsweredQuestion } from '../types.js';

export function formatAnswer({ answer, details }: AnsweredQuestion): string {
	// Disclosure state is presentation only: all sections belong to subsequent
	// questions, actions and pinned capture context, even when never opened.
	return [
		answer,
		...(details ?? []).map(
			({ title, content }) => `### ${title}\n\n${content}`,
		),
	].join('\n\n');
}
