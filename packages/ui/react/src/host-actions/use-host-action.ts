import { useContext } from 'react';

import type { HostAction, HostActionHandlerOf } from './action.js';
import { HostActionContext } from './provider.js';

export function useHostAction<Action extends HostAction>(
	action: Action,
): HostActionHandlerOf<Action> {
	const registry = useContext(HostActionContext);
	if (!registry) {
		throw new Error('useHostAction must be used inside a <HostActionProvider>');
	}

	const handler = registry.get(action.id);
	if (!handler) {
		throw new Error(`No host action handler registered for "${action.id}"`);
	}

	return handler as HostActionHandlerOf<Action>;
}
