import path from 'node:path';

import type { AbsolutePath } from '@franklin/lib';
import { toAbsolutePath } from '@franklin/lib';
import type { App, TFile } from 'obsidian';

import { getVaultAbsolutePath } from '../../../utils/obsidian/path.js';
import { parseWikilink } from '../../../utils/obsidian/wikilinks/parse.js';
import type { ParsedWikilink } from '../../../utils/obsidian/wikilinks/types.js';
import type { NoteLocatorResolver } from './types.js';

function createAmbiguousLocatorMessage(
	locator: ParsedWikilink,
	canonicalLinktext: string,
): string {
	return `Ambiguous note reference: ${locator.raw}. Use [[${canonicalLinktext}]] or a normal file path.`;
}

function assertCanonicalLocator(
	app: App,
	file: TFile,
	locator: ParsedWikilink,
): void {
	if (locator.hasExplicitPath) return;

	const canonicalLinktext = app.metadataCache.fileToLinktext(
		file,
		'',
		!locator.hasMarkdownExtension,
	);
	if (canonicalLinktext === locator.linkpath) return;

	throw new Error(createAmbiguousLocatorMessage(locator, canonicalLinktext));
}

function resolveVaultFilePath(vaultRoot: string, file: TFile): AbsolutePath {
	return toAbsolutePath(path.resolve(vaultRoot, file.path));
}

export function createNoteLocatorResolver(app: App): NoteLocatorResolver {
	const vaultRoot = getVaultAbsolutePath(app.vault);

	return (input) => {
		const wikilink = parseWikilink(input);
		if (!wikilink) return undefined;

		// This optimisitcally gets the best path of the link (relative to root), but it may not
		// be unique (i. there could be multiple files with the same linkpath).

		const file = app.metadataCache.getFirstLinkpathDest(wikilink.linkpath, '');
		if (!file) throw new Error(`Note not found: ${wikilink.raw}`);

		// This checks that the wikilink produced is unique. rejecting ambiguous links.
		assertCanonicalLocator(app, file, wikilink);
		return resolveVaultFilePath(vaultRoot, file);
	};
}
