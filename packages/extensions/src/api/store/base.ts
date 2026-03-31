import type { Producer } from 'immer';
import { produce } from 'immer';

import type { Store } from './types.js';

/**
 * Immer-backed reactive store. Immutable updates via `set()`,
 * listener notification on change.
 */
export class BaseStore<T> implements Store<T> {
	protected current?: T;
	protected listeners = new Set<(value: T) => void>();

	constructor(initial?: T) {
		this.current = initial;
	}

	get(): T {
		if (this.current === undefined) throw new Error('Store is not initialized');
		return this.current;
	}

	set(recipe: Producer<T>): void {
		const next = produce<T>(this.current as T, recipe);
		// Undefined Case
		if (next === undefined) {
			throw new Error('Store cannot be set to undefined');
		}
		// No Changes Case
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

	setInitial(value: T): void {
		if (this.current !== undefined) return;
		this.current = value;
		for (const listener of this.listeners) {
			listener(value);
		}
	}

	isInitialized(): boolean {
		return this.current !== undefined;
	}
}
