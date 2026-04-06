import { useMemo } from 'react';

import { createStatusControl, statusExtension } from '@franklin/extensions';
import { useAgentState } from '@franklin/react';

import { SidebarItem } from './sidebar-item.js';

function truncateId(id: string): string {
	return id.slice(0, 8);
}

export function AgentSidebarItem({
	sessionId,
	active,
	onSelect,
	onDelete,
}: {
	sessionId: string;
	active: boolean;
	onSelect: (sessionId: string) => void;
	onDelete: (sessionId: string) => void;
}) {
	const statusStore = useAgentState(statusExtension.keys.status);
	const status = statusStore.get();
	const control = useMemo(
		() => createStatusControl(statusStore),
		[statusStore],
	);

	return (
		<SidebarItem
			name={truncateId(sessionId)}
			status={status}
			active={active}
			onClick={() => {
				control.markRead();
				onSelect(sessionId);
			}}
			onDelete={() => onDelete(sessionId)}
		/>
	);
}
