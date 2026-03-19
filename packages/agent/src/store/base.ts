import type { Draft } from 'immer';
import { produce } from 'immer';

import type { Store } from './types.js';

/**
 * Base store implementation with Immer-style immutable updates.
 * Subclasses define `copy()` to control sharing semantics.
 */
export abstract class BaseStore<T> implements Store<T> {
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

	abstract copy(): Store<T>;
}
