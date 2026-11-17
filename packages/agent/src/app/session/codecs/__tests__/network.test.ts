import { describe, expect, it } from 'vitest';
import { assertAllowed, type NetworkPermissions } from '@franklin/lib';
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
function allowed(config: NetworkPermissions, url: string) {
	try {
		assertAllowed(new URL(url), config);
		return true;
	} catch {
		return false;
	}
}

describe('persisted network semantics', () => {
	it.each([1, 2, 3])(
		'preserves v%i public-open empty lists explicitly',
		(version) => {
			const session = decode(
				{ allowedDomains: [], deniedDomains: ['blocked.example.com'] },
				version,
			);
			expect(session.env.netConfig).toEqual({
				allowedDomains: [],
				deniedDomains: ['blocked.example.com', '*.blocked.example.com'],
				allowPublicHosts: true,
			});
			expect(allowed(session.env.netConfig, 'https://example.com')).toBe(true);
			expect(
				allowed(session.env.netConfig, 'https://sub.blocked.example.com'),
			).toBe(false);
			expect(allowed(session.env.netConfig, 'http://localhost')).toBe(false);
			expect(
				franklinSessionCodec.decode(franklinSessionCodec.encode(session)),
			).toEqual({ ok: true, value: session });
		},
	);
	it('expands root/subdomain allows and denies, without expanding host:port denies', () => {
		const config = decode({
			allowedDomains: ['example.com', '*.other.com', 'localhost:8080', '::1'],
			deniedDomains: ['blocked.example.com', '*.other.com', 'localhost:9229'],
		}).env.netConfig;
		expect(config).toEqual({
			allowedDomains: [
				'example.com',
				'*.example.com',
				'other.com',
				'*.other.com',
				'localhost:8080',
				'[::1]',
			],
			deniedDomains: [
				'blocked.example.com',
				'*.blocked.example.com',
				'other.com',
				'*.other.com',
				'localhost:9229',
			],
		});
		for (const url of [
			'https://example.com',
			'https://sub.example.com',
			'http://localhost:8080',
			'http://[::1]',
		])
			expect(allowed(config, url)).toBe(true);
		for (const url of [
			'https://blocked.example.com',
			'https://sub.blocked.example.com',
			'https://other.com',
			'https://sub.other.com',
			'http://localhost:9229',
		])
			expect(allowed(config, url)).toBe(false);
	});
	it('migrates localhost exactly without granting services under a legacy deny', () => {
		const config = decode({
			allowedDomains: [
				'localhost',
				'service.localhost',
				'service.localhost:8080',
			],
			deniedDomains: [],
		}).env.netConfig;
		expect(config.allowedDomains).toEqual([
			'localhost',
			'service.localhost',
			'*.service.localhost',
			'service.localhost:8080',
		]);
		expect(allowed(config, 'http://localhost')).toBe(true);
		expect(allowed(config, 'http://arbitrary.localhost')).toBe(false);
		const denied = decode({
			allowedDomains: ['service.localhost', 'service.localhost:8080', '*'],
			deniedDomains: ['localhost'],
		}).env.netConfig;
		expect(allowed(denied, 'http://service.localhost')).toBe(false);
		expect(allowed(denied, 'http://service.localhost:8080')).toBe(false);
		expect(allowed(denied, 'http://localhost')).toBe(false);
	});
	it('does not activate legacy wildcard-port entries that never matched', () => {
		expect(
			decode({
				allowedDomains: ['*.example.com:443'],
				deniedDomains: ['*.other.com:443'],
			}).env.netConfig,
		).toEqual({ allowedDomains: [], deniedDomains: [] });
	});
	it('does not grant private literals that were inert in legacy allowlists', () => {
		const config = decode({
			allowedDomains: ['192.168.1.1', '192.168.1.1:8080', '[fd00::1]'],
			deniedDomains: [],
		}).env.netConfig;
		expect(config).toEqual({ allowedDomains: [], deniedDomains: [] });
	});
	it.each(['*', ''])(
		'converts legacy universal allow %j to public fallback plus explicit loopback',
		(entry) => {
			const config = decode({ allowedDomains: [entry], deniedDomains: [] }).env
				.netConfig;
			expect(config.allowPublicHosts).toBe(true);
			expect(allowed(config, 'http://localhost')).toBe(true);
			expect(allowed(config, 'http://192.168.1.1')).toBe(false);
		},
	);
	it('converts legacy empty deny to native deny-all', () => {
		expect(
			decode({ allowedDomains: [], deniedDomains: [''] }).env.netConfig
				.deniedDomains,
		).toEqual(['*']);
	});
	it('leaves new empty configs closed and roundtrips explicit public fallback', () => {
		for (const allowPublicHosts of [undefined, true, false]) {
			const config = {
				allowedDomains: [],
				deniedDomains: [],
				...(allowPublicHosts === undefined ? {} : { allowPublicHosts }),
			};
			const session = decode(config, SESSION_FILE_VERSION);
			expect(session.env.netConfig).toEqual(config);
			expect(allowed(config, 'https://example.com')).toBe(
				allowPublicHosts === true,
			);
		}
	});
	it('rejects invalid new rules and unrepresentable legacy patterns as schema mismatches', () => {
		for (const [version, pattern] of [
			[SESSION_FILE_VERSION, '*'],
			[3, 'https://example.com'],
		] as const) {
			expect(
				franklinSessionCodec.decode({
					version,
					data: data({ allowedDomains: [pattern], deniedDomains: [] }),
				}),
			).toMatchObject({ ok: false, issue: { kind: 'schema-mismatch' } });
		}
	});
});
