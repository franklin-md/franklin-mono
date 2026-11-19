import type { ObsidianSecretStorage } from './types.js';

export function setObsidianSecret(
	storage: ObsidianSecretStorage,
	id: string,
	value: string,
): void {
	if (id.length > 64) {
		throw new RangeError(
			`Obsidian secret ID has ${id.length} characters (maximum 64).`,
		);
	}
	storage.setSecret(id, value);
}
