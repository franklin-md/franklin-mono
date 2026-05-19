/**
 * Per-handler state carried across assemble() calls.
 *
 * - `content` — resolved string fragment (or undefined when the handler has
 *   never contributed or has cleared its slot). Factories are resolved
 *   before being written here; the slot never holds an unresolved factory.
 * - `cache` — whether this fragment belongs in the cache-stable bucket.
 * - `pinned` — set once a handler calls setPart with `{ once: true }`; the
 *   assembler then skips that handler on subsequent assembles.
 * - `priority` — relative position within this slot's bucket. Higher sorts
 *   earlier; ties preserve registration order. Default `0`.
 * - `runCount` — how many times a content factory has been invoked for
 *   this slot over the life of the session. String setPart calls do not
 *   advance it. Useful for tests and runtime introspection.
 */
export interface Slot {
	content: string | undefined;
	cache: boolean;
	pinned: boolean;
	priority: number;
	runCount: number;
}

export interface SystemPromptAssembler {
	/**
	 * Run every handler against a context tied to its own fragment slot,
	 * resolve any pending content factories, then concatenate the non-empty
	 * fragments, separated by blank lines.
	 *
	 * Slots with `cache: true` are emitted first, then non-cache slots.
	 * Within each bucket, fragments sort by `priority` descending (default
	 * `0`); ties preserve handler registration order. This keeps volatile
	 * fragments (cwd, date, env info) from invalidating the cached prefix
	 * of a later stable fragment, and lets extensions express relative
	 * intent ("persona first", "safety rules last") within a bucket.
	 *
	 * A handler that does not call `setPart` leaves its fragment (and its
	 * cache flag) unchanged from the previous assemble() call. A handler
	 * that calls `setPart('')` clears its fragment.
	 *
	 * Once a handler calls `setPart(content, { once: true })`, its slot is
	 * pinned: the handler is skipped entirely on subsequent assemble() calls
	 * (so expensive setup work runs only once). `once: true` defaults
	 * `cache` to `true` when `cache` is unspecified.
	 */
	assemble(): Promise<string>;
}
