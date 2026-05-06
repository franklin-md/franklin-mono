import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../create.js';
import { createPersistedStore } from '../persisted.js';

describe('createPersistedStore', () => {
	it('writes on store updates and forwards subscriptions', () => {
		const persist = vi.fn(async (_value: { count: number }) => {});
		const store = createPersistedStore(createStore({ count: 0 }), {
			restore: async () => ({ value: { count: 0 }, issues: [] }),
			persist,
		});
		const listener = vi.fn();
		store.subscribe(listener);

		store.set((value) => {
			value.count = 1;
		});

		expect(listener).toHaveBeenCalledWith({ count: 1 });
		expect(persist).toHaveBeenCalledWith({ count: 1 });
	});

	it('does not persist while restoring state', async () => {
		const persist = vi.fn(async (_value: { count: number }) => {});
		const store = createPersistedStore(createStore({ count: 0 }), {
			restore: async () => ({ value: { count: 2 }, issues: [] }),
			persist,
		});

		await store.restore();

		expect(store.get()).toEqual({ count: 2 });
		expect(persist).not.toHaveBeenCalled();
	});

	it('bubbles issues from adapter restore', async () => {
		const store = createPersistedStore(createStore({ count: 0 }), {
			restore: async () => ({
				value: { count: 0 },
				issues: [
					{
						kind: 'schema-mismatch',
						path: '/tmp/x',
						version: 1,
						error: 'bad',
					},
				],
			}),
			persist: async () => {},
		});

		const result = await store.restore();
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]).toMatchObject({ kind: 'schema-mismatch' });
	});
});
