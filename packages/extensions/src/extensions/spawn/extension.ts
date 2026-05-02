import { collect } from '@franklin/mini-acp';
import { createExtension } from '../../algebra/index.js';
import type { CoreAPI, CoreRuntime } from '../../modules/core/index.js';
import type { OrchestratorHandle } from '../../harness/modules/context.js';
import type { SelfRuntime } from '../../harness/orchestrator/index.js';
import { spawnSpec } from './tools.js';
import { formatResult } from './format.js';

type SpawnRuntime = CoreRuntime &
	SelfRuntime & {
		readonly orchestrator: OrchestratorHandle<SpawnRuntime>;
	};

/**
 * Spawn a child agent with a fresh prompt and return its last message.
 */
export function spawnExtension() {
	return createExtension<[CoreAPI], [SpawnRuntime]>((api) => {
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
