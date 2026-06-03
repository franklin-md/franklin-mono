import { describe, expect, it } from 'vitest';

import { parsePDFReferenceSelector } from '../pdf.js';

describe('parsePDFReferenceSelector', () => {
	it('parses a single page selector', () => {
		expect(parsePDFReferenceSelector('page=10')).toEqual({
			pages: { start: 10, end: 10 },
		});
	});

	it('parses a page range selector', () => {
		expect(parsePDFReferenceSelector('pages=10-12')).toEqual({
			pages: { start: 10, end: 12 },
		});
	});

	it('ignores unsupported selector fields', () => {
		expect(parsePDFReferenceSelector('section=intro')).toEqual({});
	});

	it('ignores invalid page ranges', () => {
		expect(parsePDFReferenceSelector('pages=12-10')).toEqual({});
		expect(parsePDFReferenceSelector('pages=0-10')).toEqual({});
		expect(parsePDFReferenceSelector('page=10.5')).toEqual({});
	});
});
