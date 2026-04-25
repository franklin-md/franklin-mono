import type { SystemPromptHandler } from '../../../../api/handlers.js';
import type {
	SystemPrompt,
	SystemPromptContent,
} from '../../../../api/system-prompt.js';
import { order } from './order.js';
import { applySetPart, createSlot, resolveSlotContent } from './slot.js';
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
				// `pending` is a per-handler local, not slot state — any
				// content factory lives only within this iteration.
				let pending: SystemPromptContent | undefined;
				const systemPrompt: SystemPrompt = {
					setPart(content, opts) {
						pending = content;
						applySetPart(slot, opts);
					},
				};
				await handler(systemPrompt);
				if (pending !== undefined) {
					await resolveSlotContent(slot, pending);
				}
			}
			return order(slots).join('\n\n');
		},
	};
}
