import { parser } from '@lezer/markdown';
import type { DirectiveToken } from './types.js';

const DIRECTIVE_PATTERN =
	/:::franklin:([a-z][a-z0-9-]*):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):::/g;
const FRONTMATTER_PATTERN =
	/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/;
const LITERAL_NODES = new Set([
	'InlineCode',
	'FencedCode',
	'CodeBlock',
	'HTMLBlock',
	'HTMLTag',
	'URL',
	'Autolink',
]);

export function parseDirectives(source: string): DirectiveToken[] {
	const matches = [...source.matchAll(DIRECTIVE_PATTERN)];
	if (matches.length === 0) return [];
	const tree = parser.parse(source);
	const frontmatterEnd = FRONTMATTER_PATTERN.exec(source)?.[0].length ?? 0;

	function isLiteral(from: number): boolean {
		if (from < frontmatterEnd) return true;
		let start = from;
		while (source[start - 1] === '\\') start--;
		if ((from - start) % 2 !== 0) return true;
		const cursor = tree.resolveInner(from, 1).cursor();
		do {
			if (LITERAL_NODES.has(cursor.name)) return true;
		} while (cursor.parent());
		return false;
	}

	const tokens: DirectiveToken[] = [];
	for (const match of matches) {
		const [text, name, id] = match;
		const from = match.index;
		if (name && id && !isLiteral(from))
			tokens.push({ name, id, from, to: from + text.length });
	}
	return tokens;
}
