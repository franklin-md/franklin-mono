import { describe, expect, it } from 'vitest';

import { formatReferenceMention } from '@franklin/agent';

import {
	createMentionAttrs,
	createMentionNodeContent,
	getMentionReference,
} from '../../../../../src/conversation/input/editor-prompt/mention/node.js';

describe('file mention node helpers', () => {
	it('builds attrs and node content from one factory path', () => {
		const item = { path: 'notes/deep work.md' };
		const reference = {
			type: 'file',
			locator: 'notes/deep work.md',
			label: 'notes/deep work.md',
		};
		const attrs = createMentionAttrs(item);

		expect(attrs).toEqual({
			id: formatReferenceMention(reference),
			label: 'notes/deep work.md',
			mentionSuggestionChar: '@',
		});
		expect(createMentionNodeContent(reference)).toEqual({
			type: 'mention',
			attrs,
		});
		expect(getMentionReference(attrs)).toEqual(reference);
	});
});
