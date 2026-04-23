import type { GrepMatch } from '../../format/types.js';

// POSIX grep -rn output lines look like `path:line:text`.

// TODO: Parsing might be ambigious for paths with colons. Is this possibe?
export function parseGrepOutput(stdout: string, limit: number): GrepMatch[] {
	const out: GrepMatch[] = [];
	for (const line of stdout.split('\n')) {
		if (!line) continue;
		const match = /^([^:]+):(\d+):(.*)$/.exec(line);
		if (!match) continue;
		const [, file, lineNumber, text] = match;
		if (file === undefined || lineNumber === undefined || text === undefined) {
			continue;
		}
		out.push({
			file,
			line: Number(lineNumber),
			text,
		});
		if (out.length >= limit) break;
	}
	return out;
}
