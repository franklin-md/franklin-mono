import { describe, expect, it } from 'vitest';

import {
	isRequestOrNotification,
	isResponse,
	matchNotification,
	matchRequest,
	rpcResponse,
	withParams,
} from '../index.js';
import type { RpcMessage } from '../index.js';

const request: RpcMessage = {
	jsonrpc: '2.0',
	id: 1,
	method: 'session/new',
	params: { cwd: '/tmp', mcpServers: [] },
};

const notification: RpcMessage = {
	jsonrpc: '2.0',
	method: 'session/update',
	params: { status: 'running' },
};

const response: RpcMessage = {
	jsonrpc: '2.0',
	id: 1,
	result: { ok: true },
};

describe('matchRequest', () => {
	it('returns typed request when method matches', () => {
		const req = matchRequest<{ cwd: string }>(request, 'session/new');
		expect(req).toBeDefined();
		expect(req!.params.cwd).toBe('/tmp');
		expect(req!.id).toBe(1);
	});

	it('returns undefined when method does not match', () => {
		expect(matchRequest(request, 'other/method')).toBeUndefined();
	});

	it('returns undefined for notifications (no id)', () => {
		expect(matchRequest(notification, 'session/update')).toBeUndefined();
	});

	it('returns undefined for responses', () => {
		expect(matchRequest(response, 'session/new')).toBeUndefined();
	});
});

describe('matchNotification', () => {
	it('returns typed notification when method matches', () => {
		const notif = matchNotification<{ status: string }>(
			notification,
			'session/update',
		);
		expect(notif).toBeDefined();
		expect(notif!.params.status).toBe('running');
	});

	it('returns undefined when method does not match', () => {
		expect(matchNotification(notification, 'other/method')).toBeUndefined();
	});

	it('returns undefined for requests (has id)', () => {
		expect(matchNotification(request, 'session/new')).toBeUndefined();
	});
});

describe('isRequestOrNotification', () => {
	it('returns true for requests', () => {
		expect(isRequestOrNotification(request)).toBe(true);
	});

	it('returns true for notifications', () => {
		expect(isRequestOrNotification(notification)).toBe(true);
	});

	it('returns false for responses', () => {
		expect(isRequestOrNotification(response)).toBe(false);
	});
});

describe('isResponse', () => {
	it('returns true for responses', () => {
		expect(isResponse(response)).toBe(true);
	});

	it('returns false for requests', () => {
		expect(isResponse(request)).toBe(false);
	});

	it('returns false for notifications', () => {
		expect(isResponse(notification)).toBe(false);
	});
});

describe('withParams', () => {
	it('returns a copy with replaced params', () => {
		const req = matchRequest<{ cwd: string }>(request, 'session/new')!;
		const updated = withParams(req, { cwd: '/home', mcpServers: ['a'] });

		expect(updated.params).toEqual({ cwd: '/home', mcpServers: ['a'] });
		expect(updated.method).toBe('session/new');
		expect(updated.id).toBe(1);
		// Original unchanged
		expect(req.params.cwd).toBe('/tmp');
	});
});

describe('rpcResponse', () => {
	it('constructs a JSON-RPC success response', () => {
		const res = rpcResponse(42, { outcome: 'ok' });

		expect(res).toEqual({
			jsonrpc: '2.0',
			id: 42,
			result: { outcome: 'ok' },
		});
	});
});
