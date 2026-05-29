import { describe, expect, it } from 'vitest';
import { ParsedSelector, parseSelectorIntegerRangeValue } from '../index.js';

describe('selector codec', () => {
	it('stringifies selector fields in a stable compact format', () => {
		expect(
			ParsedSelector.stringify({
				quote: 'hello;world',
				pages: { start: 10, end: 12 },
				page: 10,
				skip: undefined,
			}),
		).toBe('page=10;pages=10-12;quote=hello%3Bworld');
	});

	it('parses selector fields and decodes values', () => {
		const selector = ParsedSelector.parse('page=10;quote=hello%3Bworld');

		expect(selector.string('page')).toBe('10');
		expect(selector.string('quote')).toBe('hello;world');
	});

	it('reads string, integer, and integer range values', () => {
		const selector = ParsedSelector.parse('label=intro;page=10;pages=10-12');

		expect(selector.string('label')).toBe('intro');
		expect(selector.integer('page', { min: 1 })).toBe(10);
		expect(selector.integerRange('pages', { min: 1 })).toEqual({
			start: 10,
			end: 12,
		});
	});

	it('treats a single integer as a single-value range', () => {
		expect(ParsedSelector.parse('pages=10').integerRange('pages')).toEqual({
			start: 10,
			end: 10,
		});
	});

	it('returns undefined for invalid integers and ranges', () => {
		expect(ParsedSelector.parse('page=10.5').integer('page')).toBeUndefined();
		expect(
			ParsedSelector.parse('pages=12-10').integerRange('pages'),
		).toBeUndefined();
		expect(
			ParsedSelector.parse('pages=0-10').integerRange('pages', { min: 1 }),
		).toBeUndefined();
	});

	it('reports reversed raw ranges for provider correction messages', () => {
		expect(parseSelectorIntegerRangeValue('12-10', { min: 1 })).toEqual({
			ok: false,
			reversed: { start: 12, end: 10 },
		});
	});
});
