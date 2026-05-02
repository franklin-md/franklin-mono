import { collect } from '@franklin/mini-acp';
import {
	defineExtension,
	type ExtensionForModules,
} from '../../harness/modules/index.js';
import type { OrchestratorModule } from '../../harness/orchestrator/index.js';
import type { CoreModule } from '../../modules/core/index.js';
import { spawnSpec } from './tools.js';
import { formatResult } from './format.js';

type SpawnExtension = ExtensionForModules<[OrchestratorModule<[CoreModule]>]>;

/**
 * Spawn a child agent with a fresh prompt and return its last message.
 */
export function spawnExtension(): SpawnExtension {
	return defineExtension<[OrchestratorModule<[CoreModule]>]>((api) => {
		api.registerTool(spawnSpec, async ({ prompt }, ctx) => {
			const child = await ctx.orchestrator.create({
				from: ctx.self.id,
				mode: 'child',
			});
			try {
				const stream = child.runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: prompt }],
				});
				const { messages, turnEnd } = await collect(stream);
				return formatResult(messages, turnEnd);
			} finally {
				await child.runtime.orchestrator.remove(child.id);
			}
		});
	});
}
