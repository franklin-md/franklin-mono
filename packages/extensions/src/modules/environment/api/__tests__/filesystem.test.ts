import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolve as pathResolve } from 'node:path';
import {
	FILESYSTEM_ALLOW_ALL,
	FILESYSTEM_DEFAULT_PERMISSIONS,
	toAbsolutePath,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';
import { configureFilesystem } from '../filesystem.js';

function mockFilesystem(): Filesystem {
	return {
		readFile: vi.fn().mockResolvedValue(new Uint8Array()),
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
		access: vi.fn().mockResolvedValue(undefined),
		stat: vi.fn().mockResolvedValue({ isFile: true, isDirectory: false }),
		readdir: vi.fn().mockResolvedValue([]),
		exists: vi.fn().mockResolvedValue(true),
		glob: vi.fn().mockResolvedValue([]),
		deleteFile: vi.fn().mockResolvedValue(undefined),
		resolve: vi.fn(async (...paths: string[]) =>
			toAbsolutePath(pathResolve(...(paths as [string, ...string[]]))),
		),
	};
}

describe('configureFilesystem', () => {
	let inner: Filesystem;

	beforeEach(() => {
		inner = mockFilesystem();
	});

	describe('cwd scoping', () => {
		it('resolves relative paths against cwd', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: FILESYSTEM_ALLOW_ALL,
			});

			const resolved = await fs.resolve('src/index.ts');
			expect(resolved).toBe('/project/src/index.ts');
		});

		it('produces different resolved paths with different cwd', async () => {
			const fsA = configureFilesystem(inner, {
				cwd: '/project-a' as AbsolutePath,
				permissions: FILESYSTEM_ALLOW_ALL,
			});
			expect(await fsA.resolve('file.txt')).toBe('/project-a/file.txt');

			const fsB = configureFilesystem(inner, {
				cwd: '/project-b' as AbsolutePath,
				permissions: FILESYSTEM_ALLOW_ALL,
			});
			expect(await fsB.resolve('file.txt')).toBe('/project-b/file.txt');
		});
	});

	describe('permissions filtering', () => {
		it('denies reads matching a denyRead pattern', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: {
					...FILESYSTEM_ALLOW_ALL,
					allowRead: ['project/**'],
					denyRead: ['etc/**'],
				},
			});

			await expect(fs.readFile('/etc/passwd' as AbsolutePath)).rejects.toThrow(
				'Read access denied',
			);
		});

		it('allowRead overrides denyRead (allow wins)', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: {
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					allowRead: ['project/src/**'],
					denyRead: ['project/**'],
				},
			});

			await fs.readFile('/project/src/index.ts' as AbsolutePath);
			expect(inner.readFile).toHaveBeenCalledWith('/project/src/index.ts');
		});

		it('reads default-allow when no patterns match', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: FILESYSTEM_DEFAULT_PERMISSIONS,
			});

			await fs.readFile('/project/src/index.ts' as AbsolutePath);
			expect(inner.readFile).toHaveBeenCalledWith('/project/src/index.ts');
		});

		it('writes default-deny when no patterns match', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: FILESYSTEM_DEFAULT_PERMISSIONS,
			});

			await expect(
				fs.writeFile('/project/out.txt' as AbsolutePath, 'data'),
			).rejects.toThrow('Write access denied');
		});

		it('denyWrite overrides allowWrite (deny wins)', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: {
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					allowWrite: ['project/**'],
					denyWrite: ['project/secrets/**'],
				},
			});

			await expect(
				fs.writeFile('/project/secrets/key.txt' as AbsolutePath, 'data'),
			).rejects.toThrow('Write access denied');
		});

		it('produces a new filesystem with different permissions when rebuilt', async () => {
			const fsA = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: FILESYSTEM_DEFAULT_PERMISSIONS,
			});

			await expect(
				fsA.writeFile('/project/file.txt' as AbsolutePath, 'data'),
			).rejects.toThrow('Write access denied');

			const fsB = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: FILESYSTEM_ALLOW_ALL,
			});

			await fsB.writeFile('/project/file.txt' as AbsolutePath, 'data');
			expect(inner.writeFile).toHaveBeenCalledWith('/project/file.txt', 'data');
		});
	});

	describe('delegates all filesystem operations through the chain', () => {
		it('writeFile', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: {
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					allowWrite: ['project/**'],
				},
			});

			await fs.writeFile('/project/out.txt' as AbsolutePath, 'data');
			expect(inner.writeFile).toHaveBeenCalledWith('/project/out.txt', 'data');
		});

		it('mkdir', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: {
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					allowWrite: ['project/**'],
				},
			});

			await fs.mkdir('/project/dist' as AbsolutePath, { recursive: true });
			expect(inner.mkdir).toHaveBeenCalledWith('/project/dist', {
				recursive: true,
			});
		});

		it('stat', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: {
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					allowRead: ['project/**'],
				},
			});

			await fs.stat('/project/src' as AbsolutePath);
			expect(inner.stat).toHaveBeenCalledWith('/project/src');
		});

		it('deleteFile', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: {
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					allowWrite: ['project/**'],
				},
			});

			await fs.deleteFile('/project/tmp/old.log' as AbsolutePath);
			expect(inner.deleteFile).toHaveBeenCalledWith('/project/tmp/old.log');
		});
	});
});
