import type { IncomingHttpHeaders } from 'node:http';

export function normalizeHeaders(
	headers: IncomingHttpHeaders,
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		if (value === undefined) continue;
		out[key] = Array.isArray(value) ? value.join(', ') : value;
	}
	return out;
}
