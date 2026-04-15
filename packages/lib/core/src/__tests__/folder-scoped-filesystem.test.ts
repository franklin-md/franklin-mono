import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFolderScopedFilesystem } from '../filesystem/folder-scoped.js';
import type { AbsolutePath, Filesystem } from '../filesystem/types.js';

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
		resolve: vi.fn(
			async (...paths: string[]) => path.resolve(...paths) as AbsolutePath,
		),
	};
}

describe('createFolderScopedFilesystem', () => {
	let inner: Filesystem;

	beforeEach(() => {
		inner = mockFilesystem();
	});

	// The AbsolutePath branded type now enforces absolute paths at compile time,
	// so there is no runtime check to test.

	describe('path resolution', () => {
		it('resolves relative paths against cwd', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.readFile('./src/index.ts' as AbsolutePath);

			expect(inner.readFile).toHaveBeenCalledWith('/project/src/index.ts');
		});

		it('resolves bare filenames against cwd', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.readFile('file.txt' as AbsolutePath);

			expect(inner.readFile).toHaveBeenCalledWith('/project/file.txt');
		});

		it('normalizes .. within cwd', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.readFile('src/../file.txt' as AbsolutePath);

			expect(inner.readFile).toHaveBeenCalledWith('/project/file.txt');
		});

		it('resolves . to cwd itself', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.readdir('.' as AbsolutePath);

			expect(inner.readdir).toHaveBeenCalledWith('/project');
		});

		it('resolves absolute paths as-is', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.readFile('/usr/share/data.txt' as AbsolutePath);

			expect(inner.readFile).toHaveBeenCalledWith('/usr/share/data.txt');
		});

		it('resolves .. that escapes cwd', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.readFile('../other/file.txt' as AbsolutePath);

			expect(inner.readFile).toHaveBeenCalledWith('/other/file.txt');
		});
	});

	describe('delegates all operations', () => {
		it('writeFile', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.writeFile('out.txt' as AbsolutePath, 'data');

			expect(inner.writeFile).toHaveBeenCalledWith('/project/out.txt', 'data');
		});

		it('mkdir', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.mkdir('dist' as AbsolutePath, { recursive: true });

			expect(inner.mkdir).toHaveBeenCalledWith('/project/dist', {
				recursive: true,
			});
		});

		it('access', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.access('package.json' as AbsolutePath);

			expect(inner.access).toHaveBeenCalledWith('/project/package.json');
		});

		it('stat', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.stat('src' as AbsolutePath);

			expect(inner.stat).toHaveBeenCalledWith('/project/src');
		});

		it('exists', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.exists('config.json' as AbsolutePath);

			expect(inner.exists).toHaveBeenCalledWith('/project/config.json');
		});

		it('deleteFile', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.deleteFile('tmp/old.log' as AbsolutePath);

			expect(inner.deleteFile).toHaveBeenCalledWith('/project/tmp/old.log');
		});
	});

	describe('glob', () => {
		it('resolves glob root_dir against scoped root', async () => {
			const fs = createFolderScopedFilesystem(
				'/project' as AbsolutePath,
				inner,
			);
			await fs.glob('**/*.ts', { root_dir: 'src' as AbsolutePath });

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
