import { parseDirectives } from '../syntax/parse.js';
import type { DirectiveReference, DirectiveToken } from '../syntax/types.js';

export function findDirectiveRanges(
	source: string,
	reference: DirectiveReference,
): DirectiveToken[] {
	return parseDirectives(source).filter(
		(token) => token.name === reference.name && token.id === reference.id,
	);
}
