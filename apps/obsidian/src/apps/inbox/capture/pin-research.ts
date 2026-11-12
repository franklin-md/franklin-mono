import type { InboxQuestion } from '../controller/types.js';
import { questionPrompt } from '../agent/prompt.js';
import type {
	EvidenceRepository,
	ResearchEvidence,
} from '../evidence/types.js';
import { redactEvidence } from '../evidence/redact.js';
import { branchContext } from '../hierarchy/context.js';
import type { InboxGroup } from '../hierarchy/types.js';

export async function pinResearch(
	question: InboxQuestion,
	ancestors: InboxQuestion[],
	repository: EvidenceRepository,
	groups?: InboxGroup[],
): Promise<ResearchEvidence[]> {
	return Promise.all(
		[question, ...ancestors].map(async (item, index) => {
			const context = contextFor(item, index);
			const branch = context.ancestors;
			try {
				const evidence = await repository.load(item.id, item.attemptId);
				if (
					evidence &&
					evidence.question.id === item.id &&
					evidence.question.attemptId === item.attemptId
				) {
					if (
						questionPrompt({
							question: item,
							ancestors: branch,
							groups: evidence.groups,
						}) !== questionPrompt({ question: item, ...context }) ||
						evidence.question.parentId !== item.parentId ||
						evidence.question.rootId !== item.rootId ||
						evidence.ancestors.length !== branch.length ||
						evidence.ancestors.some(
							(ancestor, ancestorIndex) =>
								ancestor.id !== branch[ancestorIndex]?.id ||
								ancestor.attemptId !== branch[ancestorIndex].attemptId,
						)
					)
						return missing(
							item,
							index,
							'Original research belongs to a different ancestor branch',
						);
					if (evidence.status === 'collecting') {
						evidence.status = 'partial';
						evidence.missing.push('Research capture was interrupted');
					}
					if (
						evidence.status === 'complete' &&
						evidence.acceptedAt === undefined
					) {
						evidence.status = 'partial';
						evidence.missing.push('Research has no accepted-answer checkpoint');
					}
					// The diagnostic timeline shares storage, not the training evidence contract.
					const {
						agentEvents: _agentEvents,
						omittedAgentEvents: _omittedAgentEvents,
						...research
					} = evidence;
					return research;
				}
			} catch {
				// A damaged or unreadable sidecar is not the same as no research. The
				// original file is preserved and the example remains explicitly partial.
				return missing(
					item,
					index,
					'Original research could not be read or validated',
				);
			}
			return missing(
				item,
				index,
				'Original research was not recorded for this attempt',
			);
		}),
	);

	function contextFor(item: InboxQuestion, index: number) {
		return groups?.length
			? branchContext(item, { questions: [question, ...ancestors], groups })
			: { ancestors: index === 0 ? ancestors : ancestors.slice(0, index - 1) };
	}

	function missing(
		item: InboxQuestion,
		index: number,
		reason: string,
	): ResearchEvidence {
		const context = contextFor(item, index);
		const prompt = questionPrompt({ question: item, ...context });
		const clean = redactEvidence(prompt);
		return {
			version: 1,
			question: structuredClone(item),
			...structuredClone(context),
			startedAt: item.createdAt,
			status: 'missing',
			missing: [
				reason,
				'Prompt reconstructed from saved question/source/answer; no research was rerun',
			],
			prompt: {
				text: clean.slice(0, 64_000),
				omittedCharacters: Math.max(0, clean.length - 64_000),
				redacted: clean !== prompt,
			},
			events: [],
			omittedEvents: 0,
		};
	}
}
