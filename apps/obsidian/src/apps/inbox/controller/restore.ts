import { interruptedState } from './interrupted.js';
import type { InboxControllerOptions, InboxDocument } from './types.js';

export async function restoreInbox({
	persistence,
}: InboxControllerOptions): Promise<InboxDocument> {
	const restored = await persistence.inbox.load();
	if (restored.issues.length)
		throw new Error(
			'Could not restore inbox.json. The original file was preserved. Restore a backup or move the file aside before trying again.',
		);
	const initial: InboxDocument = restored.value ?? {
		questions: [],
		actionRuns: [],
	};
	for (const question of initial.questions) {
		if (question.state.kind === 'running') {
			question.state = interruptedState();
			question.updatedAt = Date.now();
		}
	}
	for (const dump of initial.thoughtDumps ?? []) {
		if (dump.state.kind === 'running') dump.state = interruptedState();
	}
	// A saved success may still be present if the final cleanup write failed.
	initial.actionRuns = initial.actionRuns.filter(
		(run) => run.state.kind !== 'succeeded',
	);
	for (const run of initial.actionRuns) {
		if (run.state.kind === 'running') run.state = interruptedState();
	}
	return initial;
}
