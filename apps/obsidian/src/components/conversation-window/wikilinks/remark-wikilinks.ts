import { parseWikilink } from '../../../utils/obsidian/wikilinks/parse.js';

const STREAMDOWN_INCOMPLETE_LINK_URL = 'streamdown:incomplete-link';
const SKIPPED_PARENT_TYPES = new Set([
	'code',
	'definition',
	'inlineCode',
	'link',
	'linkReference',
]);

interface ParentNode {
	type?: string;
	children: MarkdownNode[];
}

interface TextNode {
	type: 'text';
	value: string;
}

interface LinkNode {
	type: 'link';
	url: string;
	title: string | null;
	children: MarkdownNode[];
}

interface WikilinkNode {
	type: 'obsidianWikilink';
	data: {
		hName: 'obsidian-wikilink';
		hProperties: {
			dataLinktext: string;
		};
	};
	children: MarkdownNode[];
}

type MarkdownNode =
	| ParentNode
	| TextNode
	| LinkNode
	| WikilinkNode
	| Record<string, unknown>;

export function remarkObsidianWikilinks() {
	return function transform(tree: unknown) {
		if (isParentNode(tree)) transformChildren(tree);
	};
}

function transformChildren(parent: ParentNode) {
	let index = 0;
	while (index < parent.children.length) {
		if (repairIncompleteWikilink(parent, index)) continue;

		const child = parent.children[index];
		if (isTextNode(child)) {
			const rewritten = rewriteText(child.value);
			if (rewritten) {
				parent.children.splice(index, 1, ...rewritten);
				index += rewritten.length;
				continue;
			}
		}

		if (isParentNode(child) && !SKIPPED_PARENT_TYPES.has(child.type ?? '')) {
			transformChildren(child);
		}

		index += 1;
	}
}

function repairIncompleteWikilink(parent: ParentNode, index: number) {
	const current = parent.children[index];
	const previous = parent.children[index - 1];
	if (!isTextNode(previous) || !isIncompleteLinkNode(current)) return false;
	if (!previous.value.endsWith('[')) return false;

	previous.value = `${previous.value}[${getTextContent(current)}`;
	parent.children.splice(index, 1);
	return true;
}

function rewriteText(value: string) {
	const nodes: MarkdownNode[] = [];
	let cursor = 0;
	let searchIndex = 0;
	let hasRewrite = false;

	while (searchIndex < value.length) {
		const openIndex = value.indexOf('[[', searchIndex);
		if (openIndex < 0) break;

		const closeIndex = value.indexOf(']]', openIndex + 2);
		if (closeIndex < 0) break;

		if (openIndex > 0 && value[openIndex - 1] === '!') {
			searchIndex = openIndex + 2;
			continue;
		}

		const raw = value.slice(openIndex, closeIndex + 2);
		const wikilink = parseWikilink(raw);
		if (!wikilink) {
			searchIndex = openIndex + 2;
			continue;
		}

		pushTextNode(nodes, value.slice(cursor, openIndex));
		nodes.push({
			type: 'obsidianWikilink',
			data: {
				hName: 'obsidian-wikilink',
				hProperties: {
					dataLinktext: wikilink.linktext,
				},
			},
			children: [{ type: 'text', value: wikilink.displayText }],
		});

		hasRewrite = true;
		cursor = closeIndex + 2;
		searchIndex = cursor;
	}

	if (!hasRewrite) return undefined;

	pushTextNode(nodes, value.slice(cursor));
	return nodes;
}

function pushTextNode(nodes: MarkdownNode[], value: string) {
	if (value === '') return;
	nodes.push({ type: 'text', value });
}

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

function isIncompleteLinkNode(node: unknown): node is LinkNode {
	return (
		typeof node === 'object' &&
		node !== null &&
		'type' in node &&
		node.type === 'link' &&
		'url' in node &&
		node.url === STREAMDOWN_INCOMPLETE_LINK_URL &&
		'children' in node &&
		Array.isArray(node.children)
	);
}

function getTextContent(node: MarkdownNode): string {
	if (isTextNode(node)) return node.value;
	if (!isParentNode(node)) return '';
	return node.children.map(getTextContent).join('');
}
