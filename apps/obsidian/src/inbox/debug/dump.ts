import type { InboxQuestion } from '../controller/types.js';
import type {
	EvidenceRepository,
	ResearchEvidence,
} from '../capture/evidence/types.js';
import { redactEvidence } from '../capture/evidence/redact.js';
import { errorMessage } from '../controller/error.js';

export async function createDebugDump(
	question: InboxQuestion,
	ancestors: InboxQuestion[],
	repository?: EvidenceRepository,
): Promise<string> {
	// Pin the visible attempt before awaiting disk; a retry must not change its identity.
	const context = structuredClone({ question, ancestors });
	const unavailable: string[] = [];
	let research: ResearchEvidence | undefined;
	try {
		research = await repository?.load(
			context.question.id,
			context.question.attemptId,
		);
	} catch (error) {
		unavailable.push(`Saved events could not be read: ${errorMessage(error)}`);
	}
	if (!research)
		unavailable.push('Agent events were not recorded for this attempt.');
	else if (!research.agentEvents)
		unavailable.push(
			'The full agent timeline was not recorded for this older attempt; saved research events are included.',
		);
	return JSON.stringify(
		{
			format: 'franklin-inbox-debug',
			version: 1,
			exportedAt: new Date().toISOString(),
			...context,
			research,
			unavailable,
			eventPolicy:
				'Complete message updates, tool calls/results and turn boundaries. Streaming chunks, reasoning content and binary bodies are not retained. Omission counts mark bounded fields and events.',
		},
		(_key, value: unknown) =>
			typeof value === 'string' ? redactEvidence(value) : value,
		2,
	);
}
