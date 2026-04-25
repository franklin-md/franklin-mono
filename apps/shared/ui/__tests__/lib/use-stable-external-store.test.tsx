// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useStableExternalStore } from '../../src/lib/use-stable-external-store.js';

type Snapshot = {
	provider: {
		oauth?: {
			token: string;
		};
	};
};

function createStore(initial: Snapshot) {
	let value = initial;
	const listeners = new Set<() => void>();

	return {
		getSnapshot() {
			return {
				provider: {
					...value.provider,
					oauth: value.provider.oauth ? { ...value.provider.oauth } : undefined,
				},
			};
		},
		set(next: Snapshot) {
			value = next;
			for (const listener of listeners) {
				listener();
			}
		},
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

describe('useStableExternalStore', () => {
	it('keeps the previous snapshot identity when the next snapshot is value-equal', () => {
		const store = createStore({ provider: { oauth: { token: 'one' } } });
		const { result } = renderHook(() =>
			useStableExternalStore(
				(listener) => store.subscribe(listener),
				() => store.getSnapshot(),
			),
		);
		const firstSnapshot = result.current;

		act(() => {
			store.set({ provider: { oauth: { token: 'one' } } });
		});

		expect(result.current).toBe(firstSnapshot);
	});

	it('returns a new snapshot when the next snapshot differs by value', () => {
		const store = createStore({ provider: { oauth: { token: 'one' } } });
		const { result } = renderHook(() =>
			useStableExternalStore(
				(listener) => store.subscribe(listener),
				() => store.getSnapshot(),
			),
		);
		const firstSnapshot = result.current;

		act(() => {
			store.set({ provider: { oauth: { token: 'two' } } });
		});

		expect(result.current).not.toBe(firstSnapshot);
		expect(result.current).toEqual({
			provider: { oauth: { token: 'two' } },
		});
	});
});
