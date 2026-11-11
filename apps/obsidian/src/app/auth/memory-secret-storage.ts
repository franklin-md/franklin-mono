import type { ObsidianSecretStorage } from './types.js';

export class MemorySecretStorage implements ObsidianSecretStorage {
	private readonly map = new Map<string, string>();

	getSecret(id: string): string | null {
		return this.map.get(id) ?? null;
	}

	setSecret(id: string, secret: string): void {
		if (!/^[a-z0-9-]{1,64}$/.test(id)) {
			throw new Error(
				'Secret ID is invalid. Use only lowercase letters, numbers and dashes. 64 characters max.',
			);
		}
		this.map.set(id, secret);
	}

	listSecrets(): string[] {
		return [...this.map.keys()];
	}
}
