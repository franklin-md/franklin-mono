import { describe, expect, it } from 'vitest';
import { assertAllowed, type NetworkPermissions } from '@franklin/lib';
import { createSandboxNetworkPolicy } from '../network.js';

const cases = [
	{ host: '::1', port: 80, allowed: ['[::1]'], denied: [], expected: true },
	{ host: 'example.com', port: 443, allowed: [], denied: [], expected: true },
	{
		host: 'example.com',
		port: 443,
		allowed: [],
		denied: ['example.com'],
		expected: false,
	},
	{
		host: 'example.com',
		port: 443,
		allowed: ['example.com:443'],
		denied: [],
		expected: true,
	},
	{
		host: 'example.com',
		port: 80,
		allowed: ['example.com:443'],
		denied: [],
		expected: false,
	},
	{
		host: 'docs.example.com',
		port: 443,
		allowed: ['example.com'],
		denied: [],
		expected: true,
	},
	{
		host: 'example.com',
		port: 443,
		allowed: ['*.example.com'],
		denied: [],
		expected: true,
	},
	{
		host: 'other.example',
		port: 443,
		allowed: ['example.com'],
		denied: [],
		expected: false,
	},
	{ host: 'localhost', port: 11434, allowed: [], denied: [], expected: false },
	{
		host: 'localhost',
		port: 11434,
		allowed: ['localhost:11434'],
		denied: [],
		expected: true,
	},
	{
		host: 'localhost',
		port: 9229,
		allowed: ['localhost'],
		denied: ['localhost:9229'],
		expected: false,
	},
	{
		host: '192.168.1.10',
		port: 443,
		allowed: ['192.168.1.10'],
		denied: [],
		expected: false,
	},
	{
		host: '::1',
		port: 11434,
		allowed: ['[::1]:11434'],
		denied: [],
		expected: true,
	},
];

describe('sandbox network policy', () => {
	it.each(cases)(
		'agrees with web policy for $host:$port ($expected)',
		async ({ host, port, allowed, denied, expected }) => {
			const permissions: NetworkPermissions = {
				allowedDomains: allowed,
				deniedDomains: denied,
			};
			const hostname = host.includes(':') ? `[${host}]` : host;
			const url = new URL(
				`${port === 443 ? 'https' : 'http'}://${hostname}:${port}`,
			);
			let allowedByWeb = true;
			try {
				assertAllowed(url, permissions);
			} catch {
				allowedByWeb = false;
			}
			expect(allowedByWeb).toBe(expected);
			expect(
				await createSandboxNetworkPolicy(permissions)({ host, port }),
			).toBe(expected);
		},
	);
});
