import type { AuthStore } from '@franklin/agent/browser';
import type { Plugin } from 'obsidian';

import { createObsidianAuthStore } from './store.js';

export async function resolveAuthStore(
	plugin: Plugin,
): Promise<AuthStore | undefined> {
	try {
		plugin.app.secretStorage.getSecret('__probe__');
		return createObsidianAuthStore(plugin.app.secretStorage);
	} catch {
		// SecretStorage unavailable (e.g. Linux without keyring daemon) — fall back to auth.json
		return undefined;
	}
}
