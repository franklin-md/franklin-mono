const REFERENCE_PATTERN = /@\{([^}\n]+)\}/g;

export const REFERENCE_TOKEN_TRIGGER = '@';

export interface ReferenceTokenMatch {
	readonly index: number;
	readonly text: string;
	readonly path: string;
}

export function formatReferenceToken(path: string): string {
	return `${REFERENCE_TOKEN_TRIGGER}{${path}}`;
}

export function findReferenceTokens(
	line: string,
): readonly ReferenceTokenMatch[] {
	const tokens: ReferenceTokenMatch[] = [];

	for (const match of line.matchAll(REFERENCE_PATTERN)) {
		const text = match[0];
		const path = match[1];

		if (path === undefined || path.length === 0) {
			continue;
		}

		tokens.push({
			index: match.index,
			text,
			path,
		});
	}

	return tokens;
}
