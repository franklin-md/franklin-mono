import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import { createSimpleContext } from '../utils/create-simple-context.js';

describe('createSimpleContext', () => {
	it('provides and consumes a value', () => {
		const [Provider, useValue] = createSimpleContext<number>('Test');

		const { result } = renderHook(() => useValue(), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<Provider value={42}>{children}</Provider>
			),
		});

		expect(result.current).toBe(42);
	});

	it('throws when used outside the provider', () => {
		const [, useValue] = createSimpleContext<string>('Missing');

		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(() => renderHook(() => useValue())).toThrow(
			'useMissing must be used inside a <MissingProvider>',
		);

		spy.mockRestore();
	});

	it('provides different values to different providers', () => {
		const [Provider, useValue] = createSimpleContext<string>('Name');

		const { result: alice } = renderHook(() => useValue(), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<Provider value="Alice">{children}</Provider>
			),
		});
		expect(alice.current).toBe('Alice');

		const { result: bob } = renderHook(() => useValue(), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<Provider value="Bob">{children}</Provider>
			),
		});
		expect(bob.current).toBe('Bob');
	});

	it('works with complex object values', () => {
		interface Ctx {
			count: number;
			label: string;
		}
		const [Provider, useValue] = createSimpleContext<Ctx>('Complex');

		const value = { count: 5, label: 'test' };
		const { result } = renderHook(() => useValue(), {
			wrapper: ({ children }: { children: ReactNode }) => (
				<Provider value={value}>{children}</Provider>
			),
		});

		expect(result.current).toEqual({ count: 5, label: 'test' });
	});
});
