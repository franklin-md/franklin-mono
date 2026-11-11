import { afterEach, describe, expect, it } from 'vitest';
import {
	createHttpTestServer,
	type HttpTestServer,
} from '../../__tests__/test-helpers/http.js';
import { createMCPFetch } from '../fetch.js';

const servers: HttpTestServer[] = [];
afterEach(async () => {
	await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('MCP HTTP policy', () => {
	it('checks live network permissions before each request', async () => {
		let calls = 0;
		const server = await createHttpTestServer((_req, res) => {
			calls++;
			res.end('ok');
		});
		servers.push(server);
		let allowedDomains = ['127.0.0.1'];
		const fetch = createMCPFetch(async () => ({
			allowedDomains,
			deniedDomains: [],
		}));
		expect(await (await fetch(server.url())).text()).toBe('ok');
		allowedDomains = [];
		await expect(fetch(server.url())).rejects.toThrow('explicitly allowlisted');
		expect(calls).toBe(1);
	});
	it('rejects redirects without forwarding secret headers to the destination', async () => {
		let destinationCalls = 0;
		const destination = await createHttpTestServer((_req, res) => {
			destinationCalls++;
			res.end('should not arrive');
		});
		servers.push(destination);
		const origin = await createHttpTestServer((_req, res) => {
			res.writeHead(302, { location: destination.url() });
			res.end('redirect');
		});
		servers.push(origin);
		const fetch = createMCPFetch(async () => ({
			allowedDomains: ['127.0.0.1'],
			deniedDomains: [],
		}));
		await expect(
			fetch(origin.url(), { headers: { 'x-api-key': 'secret' } }),
		).rejects.toThrow('redirects');
		expect(destinationCalls).toBe(0);
	});
});
