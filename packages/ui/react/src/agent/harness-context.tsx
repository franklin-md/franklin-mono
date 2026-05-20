import { createContext, useContext, type ReactNode } from 'react';

import type { FranklinApp } from '@franklin/agent';

export type Harness = FranklinApp;

const HarnessContext = createContext<Harness | null>(null);

export type HarnessProviderProps = {
	harness: Harness;
	children: ReactNode;
};

export function HarnessProvider({ harness, children }: HarnessProviderProps) {
	return (
		<HarnessContext.Provider value={harness}>
			{children}
		</HarnessContext.Provider>
	);
}

export function useHarness(): Harness {
	const harness = useContext(HarnessContext);
	if (!harness) {
		throw new Error('useHarness must be used inside a <HarnessProvider>');
	}
	return harness;
}
