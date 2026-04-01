import { describe, it, expect } from 'vitest';
import { normalizeForFuzzyMatch } from '../normalize.js';

describe('normalizeForFuzzyMatch', () => {
	it('strips trailing whitespace from each line', () => {
		expect(normalizeForFuzzyMatch('hello   \nworld  ')).toBe('hello\nworld');
	});

	it('normalizes smart single quotes to ASCII', () => {
		expect(normalizeForFuzzyMatch('\u2018hello\u2019')).toBe("'hello'");
	});

	it('normalizes smart double quotes to ASCII', () => {
		expect(normalizeForFuzzyMatch('\u201Chello\u201D')).toBe('"hello"');
	});

	it('normalizes Unicode dashes to ASCII hyphen', () => {
		// en-dash, em-dash, minus sign
		expect(normalizeForFuzzyMatch('a\u2013b\u2014c\u2212d')).toBe('a-b-c-d');
	});

	it('normalizes special Unicode spaces to regular space', () => {
		// NBSP, en space
		expect(normalizeForFuzzyMatch('a\u00A0b\u2002c')).toBe('a b c');
	});

	it('applies NFKC normalization', () => {
		// ﬁ ligature → fi
		expect(normalizeForFuzzyMatch('\uFB01le')).toBe('file');
	});

	it('leaves already-clean text unchanged', () => {
		const text = 'hello world';
		expect(normalizeForFuzzyMatch(text)).toBe(text);
	});
});
