import type { ReactNode } from 'react';

import {
	HarnessProvider,
	HostActionProvider,
	type Harness,
	type HostActionBinding,
} from '@franklin/react';

export type ApplicationProviderProps = {
	harness: Harness;
	hostActionBindings: readonly HostActionBinding[];
	children: ReactNode;
};

export function ApplicationProvider({
	harness,
	hostActionBindings,
	children,
}: ApplicationProviderProps) {
	return (
		<HostActionProvider bindings={hostActionBindings}>
			<HarnessProvider harness={harness}>{children}</HarnessProvider>
		</HostActionProvider>
	);
}
