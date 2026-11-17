import { describe, expect, it } from 'vitest';
import type { NetworkPermissions } from '@franklin/lib';
import { createSandboxNetworkPolicy } from '../network.js';

const restricted: NetworkPermissions = {
	allowedDomains: ['example.com', '*.example.com', '[::1]'],
	deniedDomains: ['blocked.example.com'],
};

describe('sandbox network callback', () => {
	it.each([
		['example.com', 443, true],
		['api.example.com', 443, true],
		['api.example.com', 8443, true],
		['example.com', 8443, true],
		['blocked.example.com', 8443, false],
		['::1', 8080, true],
		['[0:0:0:0:0:0:0:1]', 8080, true],
		['::1', 8081, true],
		['example.com', undefined, true],
		['example.com@evil.com', 443, false],
		['example.com/else', 443, false],
	])('decides %s:%s', async (host, port, allowed) => {
		expect(
			await createSandboxNetworkPolicy(() => restricted)({ host, port }),
		).toBe(allowed);
	});
	it('denies empty lists and allows public and private hosts with a wildcard', async () => {
		expect(
			await createSandboxNetworkPolicy(() => ({
				allowedDomains: [],
				deniedDomains: [],
			}))({ host: 'example.com', port: 443 }),
		).toBe(false);
		const ask = createSandboxNetworkPolicy(() => ({
			allowedDomains: ['*'],
			deniedDomains: ['example.com'],
		}));
		expect(await ask({ host: 'other.example.com', port: 443 })).toBe(true);
		for (const host of [
			'localhost',
			'127.1',
			'192.168.0.1',
			'::ffff:192.168.0.1',
		])
			expect(await ask({ host, port: 443 })).toBe(true);
		for (const host of [
			'example.com.',
			'',
			'example.com@evil.com',
			'example.com/path',
		]) {
			expect(await ask({ host, port: 443 })).toBe(false);
		}
	});
});
