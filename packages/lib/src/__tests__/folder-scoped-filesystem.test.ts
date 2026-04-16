import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFolderScopedFilesystem } from '../filesystem/folder-scoped.js';
import type { AbsolutePath, Filesystem } from '../filesystem/types.js';
import { toAbsolutePath } from '../paths/index.js';

function mockFilesystem(): Filesystem {
	return {
		readFile: vi.fn().mockResolvedValue(new Uint8Array()),
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
		access: vi.fn().mockResolvedValue(undefined),
		stat: vi.fn().mockResolvedValue({
			isFile: true,
			isDirectory: false,
		}),
		readdir: vi.fn().mockResolvedValue([]),
		exists: vi.fn().mockResolvedValue(true),
		glob: vi.fn().mockResolvedValue([]),
		deleteFile: vi.fn().mockResolvedValue(undefined),
		resolve: vi.fn(async (...paths: string[]) =>
			toAbsolutePath(path.resolve(...paths)),
		),
	};
}

describe('createFolderScopedFilesystem', () => {
	let inner: Filesystem;

	beforeEach(() => {
		inner = mockFilesystem();
	});

	describe('resolve scopes to cwd', () => {
		it('prepends cwd to relative paths', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.resolve('src/index.ts');

			expect(inner.resolve).toHaveBeenCalledWith('/project', 'src/index.ts');
		});

		it('prepends cwd to bare filenames', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.resolve('file.txt');

			expect(inner.resolve).toHaveBeenCalledWith('/project', 'file.txt');
		});
	});

	describe('passthrough — methods delegate directly to inner', () => {
		it('readFile', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			const absPath = '/project/src/index.ts' as AbsolutePath;
			await fs.readFile(absPath);

			expect(inner.readFile).toHaveBeenCalledWith(absPath);
		});

		it('writeFile', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			const absPath = '/project/out.txt' as AbsolutePath;
			await fs.writeFile(absPath, 'data');

			expect(inner.writeFile).toHaveBeenCalledWith(absPath, 'data');
		});

		it('mkdir', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			const absPath = '/project/dist' as AbsolutePath;
			await fs.mkdir(absPath, { recursive: true });

			expect(inner.mkdir).toHaveBeenCalledWith(absPath, {
				recursive: true,
			});
		});

		it('access', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			const absPath = '/project/package.json' as AbsolutePath;
			await fs.access(absPath);

			expect(inner.access).toHaveBeenCalledWith(absPath);
		});

		it('stat', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			const absPath = '/project/src' as AbsolutePath;
			await fs.stat(absPath);

			expect(inner.stat).toHaveBeenCalledWith(absPath);
		});

		it('exists', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			const absPath = '/project/config.json' as AbsolutePath;
			await fs.exists(absPath);

			expect(inner.exists).toHaveBeenCalledWith(absPath);
		});

		it('readdir', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			const absPath = '/project' as AbsolutePath;
			await fs.readdir(absPath);

			expect(inner.readdir).toHaveBeenCalledWith(absPath);
		});

		it('deleteFile', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			const absPath = '/project/tmp/old.log' as AbsolutePath;
			await fs.deleteFile(absPath);

			expect(inner.deleteFile).toHaveBeenCalledWith(absPath);
		});
	});

	describe('glob', () => {
		it('resolves glob root_dir against scoped root', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.glob('**/*.ts', { root_dir: '/project/src' as AbsolutePath });

			expect(inner.glob).toHaveBeenCalledWith('**/*.ts', {
				root_dir: '/project/src',
			});
		});

		it('defaults root_dir to cwd when not specified', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.glob('*.json', {});

			expect(inner.glob).toHaveBeenCalledWith('*.json', {
				root_dir: '/project',
			});
		});
	});
});
