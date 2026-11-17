import { describe, expect, it, vi } from 'vitest';
import {
	createFilteredFilesystem,
	toAbsolutePath,
	type AbsolutePath,
	type Filesystem,
} from '@franklin/lib';

import { createDefaultObsidianFilesystemPermissions } from '../permissions.js';

function createFilesystem(): Filesystem {
	return {
		resolve: vi.fn(async (...paths: string[]) => paths.at(-1) as AbsolutePath),
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

describe('createDefaultObsidianFilesystemPermissions', () => {
	it('denies reading dotenv files', async () => {
		const inner = createFilesystem();
		const fs = createFilteredFilesystem(
			createDefaultObsidianFilesystemPermissions(
				toAbsolutePath('/vault'),
				'.obsidian',
				'/tmp',
			),
			inner,
		);

		await expect(fs.readFile(toAbsolutePath('/vault/.env'))).rejects.toThrow(
			'Read access denied',
		);
		await expect(
			fs.readFile(toAbsolutePath('/vault/.env.local')),
		).rejects.toThrow('Read access denied');
	});

	it('denies reading the configured Obsidian config directory', async () => {
		const inner = createFilesystem();
		const fs = createFilteredFilesystem(
			createDefaultObsidianFilesystemPermissions(
				toAbsolutePath('/vault'),
				'config',
				'/tmp',
			),
			inner,
		);

		await expect(
			fs.readFile(toAbsolutePath('/vault/config/plugins/franklin/data.json')),
		).rejects.toThrow('Read access denied');
		await expect(fs.stat(toAbsolutePath('/vault/config'))).rejects.toThrow(
			'Read access denied',
		);
	});

	it('allows writes in the vault root and temp directory', async () => {
		const inner = createFilesystem();
		const fs = createFilteredFilesystem(
			createDefaultObsidianFilesystemPermissions(
				toAbsolutePath('/vault'),
				'.obsidian',
				'/tmp',
			),
			inner,
		);

		await fs.writeFile(toAbsolutePath('/vault/notes/new.md'), 'note');
		await fs.writeFile(toAbsolutePath('/tmp/franklin/cache.json'), 'cache');

		expect(inner.writeFile).toHaveBeenCalledWith('/vault/notes/new.md', 'note');
		expect(inner.writeFile).toHaveBeenCalledWith(
			'/tmp/franklin/cache.json',
			'cache',
		);
	});

	it('denies writes to the Obsidian config directory and outside allowed roots', async () => {
		const inner = createFilesystem();
		const fs = createFilteredFilesystem(
			createDefaultObsidianFilesystemPermissions(
				toAbsolutePath('/vault'),
				'.obsidian',
				'/tmp',
			),
			inner,
		);

		await expect(
			fs.writeFile(toAbsolutePath('/vault/.obsidian/workspace.json'), '{}'),
		).rejects.toThrow('Write access denied');
		await expect(
			fs.writeFile(toAbsolutePath('/etc/passwd'), 'nope'),
		).rejects.toThrow('Write access denied');
	});
});
