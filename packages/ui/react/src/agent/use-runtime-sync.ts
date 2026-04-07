import { useCallback, useEffect, useRef, useState } from 'react';

import type { FranklinRuntime } from '@franklin/agent/browser';

import { useAgent } from './agent-context.js';

// ---------------------------------------------------------------------------
// useRuntimeSync
// ---------------------------------------------------------------------------

export type UseRuntimeSync<T> = {
	readonly value: T;
	readonly set: (next: T) => Promise<void>;
};

/**
 * Generic hook that syncs a value derived from the agent runtime.
 *
 * - `extract` reads the current value from the runtime (async).
 * - `apply` writes a new value to the runtime (async).
 * - `initial` is the value used before the first extract resolves.
 *
 * Subscribes to runtime notifications and re-extracts on every change.
 *
 * `set` performs an optimistic local update and returns the `apply` promise.
 * Callers that don't await get optimistic behavior; awaiting confirms the
 * write reached the runtime.
 */
export function useRuntimeSync<T>(opts: {
	extract: (runtime: FranklinRuntime) => Promise<T>;
	apply: (runtime: FranklinRuntime, value: T) => Promise<void>;
	initial: T;
}): UseRuntimeSync<T> {
	const runtime = useAgent();
	const [value, setValue] = useState(opts.initial);

	// Keep opts in a ref so the effect doesn't re-run when closures change.
	const optsRef = useRef(opts);
	optsRef.current = opts;

	useEffect(() => {
		let active = true;

		const sync = async () => {
			try {
				const extracted = await optsRef.current.extract(runtime);
				if (active) setValue(extracted);
			} catch {
				// Keep current value on failure.
			}
		};

		void sync();
		const unsub = runtime.subscribe(() => void sync());

		return () => {
			active = false;
			unsub();
		};
	}, [runtime]);

	const set = useCallback(
		(next: T): Promise<void> => {
			setValue(next);
			return optsRef.current.apply(runtime, next);
		},
		[runtime],
	);

	return { value, set };
}
