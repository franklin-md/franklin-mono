import { getLinkpath } from 'obsidian';

import type { ParsedWikilink } from './types.js';

function stripDisplayText(linktext: string): string {
	const pipeIndex = linktext.indexOf('|');
	return pipeIndex >= 0 ? linktext.slice(0, pipeIndex) : linktext;
}

function isSearchOnlyLink(linktext: string): boolean {
	return linktext.startsWith('#') || linktext.startsWith('^');
}

export function parseWikilink(input: string): ParsedWikilink | undefined {
	if (!input.startsWith('[[') || !input.endsWith(']]')) return undefined;

	return parseWikilinkLinktext(input.slice(2, -2));
}

export function parseWikilinkLinktext(
	input: string,
): ParsedWikilink | undefined {
	const inner = input.trim();
	if (inner === '') return undefined;

	const linktext = stripDisplayText(inner).trim();
	if (linktext === '' || isSearchOnlyLink(linktext)) return undefined;

	const linkpath = getLinkpath(linktext).trim();
	if (linkpath === '' || isSearchOnlyLink(linkpath)) return undefined;

	return {
		linktext,
		linkpath,
		hasExplicitPath: linkpath.includes('/'),
		hasMarkdownExtension: linkpath.toLowerCase().endsWith('.md'),
	};
}
