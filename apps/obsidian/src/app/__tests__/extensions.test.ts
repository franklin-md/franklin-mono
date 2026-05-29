import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import {
	createConfigurationModule,
	createDependencyModule,
} from '@franklin/extensibility/module';
import { createMockMiniACP, finishedTurn } from '@franklin/mini-acp/mock';
import {
	StoreRegistry,
	buildStateExtensionModule,
	createCoreStateModule,
	createEnvironmentModule,
	createReferencesModule,
	createStoreStateModule,
	type EnvironmentConfig,
	type ReconfigurableEnvironment,
} from '@franklin/agent';
import { createRuntime } from '@franklin/agent/testing';
import { describe, expect, it, vi } from 'vitest';

import { createObsidianExtensions } from '../app.js';

const defaultConfig: EnvironmentConfig = {
	fsConfig: {
		cwd: '/vault' as AbsolutePath,
		permissions: FILESYSTEM_ALLOW_ALL,
	},
	netConfig: { allowedDomains: [], deniedDomains: [] },
};

function createEnvironment(filesystem: Filesystem): ReconfigurableEnvironment {
	return {
		filesystem,
		process: { exec: vi.fn() },
		web: { fetch: vi.fn() },
		osInfo: new MemoryOsInfo(),
		config: vi.fn(async () => defaultConfig),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

async function drain(iterable: AsyncIterable<unknown>): Promise<void> {
	for await (const _event of iterable) {
		// Drain the mock prompt so the app runtime sends context.
	}
}

describe('createObsidianExtensions', () => {
	it('uses reference-backed read_file without exposing read_pdf', async () => {
		const mock = createMockMiniACP({ defaultTurn: finishedTurn() });
		const module = buildStateExtensionModule([
			createCoreStateModule(mock.connector),
			createStoreStateModule(new StoreRegistry()),
			createEnvironmentModule(async () =>
				createEnvironment(new MemoryFilesystem()),
			),
			createReferencesModule(),
			createDependencyModule('auth', {
				getApiKey: vi.fn(async () => undefined),
				entries: vi.fn(() => ({})),
				onAuthChange: vi.fn(() => () => {}),
			}),
			createConfigurationModule(),
		]);
		const runtime = await createRuntime(
			module,
			module.emptyState(),
			createObsidianExtensions() as never,
		);

		try {
			await drain(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				}),
			);

			const names = mock.context().tools.map((tool) => tool.name);
			expect(names).toContain('read_file');
			expect(names).toContain('edit_file');
			expect(names).toContain('write_file');
			expect(names).toContain('glob');
			expect(names).toContain('grep');
			expect(names).not.toContain('read_pdf');
		} finally {
			await runtime.dispose();
		}
	});
});
