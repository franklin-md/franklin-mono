import type { SecretStorage } from 'obsidian';

export type ObsidianSecretStorage = Pick<
	SecretStorage,
	'getSecret' | 'setSecret' | 'listSecrets'
>;
