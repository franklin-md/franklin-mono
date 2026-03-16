import { describe, expect, it, vi } from 'vitest';

import { createStore } from '../create.js';
import type { ReadonlyStore, Store } from '../types.js';

describe('createStore', () => {
	it('returns the initial value via get()', () => {
		const store = createStore(42);
		expect(store.get()).toBe(42);
	});

	it('updates value with Immer-style mutation (push to array)', () => {
		const store = createStore<string[]>([]);
		store.set((draft) => {
			draft.push('hello');
		});
		expect(store.get()).toEqual(['hello']);
	});

	it('updates nested objects immutably', () => {
		const store = createStore({ user: { name: 'Alice', age: 30 } });
		const original = store.get();

		store.set((draft) => {
			draft.user.age = 31;
		});

		expect(store.get().user.age).toBe(31);
		expect(store.get()).not.toBe(original);
	});

	it('notifies subscriber on change', () => {
		const store = createStore(0);
		const listener = vi.fn();
		store.subscribe(listener);

		store.set(() => 1);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(1);
	});

	it('notifies multiple subscribers', () => {
		const store = createStore('a');
		const listener1 = vi.fn();
		const listener2 = vi.fn();
		store.subscribe(listener1);
		store.subscribe(listener2);

		store.set(() => 'b');

		expect(listener1).toHaveBeenCalledWith('b');
		expect(listener2).toHaveBeenCalledWith('b');
	});

	it('unsubscribe stops notifications', () => {
		const store = createStore(0);
		const listener = vi.fn();
		const unsub = store.subscribe(listener);

		store.set(() => 1);
		expect(listener).toHaveBeenCalledTimes(1);

		unsub();
		store.set(() => 2);
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('no-op set does not notify', () => {
		const store = createStore({ x: 1 });
		const listener = vi.fn();
		store.subscribe(listener);

		// Immer returns the same object if nothing was mutated
		store.set(() => {});

		expect(listener).not.toHaveBeenCalled();
	});

	it('Store<T> is assignable to ReadonlyStore<T>', () => {
		const store: Store<number> = createStore(0);
		const readonly: ReadonlyStore<number> = store;

		expect(readonly.get()).toBe(0);
		expect(typeof readonly.subscribe).toBe('function');
		// ReadonlyStore should not have set
		expect('set' in readonly).toBe(true); // it's still there at runtime
		// but the type system prevents calling it:
		// readonly.set(() => 1); // would be a type error
	});
});
