import { useMemo } from 'react';

import {
	createStatusControl,
	statusKey,
	type Session,
} from '@franklin/agent/browser';
import { useAgentState } from '@franklin/react';

import { SidebarItem } from './sidebar-item.js';

function truncateId(id: string): string {
	return id.slice(0, 8);
}

export function AgentSidebarItem({
	session,
	active,
	onSelect,
}: {
	session: Session;
	active: boolean;
	onSelect: (sessionId: string) => void;
}) {
	const statusStore = useAgentState(session.agent, statusKey);
	const status = statusStore.get();
	const control = useMemo(
		() => createStatusControl(statusStore),
		[statusStore],
	);

	return (
		<SidebarItem
			name={truncateId(session.sessionId)}
			status={status}
			active={active}
			onClick={() => {
				control.markRead();
				onSelect(session.sessionId);
			}}
		/>
	);
}
