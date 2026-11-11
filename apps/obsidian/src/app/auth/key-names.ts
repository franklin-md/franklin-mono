import { createHash } from 'node:crypto';

/**
 * Obsidian `SecretStorage` IDs must be lowercase alphanumeric with optional
 * dashes, so provider-derived keys need to be normalized before storing them.
 */
export function toSecretStorageIdSegment(value: string): string {
	const normalized = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	if (normalized.length === 0) {
		throw new Error(
			'SecretStorage ID segment must include alphanumeric characters',
		);
	}

	// Obsidian also caps the complete ID at 64 characters (verified in 1.15.1).
	// Reserve eight characters for "-api-key". Hash the whole provider identity
	// rather than truncating MCP IDs, which share long server/header prefixes.
	// Existing short provider names keep their original storage addresses.
	// https://docs.obsidian.md/plugins/guides/secret-storage
	return normalized.length <= 56
		? normalized
		: `sha256-${createHash('sha256').update(value).digest('hex').slice(0, 48)}`;
}

export const PROVIDERS_KEY = 'franklin-providers';

export function toApiKeyName(provider: string): string {
	return `${toSecretStorageIdSegment(provider)}-api-key`;
}

export function toOAuthName(provider: string): string {
	return `${toSecretStorageIdSegment(provider)}-oauth`;
}
