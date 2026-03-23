import { z } from 'zod';
import type { Extension } from '../../types/extension.js';
import type { CoreAPI } from '../../api/core/api.js';

/**
 * Extension that registers a `spawn` tool allowing the agent
 * to spawn child agents via a provided callback.
 */
export function spawnExtension(spawn: () => Promise<void>): Extension<CoreAPI> {
	return (api) => {
		api.registerTool({
			name: 'spawn',
			description: 'Spawn a new agent',
			schema: z.object({}),
			async execute() {
				await spawn();
				return { ok: true };
			},
		});
	};
}
