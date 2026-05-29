import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import { Mention } from '@tiptap/extension-mention';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { describe, expect, it } from 'vitest';

import { formatReferenceMention } from '@franklin/agent';

import { createFileReferenceMentionNodeContent } from '../../../../src/conversation/input/editor-prompt/mention/node.js';
import {
	createPromptDocument,
	getPromptText,
} from '../../../../src/conversation/input/editor-prompt/prompt-document.js';

describe('createPromptDocument', () => {
	it('parses canonical file reference tokens into mention nodes', () => {
		const reference = {
			locator: 'notes/deep work.md',
			label: 'notes/deep work.md',
		};
		const mention = formatReferenceMention(reference);

		expect(createPromptDocument(`Read ${mention}\nthen respond`)).toEqual({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Read ' },
						{
							type: 'mention',
							attrs: {
								id: mention,
								label: 'notes/deep work.md',
								mentionSuggestionChar: '@',
							},
						},
					],
				},
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'then respond' }],
				},
			],
		});
	});

	it('preserves non-file reference tokens as text', () => {
		const reference = {
			locator: 'linear://issue/FRA-123',
			label: 'Inline Context',
		};
		const mention = formatReferenceMention(reference);

		expect(createPromptDocument(`Read ${mention}`)).toEqual({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Read ' },
						{ type: 'text', text: mention },
					],
				},
			],
		});
	});
});

describe('getPromptText', () => {
	it('serializes mention nodes back to canonical file reference tokens', () => {
		const reference = {
			locator: 'notes/deep work.md',
			label: 'notes/deep work.md',
		};
		const editor = new Editor({
			extensions: [Document, Paragraph, Text, Mention],
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'Read ' },
							createFileReferenceMentionNodeContent(reference)!,
						],
					},
				],
			},
		});

		try {
			expect(getPromptText(editor)).toBe(
				`Read ${formatReferenceMention(reference)}`,
			);
		} finally {
			editor.destroy();
		}
	});
});
