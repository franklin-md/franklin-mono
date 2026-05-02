import { collect } from '@franklin/mini-acp';
import type { BoundAPI } from '../../algebra/api/index.js';
import type { Extension } from '../../algebra/extension/index.js';
import { createExtension } from '../../harness/modules/index.js';
import type {
	OrchestratorModule,
	OrchestratorRuntime,
} from '../../harness/orchestrator/index.js';
import type { CoreAPI, CoreModule } from '../../modules/core/index.js';
import { spawnSpec } from './tools.js';
import { formatResult } from './format.js';

type SpawnExtension = Extension<
	BoundAPI<CoreAPI, OrchestratorRuntime<CoreModule>>
>;

/**
 * Spawn a child agent with a fresh prompt and return its last message.
 */
export function spawnExtension(): SpawnExtension {
	return createExtension<[OrchestratorModule<[CoreModule]>]>((api) => {
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
