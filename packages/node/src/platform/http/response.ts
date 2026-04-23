// A Response-shaped adapter for `nodeHttpFetch`.
//
// We deliberately do NOT pass a node-world `ReadableStream` (from
// `node:stream/web` via `Readable.toWeb`) to the ambient `new Response(...)`.
// In an Electron renderer, `globalThis.Response` is Chromium's DOM Response
// and brand-checks the body against the renderer's DOM `ReadableStream`; a
// Node-world stream fails that check, falls through to string coercion, and
// becomes the literal text `"[object ReadableStream]"`. That breaks both
// SSE streaming and buffered `.text()` / `.json()` consumers.
//
// See `.context/node-http-fetch-shape-survey.md` for the full write-up.

type ResponseInitLike = {
	url: string;
	status: number;
	statusText: string;
	headers: Headers;
};

export function createFetchResponse(
	body: ReadableStream<Uint8Array<ArrayBuffer>> | null,
	init: ResponseInitLike,
): Response {
	let exposedBody = body;
	let bodyUsed = false;

	const consume = async (): Promise<Uint8Array<ArrayBuffer>> => {
		if (bodyUsed) {
			throw new TypeError('Body has already been consumed.');
		}
		bodyUsed = true;
		if (!exposedBody) return new Uint8Array();
		const bytes = await drainStream(exposedBody);
		exposedBody = null;
		return bytes;
	};

	const adapter: Response = {
		get url() {
			return init.url;
		},
		get status() {
			return init.status;
		},
		get statusText() {
			return init.statusText;
		},
		get headers() {
			return init.headers;
		},
		get ok() {
			return init.status >= 200 && init.status < 300;
		},
		get redirected() {
			return false;
		},
		get type() {
			return 'default' as const;
		},
		get body() {
			return exposedBody;
		},
		get bodyUsed() {
			return bodyUsed;
		},
		async text() {
			const bytes = await consume();
			return new TextDecoder().decode(bytes);
		},
		async json() {
			const bytes = await consume();
			return JSON.parse(new TextDecoder().decode(bytes));
		},
		async arrayBuffer() {
			return (await consume()).buffer;
		},
		async bytes() {
			return consume();
		},
		async blob() {
			const bytes = await consume();
			const type = init.headers.get('content-type') ?? '';
			return new Blob([bytes], { type });
		},
		formData(): Promise<FormData> {
			return Promise.reject(
				new Error('formData() is not supported by nodeHttpFetch'),
			);
		},
		clone(): Response {
			throw new Error('clone() is not supported by nodeHttpFetch');
		},
	} as Response;

	return adapter;
}

async function drainStream(
	stream: ReadableStream<Uint8Array<ArrayBuffer>>,
): Promise<Uint8Array<ArrayBuffer>> {
	const reader = stream.getReader();
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
			total += value.byteLength;
		}
	} finally {
		try {
			reader.releaseLock();
		} catch {
			// Ignore release errors from already-released readers.
		}
	}
	const out = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return out;
}
