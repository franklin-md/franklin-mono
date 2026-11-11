import { describe, expect, it } from 'vitest';

import { completeIncompleteObsidianWikilink } from '../remend-wikilinks.js';

describe('completeIncompleteObsidianWikilink', () => {
	it('completes a trailing wikilink while streaming', () => {
		expect(completeIncompleteObsidianWikilink('See [[MEM')).toBe('See [[MEM]]');
	});

	it('completes a trailing aliased wikilink while streaming', () => {
		expect(completeIncompleteObsidianWikilink('See [[MEM|Memory')).toBe(
			'See [[MEM|Memory]]',
		);
	});

	it('only completes the rightmost incomplete wikilink opener', () => {
		expect(completeIncompleteObsidianWikilink('See [[old and [[new')).toBe(
			'See [[old and [[new]]',
		);
	});

	it('completes a trailing embed without changing it into a normal link', () => {
		expect(completeIncompleteObsidianWikilink('Embed ![[MEM')).toBe(
			'Embed ![[MEM]]',
		);
	});

	it('leaves complete wikilinks alone', () => {
		expect(completeIncompleteObsidianWikilink('See [[MEM]]')).toBe(
			'See [[MEM]]',
		);
	});

	it('leaves code spans alone', () => {
		expect(completeIncompleteObsidianWikilink('Use `[[MEM')).toBe('Use `[[MEM');
	});

	it('leaves multiline wikilink-like text alone', () => {
		expect(completeIncompleteObsidianWikilink('See [[MEM\nnext')).toBe(
			'See [[MEM\nnext',
		);
	});
});
