import type { App } from 'obsidian';

import { parseWikilinkLinktext } from './parse.js';
import { resolveWikilinkFile } from './resolve.js';
import { wrapLinkText } from './wrap-link-text.js';

const SOURCE_PATH = '';

export async function openObsidianWikilink(
	app: App,
	linktext: string,
): Promise<void> {
	const wikilink = parseWikilinkLinktext(linktext);
	if (!wikilink) {
		throw new Error(`Invalid note reference: ${wrapLinkText(linktext)}`);
	}

	resolveWikilinkFile(app, wikilink, { sourcePath: SOURCE_PATH });
	// TODO: We should consider in the future fixing a lot of the obsidian path utils
	// as most of them just simplify and assume we are getting link from root.
	await app.workspace.openLinkText(wikilink.linktext, SOURCE_PATH, false);
}
