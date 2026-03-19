import type { AgentCommands } from '../types.js';
import type { Store } from '../store/types.js';
import type { Extension } from '../extensions/types/extension.js';

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

/** An extension that exposes mutable state. */
type StatefulExt = Extension<any> & { state: Store<any> };

/** Extract the literal `name` from an extension. */
type NameOf<E> = E extends { readonly name: infer N extends string }
	? N
	: never;

/** Extract the state type `T` from an extension's `Store<T>`. */
type StateOf<E> = E extends { state: Store<infer T> } ? T : never;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Maps a tuple of extensions to `{ [name]: Store<state> }`.
 *
 * Only stateful extensions (those with a `state: Store<T>`) produce a key.
 * Requires concrete classes with `readonly name = 'literal'` so
 * TypeScript can infer the string-literal key.
 */
export type ExtensionStores<E extends readonly Extension<any>[]> = {
	[K in Extract<E[number], StatefulExt> as NameOf<K>]: Store<StateOf<K>>;
};

/**
 * A typed agent handle that unifies commands, extension stores,
 * and lifecycle into a single object.
 *
 * - Commands (`prompt`, `cancel`, …) live at the top level.
 * - Each stateful extension's `Store<T>` is accessible at `agent.<name>`.
 * - Lifecycle methods (`dispose`, `signal`, `closed`) manage the connection.
 */

/*
 TODO: I dont think this should be AgentCommands. It should likely not have:
 a) The session commands like new, load or fork (as those commands should actually give you this Agent). It also means the Agent is session-aware (it knows it session-id)

*/
export type Agent<E extends readonly Extension<any>[]> = AgentCommands &
	ExtensionStores<E> & {
		dispose: () => Promise<void>;
		signal: AbortSignal;
		closed: Promise<void>;
	};
