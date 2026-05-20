import type { Issue, RestoreResult } from '@franklin/lib';
import { hydrateFailedIssue } from '@franklin/lib';
import type { BaseRuntime } from '@franklin/extensibility';
import type { BaseState } from '../modules/state/index.js';
import type {
	RuntimeCollection,
	RuntimeEntry,
} from '../modules/orchestrator/index.js';
import type { SessionPersistence as PersistedSessions } from '../storage/types.js';

export type SessionChangeObserver<Runtime extends BaseRuntime> = (
	runtime: Runtime,
	listener: () => void,
) => () => void;

export type SessionPersistenceController<
	Session extends BaseState,
	Runtime extends BaseRuntime,
> = {
	restore(
		hydrate: (id: string, session: Session) => Promise<RuntimeEntry<Runtime>>,
	): Promise<RestoreResult>;
	dispose(): void;
};

type SessionPersistenceOptions<
	Session extends BaseState,
	Runtime extends BaseRuntime,
> = {
	readonly collection: RuntimeCollection<Runtime>;
	readonly persistedSessions: PersistedSessions<Session>;
	readonly getSession: (runtime: Runtime) => Promise<Session>;
	readonly observeSessionChanges: SessionChangeObserver<Runtime>;
};

export function createSessionPersistence<
	Session extends BaseState,
	Runtime extends BaseRuntime,
>({
	collection,
	persistedSessions,
	getSession,
	observeSessionChanges,
}: SessionPersistenceOptions<Session, Runtime>): SessionPersistenceController<
	Session,
	Runtime
> {
	const runtimeObservers = new Map<string, () => void>();

	function removeRuntimeObserver(sessionId: string): void {
		runtimeObservers.get(sessionId)?.();
		runtimeObservers.delete(sessionId);
	}

	function persist(sessionId: string, runtime: Runtime): void {
		void getSession(runtime).then((session) =>
			persistedSessions.save(sessionId, session),
		);
	}

	function replaceRuntimeObserver(sessionId: string, runtime: Runtime): void {
		removeRuntimeObserver(sessionId);
		const unsubscribe = observeSessionChanges(runtime, () => {
			persist(sessionId, runtime);
		});
		runtimeObservers.set(sessionId, unsubscribe);
	}

	const unsubscribeCollection = collection.subscribe((event) => {
		if (event.action === 'add') {
			persist(event.id, event.runtime);
			replaceRuntimeObserver(event.id, event.runtime);
			return;
		}

		removeRuntimeObserver(event.id);
		void persistedSessions.delete(event.id);
	});

	return {
		async restore(hydrate) {
			const { values, issues } = await persistedSessions.load();
			const runtimeIssues: Issue[] = [];
			for (const [id, session] of values) {
				try {
					await hydrate(id, session);
				} catch (err) {
					runtimeIssues.push(hydrateFailedIssue(id, err));
				}
			}
			return { issues: [...issues, ...runtimeIssues] };
		},

		dispose() {
			unsubscribeCollection();
			for (const unsubscribe of runtimeObservers.values()) {
				unsubscribe();
			}
			runtimeObservers.clear();
		},
	};
}
