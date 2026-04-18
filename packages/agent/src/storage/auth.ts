import type { AbsolutePath, Filesystem } from '@franklin/lib';
import { authCodec } from '../auth/schema.js';
import type { AuthEntries } from '../auth/types.js';
import { createJsonStore } from './json.js';
import type { AuthStore } from './types.js';

export const DEFAULT_AUTH_FILE = 'auth.json';

export function createAuthStore(
	filesystem: Filesystem,
	appDir: AbsolutePath,
): AuthStore {
	return createJsonStore(filesystem, appDir, {
		file: DEFAULT_AUTH_FILE,
		defaults: {} as AuthEntries,
		codec: authCodec,
	});
}
