import { afterEach, describe, expect, it } from 'vitest';

import type { LoopbackListener } from '@franklin/lib';

import { createLoopbackListener } from '../create.js';

const disposables: LoopbackListener[] = [];

afterEach(async () => {
	while (disposables.length) {
		await disposables.pop()?.dispose();
	}
});

async function track(listener: LoopbackListener): Promise<LoopbackListener> {
	disposables.push(listener);
	return listener;
}

describe('createLoopbackListener', () => {
	it('binds an ephemeral loopback port and reports the redirect uri', async () => {
		const listener = await track(await createLoopbackListener({ path: '/cb' }));

		const uri = await listener.getRedirectUri();

		expect(uri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/cb$/);
	});

	it('defaults to /callback when no path is provided', async () => {
		const listener = await track(await createLoopbackListener());

		const uri = await listener.getRedirectUri();

		expect(uri).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/);
	});

	it('emits onRequest for every incoming request with method, url, and headers', async () => {
		const listener = await track(await createLoopbackListener());
		const uri = await listener.getRedirectUri();

		const received: Array<{
			id: string;
			method: string;
			url: string;
			headers: Record<string, string>;
		}> = [];
		listener.onRequest((req) => {
			received.push(req);
			void listener.respond(req.id, { status: 204 });
		});

		const res = await fetch(`${uri}?code=abc&state=xyz`, {
			headers: { 'x-test': 'hello' },
		});
		await res.arrayBuffer();

		expect(res.status).toBe(204);
		expect(received).toHaveLength(1);
		expect(received[0]?.method).toBe('GET');
		expect(received[0]?.url).toMatch(/\/callback\?code=abc&state=xyz$/);
		expect(received[0]?.headers['x-test']).toBe('hello');
		expect(typeof received[0]?.id).toBe('string');
		expect(received[0]?.id.length).toBeGreaterThan(0);
	});

	it('captures request body for non-GET methods', async () => {
		const listener = await track(await createLoopbackListener());
		const uri = await listener.getRedirectUri();

		const received: Array<{ id: string; body?: string }> = [];
		listener.onRequest((req) => {
			received.push(req);
			void listener.respond(req.id, { status: 200 });
		});

		const res = await fetch(uri, {
			method: 'POST',
			headers: { 'content-type': 'text/plain' },
			body: 'payload',
		});
		await res.arrayBuffer();

		expect(res.status).toBe(200);
		expect(received[0]?.body).toBe('payload');
	});

	it('sends the status, headers, and body from respond()', async () => {
		const listener = await track(await createLoopbackListener());
		const uri = await listener.getRedirectUri();

		listener.onRequest((req) => {
			void listener.respond(req.id, {
				status: 302,
				headers: {
					'content-type': 'text/html; charset=utf-8',
					location: 'https://example.com/',
				},
				body: '<p>Redirecting</p>',
			});
		});

		const res = await fetch(uri, { redirect: 'manual' });
		const body = await res.text();

		expect(res.status).toBe(302);
		expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
		expect(res.headers.get('location')).toBe('https://example.com/');
		expect(body).toBe('<p>Redirecting</p>');
	});

	it('unsubscribing onRequest stops further callbacks', async () => {
		const listener = await track(await createLoopbackListener());
		const uri = await listener.getRedirectUri();

		let observerCalls = 0;
		const unsubscribe = listener.onRequest(() => {
			observerCalls++;
		});

		// Separate subscriber owns the response so fetches resolve regardless.
		listener.onRequest((req) => {
			void listener.respond(req.id, { status: 200 });
		});

		await fetch(uri).then((r) => r.arrayBuffer());
		unsubscribe();
		await fetch(uri).then((r) => r.arrayBuffer());

		expect(observerCalls).toBe(1);
	});

	it('throws when respond() is called with an unknown request id', async () => {
		const listener = await track(await createLoopbackListener());

		await expect(
			listener.respond('nonexistent', { status: 200 }),
		).rejects.toThrow(/unknown request id/i);
	});

	it('throws when respond() is called twice for the same request', async () => {
		const listener = await track(await createLoopbackListener());
		const uri = await listener.getRedirectUri();

		const seen: string[] = [];
		listener.onRequest((req) => {
			seen.push(req.id);
			void listener.respond(req.id, { status: 200 });
		});

		await fetch(uri).then((r) => r.arrayBuffer());

		expect(seen).toHaveLength(1);
		await expect(
			listener.respond(seen[0] ?? '', { status: 200 }),
		).rejects.toThrow(/already responded|unknown request id/i);
	});

	it('dispose() stops accepting new connections', async () => {
		const listener = await createLoopbackListener();
		const uri = await listener.getRedirectUri();

		await listener.dispose();

		await expect(fetch(uri)).rejects.toBeDefined();
	});
});
