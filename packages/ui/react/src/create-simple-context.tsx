import { createContext, useContext, type ReactNode } from 'react';

/**
 * Factory for simple React contexts that hold a non-null value and throw
 * when consumed outside their provider.
 *
 * Returns a `[Provider, useValue]` tuple.
 *
 * @example
 * ```ts
 * const [AgentProvider, useAgent] = createSimpleContext<Agent>('Agent');
 * ```
 */
export function createSimpleContext<T>(
	name: string,
): [
	Provider: (props: { value: T; children: ReactNode }) => ReactNode,
	useValue: () => T,
] {
	const Context = createContext<T | null>(null);

	function Provider({ value, children }: { value: T; children: ReactNode }) {
		return <Context.Provider value={value}>{children}</Context.Provider>;
	}
	Provider.displayName = `${name}Provider`;

	function useValue(): T {
		const value = useContext(Context);
		if (value === null) {
			throw new Error(`use${name} must be used inside a <${name}Provider>`);
		}
		return value;
	}

	return [Provider, useValue];
}
