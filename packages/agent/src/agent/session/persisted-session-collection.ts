import type { Persister } from '@franklin/lib';
import {
	SessionCollection,
	type BaseRuntime,
	type Session,
	type SessionState,
} from '@franklin/extensions';

/**
 * PersistedSessionCollection = SessionCollection + Persistence.
 *
 * Subscribes to collection events so that every `set` automatically
 * starts persistence (initial snapshot + change watching) and every
 * `remove` cleans up the persisted data.
 *
 * The tree operates on the collection as if it were a plain collection —
 * persistence is a transparent side-effect.
 */
export class PersistedSessionCollection<
	S extends SessionState,
	RT extends BaseRuntime<S>,
> extends SessionCollection<RT> {
	constructor(private readonly persister: Persister<S>) {
		super();
		this.subscribe((event) => {
			if (event.action === 'add') {
				this.persist(event.id, event.runtime);
				// TODO: unsub is leaked — relies on runtime.dispose() to clean up subscribers
				event.runtime.subscribe(() => this.persist(event.id, event.runtime));
			} else {
				void this.persister.delete(event.id);
			}
		});
	}

	async restore(
		hydrate: (id: string, state: S) => Promise<Session<RT>>,
	): Promise<void> {
		const data = await this.persister.load();
		for (const [id, state] of data) {
			const session = await hydrate(id, state);
			this.set(session.id, session.runtime);
		}
	}

	private persist(sessionId: string, runtime: RT): void {
		void runtime.state().then((state) => this.persister.save(sessionId, state));
	}
}
