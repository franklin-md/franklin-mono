import { decorate, withRedirect } from '@franklin/lib';
import { afterEach, describe, expect, it } from 'vitest';

import {
	createHttpTestServer,
	type HttpTestServer,
} from './test-helpers/http.js';
import { nodePlatformFetch } from '../platform/fetch.js';

describe('nodePlatformFetch', () => {
	const servers: HttpTestServer[] = [];

	afterEach(async () => {
		await Promise.all(servers.map((server) => server.close()));
		servers.length = 0;
	});

	it('materializes the response body into a Uint8Array', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(200, 'OK', {
				'content-type': 'text/plain',
			});
			response.end('hello');
		});

		const response = await nodePlatformFetch({
			url: server.url('/body'),
			method: 'GET',
		});

		expect(response.body).toBeInstanceOf(Uint8Array);
		expect(new TextDecoder().decode(response.body)).toBe('hello');
	});

	it('preserves status text from the fetch-like wrapper', async () => {
		const server = await startServer(servers, (_request, response) => {
			response.writeHead(201, 'Created By Server', {
				'content-type': 'text/plain',
			});
			response.end('created');
		});

		const response = await nodePlatformFetch({
			url: server.url('/status'),
			method: 'GET',
		});

		expect(response.status).toBe(201);
		expect(response.statusText).toBe('Created By Server');
	});

	it('works with withRedirect by surfacing each redirect hop unchanged', async () => {
		const seenPaths: string[] = [];
		const server = await startServer(servers, (request, response) => {
			const path = request.url ?? '/';
			seenPaths.push(path);

			if (path === '/start') {
				response.writeHead(302, 'Found', { Location: '/middle' });
				response.end();
				return;
			}

			if (path === '/middle') {
				response.writeHead(302, 'Found', { Location: '/final' });
				response.end();
				return;
			}

			response.writeHead(200, 'OK', {
				'content-type': 'text/plain',
			});
			response.end('done');
		});
		const fetch = decorate(nodePlatformFetch).with(withRedirect(5)).build();

		const response = await fetch({
			url: server.url('/start'),
			method: 'GET',
		});

		expect(response.status).toBe(200);
		expect(response.url).toBe(server.url('/final'));
		expect(new TextDecoder().decode(response.body)).toBe('done');
		expect(seenPaths).toEqual(['/start', '/middle', '/final']);
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
