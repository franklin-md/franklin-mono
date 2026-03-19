import { describe, expect, it, vi } from 'vitest';

import { createPrivateStore } from '../private.js';

describe('createPrivateStore', () => {
	it('returns the initial value via get()', () => {
		const store = createPrivateStore(42);
		expect(store.get()).toBe(42);
	});

	it('updates value with Immer-style mutation', () => {
		const store = createPrivateStore<string[]>([]);
		store.set((draft) => {
			draft.push('hello');
		});
		expect(store.get()).toEqual(['hello']);
	});

	it('notifies subscriber on change', () => {
		const store = createPrivateStore(0);
		const listener = vi.fn();
		store.subscribe(listener);

		store.set(() => 1);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(1);
	});

	it('no-op set does not notify', () => {
		const store = createPrivateStore({ x: 1 });
		const listener = vi.fn();
		store.subscribe(listener);

		store.set(() => {});

		expect(listener).not.toHaveBeenCalled();
	});

	it('copy() returns a different store instance', () => {
		const store = createPrivateStore(0);
		expect(store.copy()).not.toBe(store);
	});

	it('copy snapshots the current value', () => {
		const store = createPrivateStore(0);
		store.set(() => 42);

		const copy = store.copy();

		expect(copy.get()).toBe(42);
	});

	it('original mutations do not propagate to copy', () => {
		const store = createPrivateStore(0);
		const copy = store.copy();

		store.set(() => 99);

		expect(copy.get()).toBe(0);
	});

	it('copy mutations do not propagate to original', () => {
		const store = createPrivateStore(0);
		const copy = store.copy();

		copy.set(() => 99);

		expect(store.get()).toBe(0);
	});

	it('copy does not inherit subscribers', () => {
		const store = createPrivateStore(0);
		const listener = vi.fn();
		store.subscribe(listener);

		const copy = store.copy();
		copy.set(() => 5);

		expect(listener).not.toHaveBeenCalled();
	});

	it('copy of a copy is also independent', () => {
		const store = createPrivateStore(0);
		store.set(() => 10);

		const copy1 = store.copy();
		copy1.set(() => 20);

		const copy2 = copy1.copy();
		copy2.set(() => 30);

		expect(store.get()).toBe(10);
		expect(copy1.get()).toBe(20);
		expect(copy2.get()).toBe(30);
	});

	it('copy with complex nested state is independent', () => {
		const store = createPrivateStore({ items: [{ id: 1, done: false }] });
		const copy = store.copy();

		store.set((draft) => {
			draft.items[0]!.done = true;
		});

		expect(store.get().items[0]!.done).toBe(true);
		expect(copy.get().items[0]!.done).toBe(false);
	});
});
