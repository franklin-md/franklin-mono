import type { AbsolutePath } from '@franklin/lib';
import { describe, expect, it, vi } from 'vitest';
import { compileCoreWithStoreAndEnv } from '../../../testing/compile-ext.js';
import type { ReconfigurableEnvironment } from '../../../systems/environment/api/types.js';
import { fileKey } from '../common/key.js';
import { filesystemExtension } from '../index.js';

function mockEnvironment(): ReconfigurableEnvironment {
	return {
		filesystem: {
			readFile: vi.fn(),
			writeFile: vi.fn(),
			mkdir: vi.fn(),
			access: vi.fn(),
			stat: vi.fn(async () => ({
				isFile: true,
				isDirectory: false,
			})),
			readdir: vi.fn(async () => []),
			exists: vi.fn(async () => true),
			glob: vi.fn(async () => []),
			deleteFile: vi.fn(async () => {}),
			resolve: vi.fn(
				async (...paths: string[]) => paths[paths.length - 1]! as AbsolutePath,
			),
		},
		terminal: { exec: vi.fn() },
		web: { fetch: vi.fn() },
		config: vi.fn(async () => ({
			fsConfig: {
				cwd: '/tmp' as AbsolutePath,
				permissions: {
					allowRead: ['**'],
					denyRead: [],
					allowWrite: ['**'],
					denyWrite: [],
				},
			},
			netConfig: { allowedDomains: [], deniedDomains: [] },
		})),
		reconfigure: vi.fn(async () => {}),
		dispose: vi.fn(async () => {}),
	};
}

describe('filesystemExtension', () => {
	it('exposes the shared file store and all filesystem tools', async () => {
		expect(filesystemExtension.keys.file).toBe(fileKey);
		expect(filesystemExtension.tools.readFile.name).toBe('read_file');
		expect(filesystemExtension.tools.writeFile.name).toBe('write_file');
		expect(filesystemExtension.tools.editFile.name).toBe('edit_file');
		expect(filesystemExtension.tools.glob.name).toBe('glob');

		const compiled = await compileCoreWithStoreAndEnv(
			filesystemExtension.extension,
			mockEnvironment(),
		);

		const names = compiled.tools.map((tool) => tool.name);
		expect(names).toEqual(
			expect.arrayContaining(['read_file', 'write_file', 'edit_file', 'glob']),
		);
	});
});
