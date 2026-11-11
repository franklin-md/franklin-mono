import { parser } from '@lezer/markdown';
import type { DirectiveToken } from './types.js';

export function parseDirectives(source: string): DirectiveToken[] {
	const tokens: DirectiveToken[] = [];
	const pattern =
		/:::franklin:([a-z][a-z0-9-]*):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):::/g;
	const candidates = [...source.matchAll(pattern)];
	if (candidates.length === 0) return tokens;
	const tree = parser.parse(source);
	const frontmatter =
		/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/.exec(source);
	for (const match of candidates) {
		const [, name, id] = match;
		if (!name || !id) continue;
		const from = match.index;
		if (frontmatter && from < frontmatter[0].length) continue;
		let slashes = 0;
		for (let i = from - 1; source[i] === '\\'; i--) slashes++;
		if (slashes % 2 !== 0) continue;
		let node = tree.resolveInner(from, 1);
		let literal = false;
		for (;;) {
			if (
				[
					'InlineCode',
					'FencedCode',
					'CodeBlock',
					'HTMLBlock',
					'HTMLTag',
					'URL',
					'Autolink',
				].includes(node.name)
			) {
				literal = true;
				break;
			}
			if (!node.parent) break;
			node = node.parent;
		}
		if (!literal)
			tokens.push({
				name,
				id,
				from,
				to: from + match[0].length,
			});
	}
	return tokens;
}
