import { splitFileReferenceSegments } from './token.js';

// TODO: This has an annoying amount of similarity with another remark plugin in this repo, we might look to create utilities out of their overlap

export const FILE_REFERENCE_ELEMENT_NAME = 'file-reference';
export const FILE_REFERENCE_PATH_ATTRIBUTE = 'path';

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

function createFileReferenceNode(path: string): MarkdownNode {
	return {
		type: 'customElement',
		data: {
			hName: FILE_REFERENCE_ELEMENT_NAME,
			hProperties: {
				[FILE_REFERENCE_PATH_ATTRIBUTE]: path,
			},
		},
		children: [{ type: 'text', value: path }],
	};
}

function splitFileReferenceTextNode(node: TextNode): MarkdownNode[] {
	const segments = splitFileReferenceSegments(node.value);
	const hasReference = segments.some((segment) => segment.type === 'reference');
	if (!hasReference) {
		return [node];
	}

	return segments.map((segment) =>
		segment.type === 'text'
			? createTextNode(segment.text)
			: createFileReferenceNode(segment.token.path),
	);
}

function transformNode(node: unknown): void {
	if (!isParentNode(node)) {
		return;
	}

	node.children = node.children.flatMap((child) => {
		if (isTextNode(child)) {
			return splitFileReferenceTextNode(child);
		}

		transformNode(child);
		return [child];
	});
}

export function remarkFileReferences() {
	return function transform(tree: unknown) {
		transformNode(tree);
	};
}
