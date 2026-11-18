import { parseDirectives } from '../../../../shared/directives/syntax/parse.js';
import type { DirectiveToken } from '../../../../shared/directives/syntax/types.js';

import { draftEnd } from './end.js';

export function findQuickEditDraft(
	source: string,
	id: string,
	tokens: readonly DirectiveToken[] = parseDirectives(source),
) {
	const matches = tokens.filter(
		(token) => token.name === 'quick-edit' && token.id === id,
	);
	if (matches.length !== 1) return undefined;
	const token = matches[0];
	if (!token) return undefined;
	const marker = draftEnd(id);
	const end = source.indexOf(marker, token.to);
	if (end < 0 || source.indexOf(marker, end + marker.length) >= 0)
		return undefined;
	return {
		from: token.from,
		promptFrom: token.to,
		promptTo: end,
		to: end + marker.length,
	};
}
