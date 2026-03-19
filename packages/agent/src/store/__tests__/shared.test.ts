import { describe, expect, it, vi } from 'vitest';

import { createSharedStore } from '../shared.js';

describe('createSharedStore', () => {
	it('returns the initial value via get()', () => {
		const store = createSharedStore(42);
		expect(store.get()).toBe(42);
	});

	it('updates value with Immer-style mutation', () => {
		const store = createSharedStore<string[]>([]);
		store.set((draft) => {
			draft.push('hello');
		});
		expect(store.get()).toEqual(['hello']);
	});

	it('notifies subscriber on change', () => {
		const store = createSharedStore(0);
		const listener = vi.fn();
		store.subscribe(listener);

		store.set(() => 1);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(1);
	});

	it('no-op set does not notify', () => {
		const store = createSharedStore({ x: 1 });
		const listener = vi.fn();
		store.subscribe(listener);

		store.set(() => {});

		expect(listener).not.toHaveBeenCalled();
	});

	it('copy() returns the same store instance', () => {
		const store = createSharedStore(0);
		expect(store.copy()).toBe(store);
	});

	it('copy() is idempotent', () => {
		const store = createSharedStore(0);
		expect(store.copy().copy().copy()).toBe(store);
	});

	it('mutations on original are visible through copy', () => {
		const store = createSharedStore(0);
		const copy = store.copy();

		store.set(() => 42);

		expect(copy.get()).toBe(42);
	});

	it('mutations on copy are visible through original', () => {
		const store = createSharedStore(0);
		const copy = store.copy();

		copy.set(() => 99);

		expect(store.get()).toBe(99);
	});

	it('subscribers on original fire for mutations via copy', () => {
		const store = createSharedStore(0);
		const listener = vi.fn();
		store.subscribe(listener);

		store.copy().set(() => 7);

		expect(listener).toHaveBeenCalledWith(7);
	});
});
