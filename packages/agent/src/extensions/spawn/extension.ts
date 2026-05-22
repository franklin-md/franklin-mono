import type { Message, StreamEvent, TurnEnd } from '@franklin/mini-acp';
import {
	defineExtension,
	type ExtensionForModules,
} from '../../modules/state/index.js';
import type { CoreModule } from '../../modules/core/index.js';
import type { OrchestratorModule } from '../../modules/orchestrator/index.js';
import { spawnSpec } from './tools.js';
import { formatResult } from './format.js';
import type { ToolOutput } from '../../modules/core/index.js';

type SpawnExtension = ExtensionForModules<[OrchestratorModule<[CoreModule]>]>;

async function collectStream(stream: AsyncIterable<StreamEvent>): Promise<{
	messages: Message[];
	turnEnd: TurnEnd | undefined;
}> {
	const messages: Message[] = [];
	let turnEnd: TurnEnd | undefined;

	for await (const event of stream) {
		switch (event.type) {
			case 'update':
				messages.push(event.message);
				break;
			case 'turnEnd':
				turnEnd = event;
				break;
			case 'turnStart':
			case 'chunk':
				break;
		}
	}

	return { messages, turnEnd };
}

/**
 * Spawn a child agent with a fresh prompt and return its last message.
 */
export function spawnExtension(): SpawnExtension {
	return defineExtension<[OrchestratorModule<[CoreModule]>]>((api) => {
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
					const { messages, turnEnd } = await collectStream(stream);
					return formatResult(messages, turnEnd);
				} finally {
					await child.runtime.orchestrator.remove(child.id);
				}
			},
			render: renderSpawnOutput,
		});
	});
}

function renderSpawnOutput(output: string | ToolOutput): ToolOutput {
	if (typeof output === 'string') {
		return { content: [{ type: 'text', text: output }] };
	}
	return output;
}
