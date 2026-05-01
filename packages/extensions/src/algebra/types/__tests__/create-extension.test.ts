import { describe, expect, it } from 'vitest';
import { createExtension } from '../create-extension.js';

describe('createExtension', () => {
	it('returns the extension passed directly', () => {
		const extension = () => {};
		expect(createExtension<[], []>(extension)).toBe(extension);
	});

	it('supports a curried form', () => {
		const extension = () => {};
		expect(createExtension<[], []>()(extension)).toBe(extension);
	});
});
