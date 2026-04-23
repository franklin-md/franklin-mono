import type { GrepMatch } from '../../format/types.js';

interface RgMatchRecord {
	type: 'match';
	data: {
		path: { text: string };
		line_number: number;
		lines: { text: string };
	};
}

/*
Example output:
{"type":"begin","data":{"path":{"text":"src/app.ts"},"binary_offset":0}}
{"type":"match","data":{"path":{"text":"src/app.ts"},"line_number":12,"lines":{"text":"const greeting = \"hello\";\n"},"absolute_offset":123,"submatches":[{"match":{"text":"hello"},"start":18,"end":23}]}}
{"type":"match","data":{"path":{"text":"src/app.ts"},"line_number":27,"lines":{"text":"console.log(\"hello again\");\n"},"absolute_offset":456,"submatches":[{"match":{"text":"hello"},"start":13,"end":18}]}}
{"type":"end","data":{"path":{"text":"src/app.ts"},"stats":{"elapsed":{"secs":0,"nanos":123456},"matched_lines":2,"matches":2}}}
{"type":"summary","data":{"stats":{"elapsed":{"secs":0,"nanos":234567},"matched_lines":2,"matches":2,"searches":1}}}
*/

function isRgMatch(record: unknown): record is RgMatchRecord {
	if (typeof record !== 'object' || record === null) return false;
	const r = record as { type?: unknown; data?: unknown };
	// Only parse match records
	if (r.type !== 'match') return false;
	const data = r.data as
		| {
				path?: { text?: unknown };
				line_number?: unknown;
				lines?: { text?: unknown };
		  }
		| undefined;
	return (
		!!data &&
		typeof data.path?.text === 'string' &&
		typeof data.line_number === 'number' &&
		typeof data.lines?.text === 'string'
	);
}

export function parseRipgrepJson(stdout: string, limit: number): GrepMatch[] {
	const out: GrepMatch[] = [];
	for (const line of stdout.split('\n')) {
		if (!line) continue;
		let record: unknown;
		try {
			record = JSON.parse(line);
		} catch {
			continue;
		}
		if (!isRgMatch(record)) continue;
		out.push({
			file: record.data.path.text,
			line: record.data.line_number,
			text: record.data.lines.text.replace(/\n$/, ''),
		});
		if (out.length >= limit) break;
	}
	return out;
}
