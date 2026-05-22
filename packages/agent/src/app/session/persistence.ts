import type { Issue, RestoreResult } from '@franklin/lib';
import { hydrateFailedIssue } from '@franklin/lib';
import type { BaseRuntime } from '@franklin/extensibility';
import type { BaseState } from '../../modules/state/index.js';
import type { RuntimeEvent } from '../../modules/orchestrator/index.js';
import type { SessionPersistence as PersistedSessions } from '../../storage/types.js';

type SessionChangeObserver<Runtime extends BaseRuntime> = (
	runtime: Runtime,
	listener: () => void,
) => () => void;

export type SessionPersistenceController = {
	restore(): Promise<RestoreResult>;
	dispose(): void;
};

export type SessionPersistenceSource<
	Session extends BaseState,
	Runtime extends BaseRuntime,
> = {
	create(input: {
		readonly id: string;
		readonly state: Session;
	}): Promise<unknown>;
	getState(id: string): Promise<Session | undefined>;
	subscribe(listener: (event: RuntimeEvent<Runtime>) => void): () => void;
};

type SessionPersistenceOptions<
	Session extends BaseState,
	Runtime extends BaseRuntime,
> = {
	readonly source: SessionPersistenceSource<Session, Runtime>;
	readonly persistedSessions: PersistedSessions<Session>;
	readonly observeSessionChanges: SessionChangeObserver<Runtime>;
};

export function createSessionPersistence<
	Session extends BaseState,
	Runtime extends BaseRuntime,
>({
	source,
	persistedSessions,
	observeSessionChanges,
}: SessionPersistenceOptions<Session, Runtime>): SessionPersistenceController {
	const runtimeObservers = new Map<string, () => void>();

	function removeRuntimeObserver(sessionId: string): void {
		runtimeObservers.get(sessionId)?.();
		runtimeObservers.delete(sessionId);
	}

	function persist(sessionId: string): void {
		void source.getState(sessionId).then((session) => {
			if (!session) return;
			return persistedSessions.save(sessionId, session);
		});
	}

	function replaceRuntimeObserver(sessionId: string, runtime: Runtime): void {
		removeRuntimeObserver(sessionId);
		const unsubscribe = observeSessionChanges(runtime, () => {
			persist(sessionId);
		});
		runtimeObservers.set(sessionId, unsubscribe);
	}

	const unsubscribeSource = source.subscribe((event) => {
		if (event.action === 'add') {
			persist(event.id);
			replaceRuntimeObserver(event.id, event.runtime);
			return;
		}

		removeRuntimeObserver(event.id);
		void persistedSessions.delete(event.id);
	});

	return {
		async restore() {
			const { values, issues } = await persistedSessions.load();
			const runtimeIssues: Issue[] = [];
			for (const [id, session] of values) {
				try {
					await source.create({ id, state: session });
				} catch (err) {
					runtimeIssues.push(hydrateFailedIssue(id, err));
				}
			}
			return { issues: [...issues, ...runtimeIssues] };
		},

		dispose() {
			unsubscribeSource();
			for (const unsubscribe of runtimeObservers.values()) {
				unsubscribe();
			}
			runtimeObservers.clear();
		},
	};
}
