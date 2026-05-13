import { is } from 'unist-util-is';
import { SKIP, visit } from 'unist-util-visit';

import { parseWikilink } from '../../../utils/obsidian/wikilinks/parse.js';
import type { ParsedWikilink } from '../../../utils/obsidian/wikilinks/types.js';
import type { Literal, Parent } from 'unist';

interface TextNode extends Literal {
	type: 'text';
	value: string;
}

interface WikilinkNode extends Parent {
	type: 'obsidianWikilink';
	data: {
		hName: 'obsidian-wikilink';
		hProperties: {
			linktext: string;
		};
	};
	children: TextNode[];
}

type ReplacementNode = TextNode | WikilinkNode;

// Algorithm: Replace all `[[X]]` (not in a codeblock) with a wikilink node that we render with link.tsx
const WIKILINK_PATTERN = /\[\[[\s\S]*?\]\]/g;
// Wikilinks inside code and existing link contexts are intentionally preserved
// as literal text unless we define an explicit opt-in rendering contract.
const SKIPPED_PARENT_TYPES = new Set([
	'code',
	'definition',
	'inlineCode',
	'link',
	'linkReference',
]);

export function remarkObsidianWikilinks() {
	return function transform(tree: unknown) {
		if (!isParentNode(tree)) return;

		visit(tree, (node, index, parent) => {
			if (SKIPPED_PARENT_TYPES.has(node.type)) return SKIP;
			if (!isTextNode(node) || index === undefined || parent === undefined) {
				return;
			}

			const rewritten = replaceWikilinksInText(node.value);
			if (rewritten.length === 0) return;

			parent.children.splice(index, 1, ...rewritten);
			return [SKIP, index + rewritten.length];
		});
	};
}

function replaceWikilinksInText(value: string): ReplacementNode[] {
	const nodes: ReplacementNode[] = [];
	let cursor = 0;
	let hasRewrite = false;

	for (const match of value.matchAll(WIKILINK_PATTERN)) {
		const raw = match[0];
		const index = match.index;
		if (index > 0 && value[index - 1] === '!') {
			continue;
		}

		const wikilink = parseWikilink(raw);
		if (!wikilink) {
			continue;
		}

		pushTextNode(nodes, value.slice(cursor, index));
		nodes.push(createWikilinkNode(wikilink));

		hasRewrite = true;
		cursor = index + raw.length;
	}

	if (!hasRewrite) return [];

	pushTextNode(nodes, value.slice(cursor));
	return nodes;
}

function createWikilinkNode(wikilink: ParsedWikilink): WikilinkNode {
	return {
		type: 'obsidianWikilink',
		data: {
			hName: 'obsidian-wikilink',
			hProperties: {
				linktext: wikilink.linktext,
			},
		},
		children: [{ type: 'text', value: wikilink.displayText }],
	};
}

function pushTextNode(nodes: ReplacementNode[], value: string) {
	if (value === '') return;
	nodes.push({ type: 'text', value });
}

function isParentNode(node: unknown): node is Parent {
	return (
		is(node) &&
		'children' in node &&
		Array.isArray((node as Partial<Parent>).children)
	);
}

function isTextNode(node: unknown): node is TextNode {
	return is(node, 'text');
}
