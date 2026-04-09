import type { Persister } from '@franklin/lib';
import {
	SessionCollection,
	type RuntimeBase,
	type SessionState,
} from '@franklin/extensions';

/**
 * PersistedSessionCollection = SessionCollection + Persistence.
 *
 * Extends the in-memory collection so that every `set` automatically
 * starts persistence (initial snapshot + change watching) and every
 * `remove` cleans up the persisted data.
 *
 * The tree operates on the registry as if it were a plain collection —
 * persistence is a transparent side-effect.
 */
// TODO: rename file to persisted-session-collection.ts
export class PersistedSessionCollection<
	S extends SessionState,
	RT extends RuntimeBase<S>,
> extends SessionCollection<RT> {
	private readonly unsubs = new Map<string, () => void>();

	constructor(private readonly persister: Persister<S>) {
		super();
	}

	override set(id: string, runtime: RT): void {
		this.unsubs.get(id)?.();
		this.unsubs.delete(id);
		super.set(id, runtime);
		this.watch(id, runtime);
		this.persistRuntime(id, runtime);
	}

	override async remove(id: string): Promise<boolean> {
		this.unsubs.get(id)?.();
		this.unsubs.delete(id);
		void this.persister.delete(id);
		return super.remove(id);
	}

	/**
	 * Hydrate the registry from persisted storage.
	 *
	 * Requires a `hydrate` callback that rebuilds a live runtime
	 * from state. The callback should call `tree.add(state, id)`
	 * which will in turn call `registry.set` — triggering persistence
	 * watching automatically.
	 *
	 * No-op when no persister is configured.
	 */
	async restore(hydrate: (state: S) => Promise<RT>): Promise<void> {
		const data = await this.persister.load();
		for (const [_id, state] of data) {
			await hydrate(state);
		}
	}

	private persistRuntime(sessionId: string, runtime: RT): void {
		void runtime.state().then((state) => this.persister.save(sessionId, state));
	}

	/**
	 * Subscribe to a session's runtime changes and re-persist the
	 * full session snapshot whenever state settles (turn end, config change).
	 */
	private watch(sessionId: string, runtime: RT): void {
		const unsub = runtime.subscribe(() => {
			this.persistRuntime(sessionId, runtime);
		});
		this.unsubs.set(sessionId, unsub);
	}
}
