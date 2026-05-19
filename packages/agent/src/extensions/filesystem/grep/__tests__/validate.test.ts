import { describe, expect, it } from 'vitest';
import { looksLikeMultipleAbsolutePaths } from '../validate.js';

describe('looksLikeMultipleAbsolutePaths', () => {
	it('flags whitespace-separated absolute paths', () => {
		expect(
			looksLikeMultipleAbsolutePaths('/tmp/project/src /tmp/project/docs'),
		).toBe(true);
	});

	it('allows a single absolute path with spaces in its name', () => {
		expect(looksLikeMultipleAbsolutePaths('/Users/test/My Project/src')).toBe(
			false,
		);
	});

	it('allows ordinary relative paths', () => {
		expect(looksLikeMultipleAbsolutePaths('src')).toBe(false);
	});
});
