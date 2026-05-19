import { describe, expect, it, vi } from 'vitest';
import {
	MemoryFilesystem,
	MemoryOsInfo,
	type AbsolutePath,
} from '@franklin/lib';
import type { EnvironmentConfig } from '../modules/environment/index.js';

import { FranklinApp } from '../app/index.js';
import type { Platform } from '../platform.js';
import type { FranklinExtension } from '../types.js';

const APP_DIR = '/test/app' as AbsolutePath;

function createPlatform(): Platform {
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
			filesystem: new MemoryFilesystem(),
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
		const app = new FranklinApp({
			extensions,
			platform: createPlatform(),
			appDir: APP_DIR,
		});

		expect(app.auth).toBeDefined();
	});

	it('calls extension factories with app services', () => {
		const platform = createPlatform();
		const extensions: FranklinExtension[] = [];
		const factory = vi.fn(() => extensions);
		const app = new FranklinApp({
			extensions: factory,
			platform,
			appDir: APP_DIR,
		});

		expect(factory).toHaveBeenCalledWith({
			auth: app.auth,
			platform,
			settings: app.settings,
		});
	});
});
