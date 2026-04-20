import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import type { AbsolutePath } from '@franklin/lib';
import { toAbsolutePath } from '@franklin/lib';
import { FileSystemAdapter, type App, type TFile, type Vault } from 'obsidian';

import { createObsidianFilesystem } from '../obsidian.js';
import { createNoteLocatorResolver } from '../note-locator/resolve.js';

function makeFile(filePath: string): TFile {
	const name = filePath.split('/').pop() ?? filePath;
	const dotIndex = name.lastIndexOf('.');
	return {
		path: filePath,
		name,
		basename: dotIndex >= 0 ? name.slice(0, dotIndex) : name,
		extension: dotIndex >= 0 ? name.slice(dotIndex + 1) : '',
		stat: { ctime: 0, mtime: 0, size: 0, type: 'file' },
		vault: {} as Vault,
		parent: null,
	} as TFile;
}

function createMockApp(options?: {
	basePath?: string;
	files?: TFile[];
	resolveLinkpath?: (linkpath: string, sourcePath: string) => TFile | null;
	fileToLinktext?: (
		file: TFile,
		sourcePath: string,
		omitMdExtension?: boolean,
	) => string;
}): App {
	const files = options?.files ?? [];
	const basePath = options?.basePath ?? '/vault';

	class MockFileSystemAdapter extends FileSystemAdapter {
		override getBasePath(): string {
			return basePath;
		}
	}

	return {
		vault: {
			adapter: new MockFileSystemAdapter(),
			configDir: '.obsidian',
		},
		metadataCache: {
			getFirstLinkpathDest:
				options?.resolveLinkpath ??
				((linkpath: string) => {
					return files.find((file) => file.basename === linkpath) ?? null;
				}),
			fileToLinktext:
				options?.fileToLinktext ??
				((file: TFile, _sourcePath: string, omitMdExtension?: boolean) => {
					if (omitMdExtension && file.extension === 'md') {
						return file.path.slice(0, -3);
					}
					return file.path;
				}),
		},
	} as unknown as App;
}

function mockHostFs() {
	return {
		resolve: vi.fn(
			async (...paths: string[]) =>
				path.resolve(...(paths as [string, ...string[]])) as AbsolutePath,
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

describe('createNoteLocatorResolver', () => {
	it('resolves a wikilink to the canonical note path', () => {
		const file = makeFile('notes/Hello.md');
		const app = createMockApp({
			files: [file],
			resolveLinkpath: (linkpath) => (linkpath === 'Hello' ? file : null),
			fileToLinktext: () => 'Hello',
		});

		const resolve = createNoteLocatorResolver(app);

		expect(resolve('[[Hello]]')).toBe(toAbsolutePath('/vault/notes/Hello.md'));
	});

	it('ignores link display text and heading suffixes', () => {
		const file = makeFile('notes/Hello.md');
		const app = createMockApp({
			files: [file],
			resolveLinkpath: (linkpath) => (linkpath === 'Hello' ? file : null),
			fileToLinktext: () => 'Hello',
		});

		const resolve = createNoteLocatorResolver(app);

		expect(resolve('[[Hello#Overview|Read this note]]')).toBe(
			toAbsolutePath('/vault/notes/Hello.md'),
		);
	});

	it('rejects ambiguous bare note locators', () => {
		const file = makeFile('notes/Hello.md');
		const app = createMockApp({
			files: [file],
			resolveLinkpath: (linkpath) => (linkpath === 'Hello' ? file : null),
			fileToLinktext: () => 'notes/Hello',
		});

		const resolve = createNoteLocatorResolver(app);

		expect(() => resolve('[[Hello]]')).toThrow(/Ambiguous note reference/);
	});

	it('returns undefined for plain filesystem paths', () => {
		const app = createMockApp();
		const resolve = createNoteLocatorResolver(app);

		expect(resolve('notes/Hello.md')).toBeUndefined();
	});
});

describe('createObsidianFilesystem note locators', () => {
	it('resolves wikilinks before falling back to the host filesystem', async () => {
		const file = makeFile('notes/Hello.md');
		const app = createMockApp({
			files: [file],
			resolveLinkpath: (linkpath) => (linkpath === 'Hello' ? file : null),
			fileToLinktext: () => 'Hello',
		});
		const hostFs = mockHostFs();

		const fs = createObsidianFilesystem(app, hostFs);

		await expect(fs.resolve('[[Hello]]')).resolves.toBe(
			'/vault/notes/Hello.md',
		);
		expect(hostFs.resolve).not.toHaveBeenCalled();
	});

	it('falls back to the host filesystem for plain paths', async () => {
		const app = createMockApp();
		const hostFs = mockHostFs();

		const fs = createObsidianFilesystem(app, hostFs);

		await expect(fs.resolve('/vault', 'notes', 'Hello.md')).resolves.toBe(
			'/vault/notes/Hello.md',
		);
		expect(hostFs.resolve).toHaveBeenCalledWith('/vault', 'notes', 'Hello.md');
	});
});
