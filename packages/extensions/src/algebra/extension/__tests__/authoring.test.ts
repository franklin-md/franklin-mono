import { describe, expect, it } from 'vitest';
import { defineExtension } from '../authoring.js';

describe('defineExtension', () => {
	it('returns the extension passed directly', () => {
		const extension = () => {};
		expect(defineExtension<[]>(extension)).toBe(extension);
	});

	it('supports a curried form', () => {
		const extension = () => {};
		expect(defineExtension<[]>()(extension)).toBe(extension);
	});
});
