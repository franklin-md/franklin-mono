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
	};
}

describe('createFilteredFilesystem', () => {
	let inner: Filesystem;

	beforeEach(() => {
		inner = mockFilesystem();
	});

	describe('deny-default behavior', () => {
		it('blocks reads when no allowRead patterns match', async () => {
			const fs = createFilteredFilesystem(
				{ allowRead: [], allowWrite: [] },
				inner,
			);

			await expect(fs.readFile('/project/file.txt')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('blocks writes when no allowWrite patterns match', async () => {
			const fs = createFilteredFilesystem(
				{ allowRead: ['**'], allowWrite: [] },
				inner,
			);

			await expect(fs.writeFile('/project/file.txt', 'data')).rejects.toThrow(
				'Write access denied',
			);
		});
	});

	describe('read access', () => {
		it('allows reads matching allowRead pattern', async () => {
			const fs = createFilteredFilesystem(
				{ allowRead: ['project/**'], allowWrite: [] },
				inner,
			);

			await fs.readFile('/project/src/index.ts');
			expect(inner.readFile).toHaveBeenCalledWith('/project/src/index.ts');
		});

		it('blocks reads not matching allowRead pattern', async () => {
			const fs = createFilteredFilesystem(
				{ allowRead: ['project/**'], allowWrite: [] },
				inner,
			);

			await expect(fs.readFile('/etc/passwd')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('allows reads with ** wildcard', async () => {
			const fs = createFilteredFilesystem(
				{ allowRead: ['**'], allowWrite: [] },
				inner,
			);

			await fs.readFile('/anywhere/file.txt');
			expect(inner.readFile).toHaveBeenCalledWith('/anywhere/file.txt');
		});
	});

	describe('write access', () => {
		it('allows writes matching allowWrite pattern', async () => {
			const fs = createFilteredFilesystem(
				{ allowRead: ['**'], allowWrite: ['project/**'] },
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
				{ allowRead: ['**'], allowWrite: ['project/**'] },
				inner,
			);

			await expect(fs.writeFile('/etc/config', 'data')).rejects.toThrow(
				'Write access denied',
			);
		});

		it('blocks mkdir outside allowed paths', async () => {
			const fs = createFilteredFilesystem(
				{ allowRead: ['**'], allowWrite: ['project/**'] },
				inner,
			);

			await expect(fs.mkdir('/tmp/evil')).rejects.toThrow(
				'Write access denied',
			);
		});

		it('blocks deleteFile outside allowed paths', async () => {
			const fs = createFilteredFilesystem(
				{ allowRead: ['**'], allowWrite: ['project/**'] },
				inner,
			);

			await expect(fs.deleteFile('/etc/important')).rejects.toThrow(
				'Write access denied',
			);
		});
	});

	describe('.env blocking via patterns', () => {
		it('blocks .env files when excluded from allowRead', async () => {
			const fs = createFilteredFilesystem(
				{
					allowRead: ['project/**', '!project/.env', '!project/.env.*'],
					allowWrite: [],
				},
				inner,
			);

			await expect(fs.readFile('/project/.env')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('blocks .env.local via negation pattern', async () => {
			const fs = createFilteredFilesystem(
				{
					allowRead: ['project/**', '!project/.env.*'],
					allowWrite: [],
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
					allowRead: ['project/**', '!project/.env', '!project/.env.*'],
					allowWrite: [],
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
					allowRead: ['project/**', '!project/.env', '!project/.env.*'],
					allowWrite: [],
				},
				inner,
			);

			const entries = await fs.readdir('/project');
			expect(entries).toEqual(['index.ts', 'package.json']);
		});

		it('returns all entries when all are readable', async () => {
			vi.mocked(inner.readdir).mockResolvedValue(['a.ts', 'b.ts', 'c.ts']);

			const fs = createFilteredFilesystem(
				{ allowRead: ['project/**'], allowWrite: [] },
				inner,
			);

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
					allowRead: ['project/**', '!project/.env'],
					allowWrite: [],
				},
				inner,
			);

			const results = await fs.glob('**/*', { cwd: '/project' });
			expect(results).toEqual(['src/index.ts', 'src/util.ts']);
		});
	});

	describe('stat, access, exists respect read policy', () => {
		it('stat blocked for denied paths', async () => {
			const fs = createFilteredFilesystem(
				{ allowRead: ['project/**'], allowWrite: [] },
				inner,
			);

			await expect(fs.stat('/secret/file')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('access blocked for denied paths', async () => {
			const fs = createFilteredFilesystem(
				{ allowRead: ['project/**'], allowWrite: [] },
				inner,
			);

			await expect(fs.access('/secret/file')).rejects.toThrow(
				'Read access denied',
			);
		});

		it('exists blocked for denied paths', async () => {
			const fs = createFilteredFilesystem(
				{ allowRead: ['project/**'], allowWrite: [] },
				inner,
			);

			await expect(fs.exists('/secret/file')).rejects.toThrow(
				'Read access denied',
			);
		});
	});
});
