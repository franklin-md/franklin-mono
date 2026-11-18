import type { DirectiveToken } from './types.js';

const DIRECTIVE_PATTERN =
	/:::franklin:([a-z][a-z0-9-]*):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):::/g;

export function scanDirectives(text: string): DirectiveToken[] {
	const tokens: DirectiveToken[] = [];
	for (const match of text.matchAll(DIRECTIVE_PATTERN)) {
		const [token, name, id] = match;
		const from = match.index;
		if (name && id) tokens.push({ name, id, from, to: from + token.length });
	}
	return tokens;
}
