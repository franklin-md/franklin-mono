import type { BaseRuntime, RegistryView } from '@franklin/extensibility';
import type { MiniACPClient } from '@franklin/mini-acp';
import type { CoreSignature } from '../../../api/api.js';
import { bindRegisteredEventHandlers } from '../../registrations/index.js';
import type { ProtocolDecorator } from '../types.js';
import { buildSystemPromptAssembler } from './assembler/build.js';
import type { SystemPromptAssembler } from './assembler/types.js';

/**
 * Decorator that recomputes the system prompt before every prompt call.
 *
 * Compilation semantics:
 * 1. Before each `prompt`, run all `on('systemPrompt', ...)` handlers via
 *    the assembler, producing a fresh combined prompt string.
 * 2. If the result differs from what was last sent, dispatch `setContext`
 *    with the new prompt before the `prompt` call continues.
 * 3. Otherwise skip `setContext` — the agent already has the right prompt.
 *
 * `lastSent` advances optimistically: if `setContext` fails, `lastSent`
 * stays at the previous value, so the next turn re-diffs and retries
 * naturally. The pathological case is a `setContext` failure followed by
 * a successful `prompt`; the agent would run that one turn against a
 * stale prompt until the next change. This should effectively never
 * happen in practice.
 */
export function createSystemPromptDecorator<Runtime extends BaseRuntime>(
	registrations: RegistryView<CoreSignature, Runtime>,
	getRuntime: () => Runtime,
): ProtocolDecorator | undefined {
	const handlers = bindRegisteredEventHandlers(
		registrations,
		'systemPrompt',
		getRuntime,
	);
	if (handlers.length === 0) return undefined;
	return createSystemPromptClientDecorator(
		buildSystemPromptAssembler(handlers),
	);
}

function createSystemPromptClientDecorator(
	assembler: SystemPromptAssembler,
): ProtocolDecorator {
	let lastSent = '';

	return {
		name: 'system-prompt',
		async server(s) {
			return s;
		},
		async client(c): Promise<MiniACPClient> {
			return {
				...c,
				async *prompt(message) {
					const assembled = await assembler.assemble();
					if (assembled !== lastSent) {
						await c.setContext({
							systemPrompt: assembled,
						});
						lastSent = assembled;
					}
					yield* c.prompt(message);
				},
			} as MiniACPClient;
		},
	};
}
