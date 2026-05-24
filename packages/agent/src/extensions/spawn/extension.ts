import { collect } from '@franklin/mini-acp';
import { defineExtension } from '../../modules/state/index.js';
import type { CoreModule } from '../../modules/core/index.js';
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
				from: ctx.details.id,
				mode: 'child',
				state: {
					details: { visibility: 'hidden' },
				},
			});
			// A create-time `core.toolFilter` override would make this more atomic,
			// but it depends on deep state-merge details and can obscure future child
			// state inheritance. Keep the recursive-spawn guard local until child tool
			// policy has a first-class creation helper.
			child.runtime.toolRegistry.setEnabled(spawnSpec.name, false);
			const stream = child.runtime.prompt({
				role: 'user',
				content: [{ type: 'text', text: prompt }],
			});
			const { messages, turnEnd } = await collect(stream);
			return formatResult(messages, turnEnd);
		},
	});
});
