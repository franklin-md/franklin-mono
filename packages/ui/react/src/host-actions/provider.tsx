import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { HostActionHandler } from './action.js';
import type { HostActionBinding } from './binding.js';

export type HostActionRegistry = ReadonlyMap<string, HostActionHandler>;

export type HostActionProviderProps = {
	children: ReactNode;
	bindings: readonly HostActionBinding[];
};

export const HostActionContext = createContext<HostActionRegistry | null>(null);

export function HostActionProvider({
	bindings,
	children,
}: HostActionProviderProps) {
	const parentRegistry = useContext(HostActionContext);
	const registry = useMemo(() => {
		const next = new Map(parentRegistry);
		for (const { action, handler } of bindings) {
			next.set(action.id, handler);
		}
		return next as HostActionRegistry;
	}, [bindings, parentRegistry]);

	return (
		<HostActionContext.Provider value={registry}>
			{children}
		</HostActionContext.Provider>
	);
}
