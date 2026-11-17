import { describe, expect, it } from 'vitest';

import { toSecretStorageIdSegment } from '../key-names.js';

describe('toSecretStorageIdSegment', () => {
	it('normalizes values to Obsidian-compatible SecretStorage segments', () => {
		expect(toSecretStorageIdSegment('openrouter')).toBe('openrouter');
		expect(toSecretStorageIdSegment('pi-ai')).toBe('pi-ai');
		expect(toSecretStorageIdSegment('my.provider')).toBe('my-provider');
		expect(toSecretStorageIdSegment('  Mixed CASE__value  ')).toBe(
			'mixed-case-value',
		);
	});

	it('throws when no alphanumeric characters remain after normalization', () => {
		expect(() => toSecretStorageIdSegment('---')).toThrow(
			/alphanumeric characters/,
		);
	});
});
