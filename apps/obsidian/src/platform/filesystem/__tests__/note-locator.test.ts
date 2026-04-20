import { describe, it, expect } from 'vitest';
import { toAbsolutePath } from '@franklin/lib';
import { FileSystemAdapter, type App, type TFile } from 'obsidian';

import { createObsidianFilesystem } from '../obsidian.js';
import { createNoteLocatorResolver } from '../note-locator/resolve.js';
import { makeFile, mockHostFs } from '../test-helpers.js';

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
