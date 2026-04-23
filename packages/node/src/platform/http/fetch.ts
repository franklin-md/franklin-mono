import { Readable } from 'node:stream';
import nodeFetch from 'node-fetch';

// HEAD and these status codes carry no body per the fetch spec.
const NULL_BODY_METHODS = new Set(['HEAD']);
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

// This is effectively the concrete ambient fetch that node has BUT can be used in environments that build Node externals BUT
// do not necessarily use Node globals.
// It is not the same as undici because
// (and we need to fact check this)
// Undici is also implemented in terms of some ambient Node methods and types.
// For example, timeouts use Node ref timeouts as opposed to the web int timeouts.
// This means undici cannot be used in a browser environment EVEN IF Node externals are built (like in Obsidian).
export const nodeHttpFetch: typeof fetch = async (input, init) => {
	// node-fetch uses its own Request class; extract URL and method/headers from
	// a global Request so we can pass them as plain init fields.
	const url = input instanceof Request ? input.url : input;
	const mergedInit =
		input instanceof Request
			? { method: input.method, headers: input.headers, ...init }
			: init;

	const r = await nodeFetch(
		url as string,
		mergedInit as Parameters<typeof nodeFetch>[1],
	);

	const method = (mergedInit?.method ?? 'GET').toUpperCase();
	const hasBody =
		!NULL_BODY_METHODS.has(method) && !NULL_BODY_STATUSES.has(r.status);
	const body =
		hasBody && r.body
			? (Readable.toWeb(r.body) as ReadableStream<Uint8Array>)
			: null;

	const response = new Response(body, {
		status: r.status,
		statusText: r.statusText,
		headers: Object.fromEntries(r.headers.entries()),
	});
	Object.defineProperty(response, 'url', { value: r.url, configurable: true });
	return response;
};
