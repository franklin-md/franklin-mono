import type { JSONContent, TextSerializer } from '@tiptap/core';
import type { MentionNodeAttrs } from '@tiptap/extension-mention';
import type { FileReferenceItem } from '@franklin/react';

import {
	REFERENCE_TOKEN_TRIGGER,
	formatReferenceToken,
} from './reference-token.js';

export const MENTION_TRIGGER = REFERENCE_TOKEN_TRIGGER;
export const MENTION_NODE_NAME = 'mention';

export function getMentionPath(
	attrs: Partial<Pick<MentionNodeAttrs, 'id' | 'label'>>,
): string {
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

export function createMentionAttrs(item: FileReferenceItem): MentionNodeAttrs {
	return {
		id: item.path,
		label: item.path,
		mentionSuggestionChar: MENTION_TRIGGER,
	};
}

export function createMentionNodeContent(item: FileReferenceItem): JSONContent {
	return {
		type: MENTION_NODE_NAME,
		attrs: createMentionAttrs(item),
	};
}

export const mentionTextSerializer: TextSerializer = ({ node }) => {
	const path = getMentionPath(node.attrs);
	return path.length > 0 ? formatReferenceToken(path) : '';
};
