import { useMemo } from 'react';

import type { Store, StoreKey } from '@franklin/extensions';

import { useAgentState } from './use-agent-state.js';

export function useAgentControl<T, C>(
	key: StoreKey<string, T>,
	createControl: (store: Store<T>) => C,
): C {
	const store = useAgentState(key);
	return useMemo(() => createControl(store), [createControl, store]);
}
