// String tokens are the bridge from prompt text to structured references until
// the ReferenceEngine can convert user content directly.

const FILE_REFERENCE_PATTERN = /@\{([^}\n]+)\}/g;

export const FILE_REFERENCE_TOKEN_TRIGGER = '@';

export interface FileReferenceTokenMatch {
	readonly index: number;
	readonly text: string;
	readonly path: string;
}

export type FileReferenceTextSegment =
	| {
			readonly type: 'text';
			readonly text: string;
	  }
	| {
			readonly type: 'reference';
			readonly token: FileReferenceTokenMatch;
	  };

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

export function splitFileReferenceSegments(
	line: string,
): readonly FileReferenceTextSegment[] {
	const segments: FileReferenceTextSegment[] = [];
	let lastIndex = 0;

	for (const token of findFileReferenceTokens(line)) {
		if (token.index > lastIndex) {
			segments.push({
				type: 'text',
				text: line.slice(lastIndex, token.index),
			});
		}

		segments.push({
			type: 'reference',
			token,
		});
		lastIndex = token.index + token.text.length;
	}

	if (lastIndex < line.length) {
		segments.push({
			type: 'text',
			text: line.slice(lastIndex),
		});
	}

	return segments;
}
