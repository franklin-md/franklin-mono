import { describe, it, expect } from 'vitest';
import { applyReplacement } from '../replace.js';

describe('applyReplacement', () => {
	it('replaces text at the matched position', () => {
		const result = applyReplacement('hello world', 6, 5, 'there');
		expect(result).toBe('hello there');
	});

	it('handles replacement at the start', () => {
		const result = applyReplacement('hello world', 0, 5, 'goodbye');
		expect(result).toBe('goodbye world');
	});

	it('handles replacement at the end', () => {
		const result = applyReplacement('hello world', 6, 5, 'planet');
		expect(result).toBe('hello planet');
	});

	it('handles replacement with empty string (deletion)', () => {
		const result = applyReplacement('hello world', 5, 6, '');
		expect(result).toBe('hello');
	});

	it('handles insertion (zero-length match)', () => {
		const result = applyReplacement('helloworld', 5, 0, ' ');
		expect(result).toBe('hello world');
	});

	it('handles multi-line replacement', () => {
		const content = 'line1\nline2\nline3';
		const result = applyReplacement(content, 6, 5, 'replaced');
		expect(result).toBe('line1\nreplaced\nline3');
	});
});
