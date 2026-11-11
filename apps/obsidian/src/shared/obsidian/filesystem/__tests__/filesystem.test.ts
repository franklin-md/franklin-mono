import type { Filesystem } from '@franklin/lib';
import { toAbsolutePath } from '@franklin/lib';
import {
	type App,
	type FileManager,
	FileSystemAdapter,
	type TAbstractFile,
	type TFile,
	type TFolder,
	type Vault,
} from 'obsidian';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createObsidianFilesystem } from '../obsidian.js';
import {
	createObsidianPathPolicy,
	createObsidianPathPolicyFromVault,
} from '../path-policy.js';
import { makeFile, mockHostFs } from '../test-helpers.js';
import { createVaultFilesystem } from '../vault.js';

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

function createMockFileManager(): FileManager {
	return {
		trashFile: vi.fn().mockResolvedValue(undefined),
	} as unknown as FileManager;
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

function createMockApp(
	vault: Vault,
	fileManager = createMockFileManager(),
): App {
	return {
		vault,
		fileManager,
		metadataCache: {
			getFirstLinkpathDest: vi.fn().mockReturnValue(null),
			fileToLinktext: vi.fn((file: TFile) => file.path),
		},
	} as unknown as App;
}

describe('createObsidianPathPolicy', () => {
	it('routes visible vault paths to the vault backend', () => {
		const policy = createObsidianPathPolicy('/vault', '.obsidian');
		expect(
			policy.classifyPath(toAbsolutePath('/vault/notes/hello.md')),
		).toEqual({ kind: 'vault' });
	});

	it('routes hidden paths inside the vault to the backup backend', () => {
		const policy = createObsidianPathPolicy('/vault', '.obsidian');
		expect(
			policy.classifyPath(toAbsolutePath('/vault/.hidden/secret.txt')),
		).toEqual({ kind: 'backup' });
	});

	it('routes config paths to the backup backend even when configDir is not hidden', () => {
		const policy = createObsidianPathPolicy('/vault', 'config');
		expect(
			policy.classifyPath(
				toAbsolutePath('/vault/config/plugins/franklin/data.json'),
			),
		).toEqual({ kind: 'backup' });
	});

	it('routes outside-vault paths to the backup backend', () => {
		const policy = createObsidianPathPolicy('/vault', '.obsidian');
		expect(policy.classifyPath(toAbsolutePath('/tmp/data.json'))).toEqual({
			kind: 'backup',
		});
	});

	it('creates a policy from the vault adapter and configDir', () => {
		const vault = createMockVault({
			basePath: '/vault',
			configDir: 'config',
		});
		const policy = createObsidianPathPolicyFromVault(vault);

		expect(
			policy.classifyPath(
				toAbsolutePath('/vault/config/plugins/franklin/data.json'),
			),
		).toEqual({ kind: 'backup' });
	});
});

describe('createVisibleVaultFilesystem', () => {
	let vault: Vault;
	let fileManager: FileManager;
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
		fileManager = createMockFileManager();
	});

	it('reads binary content via Vault.readBinary', async () => {
		const content = new TextEncoder().encode('hello world');
		vi.mocked(vault.readBinary).mockResolvedValue(content.buffer);
		const fs = createVaultFilesystem(vault, fileManager);

		const result = await fs.readFile(toAbsolutePath('/vault/notes/hello.md'));

		expect(vault.readBinary).toHaveBeenCalledWith(noteFile);
		expect(result).toEqual(content);
	});

	it('modifies an existing visible file through Vault.modifyBinary', async () => {
		const fs = createVaultFilesystem(vault, fileManager);

		await fs.writeFile(toAbsolutePath('/vault/notes/hello.md'), 'updated');

		expect(vault.modifyBinary).toHaveBeenCalledWith(
			noteFile,
			expect.any(ArrayBuffer),
		);
		expect(vault.createBinary).not.toHaveBeenCalled();
	});

	it('creates a new visible file through Vault.createBinary', async () => {
		const fs = createVaultFilesystem(vault, fileManager);

		await fs.writeFile(toAbsolutePath('/vault/notes/new.md'), 'new file');

		expect(vault.createBinary).toHaveBeenCalledWith(
			'notes/new.md',
			expect.any(ArrayBuffer),
		);
		expect(vault.modifyBinary).not.toHaveBeenCalled();
	});

	it('creates folders recursively through Vault.createFolder', async () => {
		const fs = createVaultFilesystem(vault, fileManager);

		await fs.mkdir(toAbsolutePath('/vault/notes/sub/folder'), {
			recursive: true,
		});

		expect(vault.createFolder).toHaveBeenCalledWith('notes/sub');
		expect(vault.createFolder).toHaveBeenCalledWith('notes/sub/folder');
		expect(vault.createFolder).not.toHaveBeenCalledWith('notes');
	});

	it('returns root as a directory in stat', async () => {
		const fs = createVaultFilesystem(vault, fileManager);
		await expect(fs.stat(toAbsolutePath('/vault'))).resolves.toEqual({
			isFile: false,
			isDirectory: true,
		});
	});

	it('lists folder contents through the vault tree', async () => {
		const fs = createVaultFilesystem(vault, fileManager);
		await expect(fs.readdir(toAbsolutePath('/vault/notes'))).resolves.toEqual([
			'hello.md',
		]);
	});

	it('reports root exists', async () => {
		const fs = createVaultFilesystem(vault, fileManager);
		await expect(fs.exists(toAbsolutePath('/vault'))).resolves.toBe(true);
	});

	it('deletes files through FileManager.trashFile', async () => {
		const fs = createVaultFilesystem(vault, fileManager);
		await fs.deleteFile(toAbsolutePath('/vault/notes/hello.md'));
		expect(fileManager.trashFile).toHaveBeenCalledWith(noteFile);
		expect(vault.delete).not.toHaveBeenCalled();
	});

	it('rejects deleting a folder through deleteFile', async () => {
		const fs = createVaultFilesystem(vault, fileManager);
		await expect(fs.deleteFile(toAbsolutePath('/vault/notes'))).rejects.toThrow(
			'EISDIR',
		);
	});
});

describe('createObsidianFilesystem', () => {
	let app: App;
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
		app = createMockApp(vault);
		hostFs = mockHostFs();
	});

	it('delegates resolve to the backup filesystem', async () => {
		const fs = createObsidianFilesystem(app, hostFs);
		await fs.resolve('/vault', 'notes', 'hello.md');
		expect(hostFs.resolve).toHaveBeenCalledWith('/vault', 'notes', 'hello.md');
	});

	it('routes visible vault reads through Vault', async () => {
		const content = new TextEncoder().encode('hello');
		vi.mocked(vault.readBinary).mockResolvedValue(content.buffer);
		const fs = createObsidianFilesystem(app, hostFs);

		const result = await fs.readFile(toAbsolutePath('/vault/notes/hello.md'));

		expect(vault.readBinary).toHaveBeenCalledWith(noteFile);
		expect(hostFs.readFile).not.toHaveBeenCalled();
		expect(result).toEqual(content);
	});

	it('routes config directory reads through the backup filesystem', async () => {
		const fs = createObsidianFilesystem(app, hostFs);
		await fs.readFile(
			toAbsolutePath('/vault/.obsidian/plugins/franklin/data.json'),
		);
		expect(hostFs.readFile).toHaveBeenCalledWith(
			'/vault/.obsidian/plugins/franklin/data.json',
		);
	});

	it('routes hidden in-vault writes through the backup filesystem', async () => {
		const fs = createObsidianFilesystem(app, hostFs);
		await fs.writeFile(toAbsolutePath('/vault/.hidden/cache.json'), 'secret');
		expect(hostFs.writeFile).toHaveBeenCalledWith(
			'/vault/.hidden/cache.json',
			'secret',
		);
	});

	it('routes visible writes through the visible vault backend', async () => {
		const fs = createObsidianFilesystem(app, hostFs);
		await fs.writeFile(toAbsolutePath('/vault/notes/new.md'), 'visible');
		expect(vault.createBinary).toHaveBeenCalledWith(
			'notes/new.md',
			expect.any(ArrayBuffer),
		);
		expect(hostFs.writeFile).not.toHaveBeenCalled();
	});

	it('routes vault root readdir through the visible vault backend', async () => {
		const fs = createObsidianFilesystem(app, hostFs);
		await expect(fs.readdir(toAbsolutePath('/vault'))).resolves.toEqual([
			'notes',
		]);
		expect(hostFs.readdir).not.toHaveBeenCalled();
	});

	it('routes outside-vault stat through the backup filesystem', async () => {
		const fs = createObsidianFilesystem(app, hostFs);
		await fs.stat(toAbsolutePath('/tmp/file.txt'));
		expect(hostFs.stat).toHaveBeenCalledWith('/tmp/file.txt');
	});

	it('routes visible exists through the visible vault backend', async () => {
		const fs = createObsidianFilesystem(app, hostFs);
		await expect(
			fs.exists(toAbsolutePath('/vault/notes/hello.md')),
		).resolves.toBe(true);
		expect(hostFs.exists).not.toHaveBeenCalled();
	});

	it('routes glob through the backup filesystem with the original root_dir', async () => {
		vi.mocked(hostFs.glob).mockResolvedValue(['hello.md']);
		const fs = createObsidianFilesystem(app, hostFs);

		const result = await fs.glob('*.md', {
			root_dir: toAbsolutePath('/vault/notes'),
			limit: 10,
		});

		expect(hostFs.glob).toHaveBeenCalledWith('*.md', {
			root_dir: '/vault/notes',
			limit: 10,
		});
		expect(result).toEqual(['hello.md']);
	});

	it('routes config directory delete through the backup filesystem', async () => {
		const fs = createObsidianFilesystem(app, hostFs);
		await fs.deleteFile(toAbsolutePath('/vault/.obsidian/workspace.json'));
		expect(hostFs.deleteFile).toHaveBeenCalledWith(
			'/vault/.obsidian/workspace.json',
		);
	});
});
