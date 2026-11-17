import { describe, expect, it, vi } from 'vitest';
import type {
	Fetch,
	NetworkPermissions,
	WebFetchResponse,
} from '../../types.js';
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
			createConfig({ allowedDomains: ['127.0.0.1', '[::1]'] }),
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

	it('allows explicitly named private destinations like native shell rules', async () => {
		const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
		const fetch = withPolicy(
			createConfig({ allowedDomains: ['192.168.1.10'] }),
		)(next);

		await expect(
			fetch({ url: 'http://192.168.1.10:8080/', method: 'GET' }),
		).resolves.toMatchObject({ status: 200 });
		expect(next).toHaveBeenCalledOnce();
	});

	it('blocks denied loopback debug ports even when the host is allowlisted', async () => {
		const next = vi.fn<Fetch>();
		const fetch = withPolicy(
			createConfig({
				allowedDomains: ['localhost', '127.0.0.1', '[::1]'],
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

describe('native network rule semantics', () => {
	it.each([
		[[], [], 'https://example.com', false],
		[['example.com'], [], 'https://example.com', true],
		[['example.com'], [], 'https://api.example.com', false],
		[['*.example.com'], [], 'https://example.com', false],
		[['*.example.com'], [], 'https://a.b.example.com', true],
		[['example.com', '*.example.com'], [], 'https://api.example.com', true],
		[['*.example.com'], ['example.com'], 'https://api.example.com', true],
		[['example.com'], ['*.example.com'], 'https://example.com', true],
		[['*.example.com'], ['*.example.com'], 'https://api.example.com', false],
		[['example.com'], ['*'], 'https://example.com', false],
		[['example.com'], ['*:443'], 'https://example.com', false],
		[['example.com:443'], [], 'https://example.com', true],
		[['example.com:80'], [], 'http://example.com', true],
		[['*.example.com:8443'], [], 'https://a.example.com:8443', true],
		[['*.example.com:8443'], [], 'https://a.example.com', false],
		[['[::1]:80'], [], 'http://[0:0:0:0:0:0:0:1]', true],
		[['[::1]:443'], [], 'https://[::1]:444', false],
	])(
		'evaluates allow=%j deny=%j url=%s',
		async (allowedDomains, deniedDomains, url, allowed) => {
			const next = vi.fn<Fetch>().mockResolvedValue(okResponse());
			const fetch = withPolicy({ allowedDomains, deniedDomains })(next);
			const result = await fetch({ url, method: 'GET' }).then(
				() => true,
				() => false,
			);
			expect(result).toBe(allowed);
			expect(next).toHaveBeenCalledTimes(allowed ? 1 : 0);
		},
	);

	it.each([
		'*',
		'',
		'*.com',
		'::1',
		'example.com:0',
		'example.com:65536',
		'https://example.com',
		'example.com/path',
	])('rejects invalid allow entry %j', (pattern) => {
		expect(() =>
			withPolicy({ allowedDomains: [pattern], deniedDomains: [] }),
		).toThrow('Invalid network');
	});

	it.each([
		'http://localhost',
		'http://127.1',
		'http://192.168.1.1',
		'http://[fe90::1]',
		'http://[::ffff:192.168.1.1]',
		'http://service.localhost',
	])('public fallback does not grant %s', async (url) => {
		const fetch = withPolicy({
			allowedDomains: [],
			deniedDomains: [],
			allowPublicHosts: true,
		})(vi.fn<Fetch>());
		await expect(fetch({ url, method: 'GET' })).rejects.toThrow(
			'Network access denied',
		);
	});

	it('supports explicit public fallback with deny precedence and private opt-in', async () => {
		const fetch = withPolicy({
			allowedDomains: ['localhost:8080'],
			deniedDomains: ['blocked.example.com'],
			allowPublicHosts: true,
		})(vi.fn<Fetch>().mockResolvedValue(okResponse()));
		for (const url of [
			'https://example.com',
			'https://fcdn.example.com',
			'http://localhost:8080',
		]) {
			await expect(fetch({ url, method: 'GET' })).resolves.toMatchObject({
				status: 200,
			});
		}
		await expect(
			fetch({ url: 'https://blocked.example.com', method: 'GET' }),
		).rejects.toThrow('Network access denied');
	});
});
