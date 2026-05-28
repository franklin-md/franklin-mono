import { describe, expect, it } from 'vitest';

import {
	createMentionAttrs,
	createMentionNodeContent,
	getMentionPath,
} from '../../../../../src/conversation/input/editor-prompt/mention/node.js';

describe('file mention node helpers', () => {
	it('builds attrs and node content from one factory path', () => {
		const item = { path: 'notes/deep work.md' };
		const attrs = createMentionAttrs(item);

		expect(attrs).toEqual({
			id: 'notes/deep work.md',
			label: 'notes/deep work.md',
			mentionSuggestionChar: '@',
		});
		expect(createMentionNodeContent(item)).toEqual({
			type: 'mention',
			attrs,
		});
		expect(getMentionPath(attrs)).toBe('notes/deep work.md');
	});
});
