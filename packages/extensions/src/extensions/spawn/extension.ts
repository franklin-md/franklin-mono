import { z } from 'zod';
import type { Extension } from '../../types/extension.js';
import { spawnDescription } from '../system_prompts.js';

/**
 * Extension that registers a `spawn` tool allowing the agent
 * to spawn child agents via a provided callback.
 */
export function spawnExtension(spawn: () => Promise<void>): Extension {
	return (api) => {
		api.registerTool({
			name: 'spawn',
			description: spawnDescription,
			schema: z.object({}),
			async execute() {
				await spawn();
				return { ok: true };
			},
		});
	};
}
