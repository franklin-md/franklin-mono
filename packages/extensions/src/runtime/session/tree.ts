import type { SessionCollection } from './collection.js';
import type { Extension } from '../../types/extension.js';
import type { RuntimeBase } from '../types.js';
import type { SessionState } from '../../state/session.js';
import type {
	RuntimeSystem,
	SessionSpawn,
} from '../../runtime-system/types.js';
import { createRuntime } from '../../runtime-system/create.js';
import type { SessionRuntime } from './runtime.js';
import type { Session } from './types.js';
import type { DeepPartial } from '@franklin/lib';
import { resolveState } from '../../runtime-system/resolve.js';

export type SessionTreeOptions<
	S extends Record<string, unknown>,
	RT extends RuntimeBase<S>,
> = {
	collection: SessionCollection<RT>;
	emptyState: () => S;
	spawn: SessionSpawn<S, RT>;
};

export class SessionTree<
	S extends Record<string, unknown>,
	RT extends RuntimeBase<S>,
> {
	private readonly collection: SessionCollection<RT>;
	private readonly _emptyState: () => S;
	private readonly spawnFn: SessionSpawn<S, RT>;

	constructor(options: SessionTreeOptions<S, RT>) {
		this.collection = options.collection;
		this._emptyState = options.emptyState;
		this.spawnFn = options.spawn;
	}

	emptyState(): S {
		return this._emptyState();
	}

	get(sessionId: string): Session<RT> | undefined {
		return this.collection.get(sessionId);
	}

	private async add(state: S): Promise<RT> {
		const id = crypto.randomUUID();
		const runtime = await this.spawnFn(state);
		this.collection.set(id, runtime);
		return runtime;
	}

	// TODO: Child and fork should support overrides
	async create(overrides?: DeepPartial<S>): Promise<RT> {
		const state = resolveState(this._emptyState(), overrides);
		return this.add(state);
	}

	async child(parentId: string): Promise<RT> {
		const parent = this.collection.get(parentId);
		if (!parent) {
			throw new Error(`Parent session ${parentId} not found`);
		}
		const childState = await parent.runtime.child();
		return this.add(childState);
	}

	async fork(sessionId: string): Promise<RT> {
		const existing = this.collection.get(sessionId);
		if (!existing) {
			throw new Error(`Session ${sessionId} not found`);
		}
		const forkState = await existing.runtime.fork();
		return this.add(forkState);
	}

	async remove(sessionId: string): Promise<void> {
		await this.collection.remove(sessionId);
	}

	list(): Session<RT>[] {
		return this.collection.list();
	}

	subscribe(listener: () => void): () => void {
		return this.collection.subscribe(listener);
	}
}

/**
 * Create a SessionTree for the extensions layer where state includes SessionState.
 * Uses `state.session.sessionId` as the ID extractor.
 */
export function createSessionTree<
	S extends SessionState,
	API,
	RT extends RuntimeBase<S> & SessionRuntime,
>(
	collection: SessionCollection<RT>,
	system: RuntimeSystem<S, API, RT>,
	extensions: Extension<API>[],
): SessionTree<S, RT> {
	return new SessionTree({
		collection,
		emptyState: () => system.emptyState(),
		spawn: (state) => createRuntime(system, state, extensions),
	});
}
