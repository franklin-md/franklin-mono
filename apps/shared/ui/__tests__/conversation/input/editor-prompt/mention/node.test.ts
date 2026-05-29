import { describe, expect, it } from 'vitest';

import { formatReferenceMention } from '@franklin/agent';

import {
	createFileReferenceMentionAttrs,
	createFileReferenceMentionNodeContent,
	getMentionReference,
} from '../../../../../src/conversation/input/editor-prompt/mention/node.js';

describe('file mention node helpers', () => {
	it('builds attrs and node content from one factory path', () => {
		const item = { path: 'notes/deep work.md' };
		const reference = {
			locator: 'notes/deep work.md',
			label: 'notes/deep work.md',
		};
		const attrs = createFileReferenceMentionAttrs(item);

		expect(attrs).toEqual({
			id: formatReferenceMention(reference),
			label: 'notes/deep work.md',
			mentionSuggestionChar: '@',
		});
		expect(createFileReferenceMentionNodeContent(reference)).toEqual({
			type: 'mention',
			attrs,
		});
		expect(getMentionReference(attrs)).toEqual(reference);
	});

	it('does not create mention node content for non-file references', () => {
		expect(
			createFileReferenceMentionNodeContent({
				locator: 'linear://issue/FRA-123',
				label: 'Inline Context',
			}),
		).toBeUndefined();
	});
});
