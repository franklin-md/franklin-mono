import type { Editor, JSONContent } from '@tiptap/core';

import { splitFileReferenceSegments } from '../../file-reference/token.js';

import {
	createMentionNodeContent,
	MENTION_NODE_NAME,
	mentionTextSerializer,
} from './mention/node.js';

function createTextContent(text: string): JSONContent | undefined {
	return text.length > 0 ? { type: 'text', text } : undefined;
}

function parsePromptLine(line: string): JSONContent[] | undefined {
	return splitFileReferenceSegments(line)
		.map((segment) => {
			switch (segment.type) {
				// Requires Mention extension
				case 'reference':
					return createMentionNodeContent({ path: segment.token.path });
				// Requires Text extension
				case 'text':
					return createTextContent(segment.text);
			}
		})
		.filter(Boolean) as JSONContent[];
}

export function createPromptDocument(value: string): JSONContent {
	const lines = value.split('\n');

	return {
		// Requires Document extension
		type: 'doc',
		content: lines.map((line) => {
			const content = parsePromptLine(line);
			// Requires Paragraph extension
			return content ? { type: 'paragraph', content } : { type: 'paragraph' };
		}),
	};
}

export function getPromptText(editor: Editor): string {
	return editor.getText({
		blockSeparator: '\n',
		textSerializers: {
			[MENTION_NODE_NAME]: mentionTextSerializer,
		},
	});
}
