import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolve as pathResolve } from 'node:path';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
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
		resolve: vi.fn(
			async (...paths: string[]) =>
				pathResolve(...(paths as [string, ...string[]])) as AbsolutePath,
		),
	};
}

describe('configureFilesystem', () => {
	let inner: Filesystem;

	beforeEach(() => {
		inner = mockFilesystem();
	});

	describe('resolve scopes to cwd', () => {
		it('resolves relative paths against cwd', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			});

			const resolved = await fs.resolve('src/index.ts');
			expect(resolved).toBe('/project/src/index.ts');
		});

		it('produces different resolved paths with different cwd', async () => {
			const fsA = configureFilesystem(inner, {
				cwd: '/project-a' as AbsolutePath,
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			});
			expect(await fsA.resolve('file.txt')).toBe('/project-a/file.txt');

			const fsB = configureFilesystem(inner, {
				cwd: '/project-b' as AbsolutePath,
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			});
			expect(await fsB.resolve('file.txt')).toBe('/project-b/file.txt');
		});
	});

	describe('permissions filtering', () => {
		it('denies reads outside allowed patterns', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: { allowRead: ['project/src/**'], allowWrite: [] },
			});

			await expect(fs.readFile('/etc/passwd' as AbsolutePath)).rejects.toThrow(
				'Read access denied',
			);
		});

		it('deny-default — empty permissions blocks all access', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: { allowRead: [], allowWrite: [] },
			});

			await expect(
				fs.readFile('/project/src/index.ts' as AbsolutePath),
			).rejects.toThrow('Read access denied');
		});

		it('produces a new filesystem with different permissions when rebuilt', async () => {
			const fsA = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: { allowRead: [], allowWrite: [] },
			});

			await expect(
				fsA.readFile('/project/file.txt' as AbsolutePath),
			).rejects.toThrow('Read access denied');

			const fsB = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			});

			await fsB.readFile('/project/file.txt' as AbsolutePath);
			expect(inner.readFile).toHaveBeenCalledWith('/project/file.txt');
		});
	});

	describe('delegates all filesystem operations through the chain', () => {
		it('writeFile', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: { allowRead: ['**'], allowWrite: ['project/**'] },
			});

			await fs.writeFile('/project/out.txt' as AbsolutePath, 'data');
			expect(inner.writeFile).toHaveBeenCalledWith('/project/out.txt', 'data');
		});

		it('mkdir', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: { allowRead: ['**'], allowWrite: ['project/**'] },
			});

			await fs.mkdir('/project/dist' as AbsolutePath, { recursive: true });
			expect(inner.mkdir).toHaveBeenCalledWith('/project/dist', {
				recursive: true,
			});
		});

		it('stat', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: { allowRead: ['project/**'], allowWrite: [] },
			});

			await fs.stat('/project/src' as AbsolutePath);
			expect(inner.stat).toHaveBeenCalledWith('/project/src');
		});

		it('deleteFile', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project' as AbsolutePath,
				permissions: { allowRead: ['**'], allowWrite: ['project/**'] },
			});

			await fs.deleteFile('/project/tmp/old.log' as AbsolutePath);
			expect(inner.deleteFile).toHaveBeenCalledWith('/project/tmp/old.log');
		});
	});
});
