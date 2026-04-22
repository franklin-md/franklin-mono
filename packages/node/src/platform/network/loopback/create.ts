import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer } from 'node:http';

import { createObserver } from '@franklin/lib';
import type {
	ListenLoopbackOptions,
	LoopbackListener,
	LoopbackRequest,
} from '@franklin/lib';
import { buildRequestUrl } from './url.js';
import { listen } from './listen.js';
import { normalizeHeaders } from './headers.js';
import { createPendingRegistry } from './pending.js';
import { readBody } from './read-body.js';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PATH = '/callback';

export async function createLoopbackListener(
	options: ListenLoopbackOptions = {},
): Promise<LoopbackListener> {
	const host = options.host ?? DEFAULT_HOST;
	const path = options.path ?? DEFAULT_PATH;

	const observer = createObserver<[LoopbackRequest]>();
	const pending = createPendingRegistry();

	const handleRequest = async (
		request: IncomingMessage,
		response: ServerResponse,
	): Promise<void> => {
		const id = pending.track(response);
		response.on('close', () => pending.clear(id));

		const body = await readBody(request);
		observer.notify({
			id,
			method: request.method ?? 'GET',
			url: buildRequestUrl(request, host, boundPort),
			headers: normalizeHeaders(request.headers),
			...(body !== undefined ? { body } : {}),
		});
	};

	const server = createServer((request, response) => {
		void handleRequest(request, response);
	});

	const boundPort = await listen(server, options.port ?? 0, host);

	return {
		async getRedirectUri() {
			return `http://${host}:${boundPort}${path}`;
		},
		onRequest(callback) {
			return observer.subscribe(callback);
		},
		async respond(id, payload) {
			pending.respond(id, payload);
		},
		async dispose() {
			await new Promise<void>((resolve) => {
				server.close(() => resolve());
				pending.destroyAll();
			});
		},
	};
}
