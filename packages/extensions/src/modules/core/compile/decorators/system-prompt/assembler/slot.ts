import type {
	SetPartOptions,
	SystemPromptContent,
} from '../../../../api/system-prompt.js';
import type { Slot } from './types.js';

export function createSlot(): Slot {
	return {
		content: undefined,
		cache: false,
		pinned: false,
		priority: 0,
		runCount: 0,
	};
}

/**
 * Apply the options half of a `setPart(content, opts)` call (cache-bucket
 * membership + pinning + priority). Synchronous; runs inside the handler's
 * `setPart` closure. Content resolution is deferred to
 * {@link resolveSlotContent} so that async factories can be awaited after
 * the handler returns.
 *
 * `cache` and `priority` are re-declared on every call (they reset to
 * their defaults when omitted), consistent with the per-call options-bag
 * model. `pinned` is sticky once set.
 */
export function applySetPart(
	slot: Slot,
	opts: SetPartOptions | undefined,
): void {
	const once = opts?.once === true;
	slot.cache = opts?.cache ?? once;
	slot.priority = opts?.priority ?? 0;
	if (once) slot.pinned = true;
}

/**
 * Resolve pending setPart content into the slot. Strings are written
 * directly; factories are invoked (awaited if they return a Promise) and
 * their result is stored. Factory invocations advance `runCount`.
 */
export async function resolveSlotContent(
	slot: Slot,
	content: SystemPromptContent,
): Promise<void> {
	if (typeof content === 'function') {
		slot.content = await content();
		slot.runCount += 1;
	} else {
		slot.content = content;
	}
}
