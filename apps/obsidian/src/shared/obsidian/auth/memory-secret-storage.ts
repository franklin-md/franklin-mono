import type { ObsidianSecretStorage } from './types.js';

export class MemorySecretStorage implements ObsidianSecretStorage {
	private readonly map = new Map<string, string>();

	getSecret(id: string): string | null {
		return this.map.get(id) ?? null;
	}

	setSecret(id: string, secret: string): void {
		this.map.set(id, secret);
	}

	listSecrets(): string[] {
		return [...this.map.keys()];
	}
}
