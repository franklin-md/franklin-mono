import type { SystemPromptHandler } from '../../../../api/handlers.js';
import type { SystemPrompt } from '../../../../api/system-prompt.js';
import { order } from './order.js';
import { applySetPart, createSlot, resolveSlot } from './slot.js';
import type { Slot, SystemPromptAssembler } from './types.js';

export function buildSystemPromptAssembler(
	handlers: SystemPromptHandler[],
): SystemPromptAssembler {
	const slots: Slot[] = handlers.map(() => createSlot());

	return {
		async assemble() {
			for (let i = 0; i < handlers.length; i++) {
				const slot = slots[i] as Slot;
				// Pinned slots skip the handler entirely — the fragment is
				// fixed and the handler need not recompute it.
				if (slot.pinned) continue;
				const handler = handlers[i] as SystemPromptHandler;
				const systemPrompt: SystemPrompt = {
					setPart(content, opts) {
						applySetPart(slot, content, opts);
					},
				};
				await handler(systemPrompt);
			}
			for (const slot of slots) {
				await resolveSlot(slot);
			}
			return order(slots).join('\n\n');
		},
	};
}
