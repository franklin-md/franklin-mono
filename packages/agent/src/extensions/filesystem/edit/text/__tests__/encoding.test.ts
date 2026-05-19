import { describe, it, expect } from 'vitest';
import { decode } from '../encoding.js';

describe('decode', () => {
	it('decodes a plain UTF-8 Uint8Array to text', () => {
		const bytes = new TextEncoder().encode('hello world');
		const result = decode(bytes);
		expect(result.text).toBe('hello world');
		expect(result.bom).toBe('');
	});

	it('strips a UTF-8 BOM and returns it separately', () => {
		const bytes = new TextEncoder().encode('\uFEFFhello');
		const result = decode(bytes);
		expect(result.text).toBe('hello');
		expect(result.bom).toBe('\uFEFF');
	});

	it('handles empty input', () => {
		const result = decode(new Uint8Array());
		expect(result.text).toBe('');
		expect(result.bom).toBe('');
	});

	it('handles a BOM-only input', () => {
		const bytes = new TextEncoder().encode('\uFEFF');
		const result = decode(bytes);
		expect(result.text).toBe('');
		expect(result.bom).toBe('\uFEFF');
	});
});
