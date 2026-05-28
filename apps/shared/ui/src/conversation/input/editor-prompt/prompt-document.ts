import type { Editor, JSONContent } from '@tiptap/core';

import {
	createMentionNodeContent,
	MENTION_NODE_NAME,
	mentionTextSerializer,
} from './mention/node.js';
import { findReferenceTokens } from './mention/reference-token.js';

function createTextContent(text: string): JSONContent | undefined {
	return text.length > 0 ? { type: 'text', text } : undefined;
}

function parsePromptLine(line: string): JSONContent[] | undefined {
	const content: JSONContent[] = [];
	let lastIndex = 0;

	for (const token of findReferenceTokens(line)) {
		const before = createTextContent(line.slice(lastIndex, token.index));
		if (before) {
			content.push(before);
		}

		content.push(createMentionNodeContent({ path: token.path }));
		lastIndex = token.index + token.text.length;
	}

	const rest = createTextContent(line.slice(lastIndex));
	if (rest) {
		content.push(rest);
	}

	return content.length > 0 ? content : undefined;
}

export function createPromptDocument(value: string): JSONContent {
	const lines = value.split('\n');

	return {
		type: 'doc',
		content: lines.map((line) => {
			const content = parsePromptLine(line);
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
