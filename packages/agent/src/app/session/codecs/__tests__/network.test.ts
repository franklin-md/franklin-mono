import { describe, expect, it } from 'vitest';
import { networkAllowed, type NetworkPermissions } from '@franklin/lib';
import { ZERO_USAGE } from '@franklin/mini-acp';
import { franklinSessionCodec, SESSION_FILE_VERSION } from '../session.js';

function data(netConfig: NetworkPermissions) {
	return {
		core: {
			entries: [],
			llmConfig: {},
			usage: ZERO_USAGE,
			toolFilter: { disabled: [] },
		},
		details: { visibility: 'visible' },
		store: {},
		env: {
			fsConfig: {
				cwd: '/tmp',
				permissions: {
					allowRead: [],
					denyRead: [],
					allowWrite: [],
					denyWrite: [],
				},
			},
			netConfig,
		},
	};
}
function decode(netConfig: NetworkPermissions, version = 3) {
	const session = data(netConfig);
	const { entries: _entries, ...core } = session.core;
	const result = franklinSessionCodec.decode({
		version,
		data:
			version < 3 ? { ...session, core: { ...core, messages: [] } } : session,
	});
	if (!result.ok) throw new Error(JSON.stringify(result.issue));
	return result.value;
}
describe('persisted network defaults', () => {
	it.each([1, 2, 3])('migrates only known v%i defaults', (version) => {
		const debugDenies = ['localhost', '127.0.0.1', '[::1]'].flatMap((host) =>
			[5005, 5678, 9222, 9229].map((port) => `${host}:${port}`),
		);
		for (const deniedDomains of [[], debugDenies.reverse()]) {
			const session = decode({ allowedDomains: [], deniedDomains }, version);
			expect(session.env.netConfig).toEqual({
				allowedDomains: [],
				deniedDomains: [],
				allowPublicHosts: true,
			});
			expect(networkAllowed('example.com', session.env.netConfig)).toBe(true);
			expect(networkAllowed('localhost', session.env.netConfig)).toBe(false);
			expect(
				franklinSessionCodec.decode(franklinSessionCodec.encode(session)),
			).toEqual({ ok: true, value: session });
		}
	});

	it.each([
		{ allowedDomains: ['example.com'], deniedDomains: [] },
		{ allowedDomains: [], deniedDomains: ['blocked.example.com'] },
		{ allowedDomains: [], deniedDomains: ['localhost:9229'] },
	])('reports custom legacy policy without modifying it: %j', (netConfig) => {
		const original = structuredClone(netConfig);
		const result = franklinSessionCodec.decode({
			version: 3,
			data: data(netConfig),
		});
		expect(result).toMatchObject({
			ok: false,
			issue: { kind: 'schema-mismatch' },
		});
		expect(JSON.stringify(result)).toContain(
			'requires explicit reconfiguration',
		);
		expect(netConfig).toEqual(original);
	});

	it('roundtrips new closed, public and custom policies without migration', () => {
		for (const config of [
			{ allowedDomains: [], deniedDomains: [] },
			{ allowedDomains: [], deniedDomains: [], allowPublicHosts: true },
			{
				allowedDomains: ['example.com', '*.example.com'],
				deniedDomains: ['localhost'],
			},
		]) {
			const session = decode(config, SESSION_FILE_VERSION);
			expect(session.env.netConfig).toEqual(config);
			expect(
				franklinSessionCodec.decode(franklinSessionCodec.encode(session)),
			).toEqual({ ok: true, value: session });
		}
	});
});
