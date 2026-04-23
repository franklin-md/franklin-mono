import { describe, expect, it, vi } from 'vitest';
import type { ServerResponse } from 'node:http';

import { createPendingRegistry } from '../pending.js';

function mockResponse() {
	const res = {
		statusCode: 0,
		setHeader: vi.fn(),
		end: vi.fn(),
		destroy: vi.fn(),
	};
	return res as unknown as ServerResponse & {
		destroy: ReturnType<typeof vi.fn>;
		end: ReturnType<typeof vi.fn>;
	};
}

describe('createPendingRegistry', () => {
	it('track returns a unique id', () => {
		const registry = createPendingRegistry();
		const a = registry.track(mockResponse());
		const b = registry.track(mockResponse());
		expect(a).not.toBe(b);
	});

	it('respond writes the response and clears the entry', () => {
		const registry = createPendingRegistry();
		const res = mockResponse();
		const id = registry.track(res);

		registry.respond(id, { status: 200, body: 'ok' });

		expect(res.end).toHaveBeenCalledWith('ok');
	});

	it('respond throws when the id is unknown', () => {
		const registry = createPendingRegistry();
		expect(() => registry.respond('missing', { status: 200 })).toThrow(
			/unknown request id/i,
		);
	});

	it('respond throws when called twice for the same id', () => {
		const registry = createPendingRegistry();
		const res = mockResponse();
		const id = registry.track(res);

		registry.respond(id, { status: 200 });

		expect(() => registry.respond(id, { status: 200 })).toThrow(
			/unknown request id|already responded/i,
		);
	});

	it('clear removes the entry so subsequent responds fail (simulates socket close)', () => {
		const registry = createPendingRegistry();
		const res = mockResponse();
		const id = registry.track(res);

		registry.clear(id);

		expect(() => registry.respond(id, { status: 200 })).toThrow(
			/unknown request id/i,
		);
	});

	it('destroyAll destroys unresponded sockets and empties the registry', () => {
		const registry = createPendingRegistry();
		const a = mockResponse();
		const b = mockResponse();
		registry.track(a);
		registry.track(b);

		registry.destroyAll();

		expect(a.destroy).toHaveBeenCalled();
		expect(b.destroy).toHaveBeenCalled();
	});
});
