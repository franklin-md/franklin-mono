import { z } from 'zod';
import { PROVIDERS_KEY } from './key-names.js';
import type { ObsidianSecretStorage } from './types.js';

const providersSchema = z.array(z.string());

export function readIndex(storage: ObsidianSecretStorage): string[] {
	const raw = storage.getSecret(PROVIDERS_KEY);
	if (!raw) return [];
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}
	const result = providersSchema.safeParse(parsed);
	return result.success ? result.data : [];
}

export function writeIndex(
	storage: ObsidianSecretStorage,
	providers: string[],
): void {
	storage.setSecret(PROVIDERS_KEY, JSON.stringify(providers));
}
