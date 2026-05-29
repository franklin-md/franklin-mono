import type { JSONContent, TextSerializer } from '@tiptap/core';
import type { MentionNodeAttrs } from '@tiptap/extension-mention';
import {
	MENTION_TRIGGER,
	formatReferenceMention,
	parseReferenceMention,
	type Reference,
} from '@franklin/agent';
import type { FileReferenceItem } from '@franklin/react';
import { isFileReference } from '../../../reference-mention/support.js';

export { MENTION_TRIGGER };
export const MENTION_NODE_NAME = 'mention';

export function getMentionReference(
	attrs: Partial<Pick<MentionNodeAttrs, 'id' | 'label'>>,
): Reference | undefined {
	const id = attrs.id;
	if (typeof id === 'string' && id.length > 0) {
		return parseReferenceMention(id);
	}
	return undefined;
}

export function createFileReferenceMentionAttrs(
	item: FileReferenceItem,
): MentionNodeAttrs {
	const reference = createFileReference(item);
	return {
		id: formatReferenceMention(reference),
		label: reference.label,
		mentionSuggestionChar: MENTION_TRIGGER,
	};
}

export function createFileReferenceMentionNodeContent(
	reference: Reference,
): JSONContent | undefined {
	if (!isFileReference(reference)) {
		// The editor mention node currently renders filesystem references only.
		// Preserve unsupported references as text at parser call sites until there
		// is a generic reference badge.
		return undefined;
	}

	return {
		type: MENTION_NODE_NAME,
		attrs: {
			id: formatReferenceMention(reference),
			label: reference.label ?? reference.locator,
			mentionSuggestionChar: MENTION_TRIGGER,
		},
	};
}

export function formatMentionText(
	attrs: Partial<Pick<MentionNodeAttrs, 'id' | 'label'>>,
): string {
	const reference = getMentionReference(attrs);
	return reference ? formatReferenceMention(reference) : '';
}

export const mentionTextSerializer: TextSerializer = ({ node }) =>
	formatMentionText(node.attrs);

function createFileReference(item: FileReferenceItem): Reference {
	return {
		type: 'file',
		locator: item.path,
		label: item.path,
	};
}
