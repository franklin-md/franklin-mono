import { randomUUID } from 'node:crypto';

export interface ResourceContext {
	create(
		factory: (...args: unknown[]) => Promise<unknown>,
		...args: unknown[]
	): Promise<string>;
	get(id: string): unknown;
	kill(id: string): Promise<void>;
	dispose(): Promise<void>;
}

interface StoredInstance {
	readonly value: unknown;
	readonly dispose: () => Promise<void>;
}

function inferDispose(value: unknown): () => Promise<void> {
	const maybeDisposable = value as {
		dispose?: () => Promise<void> | void;
		close?: () => Promise<void> | void;
	};

	if (typeof maybeDisposable.dispose === 'function') {
		return async () => {
			await maybeDisposable.dispose?.();
		};
	}

	if (typeof maybeDisposable.close === 'function') {
		return async () => {
			await maybeDisposable.close?.();
		};
	}

	return async () => {};
}

export function createResourceContext(): ResourceContext {
	const instances = new Map<string, StoredInstance>();

	return {
		async create(factory, ...args) {
			const id = randomUUID();
			const value = await factory(...args);
			instances.set(id, { value, dispose: inferDispose(value) });
			return id;
		},

		get(id) {
			const entry = instances.get(id);
			if (!entry) {
				throw new Error(`No resource instance for id "${id}"`);
			}
			return entry.value;
		},

		async kill(id) {
			const entry = instances.get(id);
			if (!entry) return;
			instances.delete(id);
			await entry.dispose();
		},

		async dispose() {
			const ids = [...instances.keys()];
			await Promise.allSettled(ids.map((id) => this.kill(id)));
		},
	};
}
