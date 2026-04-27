import { useLayoutEffect } from 'react';

import { createStatusControl, statusExtension } from '@franklin/extensions';

import { useAgentControl } from './use-agent-control.js';
import { useAgentState } from './use-agent-state.js';

/**
 * Auto-clears the agent's `unread` status while it is the active session.
 *
 * Without this, `turnEnd` flips status to `unread` (blue dot) and `markRead()`
 * only fires from sidebar/tab `onClick` — so on the already-active session the
 * dot persists indefinitely. Uses `useLayoutEffect` to clear before paint so
 * the dot never flashes.
 */
export function useAutoMarkRead(isActive: boolean): void {
	const status = useAgentState(statusExtension.keys.status).get();
	const control = useAgentControl(
		statusExtension.keys.status,
		createStatusControl,
	);

	useLayoutEffect(() => {
		if (isActive && status === 'unread') {
			control.markRead();
		}
	}, [isActive, status, control]);
}
