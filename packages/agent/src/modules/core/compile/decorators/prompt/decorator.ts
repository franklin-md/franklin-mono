import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { MiniACPClient } from '@franklin/mini-acp';
import type { CoreSignature } from '../../../api/api.js';
import type { AgentState } from '../../../agent-state/index.js';
import type { ProtocolDecorator } from '../types.js';
import { createPromptBuilder } from './build-prompt/index.js';
import { createPromptObserver } from './observer/index.js';
import { createSystemPromptSync } from './system-prompt/index.js';

export function createPromptDecorator<Runtime extends BaseRuntime>(
	agentState: Pick<AgentState, 'systemPrompt'>,
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): ProtocolDecorator {
	const syncSystemPrompt = createSystemPromptSync(agentState);
	const buildPrompt = createPromptBuilder(registrations, getRuntime);
	const observePrompt = createPromptObserver(registrations, getRuntime);

	return {
		name: 'prompt',
		async server(s) {
			return s;
		},
		async client(c): Promise<MiniACPClient> {
			return {
				...c,
				async *prompt(message) {
					await syncSystemPrompt(c);
					const fullPrompt = await buildPrompt(message);
					yield* observePrompt(c.prompt(fullPrompt));
				},
			} as MiniACPClient;
		},
	};
}
