import type { Editor, JSONContent } from '@tiptap/core';
import { formatReferenceMention, splitMentionSegments } from '@franklin/agent';
import { isFileReference } from '../../reference-mention/support.js';

import {
	createFileReferenceMentionNodeContent,
	MENTION_NODE_NAME,
	mentionTextSerializer,
} from './mention/node.js';

function createTextContent(text: string): JSONContent | undefined {
	return text.length > 0 ? { type: 'text', text } : undefined;
}

function parsePromptLine(line: string): JSONContent[] | undefined {
	return splitMentionSegments(line)
		.map((segment) => {
			switch (segment.type) {
				// Requires Mention extension
				case 'reference':
					if (isFileReference(segment.reference)) {
						return createFileReferenceMentionNodeContent(segment.reference);
					}
					// The editor mention node currently renders filesystem references
					// only. Preserve unsupported reference mentions as canonical text
					// until there is a generic reference badge.
					return createTextContent(formatReferenceMention(segment.reference));
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
