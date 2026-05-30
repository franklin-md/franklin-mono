import type { JSONContent, TextSerializer } from '@tiptap/core';
import type { MentionNodeAttrs } from '@tiptap/extension-mention';
import type { FileIndexItem } from '@franklin/react';
import {
	MENTION_TRIGGER,
	formatReferenceMention,
	parseReferenceMention,
	type Reference,
} from '@franklin/agent';
import { isFileReference } from '../../../reference-mention/support.js';

type FilePathItem = Pick<FileIndexItem, 'path'>;

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
	item: FilePathItem,
): MentionNodeAttrs {
	return createReferenceMentionAttrs(createFileReference(item));
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
		attrs: createReferenceMentionAttrs(reference),
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

function createFileReference(item: FilePathItem): Reference {
	return {
		locator: item.path,
		label: item.path,
	};
}

function createReferenceMentionAttrs(reference: Reference): MentionNodeAttrs {
	return {
		id: formatReferenceMention(reference),
		label: reference.label ?? reference.locator,
		mentionSuggestionChar: MENTION_TRIGGER,
	};
}
