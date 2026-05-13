import path from 'node:path';

import type { AbsolutePath } from '@franklin/lib';
import { toAbsolutePath } from '@franklin/lib';
import type { App, TFile } from 'obsidian';

import { getVaultAbsolutePath } from '../../../utils/obsidian/path.js';
import { parseWikilink } from '../../../utils/obsidian/wikilinks/parse.js';
import { resolveWikilinkFile } from '../../../utils/obsidian/wikilinks/resolve.js';
import type { NoteLocatorResolver } from './types.js';

function resolveVaultFilePath(vaultRoot: string, file: TFile): AbsolutePath {
	return toAbsolutePath(path.resolve(vaultRoot, file.path));
}

export function createNoteLocatorResolver(app: App): NoteLocatorResolver {
	const vaultRoot = getVaultAbsolutePath(app.vault);

	return (input) => {
		const wikilink = parseWikilink(input);
		if (!wikilink) return undefined;

		const file = resolveWikilinkFile(app, wikilink);
		return resolveVaultFilePath(vaultRoot, file);
	};
}
