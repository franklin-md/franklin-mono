import type { InboxQuestion } from '../controller/types.js';
import type { CaptureEpisode } from './types.js';

export function episodeContext(episode: CaptureEpisode): string {
	return (
		[
			`# Learning episode ${episode.id}`,
			`Recorded: ${new Date(episode.startedAt).toISOString()} to ${episode.endedAt === undefined ? 'recording' : new Date(episode.endedAt).toISOString()}`,
			'This is the context pinned at Record. Source notes were not reread after card authoring.',
			...episode.ancestors.map((question) =>
				renderQuestion(question, 'Ancestor'),
			),
			renderQuestion(episode.question, 'Question'),
			'## Research completeness',
			...episode.research.map(
				(entry) =>
					`- ${entry.question.id} / ${entry.question.attemptId}: ${entry.status}${entry.missing.length ? ` — ${entry.missing.join('; ')}` : ''}`,
			),
		].join('\n\n') + '\n'
	);
}

function renderQuestion(question: InboxQuestion, label: string): string {
	const source = question.source;
	return [
		`## ${label}\n\n${question.text}`,
		`Question ID: ${question.id}\nAttempt ID: ${question.attemptId}\nModel: ${question.provider}/${question.model}`,
		`### Answer\n\n${question.state.kind === 'answered' ? question.state.answer : '(Not answered)'}`,
		`### Answer instructions\n\n${question.answerInstructions}`,
		source
			? `### Captured source: ${source.location?.path ?? source.note}\n\n${[source.heading, ...(source.outline ?? [])].filter(Boolean).join(' → ')}\n\n${source.quote}\n\nNearby text:\n\n${source.location?.context ?? '(Unavailable)'}`
			: 'Source context unavailable.',
	].join('\n\n');
}
