import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolve as pathResolve } from 'node:path';
import type { Filesystem } from '@franklin/lib';
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
			pathResolve(...(paths as [string, ...string[]])),
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
				cwd: '/project',
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			});

			await fs.readFile('src/index.ts');
			expect(inner.readFile).toHaveBeenCalledWith('/project/src/index.ts');
		});

		it('produces a new filesystem with different cwd when rebuilt', async () => {
			const fsA = configureFilesystem(inner, {
				cwd: '/project-a',
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			});

			await fsA.readFile('file.txt');
			expect(inner.readFile).toHaveBeenCalledWith('/project-a/file.txt');

			const fsB = configureFilesystem(inner, {
				cwd: '/project-b',
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			});

			await fsB.readFile('file.txt');
			expect(inner.readFile).toHaveBeenCalledWith('/project-b/file.txt');
		});
	});

	describe('permissions filtering', () => {
		it('denies reads outside allowed patterns', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['project/src/**'], allowWrite: [] },
			});

			await expect(fs.readFile('/etc/passwd')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('deny-default — empty permissions blocks all access', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: [], allowWrite: [] },
			});

			await expect(fs.readFile('src/index.ts')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('produces a new filesystem with different permissions when rebuilt', async () => {
			const fsA = configureFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: [], allowWrite: [] },
			});

			await expect(fsA.readFile('file.txt')).rejects.toThrow(
				'Read access denied',
			);

			const fsB = configureFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			});

			await fsB.readFile('file.txt');
			expect(inner.readFile).toHaveBeenCalledWith('/project/file.txt');
		});
	});

	describe('delegates all filesystem operations through the chain', () => {
		it('writeFile', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['**'], allowWrite: ['project/**'] },
			});

			await fs.writeFile('out.txt', 'data');
			expect(inner.writeFile).toHaveBeenCalledWith('/project/out.txt', 'data');
		});

		it('mkdir', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['**'], allowWrite: ['project/**'] },
			});

			await fs.mkdir('dist', { recursive: true });
			expect(inner.mkdir).toHaveBeenCalledWith('/project/dist', {
				recursive: true,
			});
		});

		it('stat', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['project/**'], allowWrite: [] },
			});

			await fs.stat('src');
			expect(inner.stat).toHaveBeenCalledWith('/project/src');
		});

		it('deleteFile', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['**'], allowWrite: ['project/**'] },
			});

			await fs.deleteFile('tmp/old.log');
			expect(inner.deleteFile).toHaveBeenCalledWith('/project/tmp/old.log');
		});
	});
});
