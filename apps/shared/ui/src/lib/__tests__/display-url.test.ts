import { describe, expect, it } from 'vitest';

import { displayUrl, faviconUrl } from '../display-url.js';

describe('displayUrl', () => {
	it('extracts hostname and path from a valid URL', () => {
		const result = displayUrl('https://example.com/docs/getting-started');
		expect(result).toEqual({
			hostname: 'example.com',
			path: '/docs/getting-started',
		});
	});

	it('strips trailing slash from root path', () => {
		const result = displayUrl('https://example.com/');
		expect(result).toEqual({ hostname: 'example.com', path: '' });
	});

	it('returns empty path for root URLs', () => {
		const result = displayUrl('https://example.com');
		expect(result).toEqual({ hostname: 'example.com', path: '' });
	});

	it('falls back to raw string for invalid URLs', () => {
		const result = displayUrl('not-a-url');
		expect(result).toEqual({ hostname: 'not-a-url', path: '' });
	});

	it('preserves query and fragment in path', () => {
		const result = displayUrl('https://example.com/search?q=test#results');
		expect(result).toEqual({ hostname: 'example.com', path: '/search' });
	});
});

describe('faviconUrl', () => {
	it('returns a Google favicon service URL', () => {
		expect(faviconUrl('example.com')).toBe(
			'https://www.google.com/s2/favicons?domain=example.com&sz=16',
		);
	});
});
