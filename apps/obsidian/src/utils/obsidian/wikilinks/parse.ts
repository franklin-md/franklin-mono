import { getLinkpath } from 'obsidian';

import type { ParsedWikilink } from './types.js';

function splitDisplayText(inner: string) {
	const pipeIndex = inner.indexOf('|');
	const linktext = (pipeIndex >= 0 ? inner.slice(0, pipeIndex) : inner).trim();
	const displayCandidate =
		pipeIndex >= 0 ? inner.slice(pipeIndex + 1).trim() : linktext;

	return {
		linktext,
		displayText: displayCandidate === '' ? linktext : displayCandidate,
	};
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

	const { linktext, displayText } = splitDisplayText(inner);
	if (linktext === '' || isSearchOnlyLink(linktext)) return undefined;

	const linkpath = getLinkpath(linktext).trim();
	if (linkpath === '' || isSearchOnlyLink(linkpath)) return undefined;

	return {
		linktext,
		linkpath,
		displayText,
		hasExplicitPath: linkpath.includes('/'),
		hasMarkdownExtension: linkpath.toLowerCase().endsWith('.md'),
	};
}
