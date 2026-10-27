import { interruptedState } from './interrupted.js';
import { DEFAULT_ANSWER_INSTRUCTIONS } from '../answer-instructions.js';
import type { InboxControllerOptions, InboxDocument } from './types.js';

export async function restoreInbox({
	persistence,
	defaults,
}: InboxControllerOptions): Promise<InboxDocument> {
	const restored = await persistence.load();
	// A corrupt/newer file must never be replaced by an empty inbox.
	if (restored.issues.length)
		throw new Error(
			'Could not restore inbox.json. The original file was preserved. Restore a backup or move the file aside before trying again.',
		);
	const initial = restored.value ?? {
		questions: [],
		actions: [],
		actionRuns: [],
		preferences: {
			...defaults,
			answerInstructions: DEFAULT_ANSWER_INSTRUCTIONS,
			concurrency: 3,
		},
	};
	for (const question of initial.questions) {
		if (question.state.kind === 'running') {
			question.state = interruptedState();
			question.updatedAt = Date.now();
		}
	}
	initial.actionRuns = initial.actionRuns.filter(
		(run) => run.state.kind !== 'succeeded',
	);
	for (const run of initial.actionRuns) {
		if (run.state.kind === 'running') run.state = interruptedState();
	}
	return initial;
}
