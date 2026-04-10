import type { NetworkConfig } from '@franklin/extensions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EnvironmentWeb } from '../platform/web.js';

function createConfig(overrides: Partial<NetworkConfig> = {}): NetworkConfig {
	return {
		allowedDomains: [],
		deniedDomains: [],
		...overrides,
	};
}

function okResponse(): Response {
	return new Response('ok', { status: 200 });
}

describe('EnvironmentWeb', () => {
	const fetchMock = vi.fn<typeof fetch>();

	beforeEach(() => {
		fetchMock.mockReset();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('denies localhost when it is not explicitly allowlisted', async () => {
		const web = new EnvironmentWeb(createConfig());

		await expect(
			web.fetch({ url: 'http://localhost:11434/api/tags' }),
		).rejects.toThrow('Network access denied for host "localhost"');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('allows explicit localhost loopback access', async () => {
		fetchMock.mockResolvedValue(okResponse());
		const web = new EnvironmentWeb(
			createConfig({ allowedDomains: ['localhost'] }),
		);

		const response = await web.fetch({
			url: 'http://localhost:11434/api/tags',
		});

		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('allows explicit literal loopback IP access', async () => {
		fetchMock.mockImplementation(async () => okResponse());
		const web = new EnvironmentWeb(
			createConfig({ allowedDomains: ['127.0.0.1', '::1'] }),
		);

		await expect(
			web.fetch({ url: 'http://127.0.0.1:11434/api/tags' }),
		).resolves.toMatchObject({ status: 200 });
		await expect(
			web.fetch({ url: 'http://[::1]:11434/api/tags' }),
		).resolves.toMatchObject({ status: 200 });
	});

	it('supports exact host-port allowlist entries for loopback', async () => {
		fetchMock.mockImplementation(async () => okResponse());
		const web = new EnvironmentWeb(
			createConfig({ allowedDomains: ['localhost:11434'] }),
		);

		await expect(
			web.fetch({ url: 'http://localhost:11434/api/tags' }),
		).resolves.toMatchObject({ status: 200 });
		await expect(
			web.fetch({ url: 'http://localhost:11435/api/tags' }),
		).rejects.toThrow('Network access denied for host "localhost"');
	});

	it('keeps denying non-loopback private hosts even when allowlisted', async () => {
		const web = new EnvironmentWeb(
			createConfig({ allowedDomains: ['192.168.1.10'] }),
		);

		await expect(
			web.fetch({ url: 'http://192.168.1.10:8080/' }),
		).rejects.toThrow(
			'Network access denied for host "192.168.1.10": private addresses are not permitted',
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('blocks denied loopback debug ports even when the host is allowlisted', async () => {
		const web = new EnvironmentWeb(
			createConfig({
				allowedDomains: ['localhost', '127.0.0.1', '::1'],
				deniedDomains: ['localhost:9229', '127.0.0.1:9229', '[::1]:9229'],
			}),
		);

		await expect(
			web.fetch({ url: 'http://localhost:9229/json/version' }),
		).rejects.toThrow('Network access denied for host "localhost"');
		await expect(
			web.fetch({ url: 'http://127.0.0.1:9229/json/version' }),
		).rejects.toThrow('Network access denied for host "127.0.0.1"');
		await expect(
			web.fetch({ url: 'http://[::1]:9229/json/version' }),
		).rejects.toThrow('Network access denied for host "::1"');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('denies redirects from public hosts to loopback unless explicitly allowlisted', async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(null, {
				status: 302,
				headers: { location: 'http://localhost:11434/api/tags' },
			}),
		);
		const web = new EnvironmentWeb(createConfig());

		await expect(web.fetch({ url: 'https://example.com/' })).rejects.toThrow(
			'Network access denied for host "localhost"',
		);
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('allows redirects to loopback when the target is explicitly allowlisted', async () => {
		fetchMock
			.mockResolvedValueOnce(
				new Response(null, {
					status: 302,
					headers: { location: 'http://localhost:11434/api/tags' },
				}),
			)
			.mockResolvedValueOnce(okResponse());
		const web = new EnvironmentWeb(
			createConfig({ allowedDomains: ['example.com', 'localhost:11434'] }),
		);

		const response = await web.fetch({ url: 'https://example.com/' });

		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
