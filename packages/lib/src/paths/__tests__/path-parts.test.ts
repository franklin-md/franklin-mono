import { describe, expect, it } from 'vitest';
import { getFilename, getFilenameExtension } from '../parts.js';

describe('path parts', () => {
	describe('getFilename', () => {
		it('returns the final slash-delimited path segment', () => {
			expect(getFilename('packages/agent/src/session.ts')).toBe('session.ts');
		});

		it('returns the original path when there is no slash', () => {
			expect(getFilename('README.md')).toBe('README.md');
		});
	});

	describe('getFilenameExtension', () => {
		it('returns the suffix after the final dot', () => {
			expect(getFilenameExtension('archive.tar.gz')).toBe('gz');
		});

		it('does not normalize extension casing', () => {
			expect(getFilenameExtension('README.MD')).toBe('MD');
		});

		it('ignores leading and trailing dots', () => {
			expect(getFilenameExtension('.env')).toBeUndefined();
			expect(getFilenameExtension('README.')).toBeUndefined();
		});
	});
});
