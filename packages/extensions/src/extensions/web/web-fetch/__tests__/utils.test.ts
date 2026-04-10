import { describe, expect, it } from 'vitest';
import { normalizeUrl } from '../../utils.js';

describe('normalizeUrl', () => {
	it('upgrades http to https', () => {
		expect(normalizeUrl('http://example.com/path')).toBe(
			'https://example.com/path',
		);
	});

	it('leaves https unchanged', () => {
		expect(normalizeUrl('https://example.com/path')).toBe(
			'https://example.com/path',
		);
	});

	it('strips the hash fragment', () => {
		expect(normalizeUrl('https://example.com/page#section')).toBe(
			'https://example.com/page',
		);
	});

	it('strips the hash fragment when upgrading http to https', () => {
		expect(normalizeUrl('http://example.com/page#section')).toBe(
			'https://example.com/page',
		);
	});

	it('throws for unsupported protocols', () => {
		expect(() => normalizeUrl('ftp://example.com')).toThrow(
			'Only HTTP and HTTPS URLs are supported',
		);
	});

	it('throws for invalid URLs', () => {
		expect(() => normalizeUrl('not-a-url')).toThrow();
	});
});
