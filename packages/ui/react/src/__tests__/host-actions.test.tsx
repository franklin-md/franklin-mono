// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
	createHostAction,
	bindHostAction,
	HostActionProvider,
	openExternalAction,
	useHostAction,
	useOpenExternal,
} from '../host-actions/index.js';

const greetAction = createHostAction<'test.greet', (name: string) => string>(
	'test.greet',
);
const refreshAction = createHostAction<'test.refresh', () => Promise<void>>(
	'test.refresh',
);

function createWrapper(
	bindings: React.ComponentProps<typeof HostActionProvider>['bindings'],
) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<HostActionProvider bindings={bindings}>{children}</HostActionProvider>
		);
	};
}

describe('host actions', () => {
	it('provides handlers by typed action token', () => {
		const greet = vi.fn((name: string) => `hello ${name}`);

		const { result } = renderHook(() => useHostAction(greetAction), {
			wrapper: createWrapper([bindHostAction(greetAction, greet)]),
		});

		expect(result.current('Ada')).toBe('hello Ada');
		expect(greet).toHaveBeenCalledWith('Ada');
	});

	it('infers handler arguments from action bindings', () => {
		const binding = bindHostAction(greetAction, (name) => name.toUpperCase());

		expect(binding.handler('ada')).toBe('ADA');
	});

	it('inherits actions from parent providers', () => {
		const greet = vi.fn((name: string) => `hello ${name}`);
		const refresh = vi.fn(async () => {});

		const { result } = renderHook(
			() => ({
				greet: useHostAction(greetAction),
				refresh: useHostAction(refreshAction),
			}),
			{
				wrapper({ children }) {
					return (
						<HostActionProvider bindings={[bindHostAction(greetAction, greet)]}>
							<HostActionProvider
								bindings={[bindHostAction(refreshAction, refresh)]}
							>
								{children}
							</HostActionProvider>
						</HostActionProvider>
					);
				},
			},
		);

		expect(result.current.greet('Ada')).toBe('hello Ada');
		void result.current.refresh();
		expect(greet).toHaveBeenCalledWith('Ada');
		expect(refresh).toHaveBeenCalledOnce();
	});

	it('throws for required actions without a provider', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(() => renderHook(() => useHostAction(refreshAction))).toThrow(
			'useHostAction must be used inside a <HostActionProvider>',
		);

		spy.mockRestore();
	});

	it('throws for required actions missing from the provider', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(() =>
			renderHook(() => useHostAction(refreshAction), {
				wrapper: createWrapper([]),
			}),
		).toThrow('No host action handler registered for "test.refresh"');

		spy.mockRestore();
	});

	it('provides the built-in openExternal action', () => {
		const openExternal = vi.fn();

		const { result } = renderHook(() => useOpenExternal(), {
			wrapper: createWrapper([
				bindHostAction(openExternalAction, openExternal),
			]),
		});

		void result.current('https://example.com');

		expect(openExternal).toHaveBeenCalledWith('https://example.com');
	});
});
