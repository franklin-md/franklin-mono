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

	const allowAll = {
		allowRead: ['**'],
		denyRead: [],
		allowWrite: ['**'],
		denyWrite: [],
	};

	describe('cwd scoping', () => {
		it('resolves relative paths against cwd', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: allowAll,
			});

			await fs.readFile('src/index.ts');
			expect(inner.readFile).toHaveBeenCalledWith('/project/src/index.ts');
		});

		it('produces a new filesystem with different cwd when rebuilt', async () => {
			const fsA = configureFilesystem(inner, {
				cwd: '/project-a',
				permissions: allowAll,
			});

			await fsA.readFile('file.txt');
			expect(inner.readFile).toHaveBeenCalledWith('/project-a/file.txt');

			const fsB = configureFilesystem(inner, {
				cwd: '/project-b',
				permissions: allowAll,
			});

			await fsB.readFile('file.txt');
			expect(inner.readFile).toHaveBeenCalledWith('/project-b/file.txt');
		});
	});

	describe('permissions filtering', () => {
		it('denies reads matching a denyRead pattern', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: {
					allowRead: ['project/**'],
					denyRead: ['etc/**'],
					allowWrite: ['**'],
					denyWrite: [],
				},
			});

			await expect(fs.readFile('/etc/passwd')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('allowRead overrides denyRead (allow wins)', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: {
					allowRead: ['project/src/**'],
					denyRead: ['project/**'],
					allowWrite: [],
					denyWrite: [],
				},
			});

			await fs.readFile('src/index.ts');
			expect(inner.readFile).toHaveBeenCalledWith('/project/src/index.ts');
		});

		it('reads default-allow when no patterns match', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: {
					allowRead: [],
					denyRead: [],
					allowWrite: [],
					denyWrite: [],
				},
			});

			await fs.readFile('src/index.ts');
			expect(inner.readFile).toHaveBeenCalledWith('/project/src/index.ts');
		});

		it('writes default-deny when no patterns match', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: {
					allowRead: [],
					denyRead: [],
					allowWrite: [],
					denyWrite: [],
				},
			});

			await expect(fs.writeFile('out.txt', 'data')).rejects.toThrow(
				'Write access denied',
			);
		});

		it('denyWrite overrides allowWrite (deny wins)', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: {
					allowRead: [],
					denyRead: [],
					allowWrite: ['project/**'],
					denyWrite: ['project/secrets/**'],
				},
			});

			await expect(fs.writeFile('secrets/key.txt', 'data')).rejects.toThrow(
				'Write access denied',
			);
		});

		it('produces a new filesystem with different permissions when rebuilt', async () => {
			const fsA = configureFilesystem(inner, {
				cwd: '/project',
				permissions: {
					allowRead: [],
					denyRead: [],
					allowWrite: [],
					denyWrite: [],
				},
			});

			await expect(fsA.writeFile('file.txt', 'data')).rejects.toThrow(
				'Write access denied',
			);

			const fsB = configureFilesystem(inner, {
				cwd: '/project',
				permissions: allowAll,
			});

			await fsB.writeFile('file.txt', 'data');
			expect(inner.writeFile).toHaveBeenCalledWith('/project/file.txt', 'data');
		});
	});

	describe('delegates all filesystem operations through the chain', () => {
		it('writeFile', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: {
					allowRead: ['**'],
					denyRead: [],
					allowWrite: ['project/**'],
					denyWrite: [],
				},
			});

			await fs.writeFile('out.txt', 'data');
			expect(inner.writeFile).toHaveBeenCalledWith('/project/out.txt', 'data');
		});

		it('mkdir', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: {
					allowRead: ['**'],
					denyRead: [],
					allowWrite: ['project/**'],
					denyWrite: [],
				},
			});

			await fs.mkdir('dist', { recursive: true });
			expect(inner.mkdir).toHaveBeenCalledWith('/project/dist', {
				recursive: true,
			});
		});

		it('stat', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: {
					allowRead: ['project/**'],
					denyRead: [],
					allowWrite: [],
					denyWrite: [],
				},
			});

			await fs.stat('src');
			expect(inner.stat).toHaveBeenCalledWith('/project/src');
		});

		it('deleteFile', async () => {
			const fs = configureFilesystem(inner, {
				cwd: '/project',
				permissions: {
					allowRead: ['**'],
					denyRead: [],
					allowWrite: ['project/**'],
					denyWrite: [],
				},
			});

			await fs.deleteFile('tmp/old.log');
			expect(inner.deleteFile).toHaveBeenCalledWith('/project/tmp/old.log');
		});
	});
});
