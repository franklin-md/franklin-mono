import {
	formatReferenceMention,
	splitMentionSegments,
	type Reference,
} from '@franklin/agent';
import { isFileReference } from '../reference-mention/support.js';

// TODO: This has an annoying amount of similarity with another remark plugin in this repo, we might look to create utilities out of their overlap

export const REFERENCE_MENTION_ELEMENT_NAME = 'reference-mention';
export const REFERENCE_MENTION_ATTRIBUTE = 'reference';

interface ParentNode {
	children: MarkdownNode[];
}

interface TextNode {
	type: 'text';
	value: string;
}

type MarkdownNode = ParentNode | TextNode | Record<string, unknown>;

function isParentNode(node: unknown): node is ParentNode {
	return (
		typeof node === 'object' &&
		node !== null &&
		'children' in node &&
		Array.isArray(node.children)
	);
}

function isTextNode(node: unknown): node is TextNode {
	return (
		typeof node === 'object' &&
		node !== null &&
		'type' in node &&
		node.type === 'text' &&
		'value' in node &&
		typeof node.value === 'string'
	);
}

function createTextNode(value: string): TextNode {
	return { type: 'text', value };
}

function createReferenceMentionNode(reference: Reference): MarkdownNode {
	const text = reference.label ?? reference.locator;
	return {
		type: 'customElement',
		data: {
			hName: REFERENCE_MENTION_ELEMENT_NAME,
			hProperties: {
				[REFERENCE_MENTION_ATTRIBUTE]: formatReferenceMention(reference),
			},
		},
		children: [{ type: 'text', value: text }],
	};
}

function splitReferenceMentionTextNode(node: TextNode): MarkdownNode[] {
	const segments = splitMentionSegments(node.value);
	const hasReference = segments.some((segment) => segment.type === 'reference');
	if (!hasReference) {
		return [node];
	}

	return segments.map((segment) => {
		switch (segment.type) {
			case 'text':
				return createTextNode(segment.text);
			case 'reference':
				if (isFileReference(segment.reference)) {
					return createReferenceMentionNode(segment.reference);
				}
				// The shared UI mention renderer only supports filesystem references
				// today. Keep unsupported references visible as canonical text until
				// there is a generic reference badge.
				return createTextNode(formatReferenceMention(segment.reference));
		}
	});
}

function transformNode(node: unknown): void {
	if (!isParentNode(node)) {
		return;
	}

	node.children = node.children.flatMap((child) => {
		if (isTextNode(child)) {
			return splitReferenceMentionTextNode(child);
		}

		transformNode(child);
		return [child];
	});
}

export function remarkReferenceMentions() {
	return function transform(tree: unknown) {
		transformNode(tree);
	};
}
