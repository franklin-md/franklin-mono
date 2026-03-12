import { useEffect, useMemo, useState } from 'react';

import type { AgentHandle, AgentStatus } from '@franklin/agent-manager';
import type {
	ManagedAgentEvent,
	PermissionRequest,
} from '@franklin/managed-agent';

import {
	eventsToConversation,
	type ConversationItem,
} from '../lib/events-to-conversation.js';

export interface AgentHandleState {
	status: AgentStatus;
	events: ManagedAgentEvent[];
	conversation: ConversationItem[];
	pendingPermission: PermissionRequest | null;
}

export function useAgentHandle(
	handle: AgentHandle | undefined,
): AgentHandleState {
	const [events, setEvents] = useState<ManagedAgentEvent[]>([]);
	const [status, setStatus] = useState<AgentStatus>(
		handle?.status ?? 'created',
	);

	useEffect(() => {
		if (!handle) {
			setEvents([]);
			setStatus('created');
			return;
		}

		setStatus(handle.status);
		// Load initial events
		void handle.events().then(setEvents);

		return handle.on(() => {
			setStatus(handle.status); // status already updated by handle
			void handle.events().then(setEvents);
		});
	}, [handle]);

	const conversation = useMemo(() => eventsToConversation(events), [events]);

	const pendingPermission = useMemo((): PermissionRequest | null => {
		// Walk events backwards: if last permission event is 'requested', return it
		for (let i = events.length - 1; i >= 0; i--) {
			const e = events[i];
			if (e?.type === 'permission.resolved') return null;
			if (e?.type === 'permission.requested') return e.payload;
		}
		return null;
	}, [events]);

	return { status, events, conversation, pendingPermission };
}
