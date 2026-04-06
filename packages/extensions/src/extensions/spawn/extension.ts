import type { Extension } from '../../types/extension.js';
import { spawnSpec } from './tools.js';

/**
 * Extension that registers a `spawn` tool allowing the agent
 * to spawn child agents via a provided callback.
 */
export function spawnExtension(spawn: () => Promise<void>): Extension {
	return (api) => {
		api.registerTool(spawnSpec, async () => {
			await spawn();
			return { ok: true };
		});
	};
}
