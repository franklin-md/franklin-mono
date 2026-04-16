import { describe, expect, it } from 'vitest';
import { joinAbsolute, toAbsolutePath } from '../paths/index.js';

describe('AbsolutePath', () => {
	describe('POSIX', () => {
		it('normalizes absolute paths', () => {
			expect(toAbsolutePath('/project/src/../index.ts')).toBe(
				'/project/index.ts',
			);
		});
	});

	describe('Windows', () => {
		describe('drive paths', () => {
			it('normalizes native drive paths into canonical slash form', () => {
				expect(toAbsolutePath('c:\\Users\\afv\\.franklin')).toBe(
					'/C:/Users/afv/.franklin',
				);
			});

			it('does not allow normalization to escape a drive root', () => {
				expect(toAbsolutePath('/C:/../Users/afv')).toBe('/C:/Users/afv');
			});

			it('rejects drive-relative paths', () => {
				expect(() => toAbsolutePath('C:project\\file.txt')).toThrow(
					'Expected an absolute path',
				);
			});
		});

		describe('UNC paths', () => {
			it('normalizes native UNC paths into canonical slash form', () => {
				expect(toAbsolutePath('\\\\server\\share\\docs\\note.md')).toBe(
					'/UNC/server/share/docs/note.md',
				);
			});

			it('does not allow normalization to escape a share root', () => {
				expect(toAbsolutePath('/UNC/server/share/../../docs')).toBe(
					'/UNC/server/share/docs',
				);
			});
		});
	});

	describe('shared behavior', () => {
		it('joins onto absolute paths while preserving canonical form', () => {
			expect(joinAbsolute(toAbsolutePath('/project/src'), '../index.ts')).toBe(
				'/project/index.ts',
			);
		});

		it('rejects relative paths', () => {
			expect(() => toAbsolutePath('project/file.txt')).toThrow(
				'Expected an absolute path',
			);
		});
	});
});
