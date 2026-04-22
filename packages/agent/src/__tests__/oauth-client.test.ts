import type { Fetch } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';

import { OAuthClient } from '../auth/oauth-client.js';
import type { Net } from '../platform.js';
import type { AuthorizationCodePkceSpec } from '../auth/specs/types.js';

function makeSpec(
	id: string,
	overrides: Partial<AuthorizationCodePkceSpec> = {},
): AuthorizationCodePkceSpec {
	return {
		id,
		name: `Provider ${id}`,
		loopback: { path: '/callback' },
		redirectUri: 'http://localhost:9999/callback',
		buildAuthUrl: () => 'https://example.com/authorize',
		exchangeCode: vi.fn(async () => ({
			access: 'A',
			refresh: 'R',
			expires: 0,
		})),
		refresh: vi.fn(async (credentials) => ({
			...credentials,
			access: 'new-access',
		})),
		getApiKey: (creds) => creds.access,
		...overrides,
	};
}

function makeNet(): Net {
	return {
		listenLoopback: vi.fn(async () => {
			throw new Error('not used');
		}),
		fetch: vi.fn() as unknown as Fetch,
	};
}

describe('OAuthClient', () => {
	it('createFlow returns an OAuthFlow for a known provider', () => {
		const spec = makeSpec('anthropic');
		const client = new OAuthClient(new Map([['anthropic', spec]]), makeNet());
		const flow = client.createFlow('anthropic');
		expect(typeof flow.login).toBe('function');
		expect(typeof flow.dispose).toBe('function');
	});

	it('createFlow throws for an unknown provider', () => {
		const client = new OAuthClient(new Map(), makeNet());
		expect(() => client.createFlow('missing')).toThrow(/not found/i);
	});

	it('refresh delegates to the provider spec with the net fetch', async () => {
		const spec = makeSpec('anthropic');
		const net = makeNet();
		const client = new OAuthClient(new Map([['anthropic', spec]]), net);

		const creds = await client.refresh('anthropic', {
			access: 'old',
			refresh: 'refresh',
			expires: 0,
		});

		expect(spec.refresh).toHaveBeenCalledWith(
			{ access: 'old', refresh: 'refresh', expires: 0 },
			net.fetch,
		);
		expect(creds.access).toBe('new-access');
	});

	it('refresh throws for an unknown provider', async () => {
		const client = new OAuthClient(new Map(), makeNet());
		await expect(
			client.refresh('missing', { access: 'A', refresh: 'R', expires: 0 }),
		).rejects.toThrow(/not found/i);
	});

	it('getApiKey delegates to the provider spec', () => {
		const spec = makeSpec('anthropic');
		const client = new OAuthClient(new Map([['anthropic', spec]]), makeNet());
		expect(
			client.getApiKey('anthropic', {
				access: 'api-key',
				refresh: 'R',
				expires: 0,
			}),
		).toBe('api-key');
	});

	it('providers() lists id + name for each registered spec', () => {
		const a = makeSpec('a');
		const b = makeSpec('b');
		const client = new OAuthClient(
			new Map([
				['a', a],
				['b', b],
			]),
			makeNet(),
		);
		expect(client.providers()).toEqual([
			{ id: 'a', name: 'Provider a' },
			{ id: 'b', name: 'Provider b' },
		]);
	});
});
