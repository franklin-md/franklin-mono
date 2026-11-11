import type { InboxQuestion } from '../controller/types.js';
import type { BranchContext } from '../hierarchy/types.js';
import { formatAnswer } from '../answer/format.js';

type Options = BranchContext & { question: InboxQuestion };

export function questionPrompt({
	question,
	ancestors,
	groups,
}: Options): string {
	const source = question.source;
	return [
		groups?.length
			? `Group context on this branch (JSON):\n${JSON.stringify(groups.map(({ title, context, source }) => ({ title, context, source })))}`
			: '',
		source
			? `Captured source (JSON):\n${JSON.stringify({ note: source.note, path: source.location?.path, heading: source.heading, outline: source.outline, lines: source.location ? { from: source.location.from.line + 1, to: source.location.to.line + 1 } : undefined, quote: source.quote, surroundingText: source.location?.context })}`
			: '',
		ancestors.length
			? `Prior questions on this branch (JSON):\n${JSON.stringify(ancestors.map((q) => ({ question: q.text, answer: q.state.kind === 'answered' ? formatAnswer(q.state) : null })))}`
			: '',
		`Current question:\n${question.text}`,
	]
		.filter(Boolean)
		.join('\n\n');
}
