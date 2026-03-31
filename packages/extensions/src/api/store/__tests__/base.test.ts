import { describe, expect, it } from 'vitest';
import { BaseStore } from '../base.js';

describe('BaseStore', () => {
	describe('uninitialized', () => {
		it('get() throws when store has no initial value', () => {
			const store = new BaseStore<number>();
			expect(() => store.get()).toThrow('Store is not initialized');
		});

		it('set() on uninitialized store initializes it', () => {
			const store = new BaseStore<number>();
			store.set(() => 42);
			expect(store.get()).toBe(42);
		});
	});

	describe('falsy initial values', () => {
		it('get() works with initial value 0', () => {
			const store = new BaseStore(0);
			expect(store.get()).toBe(0);
		});

		it('get() works with initial value empty string', () => {
			const store = new BaseStore('');
			expect(store.get()).toBe('');
		});

		it('get() works with initial value false', () => {
			const store = new BaseStore(false);
			expect(store.get()).toBe(false);
		});
	});

	describe('setInitial()', () => {
		it('initializes an uninitialized store', () => {
			const store = new BaseStore<number>();
			store.setInitial(42);
			expect(store.get()).toBe(42);
		});

		it('no-op when store is already initialized', () => {
			const store = new BaseStore(99);
			store.setInitial(0);
			expect(store.get()).toBe(99);
		});

		it('notifies listeners when initializing', () => {
			const store = new BaseStore<number>();
			const values: number[] = [];
			store.subscribe((v) => values.push(v));
			store.setInitial(42);
			expect(values).toEqual([42]);
		});
	});

	describe('set()', () => {
		it('replacement producer replaces root value', () => {
			const store = new BaseStore('original');
			store.set(() => 'replaced');
			expect(store.get()).toBe('replaced');
		});

		it('no-op when producer makes no changes', () => {
			const store = new BaseStore(1);
			const values: number[] = [];
			store.subscribe((v) => values.push(v));
			store.set(() => {});
			expect(store.get()).toBe(1);
			expect(values).toEqual([]);
		});
	});
});
