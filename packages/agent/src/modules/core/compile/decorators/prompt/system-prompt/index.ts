import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { MiniACPClient } from '@franklin/mini-acp';
import type { CoreSignature } from '../../../../api/api.js';
import { bindRegisteredEventHandlers } from '../../../registrations/index.js';
import { buildSystemPromptAssembler } from './assembler/build.js';

export function createSystemPromptSync<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): (client: MiniACPClient) => Promise<void> {
	const handlers = bindRegisteredEventHandlers(
		registrations,
		'systemPrompt',
		getRuntime,
	);
	if (handlers.length === 0) return async () => {};

	const assembler = buildSystemPromptAssembler(handlers);
	let lastSent = '';

	return async (client) => {
		const assembled = await assembler.assemble();
		if (assembled === lastSent) return;

		await client.setContext({
			systemPrompt: assembled,
		});
		lastSent = assembled;
	};
}
