import type { CtxTracker, MiniACPClient } from '@franklin/mini-acp';
import type { ProtocolDecorator } from '../decorator.js';
import type { SystemPromptAssembler } from '../builders/system-prompt.js';

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
 *
 * TODO: once mini-ACP treats `history` as a partial merge
 * (see .context/partial-history-proposal.md), drop the tracker read and
 * send only { history: { systemPrompt: assembled } }.
 */
export function createSystemPromptDecorator(
	assembler: SystemPromptAssembler,
	tracker: CtxTracker,
	basePrompt: string,
): ProtocolDecorator {
	// The tracker decorator seeds the agent with basePrompt at boot, so
	// there's no need to re-send it on the first matching turn.
	let lastSent: string = basePrompt;

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
							history: {
								systemPrompt: assembled,
								messages: tracker.get().history.messages,
							},
						});
						lastSent = assembled;
					}
					yield* c.prompt(message);
				},
			} as MiniACPClient;
		},
	};
}
