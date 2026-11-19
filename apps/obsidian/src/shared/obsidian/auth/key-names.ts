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

	// Obsidian caps the complete ID at 64 characters, including "-api-key".
	// Earlier builds hashed the original provider ID at this same threshold.
	// Keep those addresses so previously saved MCP credentials still restore.
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
