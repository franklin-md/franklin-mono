import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createFilteredFilesystem,
	FILESYSTEM_DEFAULT_PERMISSIONS,
	FILESYSTEM_DENY_ALL,
} from '../filesystem/filtered.js';
import type { AbsolutePath, Filesystem } from '../filesystem/types.js';
import { joinAbsolute } from '../paths/index.js';

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
		resolve: vi.fn(async (...paths: string[]) => {
			const [base, ...rest] = paths;
			if (base?.startsWith('/')) {
				return joinAbsolute(base as AbsolutePath, ...rest);
			}
			return paths[paths.length - 1]! as AbsolutePath;
		}),
	};
}

describe('createFilteredFilesystem', () => {
	let inner: Filesystem;

	beforeEach(() => {
		inner = mockFilesystem();
	});

	describe('default policy', () => {
		it('allows reads when no patterns match (default-allow)', async () => {
			const fs = createFilteredFilesystem(
				FILESYSTEM_DEFAULT_PERMISSIONS,
				inner,
			);

			await fs.readFile('/project/file.txt' as AbsolutePath);
			expect(inner.readFile).toHaveBeenCalledWith('/project/file.txt');
		});

		it('blocks writes when no patterns match (default-deny)', async () => {
			const fs = createFilteredFilesystem(
				FILESYSTEM_DEFAULT_PERMISSIONS,
				inner,
			);

			await expect(
				fs.writeFile('/project/file.txt' as AbsolutePath, 'data'),
			).rejects.toThrow('Write access denied');
		});
		it('FILESYSTEM_DENY_ALL blocks both reads and writes', async () => {
			const fs = createFilteredFilesystem(FILESYSTEM_DENY_ALL, inner);

			await expect(
				fs.readFile('/project/file.txt' as AbsolutePath),
			).rejects.toThrow('Read access denied');
			await expect(
				fs.writeFile('/project/file.txt' as AbsolutePath, 'data'),
			).rejects.toThrow('Write access denied');
		});

		it('FILESYSTEM_DEFAULT_PERMISSIONS keeps default read/write behavior', async () => {
			const fs = createFilteredFilesystem(FILESYSTEM_DEFAULT_PERMISSIONS, inner);

			await fs.readFile('/project/file.txt' as AbsolutePath);
			await expect(
				fs.writeFile('/project/file.txt' as AbsolutePath, 'data'),
			).rejects.toThrow('Write access denied');
		});
	});

	describe('read access', () => {
		it('blocks reads matching denyRead pattern', async () => {
			const fs = createFilteredFilesystem(
				{ ...FILESYSTEM_DEFAULT_PERMISSIONS, denyRead: ['secret/**'] },
				inner,
			);

			await expect(fs.readFile('/secret/file' as AbsolutePath)).rejects.toThrow(
				'Read access denied',
			);
		});

		it('allowRead overrides denyRead (allow wins)', async () => {
			const fs = createFilteredFilesystem(
				{
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					allowRead: ['project/src/**'],
					denyRead: ['project/**'],
				},
				inner,
			);

			await fs.readFile('/project/src/index.ts' as AbsolutePath);
			expect(inner.readFile).toHaveBeenCalledWith('/project/src/index.ts');
		});

		it('denyRead blocks paths outside allowRead', async () => {
			const fs = createFilteredFilesystem(
				{
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					allowRead: ['project/**'],
					denyRead: ['etc/**'],
				},
				inner,
			);

			await expect(fs.readFile('/etc/passwd' as AbsolutePath)).rejects.toThrow(
				'Read access denied',
			);
		});

		it('allows reads with ** wildcard', async () => {
			const fs = createFilteredFilesystem(
				{
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					allowRead: ['**'],
				},
				inner,
			);

			await fs.readFile('/anywhere/file.txt' as AbsolutePath);
			expect(inner.readFile).toHaveBeenCalledWith('/anywhere/file.txt');
		});
	});

	describe('write access', () => {
		it('allows writes matching allowWrite pattern', async () => {
			const fs = createFilteredFilesystem(
				{ ...FILESYSTEM_DEFAULT_PERMISSIONS, allowWrite: ['project/**'] },
				inner,
			);

			await fs.writeFile('/project/src/new.ts' as AbsolutePath, 'content');
			expect(inner.writeFile).toHaveBeenCalledWith(
				'/project/src/new.ts',
				'content',
			);
		});

		it('blocks writes not matching allowWrite pattern', async () => {
			const fs = createFilteredFilesystem(
				{ ...FILESYSTEM_DEFAULT_PERMISSIONS, allowWrite: ['project/**'] },
				inner,
			);

			await expect(
				fs.writeFile('/etc/config' as AbsolutePath, 'data'),
			).rejects.toThrow('Write access denied');
		});

		it('denyWrite overrides allowWrite (deny wins)', async () => {
			const fs = createFilteredFilesystem(
				{
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					allowWrite: ['project/**'],
					denyWrite: ['project/secrets/**'],
				},
				inner,
			);

			await expect(
				fs.writeFile('/project/secrets/key' as AbsolutePath, 'data'),
			).rejects.toThrow('Write access denied');
		});

		it('blocks mkdir outside allowed paths', async () => {
			const fs = createFilteredFilesystem(
				{ ...FILESYSTEM_DEFAULT_PERMISSIONS, allowWrite: ['project/**'] },
				inner,
			);

			await expect(fs.mkdir('/tmp/evil' as AbsolutePath)).rejects.toThrow(
				'Write access denied',
			);
		});

		it('blocks deleteFile outside allowed paths', async () => {
			const fs = createFilteredFilesystem(
				{ ...FILESYSTEM_DEFAULT_PERMISSIONS, allowWrite: ['project/**'] },
				inner,
			);

			await expect(
				fs.deleteFile('/etc/important' as AbsolutePath),
			).rejects.toThrow('Write access denied');
		});
	});

	describe('.env blocking via denyRead', () => {
		it('blocks .env files listed in denyRead', async () => {
			const fs = createFilteredFilesystem(
				{
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					denyRead: ['**/.env', '**/.env.*'],
				},
				inner,
			);

			await expect(
				fs.readFile('/project/.env' as AbsolutePath),
			).rejects.toThrow('Read access denied');
		});

		it('blocks .env.local via denyRead', async () => {
			const fs = createFilteredFilesystem(
				{
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					denyRead: ['**/.env.*'],
				},
				inner,
			);

			await expect(
				fs.readFile('/project/.env.local' as AbsolutePath),
			).rejects.toThrow('Read access denied');
		});

		it('allows non-env files in same directory', async () => {
			const fs = createFilteredFilesystem(
				{
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					denyRead: ['**/.env', '**/.env.*'],
				},
				inner,
			);

			await fs.readFile('/project/package.json' as AbsolutePath);
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
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					denyRead: ['**/.env', '**/.env.*'],
				},
				inner,
			);

			const entries = await fs.readdir('/project' as AbsolutePath);
			expect(entries).toEqual(['index.ts', 'package.json']);
		});

		it('returns all entries when all are readable', async () => {
			vi.mocked(inner.readdir).mockResolvedValue(['a.ts', 'b.ts', 'c.ts']);

			const fs = createFilteredFilesystem(
				FILESYSTEM_DEFAULT_PERMISSIONS,
				inner,
			);

			const entries = await fs.readdir('/project' as AbsolutePath);
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
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					denyRead: ['**/.env'],
				},
				inner,
			);

			const results = await fs.glob('**/*', {
				root_dir: '/project' as AbsolutePath,
			});
			expect(results).toEqual(['src/index.ts', 'src/util.ts']);
		});

		it('resolves glob results against cwd when root_dir is omitted', async () => {
			vi.mocked(inner.glob).mockResolvedValue([
				'src/index.ts',
				'.env',
				'src/util.ts',
			]);
			vi.mocked(inner.resolve).mockImplementation(
				async (...paths: string[]) => {
					if (paths[0] === '.' && paths[1]) {
						return joinAbsolute('/project' as AbsolutePath, paths[1]);
					}
					return paths[paths.length - 1]! as AbsolutePath;
				},
			);

			const fs = createFilteredFilesystem(
				{
					...FILESYSTEM_DEFAULT_PERMISSIONS,
					denyRead: ['**/.env'],
				},
				inner,
			);

			const results = await fs.glob('**/*', {});
			expect(results).toEqual(['src/index.ts', 'src/util.ts']);
		});
	});

	describe('stat, access, exists respect read policy', () => {
		it('stat blocked for denied paths', async () => {
			const fs = createFilteredFilesystem(
				{ ...FILESYSTEM_DEFAULT_PERMISSIONS, denyRead: ['secret/**'] },
				inner,
			);

			await expect(fs.stat('/secret/file' as AbsolutePath)).rejects.toThrow(
				'Read access denied',
			);
		});

		it('access blocked for denied paths', async () => {
			const fs = createFilteredFilesystem(
				{ ...FILESYSTEM_DEFAULT_PERMISSIONS, denyRead: ['secret/**'] },
				inner,
			);

			await expect(fs.access('/secret/file' as AbsolutePath)).rejects.toThrow(
				'Read access denied',
			);
		});

		it('exists blocked for denied paths', async () => {
			const fs = createFilteredFilesystem(
				{ ...FILESYSTEM_DEFAULT_PERMISSIONS, denyRead: ['secret/**'] },
				inner,
			);

			await expect(fs.exists('/secret/file' as AbsolutePath)).rejects.toThrow(
				'Read access denied',
			);
		});
	});
});
