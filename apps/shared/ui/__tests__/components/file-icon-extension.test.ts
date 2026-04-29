import { describe, expect, it } from 'vitest';

import { resolveFileExtension } from '../../src/components/file-icon/extension.js';

describe('resolveFileExtension', () => {
	describe('without an override', () => {
		it('returns the lowercased extension for a normal filename', () => {
			expect(resolveFileExtension('index.ts', undefined)).toBe('ts');
		});

		it('lowercases extensions whose source is upper-case', () => {
			expect(resolveFileExtension('README.MD', undefined)).toBe('md');
		});

		it('returns only the final segment of a multi-dot filename', () => {
			expect(resolveFileExtension('archive.tar.gz', undefined)).toBe('gz');
		});

		it('returns undefined for an extensionless filename', () => {
			expect(resolveFileExtension('session', undefined)).toBeUndefined();
		});

		it('returns undefined for a leading-dot dotfile', () => {
			expect(resolveFileExtension('.env', undefined)).toBeUndefined();
		});

		it('returns undefined when the filename ends with a dot', () => {
			expect(resolveFileExtension('README.', undefined)).toBeUndefined();
		});

		it('returns undefined for an empty filename', () => {
			expect(resolveFileExtension('', undefined)).toBeUndefined();
		});
	});

	describe('with an override', () => {
		it('prefers the override over the filename extension', () => {
			expect(resolveFileExtension('index.ts', 'md')).toBe('md');
		});

		it('uses the override when the filename has no extension', () => {
			expect(resolveFileExtension('session', 'ts')).toBe('ts');
		});

		it('strips a single leading dot from the override', () => {
			expect(resolveFileExtension('x', '.ts')).toBe('ts');
		});

		it('trims whitespace and lowercases the override', () => {
			expect(resolveFileExtension('x', '  TS  ')).toBe('ts');
		});

		it('lowercases an upper-case override', () => {
			expect(resolveFileExtension('x', 'TSX')).toBe('tsx');
		});

		it('returns undefined when the override is empty (does not fall back)', () => {
			expect(resolveFileExtension('x.ts', '')).toBeUndefined();
		});

		it('returns undefined when the override is just a dot', () => {
			expect(resolveFileExtension('x.ts', '.')).toBeUndefined();
		});

		it('returns undefined when the override is only whitespace', () => {
			expect(resolveFileExtension('x.ts', '   ')).toBeUndefined();
		});

		it('falls back to the filename when the override is undefined', () => {
			expect(resolveFileExtension('x.ts', undefined)).toBe('ts');
		});
	});
});
