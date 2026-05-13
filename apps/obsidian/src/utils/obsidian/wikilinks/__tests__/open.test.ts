import type { App, TFile, Vault } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';

import { openObsidianWikilink } from '../open.js';

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

function createMockApp({
	canonicalLinktext = 'Hello',
	file = makeFile('notes/Hello.md'),
}: {
	canonicalLinktext?: string;
	file?: TFile | null;
} = {}) {
	const getFirstLinkpathDest = vi.fn().mockReturnValue(file);
	const fileToLinktext = vi.fn().mockReturnValue(canonicalLinktext);
	const openLinkText = vi.fn().mockResolvedValue(undefined);
	const app = {
		metadataCache: {
			fileToLinktext,
			getFirstLinkpathDest,
		},
		workspace: {
			openLinkText,
		},
	} as unknown as App;

	return { app, fileToLinktext, getFirstLinkpathDest, openLinkText };
}

describe('openObsidianWikilink', () => {
	it('opens wikilinks in the current pane by default', async () => {
		const { app, openLinkText } = createMockApp();

		await openObsidianWikilink(app, 'Hello');

		expect(openLinkText).toHaveBeenCalledWith('Hello', '', false);
	});

	it('forwards the requested Obsidian pane target', async () => {
		const { app, openLinkText } = createMockApp();

		await openObsidianWikilink(app, 'Hello', { newLeaf: 'split' });

		expect(openLinkText).toHaveBeenCalledWith('Hello', '', 'split');
	});

	it('forwards boolean Obsidian pane targets', async () => {
		const { app, openLinkText } = createMockApp();

		await openObsidianWikilink(app, 'Hello', { newLeaf: true });

		expect(openLinkText).toHaveBeenCalledWith('Hello', '', true);
	});

	it('does not open missing wikilinks', async () => {
		const { app, getFirstLinkpathDest, openLinkText } = createMockApp({
			file: null,
		});

		await expect(openObsidianWikilink(app, 'Missing')).rejects.toThrow(
			'Note not found: [[Missing]]',
		);
		expect(getFirstLinkpathDest).toHaveBeenCalledWith('Missing', '');
		expect(openLinkText).not.toHaveBeenCalled();
	});

	it('does not open ambiguous wikilinks', async () => {
		const { app, fileToLinktext, openLinkText } = createMockApp({
			canonicalLinktext: 'notes/Hello',
		});

		await expect(openObsidianWikilink(app, 'Hello')).rejects.toThrow(
			'Ambiguous note reference: [[Hello]]. Use [[notes/Hello]] or a normal file path.',
		);
		expect(fileToLinktext).toHaveBeenCalled();
		expect(openLinkText).not.toHaveBeenCalled();
	});
});
