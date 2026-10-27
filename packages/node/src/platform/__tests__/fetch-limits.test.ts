import { afterEach, describe, expect, it, vi } from 'vitest';
import { decorate, withRedirect } from '@franklin/lib';
import { nodePlatformFetch } from '../fetch.js';
import {
	createHttpTestServer,
	type HttpTestServer,
} from '../../__tests__/test-helpers/http.js';

const servers: HttpTestServer[] = [];
afterEach(async () => {
	await Promise.all(servers.splice(0).map((server) => server.close()));
});

async function start(handler: Parameters<typeof createHttpTestServer>[0]) {
	const server = await createHttpTestServer(handler);
	servers.push(server);
	return server;
}

describe('platform fetch limits', () => {
	it('allows a slow response while body data keeps arriving', async () => {
		const server = await start((_request, response) => {
			let count = 0;
			const timer = setInterval(() => {
				response.write('x');
				if (++count === 8) response.end();
			}, 25);
			response.on('close', () => clearInterval(timer));
		});
		const result = await nodePlatformFetch({
			url: server.url(),
			method: 'GET',
			idleTimeoutMs: 90,
			deadline: Date.now() + 2000,
		});
		expect(new TextDecoder().decode(result.body)).toBe('xxxxxxxx');
	});

	it('aborts a stalled body and reports received bytes', async () => {
		let disconnected = false;
		const server = await start((_request, response) => {
			response.setHeader('content-length', '9');
			response.write('first');
			const timer = setTimeout(() => response.end('last'), 250);
			response.on('close', () => {
				clearTimeout(timer);
				disconnected = true;
			});
		});
		await expect(
			nodePlatformFetch({
				url: server.url(),
				method: 'GET',
				idleTimeoutMs: 60,
			}),
		).rejects.toThrow('no data for 60ms (received 5 of 9 bytes)');
		await vi.waitFor(() => expect(disconnected).toBe(true));
	});

	it('applies inactivity limits before receiving headers', async () => {
		const server = await start((_request, response) => {
			const timer = setTimeout(() => response.end('late'), 250);
			response.on('close', () => clearTimeout(timer));
		});
		await expect(
			nodePlatformFetch({
				url: server.url(),
				method: 'GET',
				idleTimeoutMs: 60,
			}),
		).rejects.toThrow('no data for 60ms (received 0 bytes)');
	});

	it('keeps the total deadline even when chunks reset the inactivity timer', async () => {
		const server = await start((_request, response) => {
			const timer = setInterval(() => response.write('x'), 15);
			response.on('close', () => clearInterval(timer));
		});
		await expect(
			nodePlatformFetch({
				url: server.url(),
				method: 'GET',
				idleTimeoutMs: 100,
				deadline: Date.now() + 150,
			}),
		).rejects.toThrow('Request deadline exceeded');
	});

	it('rejects an oversized streamed response instead of returning a partial document', async () => {
		const server = await start((_request, response) => {
			response.end('abcdef');
		});
		await expect(
			nodePlatformFetch({
				url: server.url(),
				method: 'GET',
				maxResponseBytes: 5,
			}),
		).rejects.toThrow('Response exceeds 5 bytes');
	});

	it('aborts a response body when its deadline expires', async () => {
		let disconnected = false;
		const server = await start((_request, response) => {
			response.write('first');
			const timer = setTimeout(() => response.end('last'), 180);
			response.on('close', () => {
				clearTimeout(timer);
				disconnected = true;
			});
		});
		await expect(
			nodePlatformFetch({
				url: server.url(),
				method: 'GET',
				deadline: Date.now() + 40,
			}),
		).rejects.toThrow('Request deadline exceeded');
		await vi.waitFor(() => expect(disconnected).toBe(true));
	});

	it('uses one deadline across redirects, including time before headers', async () => {
		const server = await start((request, response) => {
			const timer = setTimeout(() => {
				if (request.url === '/start')
					response.writeHead(302, { location: '/end' });
				response.end('done');
			}, 80);
			response.on('close', () => clearTimeout(timer));
		});
		const fetch = decorate(nodePlatformFetch).with(withRedirect(5)).build();
		await expect(
			fetch({
				url: server.url('/start'),
				method: 'GET',
				deadline: Date.now() + 120,
			}),
		).rejects.toThrow('Request deadline exceeded');
	});

	it('rejects an expired deadline before opening a connection', async () => {
		let requests = 0;
		const server = await start((_request, response) => {
			requests++;
			response.end('unexpected');
		});
		await expect(
			nodePlatformFetch({
				url: server.url(),
				method: 'GET',
				deadline: Date.now() - 1,
			}),
		).rejects.toThrow('Request deadline exceeded');
		expect(requests).toBe(0);
	});
});
