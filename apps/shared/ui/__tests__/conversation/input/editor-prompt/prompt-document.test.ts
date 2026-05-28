import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import { Mention } from '@tiptap/extension-mention';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { describe, expect, it } from 'vitest';

import { createMentionNodeContent } from '../../../../src/conversation/input/editor-prompt/mention/node.js';
import {
	createPromptDocument,
	getPromptText,
} from '../../../../src/conversation/input/editor-prompt/prompt-document.js';

describe('createPromptDocument', () => {
	it('parses canonical file reference tokens into mention nodes', () => {
		expect(createPromptDocument('Read @{notes/deep work.md}\nthen respond'))
			.toMatchInlineSnapshot(`
				{
				  "content": [
				    {
				      "content": [
				        {
				          "text": "Read ",
				          "type": "text",
				        },
				        {
				          "attrs": {
				            "id": "notes/deep work.md",
				            "label": "notes/deep work.md",
				            "mentionSuggestionChar": "@",
				          },
				          "type": "mention",
				        },
				      ],
				      "type": "paragraph",
				    },
				    {
				      "content": [
				        {
				          "text": "then respond",
				          "type": "text",
				        },
				      ],
				      "type": "paragraph",
				    },
				  ],
				  "type": "doc",
				}
			`);
	});
});

describe('getPromptText', () => {
	it('serializes mention nodes back to canonical file reference tokens', () => {
		const editor = new Editor({
			extensions: [Document, Paragraph, Text, Mention],
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'Read ' },
							createMentionNodeContent({ path: 'notes/deep work.md' }),
						],
					},
				],
			},
		});

		try {
			expect(getPromptText(editor)).toBe('Read @{notes/deep work.md}');
		} finally {
			editor.destroy();
		}
	});
});
