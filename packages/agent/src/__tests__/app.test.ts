import { describe, expect, it, vi } from 'vitest';
import {
	joinAbsolute,
	MemoryFilesystem,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import type { EnvironmentConfig } from '../modules/environment/index.js';

import { FranklinApp } from '../app/index.js';
import { AuthManager } from '../auth/manager.js';
import { createAuthStore, DEFAULT_AUTH_FILE } from '../auth/store.js';
import type { Platform } from '../platform.js';
import type { FranklinExtension } from '../types.js';

const APP_DIR = '/test/app' as AbsolutePath;

function createPlatform(filesystem = new MemoryFilesystem()): Platform {
	return {
		spawn: vi.fn(async () => {
			throw new Error('not implemented');
		}),
		environment: vi.fn(async (_config: EnvironmentConfig) => {
			throw new Error('not implemented');
		}),
		os: {
			process: {
				exec: vi.fn(async () => ({
					exit_code: 0,
					stdout: '',
					stderr: '',
				})),
			},
			filesystem,
			osInfo: new MemoryOsInfo(),
			openExternal: vi.fn(async () => {}),
			net: {
				listenLoopback: vi.fn(async () => {
					throw new Error('not implemented');
				}),
				fetch: vi.fn(async () => {
					throw new Error('not implemented');
				}),
			},
		},
		ai: {
			getApiKeyProviders: async () => [],
		},
	};
}

describe('FranklinApp extensions option', () => {
	it('accepts an existing extension array', () => {
		const extensions: FranklinExtension[] = [];
		const platform = createPlatform();
		const auth = new AuthManager(
			platform,
			createAuthStore(platform.os.filesystem, APP_DIR),
		);
		const app = new FranklinApp({
			extensions,
			platform,
			appDir: APP_DIR,
			auth,
		});

		expect(app.auth).toBe(auth);
	});
});

describe('FranklinApp.start', () => {
	it('includes auth restore issues before restoring sessions', async () => {
		const filesystem = new MemoryFilesystem();
		filesystem.seed(
			joinAbsolute(APP_DIR, DEFAULT_AUTH_FILE),
			JSON.stringify({ version: 1, data: { anthropic: 'not-an-object' } }),
		);
		const platform = createPlatform(filesystem);
		const auth = new AuthManager(
			platform,
			createAuthStore(platform.os.filesystem, APP_DIR),
		);
		const app = new FranklinApp({
			extensions: [],
			platform,
			appDir: APP_DIR,
			auth,
		});

		const result = await app.start();

		expect(result.issues[0]).toMatchObject({
			kind: 'schema-mismatch',
			version: 1,
		});
	});
});
