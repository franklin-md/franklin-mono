import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFolderScopedFilesystem } from '../filesystem/folder-scoped.js';
import type { Filesystem } from '../filesystem/types.js';

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
		resolve: vi.fn(async (...paths: string[]) => path.resolve(...paths)),
	};
}

describe('createFolderScopedFilesystem', () => {
	let inner: Filesystem;

	beforeEach(() => {
		inner = mockFilesystem();
	});

	it('throws if cwd is not absolute', () => {
		expect(() => createFolderScopedFilesystem('relative/path', inner)).toThrow(
			'cwd must be an absolute path',
		);
	});

	describe('path resolution', () => {
		it('resolves relative paths against cwd', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.readFile('./src/index.ts');

			expect(inner.readFile).toHaveBeenCalledWith('/project/src/index.ts');
		});

		it('resolves bare filenames against cwd', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.readFile('file.txt');

			expect(inner.readFile).toHaveBeenCalledWith('/project/file.txt');
		});

		it('normalizes .. within cwd', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.readFile('src/../file.txt');

			expect(inner.readFile).toHaveBeenCalledWith('/project/file.txt');
		});

		it('resolves . to cwd itself', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.readdir('.');

			expect(inner.readdir).toHaveBeenCalledWith('/project');
		});

		it('resolves absolute paths as-is', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.readFile('/usr/share/data.txt');

			expect(inner.readFile).toHaveBeenCalledWith('/usr/share/data.txt');
		});

		it('resolves .. that escapes cwd', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.readFile('../other/file.txt');

			expect(inner.readFile).toHaveBeenCalledWith('/other/file.txt');
		});
	});

	describe('delegates all operations', () => {
		it('writeFile', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.writeFile('out.txt', 'data');

			expect(inner.writeFile).toHaveBeenCalledWith('/project/out.txt', 'data');
		});

		it('mkdir', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.mkdir('dist', { recursive: true });

			expect(inner.mkdir).toHaveBeenCalledWith('/project/dist', {
				recursive: true,
			});
		});

		it('access', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.access('package.json');

			expect(inner.access).toHaveBeenCalledWith('/project/package.json');
		});

		it('stat', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.stat('src');

			expect(inner.stat).toHaveBeenCalledWith('/project/src');
		});

		it('exists', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.exists('config.json');

			expect(inner.exists).toHaveBeenCalledWith('/project/config.json');
		});

		it('deleteFile', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.deleteFile('tmp/old.log');

			expect(inner.deleteFile).toHaveBeenCalledWith('/project/tmp/old.log');
		});
	});

	describe('glob', () => {
		it('resolves glob root_dir against scoped root', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.glob('**/*.ts', { root_dir: 'src' });

			expect(inner.glob).toHaveBeenCalledWith('**/*.ts', {
				root_dir: '/project/src',
			});
		});

		it('defaults root_dir to cwd when not specified', async () => {
			const fs = createFolderScopedFilesystem('/project', inner);
			await fs.glob('*.json', {});

			expect(inner.glob).toHaveBeenCalledWith('*.json', {
				root_dir: '/project',
			});
		});
	});
});
