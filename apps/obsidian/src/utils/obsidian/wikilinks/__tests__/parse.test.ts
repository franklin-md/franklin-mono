import { describe, it, expect } from 'vitest';

import { parseWikilink } from '../parse.js';

describe('parseWikilink', () => {
	it('returns undefined for non-wikilink input', () => {
		expect(parseWikilink('notes/Hello.md')).toBeUndefined();
		expect(parseWikilink('[[Hello]')).toBeUndefined();
		expect(parseWikilink('[Hello]]')).toBeUndefined();
		expect(parseWikilink('')).toBeUndefined();
	});

	it('returns undefined for empty inner content', () => {
		expect(parseWikilink('[[]]')).toBeUndefined();
		expect(parseWikilink('[[   ]]')).toBeUndefined();
	});

	it('parses a bare wikilink', () => {
		expect(parseWikilink('[[Hello]]')).toEqual({
			raw: '[[Hello]]',
			linktext: 'Hello',
			linkpath: 'Hello',
			hasExplicitPath: false,
			hasMarkdownExtension: false,
		});
	});

	it('strips display text after a pipe', () => {
		const parsed = parseWikilink('[[Hello|Read this]]');
		expect(parsed?.linktext).toBe('Hello');
		expect(parsed?.linkpath).toBe('Hello');
	});

	it('strips heading suffix from linkpath', () => {
		const parsed = parseWikilink('[[Hello#Overview]]');
		expect(parsed?.linktext).toBe('Hello#Overview');
		expect(parsed?.linkpath).toBe('Hello');
	});

	it('strips heading suffix and display text together', () => {
		const parsed = parseWikilink('[[Hello#Overview|Read this]]');
		expect(parsed?.linktext).toBe('Hello#Overview');
		expect(parsed?.linkpath).toBe('Hello');
	});

	it('rejects heading-only links', () => {
		expect(parseWikilink('[[#Overview]]')).toBeUndefined();
	});

	it('rejects block-reference-only links', () => {
		expect(parseWikilink('[[^abc123]]')).toBeUndefined();
	});

	it('detects explicit paths', () => {
		const parsed = parseWikilink('[[notes/Hello]]');
		expect(parsed?.hasExplicitPath).toBe(true);
		expect(parsed?.linkpath).toBe('notes/Hello');
	});

	it('detects the .md extension case-insensitively', () => {
		expect(parseWikilink('[[Hello.md]]')?.hasMarkdownExtension).toBe(true);
		expect(parseWikilink('[[Hello.MD]]')?.hasMarkdownExtension).toBe(true);
		expect(parseWikilink('[[Hello]]')?.hasMarkdownExtension).toBe(false);
	});

	it('trims surrounding whitespace inside the wikilink', () => {
		expect(parseWikilink('[[  Hello  ]]')?.linkpath).toBe('Hello');
	});
});
