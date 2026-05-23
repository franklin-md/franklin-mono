import type { MiniACPClient } from '@franklin/mini-acp';
import type { ContextManager } from '../../../context-manager/index.js';
import type { CoreRegistry } from '../../../registrations/index.js';
import type { ProtocolDecorator } from '../types.js';
import { createPromptBuilder } from './build-prompt/index.js';
import { createPromptObserver } from './observer/index.js';

export function createPromptDecorator(
	contextManager: Pick<ContextManager, 'contextLedger'>,
	registrations: CoreRegistry,
): ProtocolDecorator {
	const buildPrompt = createPromptBuilder(registrations);
	const observePrompt = createPromptObserver(registrations);

	return {
		name: 'prompt',
		async server(s) {
			return s;
		},
		async client(c): Promise<MiniACPClient> {
			return {
				...c,
				async *prompt(message) {
					await contextManager.contextLedger.sync(c);
					const fullPrompt = await buildPrompt(message);
					yield* observePrompt(c.prompt(fullPrompt));
				},
			} as MiniACPClient;
		},
	};
}
