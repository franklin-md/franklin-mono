import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Filesystem } from '@franklin/lib';
import { EnvironmentFilesystem } from '../platform/environment-filesystem.js';

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
	};
}

describe('EnvironmentFilesystem', () => {
	let inner: Filesystem;

	beforeEach(() => {
		inner = mockFilesystem();
	});

	describe('construction', () => {
		it('applies cwd scoping — relative paths resolve against cwd', async () => {
			const fs = new EnvironmentFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			});

			await fs.readFile('src/index.ts');
			expect(inner.readFile).toHaveBeenCalledWith('/project/src/index.ts');
		});

		it('applies permissions filtering — denies reads outside allowed patterns', async () => {
			const fs = new EnvironmentFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['project/src/**'], allowWrite: [] },
			});

			await expect(fs.readFile('/etc/passwd')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('deny-default — empty permissions blocks all access', async () => {
			const fs = new EnvironmentFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: [], allowWrite: [] },
			});

			await expect(fs.readFile('src/index.ts')).rejects.toThrow(
				'Read access denied',
			);
		});
	});

	describe('setCwd', () => {
		it('changes path resolution on subsequent calls', async () => {
			const fs = new EnvironmentFilesystem(inner, {
				cwd: '/project-a',
				permissions: { allowRead: ['**'], allowWrite: ['**'] },
			});

			await fs.readFile('file.txt');
			expect(inner.readFile).toHaveBeenCalledWith('/project-a/file.txt');

			fs.setCwd('/project-b');

			await fs.readFile('file.txt');
			expect(inner.readFile).toHaveBeenCalledWith('/project-b/file.txt');
		});
	});

	describe('setPermissions', () => {
		it('changes access control on subsequent calls', async () => {
			const fs = new EnvironmentFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: [], allowWrite: [] },
			});

			await expect(fs.readFile('file.txt')).rejects.toThrow(
				'Read access denied',
			);

			fs.setPermissions({ allowRead: ['**'], allowWrite: ['**'] });

			await fs.readFile('file.txt');
			expect(inner.readFile).toHaveBeenCalledWith('/project/file.txt');
		});
	});

	describe('config', () => {
		it('returns current config after construction', () => {
			const fs = new EnvironmentFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['src/**'], allowWrite: [] },
			});

			expect(fs.config).toEqual({
				cwd: '/project',
				permissions: { allowRead: ['src/**'], allowWrite: [] },
			});
		});

		it('reflects updated cwd after setCwd', () => {
			const fs = new EnvironmentFilesystem(inner, {
				cwd: '/project-a',
				permissions: { allowRead: ['**'], allowWrite: [] },
			});

			fs.setCwd('/project-b');

			expect(fs.config.cwd).toBe('/project-b');
		});

		it('reflects updated permissions after setPermissions', () => {
			const fs = new EnvironmentFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: [], allowWrite: [] },
			});

			fs.setPermissions({ allowRead: ['src/**'], allowWrite: ['src/**'] });

			expect(fs.config.permissions).toEqual({
				allowRead: ['src/**'],
				allowWrite: ['src/**'],
			});
		});
	});

	describe('delegates all filesystem operations through the chain', () => {
		it('writeFile', async () => {
			const fs = new EnvironmentFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['**'], allowWrite: ['project/**'] },
			});

			await fs.writeFile('out.txt', 'data');
			expect(inner.writeFile).toHaveBeenCalledWith('/project/out.txt', 'data');
		});

		it('mkdir', async () => {
			const fs = new EnvironmentFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['**'], allowWrite: ['project/**'] },
			});

			await fs.mkdir('dist', { recursive: true });
			expect(inner.mkdir).toHaveBeenCalledWith('/project/dist', {
				recursive: true,
			});
		});

		it('stat', async () => {
			const fs = new EnvironmentFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['project/**'], allowWrite: [] },
			});

			await fs.stat('src');
			expect(inner.stat).toHaveBeenCalledWith('/project/src');
		});

		it('deleteFile', async () => {
			const fs = new EnvironmentFilesystem(inner, {
				cwd: '/project',
				permissions: { allowRead: ['**'], allowWrite: ['project/**'] },
			});

			await fs.deleteFile('tmp/old.log');
			expect(inner.deleteFile).toHaveBeenCalledWith('/project/tmp/old.log');
		});
	});
});
