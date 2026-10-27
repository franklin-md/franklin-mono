import {
	FILESYSTEM_ALLOW_ALL,
	MemoryFilesystem,
	MemoryOsInfo,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import { createMockMiniACP, finishedTurn } from '@franklin/mini-acp/mock';
import {
	createFranklinAgents,
	viewingContextExtension,
	type AuthManager,
	type EnvironmentConfig,
	type ReconfigurableEnvironment,
} from '@franklin/agent';
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
		const agents = createFranklinAgents({
			connect: mock.connector,
			environment: async () => createEnvironment(new MemoryFilesystem()),
			auth: {
				getApiKey: vi.fn(async () => undefined),
				entries: vi.fn(() => ({})),
				onAuthChange: vi.fn(() => () => {}),
			} as unknown as AuthManager,
			extensions: createObsidianExtensions(),
		});
		const { runtime } = await agents.create({ state: { env: defaultConfig } });

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
			expect(names).toContain('bash');
			expect(names).not.toContain('read_pdf');
			expect(
				runtime.getStore(viewingContextExtension.keys.viewingContext).get(),
			).toEqual({
				enabled: true,
				references: [],
			});
		} finally {
			await runtime.dispose();
		}
	});
});
