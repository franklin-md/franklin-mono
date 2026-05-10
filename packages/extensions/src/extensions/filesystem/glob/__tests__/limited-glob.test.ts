import { describe, expect, it, vi } from 'vitest';
import type { AbsolutePath, Filesystem } from '@franklin/lib';
import { limitedGlob } from '../limited-glob.js';

function mockFilesystem(results: string[]): Filesystem {
	return {
		resolve: vi.fn(
			async (...paths: string[]) => paths.join('/') as AbsolutePath,
		),
		readFile: vi.fn(),
		writeFile: vi.fn(),
		mkdir: vi.fn(),
		access: vi.fn(),
		stat: vi.fn(async () => ({ isFile: true, isDirectory: false })),
		readdir: vi.fn(async () => []),
		exists: vi.fn(async () => true),
		glob: vi.fn(
			async (
				_pattern: string | string[],
				options: Parameters<Filesystem['glob']>[1],
			) =>
				options.limit === undefined ? results : results.slice(0, options.limit),
		),
		deleteFile: vi.fn(),
	};
}

describe('limitedGlob', () => {
	it('passes options through when no limit is set', async () => {
		const filesystem = mockFilesystem(['one.md', 'two.md']);

		const result = await limitedGlob(filesystem, '*.md', {
			root_dir: '/tmp' as AbsolutePath,
			ignore: ['ignored.md'],
		});

		expect(result).toEqual({
			files: ['one.md', 'two.md'],
			exceededLimit: false,
		});
		expect(filesystem.glob).toHaveBeenCalledWith('*.md', {
			root_dir: '/tmp',
			ignore: ['ignored.md'],
		});
	});

	it('treats zero limit as no limit', async () => {
		const filesystem = mockFilesystem(['one.md', 'two.md']);

		const result = await limitedGlob(filesystem, '*.md', {
			root_dir: '/tmp' as AbsolutePath,
			limit: 0,
		});

		expect(result).toEqual({
			files: ['one.md', 'two.md'],
			exceededLimit: false,
		});
		expect(filesystem.glob).toHaveBeenCalledWith('*.md', {
			root_dir: '/tmp',
		});
	});

	it('does not report exceeded limit when fewer results exist', async () => {
		const filesystem = mockFilesystem(['one.md']);

		const result = await limitedGlob(filesystem, '*.md', { limit: 2 });

		expect(result).toEqual({
			files: ['one.md'],
			exceededLimit: false,
		});
		expect(filesystem.glob).toHaveBeenCalledWith('*.md', { limit: 3 });
	});

	it('does not report exceeded limit when result count equals the limit', async () => {
		const filesystem = mockFilesystem(['one.md', 'two.md']);

		const result = await limitedGlob(filesystem, '*.md', { limit: 2 });

		expect(result).toEqual({
			files: ['one.md', 'two.md'],
			exceededLimit: false,
		});
		expect(filesystem.glob).toHaveBeenCalledWith('*.md', { limit: 3 });
	});

	it('reports exceeded limit and slices when an extra result exists', async () => {
		const filesystem = mockFilesystem(['one.md', 'two.md', 'three.md']);

		const result = await limitedGlob(filesystem, '*.md', { limit: 2 });

		expect(result).toEqual({
			files: ['one.md', 'two.md'],
			exceededLimit: true,
		});
		expect(filesystem.glob).toHaveBeenCalledWith('*.md', { limit: 3 });
	});
});
