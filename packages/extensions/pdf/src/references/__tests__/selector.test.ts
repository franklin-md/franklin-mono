import { describe, expect, it } from 'vitest';

import { parsePdfReferenceSelector } from '../pdf.js';

describe('parsePdfReferenceSelector', () => {
	it('parses a single page selector', () => {
		expect(parsePdfReferenceSelector('page=10')).toEqual({
			pages: { start: 10, end: 10 },
		});
	});

	it('parses a page range selector', () => {
		expect(parsePdfReferenceSelector('pages=10-12')).toEqual({
			pages: { start: 10, end: 12 },
		});
	});

	it('ignores unsupported selector fields', () => {
		expect(parsePdfReferenceSelector('section=intro')).toEqual({});
	});

	it('ignores invalid page ranges', () => {
		expect(parsePdfReferenceSelector('pages=12-10')).toEqual({});
		expect(parsePdfReferenceSelector('pages=0-10')).toEqual({});
		expect(parsePdfReferenceSelector('page=10.5')).toEqual({});
	});
});
