import { afterEach, describe, expect, it } from 'vitest';

import { encodeNdjsonLine } from '../streams/ndjson.js';
import { createJSONServer } from '../http/loopback/server.js';
import { createCallbackServerPipe } from '../http/loopback/stream.js';

import type { HttpCallbackServer } from '../http/loopback/server.js';

describe('createCallbackServerPipe', () => {
	const servers: HttpCallbackServer[] = [];
	const disposers: Array<() => Promise<void>> = [];

	afterEach(async () => {
		while (disposers.length > 0) {
			const dispose = disposers.pop();
			if (dispose) await dispose();
		}

		while (servers.length > 0) {
			const server = servers.pop();
			if (server) await server.dispose();
		}
	});

	it('enqueues requests on the readable stream and returns writable responses', async () => {
		const server = await createJSONServer();
		servers.push(server);

		const { pipe, dispose } = createCallbackServerPipe(server);
		disposers.push(dispose);

		const reader = pipe.readable.getReader();
		const writer = pipe.writable.getWriter();
		const decoder = new TextDecoder();

		const responsePromise = fetch(server.url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tool: 'multiply', arguments: { x: 6, y: 7 } }),
		});

		const { done, value } = await reader.read();
		expect(done).toBe(false);

		const request = JSON.parse(decoder.decode(value)) as {
			id: string;
			body: { tool: string; arguments: { x: number; y: number } };
		};

		expect(request.body).toEqual({
			tool: 'multiply',
			arguments: { x: 6, y: 7 },
		});

		await writer.write(
			encodeNdjsonLine({ id: request.id, result: { product: 42 } }),
		);

		const response = await responsePromise;
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ product: 42 });

		reader.releaseLock();
		writer.releaseLock();
	});
});
