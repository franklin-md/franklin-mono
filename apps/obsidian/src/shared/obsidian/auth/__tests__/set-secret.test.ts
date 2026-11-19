import { describe, expect, it } from 'vitest';
import { MemorySecretStorage } from '../memory-secret-storage.js';
import { setObsidianSecret } from '../set-secret.js';

describe('setObsidianSecret', () => {
	it('writes a 64-character ID and preserves a longer value', () => {
		const storage = new MemorySecretStorage();
		const id = 'a'.repeat(64);
		const value = 'b'.repeat(100);
		setObsidianSecret(storage, id, value);
		expect(storage.getSecret(id)).toBe(value);
	});

	it('rejects a 65-character ID before writing to storage', () => {
		const storage = new MemorySecretStorage();
		expect(() => setObsidianSecret(storage, 'a'.repeat(65), 'value')).toThrow(
			/^Obsidian secret ID has 65 characters \(maximum 64\)\.$/,
		);
		expect(storage.listSecrets()).toEqual([]);
	});
});
