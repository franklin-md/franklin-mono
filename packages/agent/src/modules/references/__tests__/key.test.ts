import { describe, expect, it } from 'vitest';

import { referenceKey } from '../index.js';

describe('referenceKey', () => {
	it('keys references by locator and selector', () => {
		expect(
			referenceKey({
				locator: 'notes/deep work.md',
				selector: 'lines=1-5',
				label: 'Deep Work',
			}),
		).toBe(
			referenceKey({
				locator: 'notes/deep work.md',
				selector: 'lines=1-5',
				label: 'Deep Work Copy',
			}),
		);
		expect(
			referenceKey({
				locator: 'notes/deep work.md',
				selector: 'lines=1-5',
			}),
		).not.toBe(
			referenceKey({
				locator: 'notes/deep work.md',
				selector: 'lines=6-10',
			}),
		);
	});

	it('uses length prefixes to avoid delimiter collisions', () => {
		expect(referenceKey({ locator: 'a|b', selector: 'c' })).toBe('l3:a|b|s1:c');
		expect(referenceKey({ locator: 'a', selector: 'b|c' })).toBe('l1:a|s3:b|c');
		expect(referenceKey({ locator: 'a', selector: '' })).not.toBe(
			referenceKey({ locator: 'a' }),
		);
	});
});
