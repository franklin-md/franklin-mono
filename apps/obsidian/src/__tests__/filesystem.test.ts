import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	FileSystemAdapter,
	type Vault,
	type TFile,
	type TFolder,
	type TAbstractFile,
} from 'obsidian';
import type { Filesystem } from '@franklin/lib';

import { createObsidianFilesystem } from '../platform/filesystem/obsidian.js';
import { createObsidianPathPolicy } from '../platform/filesystem/path-policy.js';
import { createVisibleVaultFilesystem } from '../platform/filesystem/vault-visible.js';

function makeFile(path: string): TFile {
	const name = path.split('/').pop() ?? path;
	const dotIndex = name.lastIndexOf('.');
	return {
		path,
		name,
		basename: dotIndex >= 0 ? name.slice(0, dotIndex) : name,
		extension: dotIndex >= 0 ? name.slice(dotIndex + 1) : '',
		stat: { ctime: 0, mtime: 0, size: 0, type: 'file' },
		vault: {} as Vault,
		parent: null,
	} as TFile;
}

function makeFolder(path: string, children: TAbstractFile[] = []): TFolder {
	const name = path.split('/').pop() ?? path;
	return {
		path,
		name,
		children,
		vault: {} as Vault,
		parent: null,
		isRoot: () => path === '',
	} as TFolder;
}

class MockFileSystemAdapter extends FileSystemAdapter {
	readonly readBinary = vi.fn().mockResolvedValue(new ArrayBuffer(0));
	readonly writeBinary = vi.fn().mockResolvedValue(undefined);
	readonly exists = vi.fn().mockResolvedValue(true);

	constructor(private readonly basePath: string) {
		super();
	}

	getBasePath(): string {
		return this.basePath;
	}
}

function createMockVault(options?: {
	basePath?: string;
	configDir?: string;
	files?: TFile[];
	folders?: TFolder[];
}): Vault {
	const files = [...(options?.files ?? [])];
	const folders = [...(options?.folders ?? [])];
	const adapter = new MockFileSystemAdapter(options?.basePath ?? '/vault');

	return {
		adapter,
		configDir: options?.configDir ?? '.obsidian',
		getAbstractFileByPath: vi.fn((targetPath: string) => {
			const file = files.find((entry) => entry.path === targetPath);
			if (file) return file;
			const folder = folders.find((entry) => entry.path === targetPath);
			if (folder) return folder;
			return null;
		}),
		getFileByPath: vi.fn((targetPath: string) => {
			return files.find((entry) => entry.path === targetPath) ?? null;
		}),
		getFolderByPath: vi.fn((targetPath: string) => {
			return folders.find((entry) => entry.path === targetPath) ?? null;
		}),
		getRoot: vi.fn(() => {
			return folders.find((entry) => entry.isRoot()) ?? makeFolder('');
		}),
		readBinary: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
		createBinary: vi.fn().mockResolvedValue(undefined),
		modifyBinary: vi.fn().mockResolvedValue(undefined),
		createFolder: vi.fn().mockResolvedValue(undefined),
		delete: vi.fn().mockResolvedValue(undefined),
	} as unknown as Vault;
}

function mockHostFs(): Filesystem {
	return {
		resolve: vi.fn(async (...paths: string[]) =>
			path.resolve(...(paths as [string, ...string[]])),
		),
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

describe('createObsidianPathPolicy', () => {
	it('routes visible vault paths to the vault backend', () => {
		const policy = createObsidianPathPolicy('/vault', '.obsidian');
		expect(policy.classifyPath('/vault/notes/hello.md')).toEqual({
			kind: 'vault',
			absolutePath: '/vault/notes/hello.md',
			relativePath: 'notes/hello.md',
		});
	});

	it('routes hidden paths inside the vault to the backup backend', () => {
		const policy = createObsidianPathPolicy('/vault', '.obsidian');
		expect(policy.classifyPath('/vault/.hidden/secret.txt')).toEqual({
			kind: 'backup',
			absolutePath: '/vault/.hidden/secret.txt',
		});
	});

	it('routes config paths to the backup backend even when configDir is not hidden', () => {
		const policy = createObsidianPathPolicy('/vault', 'config');
		expect(
			policy.classifyPath('/vault/config/plugins/franklin/data.json'),
		).toEqual({
			kind: 'backup',
			absolutePath: '/vault/config/plugins/franklin/data.json',
		});
	});

	it('routes outside-vault paths to the backup backend', () => {
		const policy = createObsidianPathPolicy('/vault', '.obsidian');
		expect(policy.classifyPath('/tmp/data.json')).toEqual({
			kind: 'backup',
			absolutePath: '/tmp/data.json',
		});
	});
});

describe('createVisibleVaultFilesystem', () => {
	let vault: Vault;
	const noteFile = makeFile('notes/hello.md');
	const dataFile = makeFile('data/config.json');
	const notesFolder = makeFolder('notes', [noteFile]);
	const dataFolder = makeFolder('data', [dataFile]);
	const rootFolder = makeFolder('', [notesFolder, dataFolder]);
	rootFolder.isRoot = () => true;

	beforeEach(() => {
		vault = createMockVault({
			files: [noteFile, dataFile],
			folders: [rootFolder, notesFolder, dataFolder],
		});
	});

	it('reads binary content via Vault.readBinary', async () => {
		const content = new TextEncoder().encode('hello world');
		vi.mocked(vault.readBinary).mockResolvedValue(content.buffer);
		const fs = createVisibleVaultFilesystem(vault);

		const result = await fs.readFile('notes/hello.md');

		expect(vault.readBinary).toHaveBeenCalledWith(noteFile);
		expect(result).toEqual(content);
	});

	it('modifies an existing visible file through Vault.modifyBinary', async () => {
		const fs = createVisibleVaultFilesystem(vault);

		await fs.writeFile('notes/hello.md', 'updated');

		expect(vault.modifyBinary).toHaveBeenCalledWith(
			noteFile,
			expect.any(ArrayBuffer),
		);
		expect(vault.createBinary).not.toHaveBeenCalled();
	});

	it('creates a new visible file through Vault.createBinary', async () => {
		const fs = createVisibleVaultFilesystem(vault);

		await fs.writeFile('notes/new.md', 'new file');

		expect(vault.createBinary).toHaveBeenCalledWith(
			'notes/new.md',
			expect.any(ArrayBuffer),
		);
		expect(vault.modifyBinary).not.toHaveBeenCalled();
	});

	it('creates folders recursively through Vault.createFolder', async () => {
		const fs = createVisibleVaultFilesystem(vault);

		await fs.mkdir('notes/sub/folder', { recursive: true });

		expect(vault.createFolder).toHaveBeenCalledWith('notes/sub');
		expect(vault.createFolder).toHaveBeenCalledWith('notes/sub/folder');
		expect(vault.createFolder).not.toHaveBeenCalledWith('notes');
	});

	it('returns root as a directory in stat', async () => {
		const fs = createVisibleVaultFilesystem(vault);
		await expect(fs.stat('')).resolves.toEqual({
			isFile: false,
			isDirectory: true,
		});
	});

	it('lists folder contents through the vault tree', async () => {
		const fs = createVisibleVaultFilesystem(vault);
		await expect(fs.readdir('notes')).resolves.toEqual(['hello.md']);
	});

	it('reports root exists', async () => {
		const fs = createVisibleVaultFilesystem(vault);
		await expect(fs.exists('')).resolves.toBe(true);
	});

	it('deletes files through Vault.delete', async () => {
		const fs = createVisibleVaultFilesystem(vault);
		await fs.deleteFile('notes/hello.md');
		expect(vault.delete).toHaveBeenCalledWith(noteFile);
	});

	it('rejects deleting a folder through deleteFile', async () => {
		const fs = createVisibleVaultFilesystem(vault);
		await expect(fs.deleteFile('notes')).rejects.toThrow('EISDIR');
	});
});

describe('createObsidianFilesystem', () => {
	let vault: Vault;
	let hostFs: Filesystem;
	const noteFile = makeFile('notes/hello.md');
	const notesFolder = makeFolder('notes', [noteFile]);
	const rootFolder = makeFolder('', [notesFolder]);
	rootFolder.isRoot = () => true;

	beforeEach(() => {
		vault = createMockVault({
			basePath: '/vault',
			configDir: '.obsidian',
			files: [noteFile],
			folders: [rootFolder, notesFolder],
		});
		hostFs = mockHostFs();
	});

	it('delegates resolve to the backup filesystem', async () => {
		const fs = createObsidianFilesystem(vault, hostFs);
		await fs.resolve('/vault', 'notes', 'hello.md');
		expect(hostFs.resolve).toHaveBeenCalledWith('/vault', 'notes', 'hello.md');
	});

	it('routes visible vault reads through Vault', async () => {
		const content = new TextEncoder().encode('hello');
		vi.mocked(vault.readBinary).mockResolvedValue(content.buffer);
		const fs = createObsidianFilesystem(vault, hostFs);

		const result = await fs.readFile('/vault/notes/hello.md');

		expect(vault.readBinary).toHaveBeenCalledWith(noteFile);
		expect(hostFs.readFile).not.toHaveBeenCalled();
		expect(result).toEqual(content);
	});

	it('routes config directory reads through the backup filesystem', async () => {
		const fs = createObsidianFilesystem(vault, hostFs);
		await fs.readFile('/vault/.obsidian/plugins/franklin/data.json');
		expect(hostFs.readFile).toHaveBeenCalledWith(
			'/vault/.obsidian/plugins/franklin/data.json',
		);
	});

	it('routes hidden in-vault writes through the backup filesystem', async () => {
		const fs = createObsidianFilesystem(vault, hostFs);
		await fs.writeFile('/vault/.hidden/cache.json', 'secret');
		expect(hostFs.writeFile).toHaveBeenCalledWith(
			'/vault/.hidden/cache.json',
			'secret',
		);
	});

	it('routes visible writes through the visible vault backend', async () => {
		const fs = createObsidianFilesystem(vault, hostFs);
		await fs.writeFile('/vault/notes/new.md', 'visible');
		expect(vault.createBinary).toHaveBeenCalledWith(
			'notes/new.md',
			expect.any(ArrayBuffer),
		);
		expect(hostFs.writeFile).not.toHaveBeenCalled();
	});

	it('routes vault root readdir through the visible vault backend', async () => {
		const fs = createObsidianFilesystem(vault, hostFs);
		await expect(fs.readdir('/vault')).resolves.toEqual(['notes']);
		expect(hostFs.readdir).not.toHaveBeenCalled();
	});

	it('routes outside-vault stat through the backup filesystem', async () => {
		const fs = createObsidianFilesystem(vault, hostFs);
		await fs.stat('/tmp/file.txt');
		expect(hostFs.stat).toHaveBeenCalledWith('/tmp/file.txt');
	});

	it('routes visible exists through the visible vault backend', async () => {
		const fs = createObsidianFilesystem(vault, hostFs);
		await expect(fs.exists('/vault/notes/hello.md')).resolves.toBe(true);
		expect(hostFs.exists).not.toHaveBeenCalled();
	});

	it('routes glob through the backup filesystem with the original root_dir', async () => {
		vi.mocked(hostFs.glob).mockResolvedValue(['hello.md']);
		const fs = createObsidianFilesystem(vault, hostFs);

		const result = await fs.glob('*.md', {
			root_dir: '/vault/notes',
			limit: 10,
		});

		expect(hostFs.glob).toHaveBeenCalledWith('*.md', {
			root_dir: '/vault/notes',
			limit: 10,
		});
		expect(result).toEqual(['hello.md']);
	});

	it('routes config directory delete through the backup filesystem', async () => {
		const fs = createObsidianFilesystem(vault, hostFs);
		await fs.deleteFile('/vault/.obsidian/workspace.json');
		expect(hostFs.deleteFile).toHaveBeenCalledWith(
			'/vault/.obsidian/workspace.json',
		);
	});
});
