import { describe, expect, it } from 'vitest';

import {
	toApiKeyName,
	toOAuthName,
	toSecretStorageIdSegment,
} from '../key-names.js';

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

	it('keeps MCP credential names within Obsidian’s 64-character limit', () => {
		const provider =
			'mcp-11111111-1111-4111-8111-111111111111-22222222-2222-4222-8222-222222222222';
		for (const name of [toApiKeyName(provider), toOAuthName(provider)]) {
			expect(name).toMatch(/^[a-z0-9-]{1,64}$/);
		}
		expect(toApiKeyName(provider)).not.toBe(
			toApiKeyName(`${provider.slice(0, -1)}3`),
		);
		expect(toApiKeyName(provider)).not.toBe(toOAuthName(provider));
	});
});
