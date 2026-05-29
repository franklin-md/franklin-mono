import type { UserContent } from '@franklin/mini-acp';
import type { CoreModule } from '../../modules/core/index.js';
import type {
	Reference,
	ReferencesModule,
} from '../../modules/references/index.js';
import { referenceKey } from '../../modules/references/index.js';
import { defineExtension } from '../../modules/state/index.js';
import { splitMentionSegments } from './embedding.js';

export const mentionExtension = defineExtension<[CoreModule, ReferencesModule]>(
	(api) => {
		api.on('prompt', async (prompt, ctx) => {
			const references = uniquePromptReferences(prompt.request.content);
			const content: UserContent[] = [];
			for (const reference of references) {
				content.push((await ctx.references.toContext(reference)).content);
			}
			if (content.length > 0) {
				prompt.editContent((current) => [...current, ...content]);
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
			const key = referenceKey(segment.reference);
			if (!references.has(key)) {
				references.set(key, segment.reference);
			}
		}
	}

	return Array.from(references.values());
}
