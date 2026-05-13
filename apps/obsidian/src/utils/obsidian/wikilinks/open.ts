import type { App, PaneType } from 'obsidian';

import { parseWikilinkLinktext } from './parse.js';
import { resolveWikilinkFile } from './resolve.js';
import { wrapLinkText } from './wrap-link-text.js';

const SOURCE_PATH = '';

export interface OpenObsidianWikilinkOptions {
	// Workspace.openLinkText accepts these PaneType values as its newLeaf target.
	// https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts#L6949
	// https://obsidian.md/help/uri
	newLeaf?: PaneType | boolean;
}

export async function openObsidianWikilink(
	app: App,
	linktext: string,
	options: OpenObsidianWikilinkOptions = {},
): Promise<void> {
	const wikilink = parseWikilinkLinktext(linktext);
	if (!wikilink) {
		throw new Error(`Invalid note reference: ${wrapLinkText(linktext)}`);
	}

	resolveWikilinkFile(app, wikilink, { sourcePath: SOURCE_PATH });
	// TODO(FRA-302): Thread real source context instead of assuming vault root.
	await app.workspace.openLinkText(
		wikilink.linktext,
		SOURCE_PATH,
		options.newLeaf ?? false,
	);
}
