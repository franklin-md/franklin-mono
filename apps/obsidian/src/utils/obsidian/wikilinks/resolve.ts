import type { App, TFile } from 'obsidian';

import type { ParsedWikilink } from './types.js';
import { wrapLinkText } from './wrap-link-text.js';

const DEFAULT_SOURCE_PATH = '';

export interface ResolveWikilinkFileOptions {
	sourcePath?: string;
}

function createAmbiguousWikilinkMessage(
	wikilink: ParsedWikilink,
	canonicalLinktext: string,
): string {
	return `Ambiguous note reference: ${wrapLinkText(wikilink.linktext)}. Use ${wrapLinkText(canonicalLinktext)} or a normal file path.`;
}

function assertCanonicalWikilink(
	app: App,
	file: TFile,
	wikilink: ParsedWikilink,
	sourcePath: string,
): void {
	if (wikilink.hasExplicitPath) return;

	// This checks that the wikilink produced is unique, rejecting ambiguous links.
	const canonicalLinktext = app.metadataCache.fileToLinktext(
		file,
		sourcePath,
		!wikilink.hasMarkdownExtension,
	);
	if (canonicalLinktext === wikilink.linkpath) return;

	throw new Error(createAmbiguousWikilinkMessage(wikilink, canonicalLinktext));
}

export function resolveWikilinkFile(
	app: App,
	wikilink: ParsedWikilink,
	options: ResolveWikilinkFileOptions = {},
): TFile {
	const sourcePath = options.sourcePath ?? DEFAULT_SOURCE_PATH;
	// This optimistically gets the best path of the link, but it may not
	// be unique if there are multiple files with the same linkpath.
	const file = app.metadataCache.getFirstLinkpathDest(
		wikilink.linkpath,
		sourcePath,
	);
	if (!file) {
		throw new Error(`Note not found: ${wrapLinkText(wikilink.linktext)}`);
	}

	assertCanonicalWikilink(app, file, wikilink, sourcePath);
	return file;
}
