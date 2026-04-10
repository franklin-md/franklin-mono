import { describe, expect, it } from 'vitest';
import { normalizeUrl } from '../../utils.js';

describe('normalizeUrl', () => {
	it('upgrades http to https', () => {
		expect(normalizeUrl('http://example.com/path')).toBe(
			'https://example.com/path',
		);
	});

	it('keeps localhost on http', () => {
		expect(normalizeUrl('http://localhost:3000/path')).toBe(
			'http://localhost:3000/path',
		);
	});

	it('keeps literal loopback IPs on http', () => {
		expect(normalizeUrl('http://127.0.0.1:11434/path')).toBe(
			'http://127.0.0.1:11434/path',
		);
		expect(normalizeUrl('http://[::1]:11434/path')).toBe(
			'http://[::1]:11434/path',
		);
	});

	it('keeps other non-public hosts on http', () => {
		expect(normalizeUrl('http://192.168.1.10:8080/path')).toBe(
			'http://192.168.1.10:8080/path',
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
