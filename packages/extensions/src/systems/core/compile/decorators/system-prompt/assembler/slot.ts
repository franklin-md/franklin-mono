import type {
	SetPartOptions,
	SystemPromptContent,
} from '../../../../api/system-prompt.js';
import type { Slot } from './types.js';

export function createSlot(): Slot {
	return {
		content: undefined,
		factory: undefined,
		cache: false,
		pinned: false,
	};
}

/**
 * Apply a `setPart(content, opts)` call to a slot. Synchronous — factories
 * are stored raw and resolved in a later pass. Mutates:
 *
 * - `slot.content` / `slot.factory` — exactly one is populated; the other
 *   is cleared, so a later call with the opposite variant supersedes the
 *   earlier one.
 * - `slot.cache` — cache-bucket membership (defaults to `opts.once`).
 * - `slot.pinned` — set to `true` when `opts.once` is `true`.
 */
export function applySetPart(
	slot: Slot,
	content: SystemPromptContent,
	opts: SetPartOptions | undefined,
): void {
	const once = opts?.once === true;
	if (typeof content === 'function') {
		slot.factory = content;
		slot.content = undefined;
	} else {
		slot.factory = undefined;
		slot.content = content;
	}
	slot.cache = opts?.cache ?? once;
	if (once) slot.pinned = true;
}

/**
 * Resolve a slot's pending factory, if any, into its `content`. Clearing
 * the factory after resolution keeps `{ once: true }` semantics honest:
 * the pinned handler won't run again, so the factory stays cleared and
 * the resolved content sticks.
 */
export async function resolveSlot(slot: Slot): Promise<void> {
	if (slot.factory === undefined) return;
	slot.content = await slot.factory();
	slot.factory = undefined;
}
