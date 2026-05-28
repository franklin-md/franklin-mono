import type { JSONContent, TextSerializer } from '@tiptap/core';
import type { MentionNodeAttrs } from '@tiptap/extension-mention';
import type { FileReferenceItem } from '@franklin/react';

import {
	FILE_REFERENCE_TOKEN_TRIGGER,
	formatFileReferenceToken,
} from './file-reference-token.js';

export const FILE_MENTION_TRIGGER = FILE_REFERENCE_TOKEN_TRIGGER;
export const FILE_MENTION_NODE_NAME = 'mention';

interface FileMentionAttrsLike {
	readonly id?: unknown;
	readonly label?: unknown;
}

export function getFileMentionPath(attrs: FileMentionAttrsLike): string {
	const id = attrs.id;
	const label = attrs.label;

	if (typeof id === 'string' && id.length > 0) {
		return id;
	}
	if (typeof label === 'string' && label.length > 0) {
		return label;
	}
	return '';
}

export function createFileMentionAttrs(
	item: FileReferenceItem,
): MentionNodeAttrs {
	return {
		id: item.path,
		label: item.path,
		mentionSuggestionChar: FILE_MENTION_TRIGGER,
	};
}

export function createFileMentionNodeContent(
	item: FileReferenceItem,
): JSONContent {
	return {
		type: FILE_MENTION_NODE_NAME,
		attrs: createFileMentionAttrs(item),
	};
}

export const fileMentionTextSerializer: TextSerializer = ({ node }) => {
	const path = getFileMentionPath(node.attrs);
	return path.length > 0 ? formatFileReferenceToken(path) : '';
};
