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

	return normalized;
}

export const PROVIDERS_KEY = 'franklin-providers';

export function toApiKeyName(provider: string): string {
	return `${toSecretStorageIdSegment(provider)}-api-key`;
}

export function toOAuthName(provider: string): string {
	return `${toSecretStorageIdSegment(provider)}-oauth`;
}
