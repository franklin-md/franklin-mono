import type { Draft } from 'immer';
import { produce } from 'immer';

import type { Store } from './types.js';

/**
 * Immer-backed reactive store. Immutable updates via `set()`,
 * listener notification on change.
 */
export class BaseStore<T> implements Store<T> {
	protected current: T;
	protected listeners = new Set<(value: T) => void>();

	constructor(initial: T) {
		this.current = initial;
	}

	get(): T {
		return this.current;
	}

	set(recipe: (draft: Draft<T>) => void): void {
		const next = produce(this.current, recipe);
		if (Object.is(this.current, next)) return;
		this.current = next;
		for (const listener of this.listeners) {
			listener(this.current);
		}
	}

	subscribe(listener: (value: T) => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}
}
