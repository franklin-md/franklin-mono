import type { UserContent } from '@franklin/mini-acp';
import type { CoreModule } from '../../modules/core/index.js';
import type {
	Reference,
	ReferencesModule,
} from '../../modules/references/index.js';
import { defineExtension } from '../../modules/state/index.js';
import { formatReferenceMention, splitMentionSegments } from './embedding.js';

export const mentionExtension = defineExtension<[CoreModule, ReferencesModule]>(
	(api) => {
		api.on('prompt', async (prompt, ctx) => {
			const references = uniquePromptReferences(prompt.request.content);
			for (const reference of references) {
				const context = await ctx.references.toContext(reference);
				for (const content of context.content) {
					prompt.appendContent(content);
				}
			}
		});
	},
);

function uniquePromptReferences(content: readonly UserContent[]): Reference[] {
	const references = new Map<string, Reference>();

	for (const block of content) {
		if (block.type !== 'text') continue;
		for (const segment of splitMentionSegments(block.text)) {
			if (segment.type !== 'reference') continue;
			references.set(
				formatReferenceMention(segment.reference),
				segment.reference,
			);
		}
	}

	return Array.from(references.values());
}
