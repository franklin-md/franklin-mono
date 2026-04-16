import type { Producer } from 'immer';
import type { Store } from './types.js';

export interface PersistedStore<T> extends Store<T> {
	restore(): Promise<void>;
	persist(): Promise<void>;
}

export type PersistedStoreAdapter<T> = {
	restore(): Promise<T>;
	persist(value: T): Promise<void>;
	isEqual?: (left: T, right: T) => boolean;
};

class BasePersistedStore<T> implements PersistedStore<T> {
	private isRestoring = false;

	constructor(
		private readonly store: Store<T>,
		private readonly adapter: PersistedStoreAdapter<T>,
	) {
		this.store.subscribe(() => {
			if (this.isRestoring) return;
			void this.persist();
		});
	}

	get(): T {
		return this.store.get();
	}

	set(recipe: Producer<T>): void {
		this.store.set(recipe);
	}

	subscribe(listener: (value: T) => void): () => void {
		return this.store.subscribe(listener);
	}

	async restore(): Promise<void> {
		const next = await this.adapter.restore();
		const isEqual = this.adapter.isEqual ?? Object.is;
		if (isEqual(this.store.get(), next)) return;

		this.isRestoring = true;
		try {
			this.store.set((() => next) as Producer<T>);
		} finally {
			this.isRestoring = false;
		}
	}

	async persist(): Promise<void> {
		await this.adapter.persist(this.store.get());
	}
}

export function createPersistedStore<T>(
	store: Store<T>,
	adapter: PersistedStoreAdapter<T>,
): PersistedStore<T> {
	return new BasePersistedStore(store, adapter);
}
