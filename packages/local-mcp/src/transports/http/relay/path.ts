import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Resolves the path to the relay script (relay.js) relative to this module.
 */
export function getRelayPath(): string {
	return path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'relay.js');
}
