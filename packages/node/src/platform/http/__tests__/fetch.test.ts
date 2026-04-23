import { afterEach, describe, expect, it } from 'vitest';

import {
	createHttpTestServer,
	type HttpTestServer,
} from '../../../__tests__/test-helpers/http.js';
import { nodeHttpFetch } from '../fetch.js';

describe('nodeHttpFetch', () => {
	const servers: HttpTestServer[] = [];

	afterEach(async () => {
		await Promise.all(servers.map((server) => server.close()));
		servers.length = 0;
	});

	it('returns a Response with url, status, statusText, headers, and body', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(201, 'Created By Server', {
				'content-type': 'text/plain',
			});
			response.end('hello');
		});

		const response = await nodeHttpFetch(server.url('/hello'), {
			redirect: 'manual',
		});

		expect(response.url).toBe(server.url('/hello'));
		expect(response.status).toBe(201);
		expect(response.statusText).toBe('Created By Server');
		expect(response.headers.get('content-type')).toBe('text/plain');
		expect(await response.text()).toBe('hello');
	});

	it('preserves null bodies for HEAD requests', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(200, 'OK', {
				'content-type': 'text/plain',
			});
			response.end('ignored');
		});

		const response = await nodeHttpFetch(server.url('/head'), {
			method: 'HEAD',
		});

		expect(response.status).toBe(200);
		expect(response.body).toBeNull();
	});

	it('accepts a global Request object by extracting the URL and method', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(200, 'OK');
			response.end('from request');
		});

		const response = await nodeHttpFetch(new Request(server.url('/req')));

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('from request');
	});

	it('computes ok from the status code', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(503, 'Service Unavailable');
			response.end('nope');
		});

		const okResponse = await nodeHttpFetch(
			(
				await startServer(servers, (_req, res) => {
					res.writeHead(200);
					res.end('yes');
				})
			).url('/'),
		);
		expect(okResponse.ok).toBe(true);

		const badResponse = await nodeHttpFetch(server.url('/fail'));
		expect(badResponse.ok).toBe(false);
		expect(badResponse.status).toBe(503);
	});

	it('decodes JSON response bodies via .json()', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(200, 'OK', { 'content-type': 'application/json' });
			response.end(JSON.stringify({ access_token: 'abc', expires_in: 42 }));
		});

		const response = await nodeHttpFetch(server.url('/token'));
		const data = (await response.json()) as {
			access_token: string;
			expires_in: number;
		};

		expect(data.access_token).toBe('abc');
		expect(data.expires_in).toBe(42);
	});

	it('decodes error bodies via .text() without pre-wrapping the body stream', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(429, 'Too Many Requests', {
				'content-type': 'text/plain',
			});
			response.end('slow down');
		});

		const response = await nodeHttpFetch(server.url('/rate-limit'));
		expect(response.ok).toBe(false);
		expect(await response.text()).toBe('slow down');
	});

	it('exposes a WHATWG body stream usable via getReader() for SSE consumers', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(200, 'OK', { 'content-type': 'text/event-stream' });
			response.write('data: chunk-1\n\n');
			response.write('data: chunk-2\n\n');
			response.end();
		});

		const response = await nodeHttpFetch(server.url('/sse'));
		const body = response.body as ReadableStream<Uint8Array> | null;
		expect(body).not.toBeNull();
		if (body === null) throw new Error('expected body');

		const reader = body.getReader();
		const decoder = new TextDecoder();
		let received = '';
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			expect(value).toBeInstanceOf(Uint8Array);
			received += decoder.decode(value, { stream: true });
		}
		received += decoder.decode();

		expect(received).toContain('data: chunk-1');
		expect(received).toContain('data: chunk-2');
	});

	it('returns the raw bytes via .arrayBuffer() and .bytes()', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(200, 'OK', {
				'content-type': 'application/octet-stream',
			});
			response.end(Buffer.from([0x01, 0x02, 0x03, 0x04]));
		});

		const r1 = await nodeHttpFetch(server.url('/bytes'));
		const buffer = await r1.arrayBuffer();
		expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3, 4]));

		const r2 = await nodeHttpFetch(server.url('/bytes'));
		const bytes = await r2.bytes();
		expect(bytes).toEqual(new Uint8Array([1, 2, 3, 4]));
	});

	it('sets bodyUsed after consumption and rejects second reads', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(200, 'OK', { 'content-type': 'text/plain' });
			response.end('once');
		});

		const response = await nodeHttpFetch(server.url('/'));
		expect(response.bodyUsed).toBe(false);
		expect(await response.text()).toBe('once');
		expect(response.bodyUsed).toBe(true);

		await expect(response.text()).rejects.toThrow(/already/i);
	});

	it('returns an empty string for .text() on null-body responses', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(204, 'No Content');
			response.end();
		});

		const response = await nodeHttpFetch(server.url('/no-content'), {
			method: 'HEAD',
		});
		expect(response.body).toBeNull();
		expect(await response.text()).toBe('');
	});

	it('does NOT coerce the body to "[object ReadableStream]" (Electron renderer regression)', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(200, 'OK', { 'content-type': 'application/json' });
			response.end(JSON.stringify({ hello: 'world' }));
		});

		const response = await nodeHttpFetch(server.url('/check'));
		const text = await response.text();
		expect(text).not.toBe('[object ReadableStream]');
		expect(text).toContain('hello');
	});
});

async function startServer(
	servers: HttpTestServer[],
	handler: Parameters<typeof createHttpTestServer>[0],
): Promise<HttpTestServer> {
	const server = await createHttpTestServer(handler);
	servers.push(server);
	return server;
}
