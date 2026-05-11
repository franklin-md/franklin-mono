import type { App, TFile } from 'obsidian';

import { parseWikilink } from '../../../utils/obsidian/wikilinks/parse.js';
import type { ParsedWikilink } from '../../../utils/obsidian/wikilinks/types.js';

const SOURCE_PATH = '';

function createRawWikilink(linktext: string) {
	return `[[${linktext}]]`;
}

function createAmbiguousWikilinkMessage(
	wikilink: ParsedWikilink,
	canonicalLinktext: string,
) {
	return `Ambiguous note reference: ${wikilink.raw}. Use [[${canonicalLinktext}]] or a normal file path.`;
}

function assertCanonicalWikilink(
	app: App,
	file: TFile,
	wikilink: ParsedWikilink,
) {
	if (wikilink.hasExplicitPath) return;

	const canonicalLinktext = app.metadataCache.fileToLinktext(
		file,
		SOURCE_PATH,
		!wikilink.hasMarkdownExtension,
	);
	if (canonicalLinktext === wikilink.linkpath) return;

	throw new Error(createAmbiguousWikilinkMessage(wikilink, canonicalLinktext));
}

export async function openObsidianWikilink(app: App, linktext: string) {
	const rawWikilink = createRawWikilink(linktext);
	const wikilink = parseWikilink(rawWikilink);
	if (!wikilink) throw new Error(`Invalid note reference: ${rawWikilink}`);

	const file = app.metadataCache.getFirstLinkpathDest(
		wikilink.linkpath,
		SOURCE_PATH,
	);
	if (!file) throw new Error(`Note not found: ${rawWikilink}`);

	assertCanonicalWikilink(app, file, wikilink);
	await app.workspace.openLinkText(wikilink.linktext, SOURCE_PATH, false);
}
