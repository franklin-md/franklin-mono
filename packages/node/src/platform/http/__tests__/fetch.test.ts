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
});

async function startServer(
	servers: HttpTestServer[],
	handler: Parameters<typeof createHttpTestServer>[0],
): Promise<HttpTestServer> {
	const server = await createHttpTestServer(handler);
	servers.push(server);
	return server;
}
