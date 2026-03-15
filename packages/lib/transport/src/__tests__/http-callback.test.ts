import { afterEach, describe, expect, it } from 'vitest';

import { createJSONServer } from '../http/index.js';

import type { HttpCallbackServer } from '../http/index.js';

describe('HttpCallbackServer', () => {
	const servers: HttpCallbackServer[] = [];

	afterEach(async () => {
		while (servers.length > 0) {
			const s = servers.pop();
			if (s) await s.dispose();
		}
	});

	it('creates a server on an available port', async () => {
		const server = await createJSONServer();
		servers.push(server);

		expect(server.port).toBeGreaterThan(0);
		expect(server.url).toBe(`http://127.0.0.1:${server.port}`);
	});

	it('handles POST requests and returns handler response', async () => {
		const server = await createJSONServer();
		servers.push(server);

		server.onRequest(async (body) => {
			const req = body as { x: number };
			return { result: req.x * 2 };
		});

		const resp = await fetch(server.url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ x: 21 }),
		});

		expect(resp.status).toBe(200);
		const data = (await resp.json()) as { result: number };
		expect(data.result).toBe(42);
	});

	it('returns 405 for non-POST methods', async () => {
		const server = await createJSONServer();
		servers.push(server);

		const resp = await fetch(server.url, { method: 'GET' });
		expect(resp.status).toBe(405);
	});

	it('returns 503 when no handler is registered', async () => {
		const server = await createJSONServer();
		servers.push(server);

		const resp = await fetch(server.url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});

		expect(resp.status).toBe(503);
	});
});
