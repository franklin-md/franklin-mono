import { describe, expect, it } from 'vitest';
import { joinAbsolute, toAbsolutePath } from '../absolute.js';

describe('AbsolutePath', () => {
	describe('validation', () => {
		it('accepts slash-prefixed absolute paths', () => {
			expect(toAbsolutePath('/project/src/index.ts')).toBe(
				'/project/src/index.ts',
			);
		});

		it('rejects relative paths', () => {
			expect(() => toAbsolutePath('project/file.txt')).toThrow(
				'Expected an absolute path',
			);
		});
	});

	describe('joining', () => {
		it('joins onto absolute paths while preserving canonical form', () => {
			expect(joinAbsolute(toAbsolutePath('/project/src'), '../index.ts')).toBe(
				'/project/index.ts',
			);
		});
	});
});
