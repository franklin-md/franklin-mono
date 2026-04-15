import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoutedFilesystem } from '../filesystem/router.js';
import type { Filesystem } from '../filesystem/types.js';

function mockFilesystem(name: string): Filesystem {
	return {
		readFile: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
		writeFile: vi.fn().mockResolvedValue(undefined),
		mkdir: vi.fn().mockResolvedValue(undefined),
		access: vi.fn().mockResolvedValue(undefined),
		stat: vi.fn().mockResolvedValue({ isFile: true, isDirectory: false }),
		readdir: vi.fn().mockResolvedValue([`${name}-entry`]),
		exists: vi.fn().mockResolvedValue(true),
		glob: vi.fn().mockResolvedValue([`${name}-match.ts`]),
		deleteFile: vi.fn().mockResolvedValue(undefined),
		resolve: vi.fn(async (...paths: string[]) => path.resolve(...paths)),
	};
}

describe('createRoutedFilesystem', () => {
	let vaultFs: Filesystem;
	let dataFs: Filesystem;
	let fallback: Filesystem;

	beforeEach(() => {
		vaultFs = mockFilesystem('vault');
		dataFs = mockFilesystem('data');
		fallback = mockFilesystem('fallback');
	});

	describe('basic routing', () => {
		it('routes to matched filesystem and strips prefix', async () => {
			const fs = createRoutedFilesystem(
				[{ prefix: '/vault', filesystem: vaultFs }],
				fallback,
			);

			await fs.readFile('/vault/notes/foo.md');

			expect(vaultFs.readFile).toHaveBeenCalledWith('notes/foo.md');
			expect(fallback.readFile).not.toHaveBeenCalled();
		});

		it('falls back when no prefix matches', async () => {
			const fs = createRoutedFilesystem(
				[{ prefix: '/vault', filesystem: vaultFs }],
				fallback,
			);

			await fs.readFile('/tmp/data.json');

			expect(fallback.readFile).toHaveBeenCalledWith('/tmp/data.json');
			expect(vaultFs.readFile).not.toHaveBeenCalled();
		});

		it('handles exact prefix match with empty relative path', async () => {
			const fs = createRoutedFilesystem(
				[{ prefix: '/vault', filesystem: vaultFs }],
				fallback,
			);

			await fs.readdir('/vault');

			expect(vaultFs.readdir).toHaveBeenCalledWith('');
		});
	});

	describe('longest prefix match', () => {
		it('matches the longer prefix when paths overlap', async () => {
			const fs = createRoutedFilesystem(
				[
					{ prefix: '/vault', filesystem: vaultFs },
					{ prefix: '/vault/data', filesystem: dataFs },
				],
				fallback,
			);

			await fs.readFile('/vault/data/db.json');

			expect(dataFs.readFile).toHaveBeenCalledWith('db.json');
			expect(vaultFs.readFile).not.toHaveBeenCalled();
		});

		it('matches shorter prefix for non-overlapping paths', async () => {
			const fs = createRoutedFilesystem(
				[
					{ prefix: '/vault', filesystem: vaultFs },
					{ prefix: '/vault/data', filesystem: dataFs },
				],
				fallback,
			);

			await fs.readFile('/vault/notes/foo.md');

			expect(vaultFs.readFile).toHaveBeenCalledWith('notes/foo.md');
			expect(dataFs.readFile).not.toHaveBeenCalled();
		});

		it('works regardless of route insertion order', async () => {
			// Provide short prefix first — should still match longest
			const fs = createRoutedFilesystem(
				[
					{ prefix: '/vault', filesystem: vaultFs },
					{ prefix: '/vault/data', filesystem: dataFs },
				],
				fallback,
			);

			await fs.readFile('/vault/data/file.txt');
			expect(dataFs.readFile).toHaveBeenCalledWith('file.txt');
		});
	});

	describe('all operations route correctly', () => {
		let fs: Filesystem;

		beforeEach(() => {
			fs = createRoutedFilesystem(
				[{ prefix: '/vault', filesystem: vaultFs }],
				fallback,
			);
		});

		it('writeFile', async () => {
			await fs.writeFile('/vault/out.txt', 'data');
			expect(vaultFs.writeFile).toHaveBeenCalledWith('out.txt', 'data');
		});

		it('mkdir', async () => {
			await fs.mkdir('/vault/new-dir', { recursive: true });
			expect(vaultFs.mkdir).toHaveBeenCalledWith('new-dir', {
				recursive: true,
			});
		});

		it('access', async () => {
			await fs.access('/vault/file.md');
			expect(vaultFs.access).toHaveBeenCalledWith('file.md');
		});

		it('stat', async () => {
			await fs.stat('/vault/file.md');
			expect(vaultFs.stat).toHaveBeenCalledWith('file.md');
		});

		it('exists', async () => {
			await fs.exists('/vault/file.md');
			expect(vaultFs.exists).toHaveBeenCalledWith('file.md');
		});

		it('deleteFile', async () => {
			await fs.deleteFile('/vault/old.md');
			expect(vaultFs.deleteFile).toHaveBeenCalledWith('old.md');
		});

		it('readdir', async () => {
			const entries = await fs.readdir('/vault/notes');
			expect(vaultFs.readdir).toHaveBeenCalledWith('notes');
			expect(entries).toEqual(['vault-entry']);
		});
	});

	describe('glob', () => {
		it('routes glob when root_dir matches a prefix', async () => {
			const fs = createRoutedFilesystem(
				[{ prefix: '/vault', filesystem: vaultFs }],
				fallback,
			);

			await fs.glob('**/*.md', { root_dir: '/vault/notes' });

			expect(vaultFs.glob).toHaveBeenCalledWith('**/*.md', {
				root_dir: 'notes',
			});
		});

		it('routes glob at exact prefix boundary', async () => {
			const fs = createRoutedFilesystem(
				[{ prefix: '/vault', filesystem: vaultFs }],
				fallback,
			);

			await fs.glob('**/*.md', { root_dir: '/vault' });

			expect(vaultFs.glob).toHaveBeenCalledWith('**/*.md', {
				root_dir: undefined,
			});
		});

		it('falls back glob when root_dir does not match', async () => {
			const fs = createRoutedFilesystem(
				[{ prefix: '/vault', filesystem: vaultFs }],
				fallback,
			);

			await fs.glob('**/*.json', { root_dir: '/tmp' });

			expect(fallback.glob).toHaveBeenCalledWith('**/*.json', {
				root_dir: '/tmp',
			});
		});

		it('uses fallback when no root_dir specified', async () => {
			const fs = createRoutedFilesystem(
				[{ prefix: '/vault', filesystem: vaultFs }],
				fallback,
			);

			await fs.glob('**/*.ts', {});

			expect(fallback.glob).toHaveBeenCalledWith('**/*.ts', {});
		});
	});

	describe('resolve', () => {
		it('re-prefixes resolved paths within a route', async () => {
			vi.mocked(vaultFs.resolve).mockResolvedValue('notes/resolved.md');
			const fs = createRoutedFilesystem(
				[{ prefix: '/vault', filesystem: vaultFs }],
				fallback,
			);

			const result = await fs.resolve('/vault/notes/resolved.md');

			expect(result).toBe('/vault/notes/resolved.md');
		});

		it('passes through to fallback for non-routed paths', async () => {
			vi.mocked(fallback.resolve).mockResolvedValue('/tmp/file.txt');
			const fs = createRoutedFilesystem(
				[{ prefix: '/vault', filesystem: vaultFs }],
				fallback,
			);

			const result = await fs.resolve('/tmp/file.txt');

			expect(result).toBe('/tmp/file.txt');
			expect(fallback.resolve).toHaveBeenCalled();
		});
	});

	describe('prefix trailing slash handling', () => {
		it('works with prefix that has trailing slash', async () => {
			const fs = createRoutedFilesystem(
				[{ prefix: '/vault/', filesystem: vaultFs }],
				fallback,
			);

			await fs.readFile('/vault/notes/foo.md');
			expect(vaultFs.readFile).toHaveBeenCalledWith('notes/foo.md');
		});

		it('does not match partial directory names', async () => {
			const fs = createRoutedFilesystem(
				[{ prefix: '/vault', filesystem: vaultFs }],
				fallback,
			);

			await fs.readFile('/vault-backup/file.md');
			expect(fallback.readFile).toHaveBeenCalledWith('/vault-backup/file.md');
			expect(vaultFs.readFile).not.toHaveBeenCalled();
		});
	});
});
