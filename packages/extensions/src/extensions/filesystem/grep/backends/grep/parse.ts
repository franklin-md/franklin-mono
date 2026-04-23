import type { GrepMatch } from '../../format/types.js';

// POSIX grep -rn output lines look like `path:line:text`.

// TODO: Parsing might be ambigious for paths with colons. Is this possibe?
export function parseGrepLine(line: string): GrepMatch | undefined {
	if (!line) return undefined;
	const match = /^([^:]+):(\d+):(.*)$/.exec(line);
	if (!match) return undefined;
	const [, file, lineNumber, text] = match;
	if (file === undefined || lineNumber === undefined || text === undefined) {
		return undefined;
	}
	return {
		file,
		line: Number(lineNumber),
		text,
	};
}
