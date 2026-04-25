import type { MaybePromise } from '../../../algebra/types/shared.js';

/**
 * Value accepted by {@link SystemPrompt.setPart} — either a string fragment
 * or a zero-arg factory that produces one (optionally asynchronously).
 * Factories are invoked by the assembler after the handler returns; paired
 * with `{ once: true }` they run exactly once per session, allowing async
 * setup work (filesystem reads, process spawns) to live inside the factory
 * while the handler body stays a simple registration call.
 */
export type SystemPromptContent = string | (() => MaybePromise<string>);

export interface SetPartOptions {
	/**
	 * Place this fragment in the cache-stable bucket. All `cache: true`
	 * fragments are emitted before non-cache fragments, so a volatile
	 * fragment (cwd, date, env info) registered earlier does not
	 * invalidate the cached prefix of a later stable fragment.
	 *
	 * Defaults to `true` when `once` is `true` (once-fragments are
	 * inherently cache-stable), `false` otherwise.
	 */
	cache?: boolean;

	/**
	 * Pin this fragment for the life of the session. The first call fixes
	 * the slot's content and cache bucket; the handler is then skipped
	 * entirely on subsequent assembles, so expensive setup work runs only
	 * once. Declares the intent "run once per session" so the assembler
	 * can distinguish it from "handler happened not to write this turn".
	 */
	once?: boolean;
}

export interface SystemPrompt {
	/**
	 * Set (or replace) this handler's fragment of the system prompt.
	 *
	 * Each handler owns a single fragment slot, identified by its
	 * registration. Calling `setPart` redefines that slot's contents;
	 * not calling it leaves the prior fragment untouched.
	 */
	setPart(content: SystemPromptContent, opts?: SetPartOptions): void;
}
