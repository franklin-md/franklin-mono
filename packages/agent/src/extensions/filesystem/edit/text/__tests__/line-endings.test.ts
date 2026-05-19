import { describe, it, expect } from 'vitest';
import {
	detectLineEnding,
	normalizeToLF,
	restoreLineEndings,
} from '../line-endings.js';

describe('detectLineEnding', () => {
	it('detects LF', () => {
		expect(detectLineEnding('a\nb\nc')).toBe('\n');
	});

	it('detects CRLF', () => {
		expect(detectLineEnding('a\r\nb\r\nc')).toBe('\r\n');
	});

	it('defaults to LF when no newlines', () => {
		expect(detectLineEnding('no newlines')).toBe('\n');
	});

	it('picks CRLF when it appears before bare LF', () => {
		// Mixed: first newline is CRLF
		expect(detectLineEnding('a\r\nb\nc')).toBe('\r\n');
	});
});

describe('normalizeToLF', () => {
	it('converts CRLF to LF', () => {
		expect(normalizeToLF('a\r\nb\r\n')).toBe('a\nb\n');
	});

	it('converts bare CR to LF', () => {
		expect(normalizeToLF('a\rb')).toBe('a\nb');
	});

	it('leaves LF-only text unchanged', () => {
		const text = 'a\nb\nc';
		expect(normalizeToLF(text)).toBe(text);
	});
});

describe('restoreLineEndings', () => {
	it('restores CRLF from LF-normalized text', () => {
		expect(restoreLineEndings('a\nb\n', '\r\n')).toBe('a\r\nb\r\n');
	});

	it('is a no-op when original was LF', () => {
		expect(restoreLineEndings('a\nb', '\n')).toBe('a\nb');
	});
});
