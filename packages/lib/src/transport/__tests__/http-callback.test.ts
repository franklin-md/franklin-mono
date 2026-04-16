import { afterEach, describe, expect, it } from 'vitest';

import { HttpJsonServer } from '../http/index.js';
import { portManager } from '../http/port-manager.js';

describe('HttpJsonServer', () => {
	const servers: HttpJsonServer[] = [];

	afterEach(async () => {
		while (servers.length > 0) {
			const s = servers.pop();
			if (s) await s.stop();
		}
	});

	it('creates a server on an available port', async () => {
		const port = await portManager.allocate();
		const server = new HttpJsonServer({ port });
		server.onRequest(async () => ({ ok: true }));
		await server.start();
		servers.push(server);

		expect(port).toBeGreaterThan(0);

		const resp = await fetch(`http://127.0.0.1:${port}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});
		expect(resp.status).toBe(200);
	});

	it('handles POST requests and returns handler response', async () => {
		const port = await portManager.allocate();
		const server = new HttpJsonServer({ port });
		server.onRequest(async (body) => {
			const req = body as { x: number };
			return { result: req.x * 2 };
		});
		await server.start();
		servers.push(server);

		const resp = await fetch(`http://127.0.0.1:${port}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ x: 21 }),
		});

		expect(resp.status).toBe(200);
		const data = (await resp.json()) as { result: number };
		expect(data.result).toBe(42);
	});

	it('returns 405 for non-POST methods', async () => {
		const port = await portManager.allocate();
		const server = new HttpJsonServer({ port });
		server.onRequest(async () => ({ ok: true }));
		await server.start();
		servers.push(server);

		const resp = await fetch(`http://127.0.0.1:${port}`, { method: 'GET' });
		expect(resp.status).toBe(405);
	});

	it('returns 500 when the handler throws', async () => {
		const port = await portManager.allocate();
		const server = new HttpJsonServer({ port });
		server.onRequest(async () => {
			throw new Error('boom');
		});
		await server.start();
		servers.push(server);

		const resp = await fetch(`http://127.0.0.1:${port}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});

		expect(resp.status).toBe(500);
	});
});
