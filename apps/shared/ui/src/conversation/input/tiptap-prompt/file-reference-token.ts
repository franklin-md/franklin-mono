const FILE_REFERENCE_PATTERN = /@\{([^}\n]+)\}/g;

export const FILE_REFERENCE_TOKEN_TRIGGER = '@';

export interface FileReferenceTokenMatch {
	readonly index: number;
	readonly text: string;
	readonly path: string;
}

export function formatFileReferenceToken(path: string): string {
	return `${FILE_REFERENCE_TOKEN_TRIGGER}{${path}}`;
}

export function findFileReferenceTokens(
	line: string,
): readonly FileReferenceTokenMatch[] {
	const tokens: FileReferenceTokenMatch[] = [];

	for (const match of line.matchAll(FILE_REFERENCE_PATTERN)) {
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
