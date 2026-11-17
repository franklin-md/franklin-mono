import { parser } from '@lezer/markdown';
import { scanDirectives } from './scan.js';
import type { DirectiveToken } from './types.js';

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
	const matches = scanDirectives(source);
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

	return matches.filter(({ from }) => !isLiteral(from));
}
