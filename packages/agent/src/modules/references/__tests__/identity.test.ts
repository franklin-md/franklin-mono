import { describe, expect, it } from 'vitest';

import { referenceIdentityKey } from '../api/identity.js';

describe('referenceIdentityKey', () => {
	it('keys references by locator and selector', () => {
		expect(
			referenceIdentityKey({
				locator: 'notes/deep work.md',
				selector: 'lines=1-5',
				label: 'Deep Work',
			}),
		).toBe(
			referenceIdentityKey({
				locator: 'notes/deep work.md',
				selector: 'lines=1-5',
				label: 'Deep Work Copy',
			}),
		);
		expect(
			referenceIdentityKey({
				locator: 'notes/deep work.md',
				selector: 'lines=1-5',
			}),
		).not.toBe(
			referenceIdentityKey({
				locator: 'notes/deep work.md',
				selector: 'lines=6-10',
			}),
		);
	});
});
