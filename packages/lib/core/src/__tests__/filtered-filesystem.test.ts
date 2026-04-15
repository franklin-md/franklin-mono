import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFilteredFilesystem } from '../filesystem/filtered.js';
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
		resolve: vi.fn(async (...paths: string[]) => paths[paths.length - 1]!),
	};
}

const empty = {
	allowRead: [],
	denyRead: [],
	allowWrite: [],
	denyWrite: [],
};

describe('createFilteredFilesystem', () => {
	let inner: Filesystem;

	beforeEach(() => {
		inner = mockFilesystem();
	});

	describe('default policy', () => {
		it('allows reads when no patterns match (default-allow)', async () => {
			const fs = createFilteredFilesystem(empty, inner);

			await fs.readFile('/project/file.txt');
			expect(inner.readFile).toHaveBeenCalledWith('/project/file.txt');
		});

		it('blocks writes when no patterns match (default-deny)', async () => {
			const fs = createFilteredFilesystem(empty, inner);

			await expect(fs.writeFile('/project/file.txt', 'data')).rejects.toThrow(
				'Write access denied',
			);
		});
	});

	describe('read access', () => {
		it('blocks reads matching denyRead pattern', async () => {
			const fs = createFilteredFilesystem(
				{ ...empty, denyRead: ['secret/**'] },
				inner,
			);

			await expect(fs.readFile('/secret/file')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('allowRead overrides denyRead (allow wins)', async () => {
			const fs = createFilteredFilesystem(
				{
					...empty,
					allowRead: ['project/src/**'],
					denyRead: ['project/**'],
				},
				inner,
			);

			await fs.readFile('/project/src/index.ts');
			expect(inner.readFile).toHaveBeenCalledWith('/project/src/index.ts');
		});

		it('denyRead blocks paths outside allowRead', async () => {
			const fs = createFilteredFilesystem(
				{
					...empty,
					allowRead: ['project/**'],
					denyRead: ['etc/**'],
				},
				inner,
			);

			await expect(fs.readFile('/etc/passwd')).rejects.toThrow(
				'Read access denied',
			);
		});
	});

	describe('write access', () => {
		it('allows writes matching allowWrite pattern', async () => {
			const fs = createFilteredFilesystem(
				{ ...empty, allowWrite: ['project/**'] },
				inner,
			);

			await fs.writeFile('/project/src/new.ts', 'content');
			expect(inner.writeFile).toHaveBeenCalledWith(
				'/project/src/new.ts',
				'content',
			);
		});

		it('blocks writes not matching allowWrite pattern', async () => {
			const fs = createFilteredFilesystem(
				{ ...empty, allowWrite: ['project/**'] },
				inner,
			);

			await expect(fs.writeFile('/etc/config', 'data')).rejects.toThrow(
				'Write access denied',
			);
		});

		it('denyWrite overrides allowWrite (deny wins)', async () => {
			const fs = createFilteredFilesystem(
				{
					...empty,
					allowWrite: ['project/**'],
					denyWrite: ['project/secrets/**'],
				},
				inner,
			);

			await expect(
				fs.writeFile('/project/secrets/key', 'data'),
			).rejects.toThrow('Write access denied');
		});

		it('blocks mkdir outside allowed paths', async () => {
			const fs = createFilteredFilesystem(
				{ ...empty, allowWrite: ['project/**'] },
				inner,
			);

			await expect(fs.mkdir('/tmp/evil')).rejects.toThrow(
				'Write access denied',
			);
		});

		it('blocks deleteFile outside allowed paths', async () => {
			const fs = createFilteredFilesystem(
				{ ...empty, allowWrite: ['project/**'] },
				inner,
			);

			await expect(fs.deleteFile('/etc/important')).rejects.toThrow(
				'Write access denied',
			);
		});
	});

	describe('.env blocking via denyRead', () => {
		it('blocks .env files listed in denyRead', async () => {
			const fs = createFilteredFilesystem(
				{
					...empty,
					denyRead: ['**/.env', '**/.env.*'],
				},
				inner,
			);

			await expect(fs.readFile('/project/.env')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('blocks .env.local via denyRead', async () => {
			const fs = createFilteredFilesystem(
				{
					...empty,
					denyRead: ['**/.env.*'],
				},
				inner,
			);

			await expect(fs.readFile('/project/.env.local')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('allows non-env files in same directory', async () => {
			const fs = createFilteredFilesystem(
				{
					...empty,
					denyRead: ['**/.env', '**/.env.*'],
				},
				inner,
			);

			await fs.readFile('/project/package.json');
			expect(inner.readFile).toHaveBeenCalledWith('/project/package.json');
		});
	});

	describe('readdir filtering', () => {
		it('filters out entries that are not readable', async () => {
			vi.mocked(inner.readdir).mockResolvedValue([
				'index.ts',
				'.env',
				'.env.local',
				'package.json',
			]);

			const fs = createFilteredFilesystem(
				{
					...empty,
					denyRead: ['**/.env', '**/.env.*'],
				},
				inner,
			);

			const entries = await fs.readdir('/project');
			expect(entries).toEqual(['index.ts', 'package.json']);
		});

		it('returns all entries when all are readable', async () => {
			vi.mocked(inner.readdir).mockResolvedValue(['a.ts', 'b.ts', 'c.ts']);

			const fs = createFilteredFilesystem(empty, inner);

			const entries = await fs.readdir('/project');
			expect(entries).toEqual(['a.ts', 'b.ts', 'c.ts']);
		});
	});

	describe('glob filtering', () => {
		it('filters glob results through read policy', async () => {
			vi.mocked(inner.glob).mockResolvedValue([
				'src/index.ts',
				'.env',
				'src/util.ts',
			]);

			const fs = createFilteredFilesystem(
				{
					...empty,
					denyRead: ['**/.env'],
				},
				inner,
			);

			const results = await fs.glob('**/*', { root_dir: '/project' });
			expect(results).toEqual(['src/index.ts', 'src/util.ts']);
		});
	});

	describe('stat, access, exists respect read policy', () => {
		it('stat blocked for denied paths', async () => {
			const fs = createFilteredFilesystem(
				{ ...empty, denyRead: ['secret/**'] },
				inner,
			);

			await expect(fs.stat('/secret/file')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('access blocked for denied paths', async () => {
			const fs = createFilteredFilesystem(
				{ ...empty, denyRead: ['secret/**'] },
				inner,
			);

			await expect(fs.access('/secret/file')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('exists blocked for denied paths', async () => {
			const fs = createFilteredFilesystem(
				{ ...empty, denyRead: ['secret/**'] },
				inner,
			);

			await expect(fs.exists('/secret/file')).rejects.toThrow(
				'Read access denied',
			);
		});
	});
});
