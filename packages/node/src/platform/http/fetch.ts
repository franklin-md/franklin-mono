import { Readable } from 'node:stream';
import nodeFetch from 'node-fetch';

import { createFetchResponse } from './response.js';

// HEAD and these status codes carry no body per the fetch spec.
const NULL_BODY_METHODS = new Set(['HEAD']);
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

// node-fetch uses node:http/https as its transport and does not call .unref()
// on globalThis.setTimeout return values. This makes it safe in Electron renderer,
// where node:* externals are available but globalThis.setTimeout returns a plain
// browser integer (no .unref()), not a Node Timeout object.
//
// Node's own globalThis.fetch is backed by undici, which calls
// globalThis.setTimeout().unref() in its fast-clock. That crashes in Electron
// renderer because browser timers don't have .unref(). Undici also has HTTP/2
// and Brotli stream-completion bugs in this environment. Hence this wrapper.
//
// We intentionally do not wrap the body with `new Response(...)`. See
// `response.ts` for the renderer stream-brand gotcha that motivates the
// hand-rolled adapter.
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
			? (Readable.toWeb(r.body) as ReadableStream<Uint8Array<ArrayBuffer>>)
			: null;

	return createFetchResponse(body, {
		url: r.url,
		status: r.status,
		statusText: r.statusText,
		headers: new Headers(Object.fromEntries(r.headers.entries())),
	});
};
