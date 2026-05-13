import type { App, TFile, Vault } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';

import { parseWikilinkLinktext } from '../parse.js';
import { resolveWikilinkFile } from '../resolve.js';

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
	const app = {
		metadataCache: {
			fileToLinktext,
			getFirstLinkpathDest,
		},
	} as unknown as App;

	return { app, file, fileToLinktext, getFirstLinkpathDest };
}

function parseLinktext(linktext: string) {
	const wikilink = parseWikilinkLinktext(linktext);
	if (!wikilink) throw new Error(`Invalid test linktext: ${linktext}`);
	return wikilink;
}

describe('resolveWikilinkFile', () => {
	it('resolves an existing wikilink file', () => {
		const { app, file, getFirstLinkpathDest } = createMockApp();

		expect(resolveWikilinkFile(app, parseLinktext('Hello'))).toBe(file);
		expect(getFirstLinkpathDest).toHaveBeenCalledWith('Hello', '');
	});

	it('passes sourcePath to Obsidian metadata lookups', () => {
		const { app, fileToLinktext, getFirstLinkpathDest } = createMockApp();

		resolveWikilinkFile(app, parseLinktext('Hello'), {
			sourcePath: 'notes/Source.md',
		});

		expect(getFirstLinkpathDest).toHaveBeenCalledWith(
			'Hello',
			'notes/Source.md',
		);
		expect(fileToLinktext).toHaveBeenCalledWith(
			expect.anything(),
			'notes/Source.md',
			true,
		);
	});

	it('throws when the wikilink file cannot be found', () => {
		const { app } = createMockApp({ file: null });

		expect(() => resolveWikilinkFile(app, parseLinktext('Missing'))).toThrow(
			'Note not found: [[Missing]]',
		);
	});

	it('throws when a bare wikilink is ambiguous', () => {
		const { app } = createMockApp({ canonicalLinktext: 'notes/Hello' });

		expect(() => resolveWikilinkFile(app, parseLinktext('Hello'))).toThrow(
			'Ambiguous note reference: [[Hello]]. Use [[notes/Hello]] or a normal file path.',
		);
	});

	it('allows explicit paths without canonical bare-link validation', () => {
		const { app, fileToLinktext } = createMockApp({
			canonicalLinktext: 'different/Hello',
		});

		resolveWikilinkFile(app, parseLinktext('notes/Hello'));

		expect(fileToLinktext).not.toHaveBeenCalled();
	});
});
