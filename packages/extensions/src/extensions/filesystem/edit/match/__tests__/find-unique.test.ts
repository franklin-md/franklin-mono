import { describe, it, expect, assert } from 'vitest';
import { findUnique } from '../find-unique.js';

describe('findUnique', () => {
	it('finds an exact match', () => {
		const result = findUnique('hello world', 'world');
		assert(result.found);
		expect(result.index).toBe(6);
		expect(result.length).toBe(5);
		expect(result.fuzzy).toBe(false);
	});

	it('returns not found when text is absent', () => {
		const result = findUnique('hello world', 'missing');
		expect(result.found).toBe(false);
	});

	it('rejects when there are multiple exact matches', () => {
		const result = findUnique('ab ab ab', 'ab');
		expect(result.found).toBe(false);
		assert(!result.found);
		expect(result.ambiguous).toBe(true);
	});

	it('falls back to fuzzy match on trailing whitespace difference', () => {
		const content = 'hello   \nworld';
		const search = 'hello\nworld';
		const result = findUnique(content, search);
		assert(result.found);
		expect(result.fuzzy).toBe(true);
	});

	it('falls back to fuzzy match on smart quote difference', () => {
		const content = 'it\u2019s a test';
		const search = "it's a test";
		const result = findUnique(content, search);
		assert(result.found);
		expect(result.fuzzy).toBe(true);
	});

	it('rejects ambiguous fuzzy matches', () => {
		const content = 'it\u2019s and it\u2019s';
		const search = "it's";
		const result = findUnique(content, search);
		expect(result.found).toBe(false);
		assert(!result.found);
		expect(result.ambiguous).toBe(true);
	});

	it('returns the content to use for replacement (exact)', () => {
		const content = 'abc def ghi';
		const result = findUnique(content, 'def');
		assert(result.found);
		expect(result.content).toBe(content);
	});

	it('returns normalized content for replacement when fuzzy matched', () => {
		const content = 'hello   \nworld';
		const search = 'hello\nworld';
		const result = findUnique(content, search);
		assert(result.found);
		expect(result.content).not.toBe(content);
		expect(result.content).not.toContain('   \n');
	});
});
