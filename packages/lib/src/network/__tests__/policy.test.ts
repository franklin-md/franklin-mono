import { describe, expect, it, vi } from 'vitest';
import type { Fetch, NetworkPermissions, WebFetchResponse } from '../types.js';
import { withPolicy } from '../policy.js';

function createConfig(
	overrides: Partial<NetworkPermissions> = {},
): NetworkPermissions {
	return {
		allowedDomains: [],
		deniedDomains: [],
		...overrides,
	};
}

function okResponse(url = 'https://example.com/'): WebFetchResponse {
	return {
		url,
		status: 200,
		statusText: 'OK',
		headers: {},
		body: new Uint8Array(),
	};
}

describe('withPolicy', () => {
	it('denies localhost when it is not explicitly allowlisted', async () => {
		const next = vi.fn<Fetch>();
		const fetch = withPolicy(createConfig())(next);

		await expect(
			fetch({ url: 'http://localhost:11434/api/tags', method: 'GET' }),
		).rejects.toThrow('Network access denied for host "localhost"');
		expect(next).not.toHaveBeenCalled();
	});

	it('allows explicit localhost loopback access', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withPolicy(createConfig({ allowedDomains: ['localhost'] }))(
			next,
		);

		const response = await fetch({
			url: 'http://localhost:11434/api/tags',
			method: 'GET',
		});

		expect(response.status).toBe(200);
		expect(next).toHaveBeenCalledOnce();
	});

	it('allows explicit literal loopback IP access', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withPolicy(
			createConfig({ allowedDomains: ['127.0.0.1', '::1'] }),
		)(next);

		await expect(
			fetch({ url: 'http://127.0.0.1:11434/api/tags', method: 'GET' }),
		).resolves.toMatchObject({ status: 200 });
		await expect(
			fetch({ url: 'http://[::1]:11434/api/tags', method: 'GET' }),
		).resolves.toMatchObject({ status: 200 });
	});

	it('supports exact host-port allowlist entries for loopback', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withPolicy(
			createConfig({ allowedDomains: ['localhost:11434'] }),
		)(next);

		await expect(
			fetch({ url: 'http://localhost:11434/api/tags', method: 'GET' }),
		).resolves.toMatchObject({ status: 200 });
		await expect(
			fetch({ url: 'http://localhost:11435/api/tags', method: 'GET' }),
		).rejects.toThrow('Network access denied for host "localhost"');
	});

	it('keeps denying non-loopback private hosts even when allowlisted', async () => {
		const next = vi.fn<Fetch>();
		const fetch = withPolicy(
			createConfig({ allowedDomains: ['192.168.1.10'] }),
		)(next);

		await expect(
			fetch({ url: 'http://192.168.1.10:8080/', method: 'GET' }),
		).rejects.toThrow('Network access denied for host "192.168.1.10"');
		expect(next).not.toHaveBeenCalled();
	});

	it('blocks denied loopback debug ports even when the host is allowlisted', async () => {
		const next = vi.fn<Fetch>();
		const fetch = withPolicy(
			createConfig({
				allowedDomains: ['localhost', '127.0.0.1', '::1'],
				deniedDomains: ['localhost:9229', '127.0.0.1:9229', '[::1]:9229'],
			}),
		)(next);

		await expect(
			fetch({ url: 'http://localhost:9229/json/version', method: 'GET' }),
		).rejects.toThrow('Network access denied for host "localhost"');
		await expect(
			fetch({ url: 'http://127.0.0.1:9229/json/version', method: 'GET' }),
		).rejects.toThrow('Network access denied for host "127.0.0.1"');
		await expect(
			fetch({ url: 'http://[::1]:9229/json/version', method: 'GET' }),
		).rejects.toThrow('Network access denied for host "::1"');
		expect(next).not.toHaveBeenCalled();
	});
});
