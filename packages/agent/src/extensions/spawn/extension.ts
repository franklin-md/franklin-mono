import { collect } from '@franklin/mini-acp';
import { defineExtension } from '../../modules/state/index.js';
import type {
	CoreModule,
	RenderedToolOutput,
} from '../../modules/core/index.js';
import type { OrchestratorModule } from '../../modules/orchestrator/index.js';
import { spawnSpec } from './tools.js';
import { formatResult } from './format.js';

/**
 * Spawn a child agent with a fresh prompt and return its last message.
 */
export const spawnExtension = defineExtension<
	[OrchestratorModule<[CoreModule]>]
>((api) => {
	api.registerTool(spawnSpec, {
		execute: async ({ prompt }, ctx) => {
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
		},
		render: renderSpawnOutput,
	});
});

function renderSpawnOutput(
	output: string | RenderedToolOutput,
): RenderedToolOutput {
	if (typeof output === 'string') {
		return { content: [{ type: 'text', text: output }] };
	}
	return output;
}
