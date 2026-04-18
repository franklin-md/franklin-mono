import type { Issue, RestoreResult } from '@franklin/lib';
import { hydrateFailedIssue } from '@franklin/lib';
import {
	SessionCollection,
	type BaseRuntime,
	type Session,
	type SessionState,
} from '@franklin/extensions';
import type { SessionPersistence } from '../../storage/types.js';

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
	constructor(private readonly persister: SessionPersistence<S>) {
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
	): Promise<RestoreResult> {
		const { values, issues } = await this.persister.load();
		const runtimeIssues: Issue[] = [];
		for (const [id, state] of values) {
			try {
				const session = await hydrate(id, state);
				this.set(session.id, session.runtime);
			} catch (err) {
				runtimeIssues.push(hydrateFailedIssue(id, err));
			}
		}
		return { issues: [...issues, ...runtimeIssues] };
	}

	private persist(sessionId: string, runtime: RT): void {
		void runtime.state().then((state) => this.persister.save(sessionId, state));
	}
}
