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
	private _initialized: boolean;

	constructor(initial?: T) {
		this._initialized = arguments.length > 0;
		this.current = initial;
	}

	get(): T {
		if (!this._initialized) throw new Error('Store is not initialized');
		return this.current as T;
	}

	set(recipe: Producer<T>): void {
		const next = produce(this.current as T, recipe);
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
		if (this._initialized) return;
		this._initialized = true;
		this.current = value;
		for (const listener of this.listeners) {
			listener(value);
		}
	}

	isInitialized(): boolean {
		return this._initialized;
	}
}
